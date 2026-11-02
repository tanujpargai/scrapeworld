import axios from 'axios';
import * as cheerio from 'cheerio';

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

/**
 * Searches DuckDuckGo HTML-only endpoint.
 * Includes retries, exponential backoff, and random delay to avoid rate limiting.
 */
export async function searchDuckDuckGo(query: string, retries = 1): Promise<SearchResult[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  
  // Introduce a small random delay (300ms - 1000ms) to reduce rate-limiting risk
  const delay = Math.floor(300 + Math.random() * 700);
  await new Promise(resolve => setTimeout(resolve, delay));

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
        timeout: 4000,
      });

      const $ = cheerio.load(response.data);
      const results: SearchResult[] = [];

      $('.result').each((_, el) => {
        const titleEl = $(el).find('.result__title a');
        const title = titleEl.text().trim();
        const rawLink = titleEl.attr('href') || '';
        
        let link = rawLink;
        if (rawLink.includes('uddg=')) {
          const parts = rawLink.split('uddg=');
          if (parts.length > 1) {
            link = decodeURIComponent(parts[1].split('&')[0]);
          }
        }

        const snippet = $(el).find('.result__snippet').text().trim();

        if (title && link && !link.includes('duckduckgo.com/')) {
          results.push({ title, link, snippet });
        }
      });

      if (results.length > 0) {
        return results;
      }
      
      // If no results, check if we got blocked or empty page
      const bodyText = $('body').text().toLowerCase();
      if (bodyText.includes('rate limit') || bodyText.includes('robot') || bodyText.includes('captcha')) {
        console.warn(`DuckDuckGo rate limit or block detected on attempt ${attempt}/${retries}`);
      } else {
        // Just no results found
        return [];
      }
    } catch (e: any) {
      console.warn(`DuckDuckGo search attempt ${attempt}/${retries} failed: ${e.message}`);
      // Break immediately on any error (403, timeout, etc.) to fail fast
      break;
    }

    if (attempt < retries) {
      // Wait with exponential backoff before retrying
      const backoff = Math.pow(2, attempt) * 2000;
      await new Promise(resolve => setTimeout(resolve, backoff));
    }
  }

  return [];
}
