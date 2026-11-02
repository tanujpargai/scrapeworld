/**
 * DeduplicationService
 * 
 * Provides robust multi-identifier deduplication across scraped businesses.
 * Prevents identical businesses from appearing multiple times without
 * accidentally merging unrelated businesses that share similar names.
 * 
 * Identifiers prioritized:
 * 1. Google Place ID (exact external ID)
 * 2. Normalized Phone (standardized digits)
 * 3. Normalized Domain (hostname without www or protocol)
 * 4. Normalized Email (case-insensitive)
 * 5. Composite Normalized Name + Location (city/address)
 */

export class DeduplicationService {
  /**
   * Normalizes a phone number to digits-only for comparison.
   */
  static normalizePhone(phone: any): string | null {
    if (!phone || typeof phone !== 'string') return null;
    const digits = phone.replace(/\D/g, '');
    // Ignore invalid or too short phone numbers
    if (digits.length < 7) return null;
    // Strip leading 1 if 11 digits (US country code)
    if (digits.length === 11 && digits.startsWith('1')) {
      return digits.substring(1);
    }
    return digits;
  }

  /**
   * Extracts clean domain from URL.
   */
  static normalizeDomain(website: any): string | null {
    if (!website || typeof website !== 'string') return null;
    const trimmed = website.trim().toLowerCase();
    if (!trimmed) return null;

    try {
      const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
      const url = new URL(withProto);
      const host = url.hostname.replace(/^www\./i, '');
      return host.length > 3 && host.includes('.') ? host : null;
    } catch {
      // Fallback regex extraction
      const match = trimmed.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0];
      return match.includes('.') ? match : null;
    }
  }

  /**
   * Cleans business name for fuzzy composite matching.
   */
  static normalizeName(name: any): string {
    if (!name || typeof name !== 'string') return '';
    return name
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/\b(inc|incorporated|llc|corp|corporation|ltd|limited|co|company)\b/gi, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  /**
   * Checks whether two business entities represent the same company.
   */
  static areDuplicates(a: any, b: any): boolean {
    if (!a || !b) return false;

    // 1. Google Place ID match
    const placeA = a.googlePlaceId || a.placeId;
    const placeB = b.googlePlaceId || b.placeId;
    if (placeA && placeB && placeA === placeB) {
      return true;
    }

    // 2. Phone match
    const phoneA = this.normalizePhone(a.phone || a.contact?.phone);
    const phoneB = this.normalizePhone(b.phone || b.contact?.phone);
    if (phoneA && phoneB && phoneA === phoneB) {
      return true;
    }

    // 3. Website Domain match
    const domainA = this.normalizeDomain(a.website || a.verifiedWebsite);
    const domainB = this.normalizeDomain(b.website || b.verifiedWebsite);
    if (domainA && domainB && domainA === domainB) {
      return true;
    }

    // 4. Email match
    const emailA = (a.email || a.contact?.email || '').trim().toLowerCase();
    const emailB = (b.email || b.contact?.email || '').trim().toLowerCase();
    if (emailA && emailB && emailA === emailB && emailA.includes('@')) {
      return true;
    }

    // 5. Composite Name + City match (Both must match to avoid false positive collisions)
    const nameA = this.normalizeName(a.name || a.businessName);
    const nameB = this.normalizeName(b.name || b.businessName);
    const cityA = (a.city || a.contact?.city || '').toLowerCase().trim();
    const cityB = (b.city || b.contact?.city || '').toLowerCase().trim();

    if (nameA && nameB && nameA === nameB && cityA && cityB && cityA === cityB) {
      return true;
    }

    return false;
  }

  /**
   * Deduplicates an array of items (businesses, leads, results).
   * Preserves the richest / highest scoring record when duplicates occur.
   */
  static deduplicateBatch<T>(
    items: T[],
    getBusiness: (item: T) => any = (item: any) => item
  ): { unique: T[]; duplicatesRemoved: number } {
    if (!Array.isArray(items) || items.length <= 1) {
      return { unique: items || [], duplicatesRemoved: 0 };
    }

    const uniqueList: T[] = [];
    const seenPlaceIds = new Set<string>();
    const seenPhones = new Set<string>();
    const seenDomains = new Set<string>();
    const seenEmails = new Set<string>();
    const seenNameCity = new Set<string>();

    let duplicatesRemoved = 0;

    for (const item of items) {
      const biz = getBusiness(item) || {};

      const placeId = biz.googlePlaceId || biz.placeId;
      const phone = this.normalizePhone(biz.phone || biz.contact?.phone);
      const domain = this.normalizeDomain(biz.website || biz.verifiedWebsite);
      const email = (biz.email || biz.contact?.email || '').trim().toLowerCase();
      const normName = this.normalizeName(biz.name || biz.businessName);
      const normCity = (biz.city || biz.contact?.city || '').toLowerCase().trim();
      const nameCityKey = normName && normCity ? `${normName}__${normCity}` : null;

      let isDuplicate = false;

      if (placeId && seenPlaceIds.has(placeId)) isDuplicate = true;
      else if (phone && seenPhones.has(phone)) isDuplicate = true;
      else if (domain && seenDomains.has(domain)) isDuplicate = true;
      else if (email && email.includes('@') && seenEmails.has(email)) isDuplicate = true;
      else if (nameCityKey && seenNameCity.has(nameCityKey)) isDuplicate = true;

      if (isDuplicate) {
        duplicatesRemoved++;
        // Find existing match in uniqueList to preserve richer data
        const existingIndex = uniqueList.findIndex((u) => {
          const uBiz = getBusiness(u) || {};
          return this.areDuplicates(uBiz, biz);
        });

        if (existingIndex !== -1) {
          const existingItem = uniqueList[existingIndex] as any;
          const newItem = item as any;
          const merged = { ...existingItem };
          for (const [k, v] of Object.entries(newItem)) {
            if (v !== undefined && v !== null && v !== '' && (merged[k] === undefined || merged[k] === null || merged[k] === '')) {
              merged[k] = v;
            }
          }
          if (newItem.rating && (!merged.rating || newItem.rating > merged.rating)) merged.rating = newItem.rating;
          if (newItem.reviewCount && (!merged.reviewCount || newItem.reviewCount > merged.reviewCount)) merged.reviewCount = newItem.reviewCount;
          if (newItem.website && !merged.website) merged.website = newItem.website;
          uniqueList[existingIndex] = merged;
        }
        continue;
      }

      // Mark identifiers as seen
      if (placeId) seenPlaceIds.add(placeId);
      if (phone) seenPhones.add(phone);
      if (domain) seenDomains.add(domain);
      if (email && email.includes('@')) seenEmails.add(email);
      if (nameCityKey) seenNameCity.add(nameCityKey);

      uniqueList.push(item);
    }

    return { unique: uniqueList, duplicatesRemoved };
  }
}

export const deduplicationService = DeduplicationService;
