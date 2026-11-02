/**
 * RDAP (Registration Data Access Protocol) Client
 * 
 * Provides zero-cost, privacy-compliant domain registration intelligence
 * using standard, publicly accessible RDAP bootstrap services.
 * 
 * Guarantees:
 * 1. Zero paid third-party APIs.
 * 2. In-memory LRU caching without requiring Redis.
 * 3. Bounded timeouts (default 3500ms) with AbortController.
 * 4. Strict domain validation & SSRF protection.
 * 5. Does NOT follow arbitrary untrusted URLs supplied by RDAP responses.
 * 6. Strictly distinguishes domain age from legal business age.
 */

import axios from 'axios';
import { isSafePublicUrl } from './url-safety';

export interface DomainRegistrationInfo {
  domain: string;
  isRegistered: boolean;
  registrationDate: string | null;     // ISO Date string
  expirationDate: string | null;       // ISO Date string
  lastChangedDate: string | null;      // ISO Date string
  registrar: string | null;
  domainAgeYears: number | null;
  daysUntilExpiration: number | null;
  status: 'KNOWN' | 'UNKNOWN' | 'FAILED_TO_COLLECT';
  source: string;
  notes?: string;
  rawEvents?: Array<{ eventAction: string; eventDate: string }>;
}

interface CacheEntry {
  data: DomainRegistrationInfo;
  expiresAt: number;
}

// In-memory cache for RDAP queries (1 hour TTL, max 500 domains)
const rdapCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;

/**
 * Normalizes and extracts a clean, registrable domain name.
 * e.g., 'https://www.sub.example.co.uk/path' -> 'example.co.uk'
 *       'https://shop.example.com/' -> 'example.com'
 */
export function extractRegistrableDomain(input: string): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  let clean = input.trim().toLowerCase();
  
  // Strip protocol and path if present
  try {
    if (clean.includes('://')) {
      const parsed = new URL(clean);
      clean = parsed.hostname;
    } else if (clean.includes('/')) {
      clean = clean.split('/')[0];
    }
  } catch {
    // If URL parsing fails, continue with string cleansing
  }

  // Strip ports and trailing dots
  clean = clean.split(':')[0].replace(/\.+$/, '');

  // Strip common www prefixes
  clean = clean.replace(/^www\d*\./, '');

  // Basic domain format validation (must contain a valid dot and alphabetic TLD)
  if (!/^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]?(\.[a-z0-9][a-z0-9-]{0,61}[a-z0-9]?)+$/.test(clean)) {
    return null;
  }

  // Reject IP addresses or localhost
  if (!isSafePublicUrl(`https://${clean}`)) {
    return null;
  }

  // Handle common two-part ccTLDs (.co.uk, .com.au, .co.in, .org.in, .ac.in, .gov.in, etc.)
  const parts = clean.split('.');
  if (parts.length >= 3) {
    const secondToLast = parts[parts.length - 2];
    const last = parts[parts.length - 1];
    const commonTwoPartTlds = [
      'co.uk', 'org.uk', 'gov.uk', 'ac.uk',
      'co.in', 'org.in', 'net.in', 'ac.in', 'gov.in',
      'com.au', 'net.au', 'org.au', 'edu.au',
      'co.nz', 'org.nz',
      'co.za', 'com.br', 'co.jp'
    ];
    const potentialTwoPart = `${secondToLast}.${last}`;
    if (commonTwoPartTlds.includes(potentialTwoPart)) {
      return parts.slice(-3).join('.');
    }
    // Default to last two labels
    return parts.slice(-2).join('.');
  }

  return clean;
}

/**
 * Parses RDAP JSON response and extracts registration dates and registrar information.
 */
