import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { searchDuckDuckGo } from '@/lib/search';
import axios from 'axios';
import * as cheerio from 'cheerio';

export interface VerificationEvidence {
  nameMatch: boolean;
  phoneMatch: boolean;
  cityMatch: boolean;
  socialMatch: boolean;
  emailDomainMatch: boolean;
  signalsChecked: string[];
  reasons: string[];
}

export class WebsiteVerificationService {
  /**
   * Run V2 website verification on a single business.
   */
  async verifyWebsite(businessId: string): Promise<{
    verifiedWebsite: string | null;
    confidence: number;
    source: string | null;
  }> {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: { 
        websiteData: true,
        socialProfiles: true,
      },
    });

    if (!business) {
      throw new Error(`Business not found: ${businessId}`);
    }

    console.log(`[Verification V2] Starting website verification for: "${business.name}" (ID: ${business.id})`);

    const candidates = new Set<string>();
    const urlSources = new Map<string, string>(); // url -> source description

    // 1. Existing Google Maps listing website
    if (business.website) {
      const cleanUrl = this.normalizeUrl(business.website);
      candidates.add(cleanUrl);
      urlSources.set(cleanUrl, 'google-maps-listing');
    }

    // 2. Existing website entity in database
    if (business.websiteData?.url) {
      const cleanUrl = this.normalizeUrl(business.websiteData.url);
      candidates.add(cleanUrl);
      if (!urlSources.has(cleanUrl)) {
        urlSources.set(cleanUrl, 'website-entity');
      }
    }

    // 3. Website discovered from Social Profiles in DB
    if (business.socialProfiles && business.socialProfiles.length > 0) {
      for (const sp of business.socialProfiles) {
        // Simple heuristic: if social profile has custom website info in URL, e.g. from post
        const parsedUrl = this.extractWebsiteFromSocialUrl(sp.url);
        if (parsedUrl) {
          const cleanUrl = this.normalizeUrl(parsedUrl);
          if (this.isValidBusinessWebsite(cleanUrl)) {
            candidates.add(cleanUrl);
            if (!urlSources.has(cleanUrl)) {
              urlSources.set(cleanUrl, `social-profile-${sp.platform.toLowerCase()}`);
            }
          }
        }
      }
    }

    // 4. Website discovered from business email domain
    if (business.email) {
      const emailDomainUrl = this.getEmailDomainCandidate(business.email);
      if (emailDomainUrl) {
        const cleanUrl = this.normalizeUrl(emailDomainUrl);
        candidates.add(cleanUrl);
        if (!urlSources.has(cleanUrl)) {
          urlSources.set(cleanUrl, 'business-email-domain');
        }
      }
    }

    let bestUrl: string | null = null;
    let bestScore = -1;
    let bestEvidence: VerificationEvidence | null = null;

    // Pre-evaluate existing / email / social candidates to avoid hitting DDG if possible
    for (const url of candidates) {
      try {
        const result = await this.evaluateCandidate(url, business);
        console.log(`  - Candidate: ${url} | Score: ${result.score} | Reasons: ${result.evidence.reasons.join(', ')}`);
        
        if (result.score > bestScore) {
          bestScore = result.score;
          bestUrl = url;
          bestEvidence = result.evidence;
        }
      } catch (err: any) {
        console.warn(`  - Candidate failed evaluation: ${url} | Error: ${err.message}`);
      }
    }

    // If candidate has high confidence (>= 80), bypass DDG search entirely
    if (bestUrl && bestScore >= 80 && bestEvidence) {
      const finalSource = urlSources.get(bestUrl) || 'pre-evaluated';
      console.log(`[Verification V2] SUCCESS (Pre-evaluated): Verified "${bestUrl}" with Confidence: ${bestScore}%`);
      await prisma.business.update({
        where: { id: businessId },
        data: {
          verifiedWebsite: bestUrl,
          websiteConfidence: bestScore,
          websiteSource: finalSource,
          verificationMethod: 'layered-signals-v2',
          verificationDate: new Date(),
          verificationEvidence: bestEvidence as any,
          website: business.website || bestUrl,
        },
      });
      return { verifiedWebsite: bestUrl, confidence: bestScore, source: finalSource };
    }

    // 5. Fallback: DuckDuckGo Discovery Search (Name and Name + City)
    console.log(`[Verification V2] Pre-evaluation did not find a confident website. Falling back to DuckDuckGo search for "${business.name}"`);
    const ddgCandidates = new Set<string>();
    try {
      const searchQuery = `${business.name} ${business.city || 'Delhi'}`.trim();
      const searchResults = await searchDuckDuckGo(searchQuery);
      
      for (const res of searchResults.slice(0, 3)) {
        const cleanUrl = this.normalizeUrl(res.link);
        if (this.isValidBusinessWebsite(cleanUrl)) {
          ddgCandidates.add(cleanUrl);
          if (!urlSources.has(cleanUrl)) {
            urlSources.set(cleanUrl, 'duckduckgo-discovery');
          }
        }
      }
    } catch (e: any) {
      console.warn(`[Verification V2] DuckDuckGo search failed: ${e.message}`);
    }

    // Evaluate DDG candidates
    for (const url of ddgCandidates) {
      if (candidates.has(url)) continue; // Already evaluated
      try {
        const result = await this.evaluateCandidate(url, business);
        console.log(`  - DDG Candidate: ${url} | Score: ${result.score} | Reasons: ${result.evidence.reasons.join(', ')}`);
        
        if (result.score > bestScore) {
          bestScore = result.score;
          bestUrl = url;
          bestEvidence = result.evidence;
        }
      } catch (err: any) {
        console.warn(`  - DDG Candidate failed evaluation: ${url} | Error: ${err.message}`);
      }
    }

    if (bestUrl === null && candidates.size === 0 && ddgCandidates.size === 0) {
      console.log(`[Verification V2] No candidates found at all for "${business.name}"`);
      await prisma.business.update({
        where: { id: businessId },
        data: {
          verifiedWebsite: null,
          websiteConfidence: 0,
          websiteSource: 'none',
          verificationMethod: 'layered-signals-v2',
          verificationDate: new Date(),
          verificationEvidence: Prisma.DbNull,
        },
      });
      return { verifiedWebsite: null, confidence: 0, source: null };
    }

    const finalSource = bestUrl ? urlSources.get(bestUrl) || 'discovery' : null;

    // Apply strict threshold: Confidence >= 80 to be stored, else NULL (never fabricate)
    if (bestUrl && bestScore >= 80 && bestEvidence) {
      console.log(`[Verification V2] SUCCESS: Verified "${bestUrl}" with Confidence: ${bestScore}%`);
      await prisma.business.update({
        where: { id: businessId },
        data: {
          verifiedWebsite: bestUrl,
          websiteConfidence: bestScore,
          websiteSource: finalSource,
          verificationMethod: 'layered-signals-v2',
          verificationDate: new Date(),
          verificationEvidence: bestEvidence as any,
          website: business.website || bestUrl,
        },
      });
      return { verifiedWebsite: bestUrl, confidence: bestScore, source: finalSource };
    } else {
      console.log(`[Verification V2] UNVERIFIED: No candidate passed threshold (Best score: ${bestScore}%). Storing NULL.`);
      await prisma.business.update({
        where: { id: businessId },
        data: {
          verifiedWebsite: null,
          websiteConfidence: bestScore > 0 ? bestScore : 0,
          websiteSource: bestUrl ? finalSource : 'none',
          verificationMethod: 'layered-signals-v2',
          verificationDate: new Date(),
          verificationEvidence: bestEvidence as any,
        },
      });
      return { verifiedWebsite: null, confidence: bestScore > 0 ? bestScore : 0, source: null };
    }
  }

  /**
   * Helper: Extract website from social profile URLs (e.g. facebook pages with website parameters)
   */
  private extractWebsiteFromSocialUrl(url: string): string | null {
    try {
      const parsed = new URL(url);
      // E.g., facebook.com/l.php?u=https%3A%2F%2Fmyclinic.com
      if (parsed.searchParams.has('u')) {
        return parsed.searchParams.get('u');
      }
      if (parsed.searchParams.has('website')) {
        return parsed.searchParams.get('website');
      }
    } catch {
      // Ignore
    }
    return null;
  }

  /**
   * Helper: Get domain candidate from email domain
   */
  private getEmailDomainCandidate(email: string): string | null {
    const parts = email.trim().split('@');
    if (parts.length < 2) return null;
    const domain = parts[1].toLowerCase();

    const publicProviders = new Set([
      'gmail.com', 'yahoo.com', 'yahoo.co.in', 'hotmail.com', 'outlook.com', 'live.com', 
      'aol.com', 'icloud.com', 'zoho.com', 'protonmail.com', 'proton.me', 'mail.com', 
      'yandex.com', 'rediffmail.com', 'indiatimes.com'
    ]);

    if (publicProviders.has(domain)) {
      return null;
    }

    return `https://${domain}`;
  }

  /**
   * Helper: Normalize URL format
   */
  private normalizeUrl(url: string): string {
    let cleanUrl = url.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = 'https://' + cleanUrl;
    }
    try {
      const parsed = new URL(cleanUrl);
      return `${parsed.protocol}//${parsed.hostname.toLowerCase()}${parsed.pathname === '/' ? '' : parsed.pathname}`;
    } catch {
      return cleanUrl;
    }
  }

  /**
   * Helper: Filter out directory sites
   */
  private isValidBusinessWebsite(url: string): boolean {
    const domain = this.getDomain(url).toLowerCase();
    const directories = [
      'google.com', 'facebook.com', 'instagram.com', 'linkedin.com', 'twitter.com', 'x.com',
      'youtube.com', 'wikipedia.org', 'justdial.com', 'tripadvisor.in', 'tripadvisor.com',
      'yelp.com', 'indiamart.com', 'mapsofindia.com', 'magicpin.in', 'zomato.com', 'swiggy.com',
      'pinterest.com', 'tumblr.com', 'sulekha.com', 'jdmagicbox.com', 'asklaila.com', 'dialme.in'
    ];
    return !directories.some(d => domain === d || domain.endsWith('.' + d));
  }

  private getDomain(urlStr: string): string {
    try {
      const parsed = new URL(urlStr);
      return parsed.hostname.replace(/^www\./i, '');
    } catch {
      return urlStr;
    }
  }

  /**
   * Evaluate a candidate website URL against a business profile using V2 signals.
   */
  private async evaluateCandidate(url: string, business: any): Promise<{ score: number; evidence: VerificationEvidence }> {
    const domain = this.getDomain(url).toLowerCase();
    const bizNameLower: string = (business.name as string).toLowerCase();
    
    // Fetch page HTML
    const https = await import('https');
    const agent = new https.Agent({ rejectUnauthorized: false });
    
    const response = await axios.get(url, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      httpsAgent: agent,
      maxRedirects: 3,
    });

    const html = response.data;
    if (typeof html !== 'string') {
      throw new Error('Response is not HTML');
    }

    const $ = cheerio.load(html);
    const pageText = $('body').text().toLowerCase();
    const pageTitle = $('title').text().toLowerCase();

    const signalsChecked: string[] = ['domain_similarity', 'brand_match'];
    const reasons: string[] = [];

    // 1. Domain Similarity Match (Max 20 points)
    const nameTokens = bizNameLower.split(/\s+/).filter(t => t.length > 2 && !['clinic', 'salon', 'gym', 'restaurant', 'associates', 'advocate', 'lawyer', 'spa', 'unisex', 'dental'].includes(t));
    let domainMatch = false;
    if (nameTokens.length > 0) {
      domainMatch = nameTokens.some(token => domain.includes(token));
    } else {
      domainMatch = domain.includes(bizNameLower.replace(/[^a-z0-9]/g, ''));
    }
    const domainScore = domainMatch ? 20 : 0;
    if (domainMatch) {
      reasons.push(`Domain "${domain}" matched business name key terms.`);
    }

    // 2. Brand Match in HTML (Max 20 points)
    let brandMatch = false;
    if (nameTokens.length > 0) {
      const matchedTokens = nameTokens.filter(token => pageTitle.includes(token) || pageText.includes(token));
      brandMatch = (matchedTokens.length / nameTokens.length) >= 0.5;
    } else {
      brandMatch = pageTitle.includes(bizNameLower) || pageText.includes(bizNameLower);
    }
    const brandScore = brandMatch ? 20 : 0;
    if (brandMatch) {
      reasons.push(`Brand name "${business.name}" found in homepage title or text copy.`);
    }

    // 3. Phone Match (Max 25 points)
    let phoneMatch = false;
    if (business.phone) {
      signalsChecked.push('phone_correlation');
      const cleanBizPhone = business.phone.replace(/[^0-9]/g, '');
      if (cleanBizPhone.length >= 7) {
        const phonesInPage: string[] = [];
        $('a[href^="tel:"]').each((_, el) => {
          const href = $(el).attr('href') || '';
          phonesInPage.push(href.replace(/[^0-9]/g, ''));
        });

        const textPhones = pageText.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g) || [];
        textPhones.forEach(p => phonesInPage.push(p.replace(/[^0-9]/g, '')));

        phoneMatch = phonesInPage.some(p => p.includes(cleanBizPhone) || cleanBizPhone.includes(p));
      }
    }
    const phoneScore = phoneMatch ? 25 : 0;
    if (phoneMatch) {
      reasons.push(`Phone number matches Google Maps listing (${business.phone}).`);
    }

    // 4. City/Address Match (Max 15 points)
    let cityMatch = false;
    if (business.city) {
      signalsChecked.push('city_match');
      cityMatch = pageText.includes(business.city.toLowerCase().split(',')[0].trim());
    }
    const cityScore = cityMatch ? 15 : 0;
    if (cityMatch) {
      reasons.push(`City "${business.city}" found in homepage address/copy.`);
    }

    // 5. Email Domain Match (Max 20 points)
    let emailDomainMatch = false;
    signalsChecked.push('email_domain_match');
    
    // Check if business has profile email and domain matches website domain
    if (business.email) {
      const emailDomain = business.email.split('@')[1]?.toLowerCase();
      if (emailDomain && emailDomain === domain) {
        emailDomainMatch = true;
      }
    }

    // Check emails on homepage
    const emailsInPage: string[] = [];
    const mailtoLinks = $('a[href^="mailto:"]');
    mailtoLinks.each((_, el) => {
      const href = $(el).attr('href') || '';
      emailsInPage.push(href.replace(/^mailto:/i, '').split('?')[0].trim().toLowerCase());
    });

    const textEmails = pageText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    textEmails.forEach(e => emailsInPage.push(e.trim().toLowerCase()));

    if (emailsInPage.length > 0) {
      const match = emailsInPage.some(e => {
        const eDomain = e.split('@')[1];
        return eDomain === domain || (business.email && e.split('@')[1] === business.email.split('@')[1]);
      });
      if (match) {
        emailDomainMatch = true;
      }
    }

    const emailDomainScore = emailDomainMatch ? 20 : 0;
    if (emailDomainMatch) {
      reasons.push('Email domain matches website domain or profile email domain.');
    }

    // 6. Social Links Match (Extra heuristic validation, Max 10 points)
    let socialMatch = false;
    signalsChecked.push('social_links');
    const socialLinks: string[] = [];
    $('a').each((_, el) => {
      const href = $(el).attr('href')?.toLowerCase() || '';
      if (href.includes('facebook.com/') || href.includes('instagram.com/') || href.includes('linkedin.com/')) {
        socialLinks.push(href);
      }
    });
    if (socialLinks.length > 0) {
      if (nameTokens.length > 0) {
        socialMatch = socialLinks.some(link => nameTokens.some(token => link.includes(token)));
      } else {
        socialMatch = socialLinks.some(link => link.includes(bizNameLower.replace(/[^a-z0-9]/g, '')));
      }
    }
    const socialScore = socialMatch ? 10 : 0;
    if (socialMatch) {
      reasons.push('Social profile handles on website match business name tokens.');
    }

    const overallScore = Math.min(100, domainScore + brandScore + phoneScore + cityScore + emailDomainScore + socialScore);

    const evidence: VerificationEvidence = {
      nameMatch: brandMatch,
      phoneMatch,
      cityMatch,
      socialMatch,
      emailDomainMatch,
      signalsChecked,
      reasons,
    };

    return {
      score: overallScore,
      evidence,
    };
  }
}
