import prisma from '@/lib/prisma';
import { searchDuckDuckGo } from '@/lib/search';
import axios from 'axios';
import * as cheerio from 'cheerio';

export class OwnerDiscoveryService {
  /**
   * Run owner discovery on a single business.
   */
  async discoverOwner(businessId: string): Promise<{
    ownerName: string | null;
    ownerRole: string | null;
    ownerLinkedIn: string | null;
    ownerConfidence: number;
  }> {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      throw new Error(`Business not found: ${businessId}`);
    }

    console.log(`[Owner] Starting owner discovery for: "${business.name}"`);

    let discoveredName: string | null = null;
    let discoveredRole: string | null = null;
    let discoveredLinkedIn: string | null = null;
    let confidence = 0;

    const targetUrl = business.verifiedWebsite || business.website;

    // 1. Scrape verified website About/Team pages if present
    if (targetUrl) {
      try {
        const websiteOwner = await this.scrapeWebsiteForOwner(targetUrl, business);
        if (websiteOwner.name) {
          discoveredName = websiteOwner.name;
          discoveredRole = websiteOwner.role;
          discoveredLinkedIn = websiteOwner.linkedIn;
          confidence = 95; // High confidence from verified site
        }
      } catch (err: any) {
        console.warn(`  - Website scraping failed for owner discovery: ${err.message}`);
      }
    }

    // 2. DuckDuckGo Search if website scrape yielded nothing
    if (!discoveredName) {
      try {
        const searchQuery = `"${business.name}" "${business.city || 'Delhi'}" owner OR founder OR "managing director" OR "clinic owner"`;
        const searchResults = await searchDuckDuckGo(searchQuery);
        
        for (const res of searchResults.slice(0, 5)) {
          const match = this.parseSnippetForOwner(res.snippet || res.title, business);
          if (match.name) {
            discoveredName = match.name;
            discoveredRole = match.role;
            confidence = 75; // Moderate confidence from search snippet
            
            // Check if there is a linkedin.com/in/ link in search result
            if (res.link.includes('linkedin.com/in/')) {
              discoveredLinkedIn = res.link;
              confidence = 85; // Boost confidence if LinkedIn is found
            }
            break;
          }
        }
      } catch (err: any) {
        console.warn(`  - Search failed for owner discovery: ${err.message}`);
      }
    }

