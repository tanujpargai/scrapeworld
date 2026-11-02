import prisma from '@/lib/prisma';
import { searchDuckDuckGo } from '@/lib/search';
import { SocialPlatform } from '@prisma/client';
import axios from 'axios';
import * as cheerio from 'cheerio';

export class SocialDiscoveryService {
  /**
   * Run social discovery on a single business.
   */
  async discoverSocialProfiles(businessId: string): Promise<number> {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      throw new Error(`Business not found: ${businessId}`);
    }

    console.log(`[Social V2] Starting social discovery for: "${business.name}"`);

    const profiles: { 
      platform: SocialPlatform; 
      url: string; 
      confidence: number;
      followersEstimate?: number | null;
      lastSeenDate?: Date | null;
      activityScore?: number | null;
    }[] = [];
    
    const targetUrl = business.verifiedWebsite || business.website;

    // 1. Extract directly from verified website HTML (header, footer, about, contact)
    if (targetUrl) {
      try {
        const https = await import('https');
        const agent = new https.Agent({ rejectUnauthorized: false });
        
        // Fetch homepage
        const response = await axios.get(targetUrl, {
          timeout: 8000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          httpsAgent: agent,
        });

        const $ = cheerio.load(response.data);
        const pagesToScrape = new Set<string>();
        pagesToScrape.add(targetUrl);

        // Find About / Contact / Team pages
        $('a').each((_, el) => {
          const href = $(el).attr('href') || '';
          const text = $(el).text().toLowerCase();
          if (
            href.includes('about') || href.includes('contact') || href.includes('team') ||
            text.includes('about') || text.includes('contact') || text.includes('team')
          ) {
            try {
              const resolved = new URL(href, targetUrl).toString();
              pagesToScrape.add(resolved);
            } catch {
              // Ignore parse errors
            }
          }
        });

        // Scan header and footer specifically, then homepage & subpages
        const pagesList = Array.from(pagesToScrape).slice(0, 3);
        for (const url of pagesList) {
          try {
            const pageRes = url === targetUrl ? response : await axios.get(url, {
              timeout: 6000,
              headers: { 'User-Agent': 'Mozilla/5.0' },
              httpsAgent: agent,
            });
            const $page = cheerio.load(pageRes.data);

            $page('a').each((_, el) => {
              const href = $page(el).attr('href') || '';
              const parsed = this.parseSocialLink(href);
              if (parsed) {
                profiles.push({
                  platform: parsed.platform,
                  url: parsed.url,
                  confidence: 98, // High confidence from business's own site
                  followersEstimate: null,
                  lastSeenDate: null,
                  activityScore: null,
                });
              }
            });
          } catch (err: any) {
            console.warn(`  - Subpage scrape failed for social profiles: ${url} | Error: ${err.message}`);
          }
        }
      } catch (err: any) {
        console.warn(`  - Website scrape failed for social profiles: ${err.message}`);
      }
    }

