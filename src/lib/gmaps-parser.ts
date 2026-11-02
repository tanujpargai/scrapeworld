export interface ParsedGmapsPlace {
  googlePlaceId: string | null;
  title: string;
  website: string | null;
  phone: string | null;
  rating: number | null;
  reviewCount: number | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  categories: string[];
  status: string | null;
  description: string | null;
}

/**
 * Strips the Google Maps security prefix and parses the nested JSON array.
 */
export function parseGmapsPlace(rawText: string): ParsedGmapsPlace | null {
  try {
    const prefix = ")]}'\n";
    let jsonText = rawText.trim();
    if (jsonText.startsWith(prefix)) {
      jsonText = jsonText.substring(prefix.length);
    } else if (jsonText.startsWith(")]}'")) {
      jsonText = jsonText.substring(4);
    }

    const jd = JSON.parse(jsonText);
    if (!Array.isArray(jd) || jd.length < 7) {
      return null;
    }

    const darray = jd[6];
    if (!Array.isArray(darray)) {
      return null;
    }

    // Helper to get nested value safely
    const getNested = (arr: any, ...indexes: number[]): any => {
      let current = arr;
      for (const idx of indexes) {
        if (current === null || current === undefined || !Array.isArray(current) || idx >= current.length) {
          return null;
        }
        current = current[idx];
      }
      return current;
    };

    const googlePlaceId = getNested(darray, 78) || null;
    const title = getNested(darray, 11) || "";
    
    // Extract actual website URL if it redirects via Google's /url?q= prefix
    let website = getNested(darray, 7, 0) || null;
    if (website && website.startsWith('/url?q=')) {
      try {
        const urlObj = new URL('https://google.com' + website);
        website = urlObj.searchParams.get('q') || website;
      } catch (e) {
        // Ignore parsing errors
      }
    }

    const phoneRaw = getNested(darray, 178, 0, 0);
    const phone = phoneRaw ? String(phoneRaw).replace(/\s+/g, '') : null;

    const rating = getNested(darray, 4, 7);
    const reviewCount = getNested(darray, 4, 8);

    const address = getNested(darray, 18) || null;

    const city = getNested(darray, 183, 1, 3) || null;
    const state = getNested(darray, 183, 1, 5) || null;
    const country = getNested(darray, 183, 1, 6) || null;

    const latitude = getNested(darray, 9, 2);
    const longitude = getNested(darray, 9, 3);

    const categoriesRaw = getNested(darray, 13) || [];
    const categories = Array.isArray(categoriesRaw) ? categoriesRaw.map(c => String(c)) : [];

    const status = getNested(darray, 34, 4, 4) || null;
    const description = getNested(darray, 32, 1, 1) || null;

    return {
      googlePlaceId,
      title,
      website,
      phone,
      rating: typeof rating === 'number' ? rating : null,
      reviewCount: typeof reviewCount === 'number' ? Math.round(reviewCount) : null,
      address,
      city,
      state,
      country,
      latitude: typeof latitude === 'number' ? latitude : null,
      longitude: typeof longitude === 'number' ? longitude : null,
      categories,
      status,
      description,
    };
  } catch (err) {
    console.error('Error parsing Google Maps place data:', err);
    return null;
  }
}