    // Save to Database (strictly confidence >= 75)
    if (discoveredName && confidence >= 75) {
      console.log(`[Owner] FOUND: Name: "${discoveredName}" | Role: "${discoveredRole}" | Confidence: ${confidence}%`);
      await prisma.business.update({
        where: { id: businessId },
        data: {
          ownerName: discoveredName,
          ownerRole: discoveredRole || 'Owner',
          ownerLinkedIn: discoveredLinkedIn,
          ownerConfidence: confidence,
        },
      });
      return { ownerName: discoveredName, ownerRole: discoveredRole, ownerLinkedIn: discoveredLinkedIn, ownerConfidence: confidence };
    } else {
      console.log(`[Owner] NOT FOUND (or low confidence) for "${business.name}"`);
      await prisma.business.update({
        where: { id: businessId },
        data: {
          ownerName: null,
          ownerRole: null,
          ownerLinkedIn: null,
          ownerConfidence: 0,
        },
      });
      return { ownerName: null, ownerRole: null, ownerLinkedIn: null, ownerConfidence: 0 };
    }
  }

  /**
   * Search and scrape About/Team pages on the business website.
   */
  private async scrapeWebsiteForOwner(baseUrl: string, business: any): Promise<{
    name: string | null;
    role: string | null;
    linkedIn: string | null;
  }> {
    const https = await import('https');
    const agent = new https.Agent({ rejectUnauthorized: false });

    // Fetch homepage to find About/Team links
    const response = await axios.get(baseUrl, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      httpsAgent: agent,
    });

    const $ = cheerio.load(response.data);
    const pagesToScrape = new Set<string>();
    pagesToScrape.add(baseUrl); // Scrape homepage too

    // Find links matching About, Team, Contact, etc.
    $('a').each((_, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().toLowerCase();
      if (
        href.includes('about') || href.includes('team') || href.includes('meet') || 
        href.includes('who') || href.includes('management') || 
        text.includes('about') || text.includes('our team') || text.includes('doctors')
      ) {
        try {
          // Resolve relative links
          const resolved = new URL(href, baseUrl).toString();
          pagesToScrape.add(resolved);
        } catch {
          // Ignore parse errors
        }
      }
    });

    // Limit to 3 pages max to prevent blocking
    const pagesList = Array.from(pagesToScrape).slice(0, 3);
    
    for (const url of pagesList) {
      try {
        console.log(`  - Scraping page for owner cues: ${url}`);
        const pageRes = await axios.get(url, {
          timeout: 6000,
          headers: { 'User-Agent': 'Mozilla/5.0' },
          httpsAgent: agent,
        });
        
        const $page = cheerio.load(pageRes.data);
        const bodyText = $page('body').text();

        // 1. Check for specific name pattern matches
        const match = this.parseSnippetForOwner(bodyText, business);
        if (match.name) {
          // Look for LinkedIn links on the page that contain the name
          let foundLinkedIn: string | null = null;
          $page('a[href*="linkedin.com/in/"]').each((_, el) => {
            const href = $page(el).attr('href') || '';
            const nameTokens = match.name!.toLowerCase().split(/\s+/);
            if (nameTokens.some(tok => href.toLowerCase().includes(tok))) {
              foundLinkedIn = href;
            }
          });
          return { name: match.name, role: match.role, linkedIn: foundLinkedIn };
        }
      } catch (err: any) {
        console.warn(`    * Failed scraping page ${url}: ${err.message}`);
      }
    }

    return { name: null, role: null, linkedIn: null };
  }

  /**
   * Parser: extract owner name and role from snippet using regex
   */
  private parseSnippetForOwner(text: string, business: any): { name: string | null; role: string | null } {
    // 1. Look for Name preceding executive titles
    // E.g. "John Doe, Founder & CEO", "Dr. Amit Verma, Clinic Owner"
    const regex1 = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\s*,\s*(?:the\s+)?(?:Founder|Owner|Managing Director|MD|CEO|Director|Partner|Clinic Owner|Business Owner)/i;
    const match1 = text.match(regex1);
    if (match1 && this.isValidName(match1[1])) {
      return { name: match1[1].trim(), role: this.extractRole(text, match1[1]) };
    }

    // 2. Look for Name following executive titles
    // E.g. "Founder: John Doe", "Clinic Owner: Dr. Amit Verma"
    const regex2 = /(?:Founder|Owner|Managing Director|MD|CEO|President|Partner|Clinic Owner|Business Owner|Doctor|Dentist)\s*[:,-]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/i;
    const match2 = text.match(regex2);
    if (match2 && this.isValidName(match2[1])) {
      return { name: match2[1].trim(), role: this.extractRole(text, match2[1]) };
    }

    // 3. Fallback for clinics: Dr. Amit Verma (often the dentist owner)
    if (business.industry?.toLowerCase().includes('clinic') || business.industry?.toLowerCase().includes('dentist') || business.industry?.toLowerCase().includes('orthodontist')) {
      const docRegex = /(Dr\.\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/i;
      const docMatch = text.match(docRegex);
      if (docMatch && this.isValidName(docMatch[1])) {
        return { name: docMatch[1].trim(), role: 'Clinic Owner & Dentist' };
      }
    }

    return { name: null, role: null };
  }

  private isValidName(name: string): boolean {
    const cleaned = name.trim();
    
    // 1. Length must be between 3 and 35 characters
    if (cleaned.length < 3 || cleaned.length > 35) {
      return false;
    }

    // 2. Reject names with more than 4 words
    const words = cleaned.split(/\s+/);
    if (words.length > 4) {
      return false;
    }

    // 3. Accept only human name patterns (letters, spaces, dots, dashes, apostrophes)
    if (!/^[A-Za-z\s\.\-\']+$/.test(cleaned)) {
      return false;
    }

    // 4. Case-insensitive blacklist of stopwords, verbs, industries, and marketing terms
    const forbiddenKeywords = new Set([
      // Stopwords/Pronouns
      'we', 'are', 'who', 'treat', 'our', 'us', 'you', 'your', 'the', 'and', 'to', 'in', 'for', 'of', 'with', 'at', 'by', 'on', 'about', 'equally', 'patients', 'relationship', 'delhi', 'new delhi', 'india',
      // Days & Months
      'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
      'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
      // Tech/Brands
      'google', 'facebook', 'instagram', 'linkedin', 'twitter', 'website', 'domain', 'email', 'phone',
      // Marketing/CTA/Web page terms
      'about', 'contact', 'home', 'services', 'reviews', 'review', 'rating', 'ratings', 'gallery', 'blog', 'news', 'privacy', 'policy', 'terms', 'map', 'location', 'locations', 'book', 'appointment', 'now', 'call', 'visit', 'open', 'hours', 'closed', 'welcome', 'experience', 'expert', 'professional',
      // Business/Industry names
      'clinic', 'salon', 'gym', 'restaurant', 'spa', 'dentist', 'dental', 'orthodontist', 'prosthodontist', 'barber', 'hairdresser', 'unisex', 'beauty', 'parlour', 'hospital', 'healthcare', 'care', 'health', 'medical', 'implant', 'aesthetic', 'practice', 'team', 'doctors', 'management', 'development', 'consulting', 'group', 'associates', 'advocate', 'advocates', 'lawyer', 'lawyers', 'firm', 'agency', 'media', 'digital', 'marketing', 'solutions', 'properties', 'estates', 'realtors', 'builders', 'construction', 'company', 'private', 'limited', 'pvt', 'ltd'
    ]);

    // Check individual words
    for (const w of words) {
      const lower = w.toLowerCase().replace(/[^a-z]/g, '');
      if (forbiddenKeywords.has(lower)) {
        return false;
      }
      
      // Reject if word is a common verb
      const verbs = ['is', 'was', 'were', 'have', 'has', 'had', 'do', 'does', 'did', 'go', 'goes', 'went', 'run', 'runs', 'work', 'works', 'make', 'makes', 'find', 'finds', 'take', 'takes', 'get', 'gets', 'give', 'gives', 'help', 'helps', 'provide', 'provides', 'serve', 'serves', 'treat', 'treats'];
      if (verbs.includes(lower)) {
        return false;
      }
    }

    // Check whole string for marketing patterns
    const lowerFull = cleaned.toLowerCase();
    const marketingPhrases = [
      'book now', 'book online', 'contact us', 'read more', 'click here', 'welcome to', 'all rights reserved', 'rating of', 'out of 5'
    ];
    if (marketingPhrases.some(phrase => lowerFull.includes(phrase))) {
      return false;
    }

    // 5. Ensure name contains at least one Capitalized human-like word (excluding "Dr", "Dr.")
    const nameWords = words.filter(w => !/^(dr|dr\.|mr|mr\.|ms|ms\.|mrs|mrs\.|md|ceo|owner|founder)$/i.test(w));
    if (nameWords.length === 0) {
      return false;
    }
    // Each human word must start with capital letter
    const capitalizedCount = nameWords.filter(w => /^[A-Z]/.test(w)).length;
    if (capitalizedCount !== nameWords.length) {
      return false;
    }

    return true;
  }

  private extractRole(text: string, name: string): string {
    const lowerText = text.toLowerCase();
    const nameLower = name.toLowerCase();
    const index = lowerText.indexOf(nameLower);
    
    // Scan a window of 80 characters before and after the name for titles
    const start = Math.max(0, index - 40);
    const end = Math.min(text.length, index + nameLower.length + 40);
    const windowText = lowerText.substring(start, end);

    if (windowText.includes('founder')) return 'Founder';
    if (windowText.includes('managing director') || windowText.includes('md')) return 'Managing Director';
    if (windowText.includes('ceo')) return 'CEO';
    if (windowText.includes('clinic owner')) return 'Clinic Owner';
    if (windowText.includes('business owner') || windowText.includes('owner')) return 'Business Owner';
    if (windowText.includes('director')) return 'Director';
    if (windowText.includes('partner')) return 'Partner';
    
    return 'Owner';
  }
}