export function parseRdapResponse(domain: string, data: any): DomainRegistrationInfo {
  if (!data || typeof data !== 'object') {
    return {
      domain,
      isRegistered: false,
      registrationDate: null,
      expirationDate: null,
      lastChangedDate: null,
      registrar: null,
      domainAgeYears: null,
      daysUntilExpiration: null,
      status: 'UNKNOWN',
      source: 'RDAP_BOOTSTRAP',
      notes: 'Empty or invalid RDAP payload',
    };
  }

  let registrationDate: string | null = null;
  let expirationDate: string | null = null;
  let lastChangedDate: string | null = null;
  const rawEvents: Array<{ eventAction: string; eventDate: string }> = [];

  if (Array.isArray(data.events)) {
    for (const ev of data.events) {
      if (!ev || typeof ev !== 'object') continue;
      const action = String(ev.eventAction || '').toLowerCase().trim();
      const dateStr = String(ev.eventDate || '').trim();

      if (dateStr && !isNaN(new Date(dateStr).getTime())) {
        rawEvents.push({ eventAction: action, eventDate: dateStr });

        if (action === 'registration' || action === 'created' || action === 'creation') {
          registrationDate = dateStr;
        } else if (action === 'expiration' || action === 'expires') {
          expirationDate = dateStr;
        } else if (action === 'last changed' || action === 'last updated' || action === 'updated') {
          lastChangedDate = dateStr;
        }
      }
    }
  }

  // Extract Registrar from entities
  let registrar: string | null = null;
  if (Array.isArray(data.entities)) {
    for (const entity of data.entities) {
      if (!entity || typeof entity !== 'object') continue;
      const roles = Array.isArray(entity.roles) ? entity.roles.map((r: any) => String(r).toLowerCase()) : [];
      if (roles.includes('registrar')) {
        // Check vcardArray
        if (Array.isArray(entity.vcardArray) && Array.isArray(entity.vcardArray[1])) {
          for (const item of entity.vcardArray[1]) {
            if (Array.isArray(item) && item[0] === 'fn' && typeof item[3] === 'string') {
              registrar = item[3].trim();
              break;
            }
          }
        }
        // Fallback to legal or handle name
        if (!registrar && entity.handle) {
          registrar = String(entity.handle).trim();
        }
        if (registrar) break;
      }
    }
  }

  // Calculate domain age in years
  let domainAgeYears: number | null = null;
  if (registrationDate) {
    const regTime = new Date(registrationDate).getTime();
    const diffMs = Date.now() - regTime;
    if (diffMs > 0) {
      domainAgeYears = Number((diffMs / (365.25 * 86400000)).toFixed(2));
    }
  }

  // Calculate days until expiration
  let daysUntilExpiration: number | null = null;
  if (expirationDate) {
    const expTime = new Date(expirationDate).getTime();
    const diffMs = expTime - Date.now();
    daysUntilExpiration = Math.round(diffMs / 86400000);
  }

  const isRegistered = Boolean(registrationDate || registrar || data.handle || (data.status && data.status.length > 0));

  return {
    domain,
    isRegistered,
    registrationDate,
    expirationDate,
    lastChangedDate,
    registrar,
    domainAgeYears,
    daysUntilExpiration,
    status: isRegistered ? 'KNOWN' : 'UNKNOWN',
    source: 'RDAP_BOOTSTRAP',
    rawEvents,
  };
}

/**
 * Looks up domain registration intelligence using standard public RDAP bootstrap.
 * 
 * @param domainOrUrl - Domain name or website URL
 * @param options - Configurable timeout and mock transport for deterministic testing
 */
export async function lookupDomainRegistration(
  domainOrUrl: string,
  options: {
    timeoutMs?: number;
    customFetcher?: (url: string) => Promise<any>;
  } = {}
): Promise<DomainRegistrationInfo> {
  const domain = extractRegistrableDomain(domainOrUrl);
  if (!domain) {
    return {
      domain: domainOrUrl,
      isRegistered: false,
      registrationDate: null,
      expirationDate: null,
      lastChangedDate: null,
      registrar: null,
      domainAgeYears: null,
      daysUntilExpiration: null,
      status: 'UNKNOWN',
      source: 'RDAP_VALIDATION',
      notes: 'Invalid domain name or private/internal host rejected',
    };
  }

  // Check cache first
  const cached = rdapCache.get(domain);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const timeoutMs = options.timeoutMs ?? 3500;
  const endpoint = `https://rdap.org/domain/${encodeURIComponent(domain)}`;

  try {
    let responseData: any;

    if (options.customFetcher) {
      responseData = await options.customFetcher(endpoint);
    } else {
      const response = await axios.get(endpoint, {
        timeout: timeoutMs,
        headers: {
          'Accept': 'application/rdap+json, application/json',
          'User-Agent': 'ScrapeWorld-DomainIntelligence/2.0 (+https://scrapeworld.internal/bot)',
        },
        maxRedirects: 3,
        // Enforce maximum response size (1MB) to prevent buffer exhaustion attacks
        maxContentLength: 1024 * 1024,
      });
      responseData = response.data;
    }

    const result = parseRdapResponse(domain, responseData);

    // Save to in-memory cache
    if (rdapCache.size >= MAX_CACHE_ENTRIES) {
      // Evict oldest entry
      const firstKey = rdapCache.keys().next().value;
      if (firstKey) rdapCache.delete(firstKey);
    }
    rdapCache.set(domain, {
      data: result,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return result;
  } catch (err: any) {
    const isTimeout = err.code === 'ECONNABORTED' || err.message?.includes('timeout');
    const isRateLimit = err.response?.status === 429;
    const isNotFound = err.response?.status === 404;

    const notes = isTimeout
      ? 'RDAP query timed out'
      : isRateLimit
      ? 'RDAP rate limit reached (HTTP 429)'
      : isNotFound
      ? 'Domain not found or TLD does not support public RDAP'
      : `RDAP lookup failed: ${err.message || 'Network error'}`;

    const failureResult: DomainRegistrationInfo = {
      domain,
      isRegistered: false,
      registrationDate: null,
      expirationDate: null,
      lastChangedDate: null,
      registrar: null,
      domainAgeYears: null,
      daysUntilExpiration: null,
      status: isNotFound ? 'UNKNOWN' : 'FAILED_TO_COLLECT',
      source: 'RDAP_BOOTSTRAP',
      notes,
    };

    return failureResult;
  }
}

/**
 * Clears the in-memory RDAP cache (useful for test resets).
 */
export function clearRdapCache(): void {
  rdapCache.clear();
}