    // 2. Scrape Linktree landing page if website is Linktree
    if (targetUrl && targetUrl.includes('linktr.ee/')) {
      try {
        console.log(`  - Scraping Linktree links: ${targetUrl}`);
        const response = await axios.get(targetUrl, {
          timeout: 6000,
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(response.data);
        $('a').each((_, el) => {
          const href = $(el).attr('href') || '';
          const parsed = this.parseSocialLink(href);
          if (parsed) {
            profiles.push({
              platform: parsed.platform,
              url: parsed.url,
              confidence: 95,
              followersEstimate: null,
              lastSeenDate: null,
              activityScore: null,
            });
          }
        });
      } catch (err: any) {
        console.warn(`  - Linktree scrape failed: ${err.message}`);
      }
    }

    // 3. DuckDuckGo search fallback if we have <= 1 profile found
    if (profiles.length <= 1) {
      try {
        const searchQuery = `"${business.name}" "${business.city || 'Delhi'}" facebook instagram linkedin twitter`;
        const searchResults = await searchDuckDuckGo(searchQuery);

        for (const res of searchResults.slice(0, 5)) {
          const parsed = this.parseSocialLink(res.link);
          if (parsed) {
            // Verify name match in the URL/username to prevent false associations
            const nameTokens = business.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(t => t.length > 2);
            const lowerUrl = parsed.url.toLowerCase();
            const matchesName = nameTokens.some(tok => lowerUrl.includes(tok));
            
            if (matchesName) {
              // Parse followers and last active date from the search snippet
              const followers = this.parseFollowers(res.snippet || '');
              const lastSeen = this.parseLastSeenDate(res.snippet || '');
              const activity = followers ? Math.min(100, Math.round(followers / 100)) : null;

              profiles.push({
                platform: parsed.platform,
                url: parsed.url,
                confidence: 75, // Moderate confidence from search engine
                followersEstimate: followers,
                lastSeenDate: lastSeen,
                activityScore: activity,
              });
            }
          }
        }
      } catch (err: any) {
        console.warn(`  - Search failed for social discovery: ${err.message}`);
      }
    }

    // Deduplicate profiles by platform and URL
    const uniqueProfiles = new Map<string, typeof profiles[number]>();
    for (const p of profiles) {
      const key = `${p.platform}:${p.url.toLowerCase()}`;
      if (!uniqueProfiles.has(key) || (uniqueProfiles.get(key)!.confidence < p.confidence)) {
        uniqueProfiles.set(key, p);
      }
    }

    // Save to Database
    let savedCount = 0;
    for (const p of uniqueProfiles.values()) {
      const existing = await prisma.socialProfile.findFirst({
        where: {
          businessId,
          platform: p.platform,
        },
      });

      if (existing) {
        await prisma.socialProfile.update({
          where: { id: existing.id },
          data: {
            url: p.url,
            confidenceScore: p.confidence,
            followersEstimate: p.followersEstimate ?? null,
            activityScore: p.activityScore ?? null,
            lastSeenDate: p.lastSeenDate ?? null,
          },
        });
      } else {
        await prisma.socialProfile.create({
          data: {
            businessId,
            platform: p.platform,
            url: p.url,
            confidenceScore: p.confidence,
            followersEstimate: p.followersEstimate ?? null,
            activityScore: p.activityScore ?? null,
            lastSeenDate: p.lastSeenDate ?? null,
          },
        });
      }
      savedCount++;
    }

    console.log(`[Social V2] Discovered and saved ${savedCount} profiles for "${business.name}"`);
    return savedCount;
  }

  /**
   * Helper: Parse followers count from snippet text
   */
  private parseFollowers(text: string): number | null {
    const lower = text.toLowerCase();
    const match = lower.match(/(\d+(?:\.\d+)?\s*[km]?)\s*(?:followers|likes|following)/i);
    if (match) {
      let valStr = match[1].replace(/,/g, '').trim();
      let multiplier = 1;
      if (valStr.endsWith('k')) {
        multiplier = 1000;
        valStr = valStr.slice(0, -1).trim();
      } else if (valStr.endsWith('m')) {
        multiplier = 1000000;
        valStr = valStr.slice(0, -1).trim();
      }
      const parsed = parseFloat(valStr);
      if (!isNaN(parsed)) {
        return Math.round(parsed * multiplier);
      }
    }
    return null;
  }

  /**
   * Helper: Parse relative date from snippet
   */
  private parseLastSeenDate(text: string): Date | null {
    const lower = text.toLowerCase();
    const daysMatch = lower.match(/(\d+)\s+days?\s+ago/);
    if (daysMatch) {
      const days = parseInt(daysMatch[1]);
      const date = new Date();
      date.setDate(date.getDate() - days);
      return date;
    }
    const weeksMatch = lower.match(/(\d+)\s+weeks?\s+ago/);
    if (weeksMatch) {
      const weeks = parseInt(weeksMatch[1]);
      const date = new Date();
      date.setDate(date.getDate() - weeks * 7);
      return date;
    }
    const monthsMatch = lower.match(/(\d+)\s+months?\s+ago/);
    if (monthsMatch) {
      const months = parseInt(monthsMatch[1]);
      const date = new Date();
      date.setMonth(date.getMonth() - months);
      return date;
    }
    return null;
  }

  /**
   * Helper: Parse absolute social platform URL and check validity
   */
  private parseSocialLink(href: string): { platform: SocialPlatform; url: string } | null {
    const clean = href.trim();
    if (!/^https?:\/\//i.test(clean)) return null;

    try {
      const url = new URL(clean);
      const host = url.hostname.toLowerCase();
      let platform: SocialPlatform | null = null;
      let path = url.pathname;

      if (host.includes('instagram.com')) {
        platform = SocialPlatform.INSTAGRAM;
      } else if (host.includes('facebook.com') || host.includes('fb.com')) {
        platform = SocialPlatform.FACEBOOK;
      } else if (host.includes('linkedin.com')) {
        platform = SocialPlatform.LINKEDIN;
      } else if (host.includes('twitter.com') || host.includes('x.com')) {
        platform = SocialPlatform.TWITTER;
      } else if (host.includes('youtube.com') || host.includes('youtu.be')) {
        platform = SocialPlatform.YOUTUBE;
      } else if (host.includes('tiktok.com')) {
        platform = SocialPlatform.TIKTOK;
      }

      // Ignore base/home URLs (e.g. facebook.com/share.php, instagram.com/accounts)
      if (platform && path && path.length > 2) {
        if (
          path.includes('share') || path.includes('intent') || path.includes('post') ||
          path.includes('login') || path.includes('account') || path.includes('signup') ||
          path.includes('pages/create')
        ) {
          return null;
        }
        
        const cleanedUrl = `https://${url.hostname}${url.pathname}${url.search ? url.search : ''}`;
        return { platform, url: cleanedUrl };
      }
    } catch {
      // Ignore URL parse errors
    }

    return null;
  }
}
