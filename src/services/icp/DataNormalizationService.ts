/**
 * DataNormalizationService
 * 
 * Normalizes scraped business data from various sources (Google Maps,
 * Playwright browser state, Cheerio DOM, or DB entities) into a uniform,
 * type-safe structure ready for ICP evaluation and filtering.
 * 
 * In Phase 5, expands the data model with actionable sales opportunity signals
 * for Web Development and Digital Marketing agencies, maintaining explicit
 * provenance (KNOWN / INFERRED / UNKNOWN, source, confidence, timestamp)
 * without fabricating missing attributes.
 */

import * as cheerio from 'cheerio';
import { detectTechnologies, type DetectedTechnology } from '@/lib/tech-detector';
import { extractRegistrableDomain } from '@/lib/rdap-client';
import type { SignalRecord, SignalStatus, DataConflict } from '@/types/icp';

export interface NormalizedBusiness {
  // ── CORE IDENTITY & GEOGRAPHY ──
  id?: string;
  name: string;
  slug?: string;
  industry: string;
  categories: string[];
  website: string | null;
  hasWebsite: boolean;
  verifiedWebsite: string | null;
  phone: string | null;
  hasPhone: boolean;
  email?: string | null;
  hasEmail: boolean;
  rating: number | null;
  reviewCount: number;
  city: string | null;
  state: string | null;
  country: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  ownerName: string | null;
  hasOwner: boolean;
  businessAge?: number;
  websiteQuality?: number;
  googlePlaceId?: string | null;

  // ── LEGACY WEBSITE DATA COMPATIBILITY ──
  websiteData: {
    overallScore?: number;
    performanceScore?: number;
    seoScore?: number;
    mobileScore?: number;
    cms?: string | null;
    hasSsl?: boolean;
    sslEnabled?: boolean;
    loadTimeMs?: number;
    issues?: any[];
  } | null;

  // ── SOCIAL PROFILES & OPPORTUNITIES ──
  socialProfiles: Array<{ platform: string; url?: string }>;
  socialProfilesCount: number;
  opportunities?: any[];
  opportunitiesCount: number;
  sourceKeywords?: string[];
  sourceLocations?: string[];
  raw?: any;

  // ── PHASE 5 EXPANDED SIGNALS: BUSINESS ──
  businessStatus: string;
  hasMultipleLocations: boolean;
  foundedYear: number | null;
  employeeCount: number | null;
  growthIndicator: 'HIGH_VELOCITY' | 'STEADY' | 'STAGNANT' | 'UNKNOWN';

  // ── PHASE 5 EXPANDED SIGNALS: WEBSITE ──
  isHttps: boolean;
  hasSsl: boolean;
  cms: string | null;
  detectedTechnologies: string[];
  mobileResponsive: boolean;
  hasMetaTitle: boolean;
  hasMetaDescription: boolean;
  h1Count: number;
  hasContactForm: boolean;
  hasWhatsApp: boolean;
  hasCta: boolean;
  hasAnalytics: boolean;
  hasMetaPixel: boolean;
  hasBrokenLinks: boolean;
  loadTimeMs?: number | null;
  performanceScore?: number | null;
  seoScore?: number | null;
  lastUpdatedYear: number | null;
  websiteAgeYears: number | null;

  // ── PHASE 2 BUSINESS INTELLIGENCE SIGNALS ──
  domainData?: {
    domain: string | null;
    isRegistered: boolean;
    registrationDate: string | null;
    expirationDate: string | null;
    lastChangedDate: string | null;
    registrar: string | null;
    domainAgeYears: number | null;
    daysUntilExpiration: number | null;
  } | null;

  tlsData?: {
    httpsConfigured: boolean;
    isValid: boolean;
    issuer: string | null;
    subject: string | null;
    validFrom: string | null;
    validTo: string | null;
    daysUntilExpiration: number | null;
    protocol: string | null;
    cipher: string | null;
    authorizationError: string | null;
  } | null;

  technicalData?: {
    ttfbMs: number | null;
    htmlSizeBytes: number | null;
    contentType: string | null;
    redirectCount: number;
    finalUrl: string | null;
    hasOpenGraph: boolean;
    openGraphCompleteness: number;
    hasSchemaOrg: boolean;
    schemaTypes: string[];
    isEcommerce: boolean;
    ecommercePlatform: string | null;
    contactPageUrl: string | null;
  } | null;

  detailedTechnologies?: DetectedTechnology[];

  // ── PHASE 5 EXPANDED SIGNALS: MARKETING ──
  hasGoogleMapsPresence: boolean;
  reviewActivityTier: 'HIGH' | 'MODERATE' | 'LOW' | 'INACTIVE';
  socialPlatformCount: number;
  hasInstagram: boolean;
  hasFacebook: boolean;
  hasLinkedIn: boolean;
  hasTwitter: boolean;
  hasYouTube: boolean;
  socialActivityAvailable: boolean;

  // ── GROUPED SIGNALS FOR NAMESPACED ACCESS ──
  signals: {
    business: {
      status: string;
      hasMultipleLocations: boolean;
      foundedYear: number | null;
      employeeCount: number | null;
      growthIndicator: string;
    };
    website: {
      hasWebsite: boolean;
      isHttps: boolean;
      cms: string | null;
      detectedTechnologies: string[];
      mobileResponsive: boolean;
      hasMetaTitle: boolean;
      hasMetaDescription: boolean;
      h1Count: number;
      hasContactForm: boolean;
      hasWhatsApp: boolean;
      hasCta: boolean;
      hasAnalytics: boolean;
      hasMetaPixel: boolean;
      hasBrokenLinks: boolean;
      qualityScore?: number;
      lastUpdatedYear: number | null;
      websiteAgeYears: number | null;
      domainAgeYears?: number | null;
      isTlsValid?: boolean;
      tlsIssuer?: string | null;
      isEcommerce?: boolean;
      ecommercePlatform?: string | null;
      hasOpenGraph?: boolean;
      hasSchemaOrg?: boolean;
      ttfbMs?: number | null;
      htmlSizeBytes?: number | null;
    };
    marketing: {
      hasGoogleMapsPresence: boolean;
      rating: number | null;
      reviewCount: number;
      reviewActivityTier: string;
      socialPlatformCount: number;
      hasInstagram: boolean;
      hasFacebook: boolean;
      hasLinkedIn: boolean;
      hasTwitter: boolean;
      hasYouTube: boolean;
    };
  };

  // ── PROVENANCE AUDIT LOG ──
  provenance: Record<string, SignalRecord>;

  // ── DATA INTEGRITY & CONFLICT AUDIT ──
  conflicts?: DataConflict[];
}

export class DataNormalizationService {
  /**
   * Helper to construct a typed SignalRecord with source, status, and confidence.
   */
  static createSignal<T>(
    value: T,
    status: SignalStatus,
    source: string,
    confidence: number,
    notes?: string
  ): SignalRecord<T> {
    return {
      value,
      status,
      source,
      confidence: Math.max(0, Math.min(1, confidence)),
      timestamp: new Date().toISOString(),
      ...(notes ? { notes } : {}),
    };
  }

  /**
   * Extracts actionable signals from raw HTML markup using Cheerio and tech detection.
   */
  static extractHtmlSignals(html: string): {
    hasMetaTitle: boolean;
    hasMetaDescription: boolean;
    h1Count: number;
    mobileResponsive: boolean;
    hasContactForm: boolean;
    hasWhatsApp: boolean;
    hasCta: boolean;
    hasBrokenLinks: boolean;
    technologies: string[];
    cms: string | null;
    detailedTechnologies: DetectedTechnology[];
    hasAnalytics: boolean;
    hasMetaPixel: boolean;
    lastUpdatedYear: number | null;
    copyrightStartYear: number | null;
    detectedSocials: Array<{ platform: string; url: string }>;
    isEcommerce: boolean;
    ecommercePlatform: string | null;
    hasOpenGraph: boolean;
    openGraphCompleteness: number;
    hasSchemaOrg: boolean;
    schemaTypes: string[];
    contactPageUrl: string | null;
  } {
    const $ = cheerio.load(html);

    // 1. SEO & Viewport Meta Tags
    const title = $('title').text().trim() || $('meta[property="og:title"]').attr('content')?.trim() || '';
    const hasMetaTitle = title.length > 0;

    const metaDescription = $('meta[name="description"]').attr('content')?.trim() || 
                           $('meta[property="og:description"]').attr('content')?.trim() || '';
    const hasMetaDescription = metaDescription.length > 0;

    const h1Count = $('h1').length;
    const mobileResponsive = $('meta[name="viewport"]').length > 0;

    // 2. Contact Form Detection
    let hasContactForm = false;
    $('form').each((_, el) => {
      const action = $(el).attr('action')?.toLowerCase() || '';
      const id = $(el).attr('id')?.toLowerCase() || '';
      const className = $(el).attr('class')?.toLowerCase() || '';
      const hasInputs = $(el).find('input[type="email"], input[type="tel"], textarea').length > 0;
      if (
        action.includes('contact') || action.includes('lead') || action.includes('submit') || action.includes('message') ||
        id.includes('contact') || className.includes('contact') || className.includes('form-contact') || hasInputs
      ) {
        hasContactForm = true;
      }
    });

    if (!hasContactForm) {
      $('a').each((_, el) => {
        const href = $(el).attr('href')?.toLowerCase() || '';
        const text = $(el).text().toLowerCase();
        if (
          (href.includes('#contact') || href.includes('/contact') || href.includes('contact-us')) &&
          (text.includes('contact') || text.includes('get in touch') || text.includes('form'))
        ) {
          hasContactForm = true;
        }
      });
    }

    // 3. WhatsApp Integration
    let hasWhatsApp = false;
    $('a').each((_, el) => {
      const href = $(el).attr('href')?.toLowerCase() || '';
      if (href.includes('wa.me') || href.includes('api.whatsapp.com') || href.includes('whatsapp://')) {
        hasWhatsApp = true;
      }
    });

    // 4. CTA (Call To Action) Presence
    const ctaRegex = /(book\s+(now|online|an?\s+appointment)|schedule(\s+a?\s+call|\s+appointment)?|get\s+a?\s+free\s+quote|get\s+a\s+quote|free\s+consultation|contact\s+us|order\s+online|request\s+a\s+quote|get\s+started|call\s+now|claim\s+offer|buy\s+now|reserve\s+a?\s+table)/i;
    let hasCta = false;
    $('button, a.btn, a.button, a[role="button"], input[type="submit"]').each((_, el) => {
      const text = $(el).text().trim() || $(el).attr('value') || '';
      if (ctaRegex.test(text)) {
        hasCta = true;
      }
    });

    if (!hasCta) {
      $('a').each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 0 && text.length < 35 && ctaRegex.test(text)) {
          hasCta = true;
        }
      });
    }

    // 5. Broken / Placeholder Links
    let brokenLinkCount = 0;
    $('a').each((_, el) => {
      const href = $(el).attr('href')?.trim();
      if (href === '#' || href === '' || href?.startsWith('javascript:void(0)')) {
        brokenLinkCount++;
      }
    });
    const hasBrokenLinks = brokenLinkCount >= 2;

    // 6. Technology & CMS Detection
    const techResult = detectTechnologies(html);
    const { technologies, cms, detailedTechnologies, ecommerce, openGraph, schemaOrg } = techResult;
    const hasAnalytics = technologies.includes('Google Analytics') || 
                         technologies.includes('GTM') || 
                         technologies.includes('Meta Pixel');
    const hasMetaPixel = technologies.includes('Meta Pixel');

    // 7. Copyright & Website Age Indicators
    const bodyText = $('body').text();
    let lastUpdatedYear: number | null = null;
    let copyrightStartYear: number | null = null;

    const copyrightMatch = bodyText.match(/(?:©|&copy;|copyright|all\s+rights\s+reserved)\s*(?:(?:19|20)\d{2}\s*[-–]\s*)?((?:19|20)\d{2})/i);
    if (copyrightMatch && copyrightMatch[1]) {
      const yr = parseInt(copyrightMatch[1], 10);
      const currentYear = new Date().getFullYear();
      if (yr >= 1995 && yr <= currentYear + 1) {
        lastUpdatedYear = yr;
      }
    }

    const rangeMatch = bodyText.match(/(?:©|&copy;|copyright)\s*((?:19|20)\d{2})\s*[-–]\s*(?:(?:19|20)\d{2})/i);
    if (rangeMatch && rangeMatch[1]) {
      const yr = parseInt(rangeMatch[1], 10);
      if (yr >= 1990 && yr <= new Date().getFullYear()) {
        copyrightStartYear = yr;
      }
    }

    // 8. Social Profile Links
    const detectedSocials: Array<{ platform: string; url: string }> = [];
    $('a').each((_, el) => {
      const href = $(el).attr('href') || '';
      const lower = href.toLowerCase();
      if (lower.includes('instagram.com/')) {
        detectedSocials.push({ platform: 'INSTAGRAM', url: href });
      } else if (lower.includes('facebook.com/')) {
        detectedSocials.push({ platform: 'FACEBOOK', url: href });
      } else if (lower.includes('linkedin.com/')) {
        detectedSocials.push({ platform: 'LINKEDIN', url: href });
      } else if (lower.includes('twitter.com/') || lower.includes('x.com/')) {
        detectedSocials.push({ platform: 'TWITTER', url: href });
      } else if (lower.includes('youtube.com/')) {
        detectedSocials.push({ platform: 'YOUTUBE', url: href });
      }
    });

    // 9. Public Contact Page Discovery
    let contactPageUrl: string | null = null;
    $('a').each((_, el) => {
      if (contactPageUrl) return;
      const href = $(el).attr('href')?.trim();
      const text = $(el).text().toLowerCase().trim();
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      if (
        href.includes('/contact') || href.includes('/about') || href.includes('/reach-us') ||
        text === 'contact' || text === 'contact us' || text === 'about us'
      ) {
        contactPageUrl = href;
      }
    });

    return {
      hasMetaTitle,
      hasMetaDescription,
      h1Count,
      mobileResponsive,
      hasContactForm,
      hasWhatsApp,
      hasCta,
      hasBrokenLinks,
      technologies,
      cms,
      detailedTechnologies,
      hasAnalytics,
      hasMetaPixel,
      lastUpdatedYear,
      copyrightStartYear,
      detectedSocials,
      isEcommerce: ecommerce.isEcommerce,
      ecommercePlatform: ecommerce.platform,
      hasOpenGraph: openGraph.hasOpenGraph,
      openGraphCompleteness: openGraph.completeness,
      hasSchemaOrg: schemaOrg.hasSchemaOrg,
      schemaTypes: schemaOrg.types,
      contactPageUrl,
    };
  }

  /**
   * Normalizes raw or database business objects into standard format with full provenance.
   */
  static normalize(input: any, fallbackId?: string): NormalizedBusiness {
    const provenance: Record<string, SignalRecord> = {};

    if (!input || typeof input !== 'object') {
      const defaultRecord = <T>(val: T, status: SignalStatus, source: string, conf: number) =>
        this.createSignal(val, status, source, conf);

      provenance['name'] = defaultRecord('Unknown Business', 'UNKNOWN', 'INPUT_EMPTY', 0.0);
      provenance['industry'] = defaultRecord('Unknown', 'UNKNOWN', 'INPUT_EMPTY', 0.0);
      provenance['hasWebsite'] = defaultRecord(false, 'KNOWN', 'INPUT_EMPTY', 1.0);
      provenance['isHttps'] = defaultRecord(false, 'KNOWN', 'INPUT_EMPTY', 1.0);
      provenance['hasPhone'] = defaultRecord(false, 'KNOWN', 'INPUT_EMPTY', 1.0);
      provenance['reviewCount'] = defaultRecord(0, 'KNOWN', 'INPUT_EMPTY', 1.0);
      provenance['employeeCount'] = defaultRecord(null, 'UNKNOWN', 'UNAVAILABLE', 0.0);
      provenance['foundedYear'] = defaultRecord(null, 'UNKNOWN', 'UNAVAILABLE', 0.0);

      return {
        name: 'Unknown Business',
        industry: 'Unknown',
        categories: [],
        website: null,
        hasWebsite: false,
        verifiedWebsite: null,
        phone: null,
        hasPhone: false,
        email: null,
        hasEmail: false,
        rating: 0,
        reviewCount: 0,
        city: null,
        state: null,
        country: null,
        address: null,
        latitude: null,
        longitude: null,
        ownerName: null,
        hasOwner: false,
        businessStatus: 'UNKNOWN',
        hasMultipleLocations: false,
        foundedYear: null,
        employeeCount: null,
        growthIndicator: 'UNKNOWN',
        isHttps: false,
        hasSsl: false,
        cms: null,
        detectedTechnologies: [],
        mobileResponsive: false,
        hasMetaTitle: false,
        hasMetaDescription: false,
        h1Count: 0,
        hasContactForm: false,
        hasWhatsApp: false,
        hasCta: false,
        hasAnalytics: false,
        hasMetaPixel: false,
        hasBrokenLinks: false,
        lastUpdatedYear: null,
        websiteAgeYears: null,
        hasGoogleMapsPresence: false,
        reviewActivityTier: 'INACTIVE',
        socialPlatformCount: 0,
        hasInstagram: false,
        hasFacebook: false,
        hasLinkedIn: false,
        hasTwitter: false,
        hasYouTube: false,
        socialActivityAvailable: false,
        websiteData: null,
        socialProfiles: [],
        socialProfilesCount: 0,
        opportunities: [],
        opportunitiesCount: 0,
        sourceKeywords: [],
        sourceLocations: [],
        domainData: null,
        tlsData: null,
        technicalData: null,
        detailedTechnologies: [],
        signals: {
          business: { status: 'UNKNOWN', hasMultipleLocations: false, foundedYear: null, employeeCount: null, growthIndicator: 'UNKNOWN' },
          website: {
            hasWebsite: false,
            isHttps: false,
            cms: null,
            detectedTechnologies: [],
            mobileResponsive: false,
            hasMetaTitle: false,
            hasMetaDescription: false,
            h1Count: 0,
            hasContactForm: false,
            hasWhatsApp: false,
            hasCta: false,
            hasAnalytics: false,
            hasMetaPixel: false,
            hasBrokenLinks: false,
            lastUpdatedYear: null,
            websiteAgeYears: null,
            domainAgeYears: null,
            isTlsValid: false,
            tlsIssuer: null,
            isEcommerce: false,
            ecommercePlatform: null,
            hasOpenGraph: false,
            hasSchemaOrg: false,
            ttfbMs: null,
            htmlSizeBytes: null,
          },
          marketing: { hasGoogleMapsPresence: false, rating: 0, reviewCount: 0, reviewActivityTier: 'INACTIVE', socialPlatformCount: 0, hasInstagram: false, hasFacebook: false, hasLinkedIn: false, hasTwitter: false, hasYouTube: false },
        },
        provenance,
      };
    }

    // ── 1. BUSINESS PROFILE SIGNALS ──
    const rawName = input.name || input.title || input.businessName || 'Unnamed Business';
    const name = String(rawName).trim();
    provenance['name'] = this.createSignal(name, 'KNOWN', input.source || 'INPUT', 1.0);

    let industry = 'Unknown';
    let categories: string[] = [];
    if (Array.isArray(input.categories) && input.categories.length > 0) {
      categories = input.categories.map((c: any) => String(c).trim()).filter(Boolean);
      industry = categories[0] || 'Unknown';
    } else if (input.industry) {
      industry = String(input.industry).trim();
      categories = [industry];
    } else if (input.category || input.categoryName || input.primaryCategory) {
      industry = String(input.category || input.categoryName || input.primaryCategory).trim();
      categories = [industry];
    }
    provenance['industry'] = this.createSignal(industry, 'KNOWN', 'GOOGLE_MAPS_CATEGORIES', 1.0);
    provenance['categories'] = this.createSignal(categories, 'KNOWN', 'GOOGLE_MAPS_CATEGORIES', 1.0);

    const address = input.address ? String(input.address).trim() : null;
    const city = input.city ? String(input.city).trim() : null;
    const state = input.state ? String(input.state).trim() : null;
    const country = input.country ? String(input.country).trim() : null;
    const latitude = typeof input.latitude === 'number' ? input.latitude : null;
    const longitude = typeof input.longitude === 'number' ? input.longitude : null;
    const googlePlaceId = input.googlePlaceId || input.placeId || null;

    if (address) provenance['address'] = this.createSignal(address, 'KNOWN', 'GOOGLE_MAPS', 1.0);
    if (city) provenance['city'] = this.createSignal(city, 'KNOWN', 'GOOGLE_MAPS', 1.0);

    // Business Status
    const rawStatus = input.status || input.businessStatus || null;
    let businessStatus = 'UNKNOWN';
    if (typeof rawStatus === 'string' && rawStatus.trim().length > 0) {
      businessStatus = rawStatus.trim().toUpperCase();
      provenance['businessStatus'] = this.createSignal(businessStatus, 'KNOWN', 'BUSINESS_PROFILE', 1.0);
    } else if (googlePlaceId || (input.rating !== undefined && input.rating !== null)) {
      businessStatus = 'OPERATIONAL';
      provenance['businessStatus'] = this.createSignal('OPERATIONAL', 'INFERRED', 'GOOGLE_MAPS_ACTIVE_LISTING', 0.85);
    } else {
      provenance['businessStatus'] = this.createSignal('UNKNOWN', 'UNKNOWN', 'UNAVAILABLE', 0.0);
    }

    // Number of locations indicator
    const hasMultipleLocations = Boolean(
      input.hasMultipleLocations ||
      input.isChain ||
      (address && /(suite|unit|bldg|ste|floor|fl|location\s+\d|branch)/i.test(address)) ||
      (Array.isArray(input.locations) && input.locations.length > 1)
    );
    provenance['hasMultipleLocations'] = this.createSignal(
      hasMultipleLocations,
      input.hasMultipleLocations !== undefined ? 'KNOWN' : 'INFERRED',
      'ADDRESS_HEURISTIC',
      hasMultipleLocations ? 0.75 : 0.6
    );

    // Decision Maker
    const ownerName = input.ownerName ? String(input.ownerName).trim() : null;
    const hasOwner = Boolean(ownerName && ownerName.length > 2);
    provenance['ownerName'] = this.createSignal(ownerName, hasOwner ? 'KNOWN' : 'UNKNOWN', 'CONTACT_DISCOVERY', hasOwner ? 0.9 : 0.0);
    provenance['hasOwner'] = this.createSignal(hasOwner, 'KNOWN', 'CONTACT_DISCOVERY', 1.0);

    // Contact Information
    let phone: string | null = null;
    if (input.phone) phone = String(input.phone).trim();
    else if (input.phoneNumber) phone = String(input.phoneNumber).trim();
    const hasPhone = Boolean(phone && phone.length >= 7);
    provenance['phone'] = this.createSignal(phone, hasPhone ? 'KNOWN' : 'UNKNOWN', 'BUSINESS_RECORD', hasPhone ? 1.0 : 0.0);
    provenance['hasPhone'] = this.createSignal(hasPhone, 'KNOWN', 'BUSINESS_RECORD', 1.0);

    const email = input.email ? String(input.email).trim() : null;
    const hasEmail = Boolean(email && email.includes('@'));
    provenance['email'] = this.createSignal(email, hasEmail ? 'KNOWN' : 'UNKNOWN', 'BUSINESS_RECORD', hasEmail ? 1.0 : 0.0);
    provenance['hasEmail'] = this.createSignal(hasEmail, 'KNOWN', 'BUSINESS_RECORD', 1.0);

    // ── 2. WEBSITE & AUDIT SIGNALS ──
    let rawWebsite = input.website || input.verifiedWebsite || input.url || null;
    if (typeof rawWebsite === 'string') {
      rawWebsite = rawWebsite.trim();
      if (rawWebsite.includes('/url?q=')) {
        const matches = rawWebsite.match(/\/url\?q=([^&]+)/);
        if (matches && matches[1]) {
          try { rawWebsite = decodeURIComponent(matches[1]); } catch {}
        }
      }
      if (rawWebsite === '' || rawWebsite === 'about:blank') {
        rawWebsite = null;
      }
    } else {
      rawWebsite = null;
    }
    const hasWebsite = Boolean(rawWebsite);
    provenance['hasWebsite'] = this.createSignal(hasWebsite, 'KNOWN', 'URL_PARSER', 1.0);
    provenance['website'] = this.createSignal(rawWebsite, hasWebsite ? 'KNOWN' : 'UNKNOWN', 'URL_PARSER', hasWebsite ? 1.0 : 0.0);

    // Inspect HTML markup if provided
    const rawHtml = typeof input.html === 'string' ? input.html : 
                    typeof input.rawHtml === 'string' ? input.rawHtml : 
                    typeof input.bodyHtml === 'string' ? input.bodyHtml : null;
    const htmlSignals = rawHtml ? this.extractHtmlSignals(rawHtml) : null;

    // Audit normalization
    const auditObj = (input.websiteData && typeof input.websiteData === 'object')
      ? input.websiteData
      : (input.audit && typeof input.audit === 'object')
      ? input.audit
      : null;

    let isHttps = false;
    if (typeof input.isHttps === 'boolean') {
      isHttps = input.isHttps;
    } else if (typeof input.hasSsl === 'boolean') {
      isHttps = input.hasSsl;
    } else if (hasWebsite && rawWebsite) {
      if (rawWebsite.toLowerCase().startsWith('https://')) {
        isHttps = true;
      } else if (auditObj?.hasSsl !== undefined) {
        isHttps = Boolean(auditObj.hasSsl);
      } else if (auditObj?.sslEnabled !== undefined) {
        isHttps = Boolean(auditObj.sslEnabled);
      }
    }
    provenance['isHttps'] = this.createSignal(
      isHttps,
      hasWebsite ? 'KNOWN' : 'UNKNOWN',
      hasWebsite ? 'TLS_HANDSHAKE' : 'NO_WEBSITE',
      hasWebsite ? 1.0 : 0.0
    );
    const hasSsl = isHttps;

    // CMS & Technologies
    let cms: string | null = null;
    let detectedTechnologies: string[] = [];
    if (htmlSignals) {
      cms = htmlSignals.cms;
      detectedTechnologies = htmlSignals.technologies;
    } else if (auditObj?.cms) {
      cms = String(auditObj.cms);
    } else if (input.cms) {
      cms = String(input.cms);
    }
    if (Array.isArray(auditObj?.technologyStack)) {
      detectedTechnologies = Array.from(new Set([...detectedTechnologies, ...auditObj.technologyStack.map(String)]));
    } else if (Array.isArray(input.detectedTechnologies)) {
      detectedTechnologies = Array.from(new Set([...detectedTechnologies, ...input.detectedTechnologies.map(String)]));
    } else if (Array.isArray(input.technologyStack)) {
      detectedTechnologies = Array.from(new Set([...detectedTechnologies, ...input.technologyStack.map(String)]));
    }
    if (cms && !detectedTechnologies.includes(cms)) {
      detectedTechnologies.unshift(cms);
    }

    provenance['cms'] = this.createSignal(
      cms,
      cms ? 'KNOWN' : (hasWebsite ? 'UNKNOWN' : 'KNOWN'),
      'TECH_DETECTOR',
      cms ? 0.95 : 0.0,
      cms ? `Detected CMS: ${cms}` : undefined
    );
    provenance['detectedTechnologies'] = this.createSignal(
      detectedTechnologies,
      'KNOWN',
      'TECH_DETECTOR',
      detectedTechnologies.length > 0 ? 0.95 : (hasWebsite ? 0.5 : 1.0)
    );

    // Mobile Responsiveness
    let mobileResponsive = false;
    if (typeof input.mobileResponsive === 'boolean') {
      mobileResponsive = input.mobileResponsive;
      provenance['mobileResponsive'] = this.createSignal(mobileResponsive, 'KNOWN', 'DIRECT_INPUT', 1.0);
    } else if (htmlSignals) {
      mobileResponsive = htmlSignals.mobileResponsive;
      provenance['mobileResponsive'] = this.createSignal(mobileResponsive, 'KNOWN', 'HTML_VIEWPORT_TAG', 1.0);
    } else if (auditObj?.mobileScore !== undefined) {
      mobileResponsive = auditObj.mobileScore >= 50;
      provenance['mobileResponsive'] = this.createSignal(mobileResponsive, 'INFERRED', 'AUDIT_MOBILE_SCORE', 0.85);
    } else if (!hasWebsite) {
      mobileResponsive = false;
      provenance['mobileResponsive'] = this.createSignal(false, 'KNOWN', 'NO_WEBSITE', 1.0);
    } else {
      mobileResponsive = false;
      provenance['mobileResponsive'] = this.createSignal(false, 'UNKNOWN', 'UNAUDITED', 0.0);
    }

    // SEO Basics
    const hasMetaTitle = typeof input.hasMetaTitle === 'boolean' ? input.hasMetaTitle :
                         htmlSignals ? htmlSignals.hasMetaTitle : 
                         auditObj?.hasMetaTitle !== undefined ? Boolean(auditObj.hasMetaTitle) : 
                         hasWebsite ? true : false;
    provenance['hasMetaTitle'] = this.createSignal(hasMetaTitle, typeof input.hasMetaTitle === 'boolean' || htmlSignals ? 'KNOWN' : 'INFERRED', 'DOM_META', htmlSignals ? 1.0 : 0.7);

    const hasMetaDescription = typeof input.hasMetaDescription === 'boolean' ? input.hasMetaDescription :
                               htmlSignals ? htmlSignals.hasMetaDescription : 
                               auditObj?.hasMetaDescription !== undefined ? Boolean(auditObj.hasMetaDescription) : 
                               false;
    provenance['hasMetaDescription'] = this.createSignal(hasMetaDescription, typeof input.hasMetaDescription === 'boolean' || htmlSignals ? 'KNOWN' : 'INFERRED', 'DOM_META', htmlSignals ? 1.0 : 0.7);

    const h1Count = htmlSignals ? htmlSignals.h1Count : 
                    typeof auditObj?.h1Count === 'number' ? auditObj.h1Count : 0;
    provenance['h1Count'] = this.createSignal(h1Count, htmlSignals ? 'KNOWN' : 'INFERRED', 'DOM_HEADING', htmlSignals ? 1.0 : 0.6);

    // Contact Form
    let hasContactForm = false;
    if (typeof input.hasContactForm === 'boolean') {
      hasContactForm = input.hasContactForm;
      provenance['hasContactForm'] = this.createSignal(hasContactForm, 'KNOWN', 'DIRECT_INPUT', 1.0);
    } else if (htmlSignals) {
      hasContactForm = htmlSignals.hasContactForm;
      provenance['hasContactForm'] = this.createSignal(hasContactForm, 'KNOWN', 'HTML_FORM_SCAN', 0.95);
    } else if (auditObj?.hasContactForm !== undefined) {
      hasContactForm = Boolean(auditObj.hasContactForm);
      provenance['hasContactForm'] = this.createSignal(hasContactForm, 'KNOWN', 'AUDIT_RESULT', 0.95);
    } else {
      hasContactForm = false;
      provenance['hasContactForm'] = this.createSignal(false, hasWebsite ? 'UNKNOWN' : 'KNOWN', 'HTML_UNAUDITED', hasWebsite ? 0.0 : 1.0);
    }

    // WhatsApp Integration
    let hasWhatsApp = false;
    if (typeof input.hasWhatsApp === 'boolean') {
      hasWhatsApp = input.hasWhatsApp;
      provenance['hasWhatsApp'] = this.createSignal(hasWhatsApp, 'KNOWN', 'DIRECT_INPUT', 1.0);
    } else if (htmlSignals) {
      hasWhatsApp = htmlSignals.hasWhatsApp;
      provenance['hasWhatsApp'] = this.createSignal(hasWhatsApp, 'KNOWN', 'HTML_WHATSAPP_LINK', 1.0);
    } else if (auditObj?.hasWhatsApp !== undefined) {
      hasWhatsApp = Boolean(auditObj.hasWhatsApp);
      provenance['hasWhatsApp'] = this.createSignal(hasWhatsApp, 'KNOWN', 'AUDIT_RESULT', 1.0);
    } else {
      hasWhatsApp = false;
      provenance['hasWhatsApp'] = this.createSignal(false, hasWebsite ? 'UNKNOWN' : 'KNOWN', 'HTML_UNAUDITED', hasWebsite ? 0.0 : 1.0);
    }

    // CTA (Call To Action) Presence
    let hasCta = false;
    if (typeof input.hasCta === 'boolean') {
      hasCta = input.hasCta;
      provenance['hasCta'] = this.createSignal(hasCta, 'KNOWN', 'DIRECT_INPUT', 1.0);
    } else if (htmlSignals) {
      hasCta = htmlSignals.hasCta;
      provenance['hasCta'] = this.createSignal(hasCta, 'INFERRED', 'HTML_CTA_HEURISTIC', 0.85);
    } else if (auditObj?.hasCta !== undefined) {
      hasCta = Boolean(auditObj.hasCta);
      provenance['hasCta'] = this.createSignal(hasCta, 'INFERRED', 'AUDIT_CTA_HEURISTIC', 0.85);
    } else {
      hasCta = false;
      provenance['hasCta'] = this.createSignal(false, hasWebsite ? 'UNKNOWN' : 'KNOWN', 'HTML_UNAUDITED', hasWebsite ? 0.0 : 1.0);
    }

    // Analytics & Pixels
    let hasAnalytics = false;
    let hasMetaPixel = false;
    if (typeof input.hasAnalytics === 'boolean') {
      hasAnalytics = input.hasAnalytics;
    } else if (htmlSignals) {
      hasAnalytics = htmlSignals.hasAnalytics;
    } else if (auditObj?.hasAnalytics !== undefined) {
      hasAnalytics = Boolean(auditObj.hasAnalytics);
    } else if (detectedTechnologies.some(t => /analytics|gtm|tag manager/i.test(t))) {
      hasAnalytics = true;
    }

    if (typeof input.hasMetaPixel === 'boolean') {
      hasMetaPixel = input.hasMetaPixel;
    } else if (htmlSignals) {
      hasMetaPixel = htmlSignals.hasMetaPixel;
    } else if (auditObj?.hasMetaPixel !== undefined) {
      hasMetaPixel = Boolean(auditObj.hasMetaPixel);
    } else if (detectedTechnologies.some(t => /pixel|facebook/i.test(t))) {
      hasMetaPixel = true;
    }

    provenance['hasAnalytics'] = this.createSignal(hasAnalytics, typeof input.hasAnalytics === 'boolean' || hasWebsite ? 'KNOWN' : 'KNOWN', 'TECH_DETECTOR', hasWebsite ? 0.95 : 1.0);
    provenance['hasMetaPixel'] = this.createSignal(hasMetaPixel, typeof input.hasMetaPixel === 'boolean' || hasWebsite ? 'KNOWN' : 'KNOWN', 'TECH_DETECTOR', hasWebsite ? 0.95 : 1.0);

    // Broken Links
    const hasBrokenLinks = htmlSignals ? htmlSignals.hasBrokenLinks : Boolean(auditObj?.hasBrokenLinks);
    provenance['hasBrokenLinks'] = this.createSignal(hasBrokenLinks, 'INFERRED', 'HTML_LINK_AUDIT', 0.8);

    // Copyright & Website Age Indicators
    let lastUpdatedYear: number | null = htmlSignals?.lastUpdatedYear || auditObj?.lastUpdatedYear || null;
    let websiteAgeYears: number | null = null;
    if (htmlSignals?.copyrightStartYear) {
      websiteAgeYears = Math.max(0, new Date().getFullYear() - htmlSignals.copyrightStartYear);
    } else if (auditObj?.websiteAgeYears !== undefined) {
      websiteAgeYears = auditObj.websiteAgeYears;
    }
    provenance['lastUpdatedYear'] = this.createSignal(
      lastUpdatedYear,
      lastUpdatedYear ? 'INFERRED' : 'UNKNOWN',
      'HTML_COPYRIGHT_FOOTER',
      lastUpdatedYear ? 0.85 : 0.0
    );
    provenance['websiteAgeYears'] = this.createSignal(
      websiteAgeYears,
      websiteAgeYears !== null ? 'INFERRED' : 'UNKNOWN',
      'HTML_COPYRIGHT_START_YEAR',
      websiteAgeYears !== null ? 0.75 : 0.0
    );

    // Scores & Website Data structure
    let websiteData: NormalizedBusiness['websiteData'] = null;
    if (auditObj) {
      websiteData = {
        overallScore: typeof auditObj.overallScore === 'number' ? auditObj.overallScore : undefined,
        performanceScore: typeof auditObj.performanceScore === 'number' ? auditObj.performanceScore : undefined,
        seoScore: typeof auditObj.seoScore === 'number' ? auditObj.seoScore : undefined,
        mobileScore: typeof auditObj.mobileScore === 'number' ? auditObj.mobileScore : undefined,
        cms: cms || (auditObj.cms ? String(auditObj.cms) : null),
        hasSsl: isHttps,
        sslEnabled: auditObj.sslEnabled !== undefined ? Boolean(auditObj.sslEnabled) : isHttps,
        loadTimeMs: typeof auditObj.loadTimeMs === 'number' ? auditObj.loadTimeMs : undefined,
        issues: Array.isArray(auditObj.issues) ? auditObj.issues : [],
      };
    }

    // Website Quality composite score (0-100)
    let websiteQuality: number | undefined = undefined;
    if (typeof input.websiteQuality === 'number') {
      websiteQuality = input.websiteQuality;
    } else if (websiteData?.overallScore !== undefined) {
      websiteQuality = websiteData.overallScore;
    } else if (websiteData?.performanceScore !== undefined) {
      websiteQuality = websiteData.performanceScore;
    } else if (hasWebsite) {
      // Heuristic quality synthesis from available signals when site exists
      let qualitySum = 40;
      if (isHttps) qualitySum += 15;
      if (mobileResponsive) qualitySum += 15;
      if (hasContactForm) qualitySum += 10;
      if (hasCta) qualitySum += 10;
      if (hasMetaDescription) qualitySum += 10;
      websiteQuality = Math.min(100, qualitySum);
    }
    provenance['websiteQuality'] = this.createSignal(
      websiteQuality,
      'INFERRED',
      'COMPOSITE_QUALITY_HEURISTIC',
      0.85
    );

    // ── 3. MARKETING & REPUTATION SIGNALS ──
    let rating: number | null = null;
    const rawRating = input.rating ?? input.totalScore ?? input.score;
    if (typeof rawRating === 'number' && !isNaN(rawRating)) {
      rating = rawRating;
    } else if (rawRating !== undefined && rawRating !== null) {
      const parsed = parseFloat(String(rawRating));
      if (!isNaN(parsed)) rating = parsed;
    }
    provenance['rating'] = this.createSignal(rating, rating !== null ? 'KNOWN' : 'UNKNOWN', 'GOOGLE_MAPS', rating !== null ? 1.0 : 0.0);

    let reviewCount = 0;
    if (typeof input.reviewCount === 'number' && !isNaN(input.reviewCount)) {
      reviewCount = input.reviewCount;
    } else if (input.reviewsCount !== undefined || input.reviews !== undefined) {
      const parsed = parseInt(String(input.reviewsCount ?? input.reviews), 10);
      if (!isNaN(parsed)) reviewCount = parsed;
    }
    provenance['reviewCount'] = this.createSignal(reviewCount, 'KNOWN', 'GOOGLE_MAPS', 1.0);

    const hasGoogleMapsPresence = Boolean(googlePlaceId || reviewCount > 0 || (rating !== null && rating > 0));
    provenance['hasGoogleMapsPresence'] = this.createSignal(hasGoogleMapsPresence, 'KNOWN', 'GOOGLE_MAPS_LISTING', 1.0);

    // Review Activity Tier
    let reviewActivityTier: 'HIGH' | 'MODERATE' | 'LOW' | 'INACTIVE' = 'INACTIVE';
    if (reviewCount >= 100) reviewActivityTier = 'HIGH';
    else if (reviewCount >= 25) reviewActivityTier = 'MODERATE';
    else if (reviewCount > 0) reviewActivityTier = 'LOW';
    else reviewActivityTier = 'INACTIVE';
    provenance['reviewActivityTier'] = this.createSignal(reviewActivityTier, 'INFERRED', 'REVIEW_VOLUME_TIER', 0.9);

    // Social Profiles
    let socialProfiles: Array<{ platform: string; url?: string }> = [];
    if (Array.isArray(input.socialProfiles)) {
      socialProfiles = input.socialProfiles.map((s: any) => ({
        platform: String(s.platform || 'UNKNOWN').toUpperCase(),
        url: s.url ? String(s.url) : undefined,
      }));
    }
    if (htmlSignals?.detectedSocials) {
      for (const ds of htmlSignals.detectedSocials) {
        if (!socialProfiles.some(sp => sp.platform === ds.platform)) {
          socialProfiles.push(ds);
        }
      }
    }

    const uniquePlatforms = new Set(socialProfiles.map(s => s.platform.toUpperCase()));
    const socialPlatformCount = typeof input.socialPlatformCount === 'number' ? input.socialPlatformCount : uniquePlatforms.size;
    provenance['socialPlatformCount'] = this.createSignal(socialPlatformCount, 'KNOWN', 'SOCIAL_DISCOVERY', 0.95);

    const hasInstagram = uniquePlatforms.has('INSTAGRAM') || Boolean(input.instagram);
    const hasFacebook = uniquePlatforms.has('FACEBOOK') || Boolean(input.facebook);
    const hasLinkedIn = uniquePlatforms.has('LINKEDIN') || Boolean(input.linkedin);
    const hasTwitter = uniquePlatforms.has('TWITTER') || uniquePlatforms.has('X') || Boolean(input.twitter);
    const hasYouTube = uniquePlatforms.has('YOUTUBE') || Boolean(input.youtube);

    provenance['hasInstagram'] = this.createSignal(hasInstagram, 'KNOWN', 'SOCIAL_PROFILES', 0.95);
    provenance['hasFacebook'] = this.createSignal(hasFacebook, 'KNOWN', 'SOCIAL_PROFILES', 0.95);
    provenance['hasLinkedIn'] = this.createSignal(hasLinkedIn, 'KNOWN', 'SOCIAL_PROFILES', 0.95);
    provenance['hasTwitter'] = this.createSignal(hasTwitter, 'KNOWN', 'SOCIAL_PROFILES', 0.95);
    provenance['hasYouTube'] = this.createSignal(hasYouTube, 'KNOWN', 'SOCIAL_PROFILES', 0.95);

    const socialActivityAvailable = Array.isArray(input.socialProfiles) && 
      input.socialProfiles.some((s: any) => s.activityScore !== undefined || s.lastSeenDate !== undefined);
    provenance['socialActivityAvailable'] = this.createSignal(
      socialActivityAvailable,
      socialActivityAvailable ? 'INFERRED' : 'UNKNOWN',
      'SOCIAL_ACTIVITY_METRICS',
      socialActivityAvailable ? 0.8 : 0.0
    );

    // ── 4. STRICT UNKNOWN HANDLING (NO FABRICATION) ──
    // Business Age & Founded Year: Do NOT fabricate. Strictly distinguish
    // legal business founding/incorporation from website creation/domain age.
    let foundedYear: number | null = null;
    let businessAge: number | undefined = undefined;

    if (typeof input.foundedYear === 'number' && input.foundedYear >= 1800 && input.foundedYear <= new Date().getFullYear()) {
      const yr = input.foundedYear;
      foundedYear = yr;
      businessAge = Math.max(0, new Date().getFullYear() - yr);
      provenance['foundedYear'] = this.createSignal(foundedYear, 'KNOWN', 'BUSINESS_PROFILE', 1.0);
      provenance['businessAge'] = this.createSignal(businessAge, 'INFERRED', 'CALCULATED_FROM_FOUNDED', 1.0);
    } else if (typeof input.incorporationYear === 'number' && input.incorporationYear >= 1800 && input.incorporationYear <= new Date().getFullYear()) {
      const yr = input.incorporationYear;
      foundedYear = yr;
      businessAge = Math.max(0, new Date().getFullYear() - yr);
      provenance['foundedYear'] = this.createSignal(foundedYear, 'KNOWN', 'OFFICIAL_REGISTRY', 1.0);
      provenance['businessAge'] = this.createSignal(businessAge, 'INFERRED', 'CALCULATED_FROM_INCORPORATION', 1.0);
    } else if (typeof input.businessAge === 'number') {
      const age = input.businessAge;
      businessAge = age;
      foundedYear = Math.floor(new Date().getFullYear() - age);
      provenance['businessAge'] = this.createSignal(businessAge, 'KNOWN', 'EXPLICIT_INPUT', 1.0);
      provenance['foundedYear'] = this.createSignal(foundedYear, 'INFERRED', 'CALCULATED_FROM_AGE', 0.9);
    } else if (input.foundedDate && !isNaN(new Date(input.foundedDate).getTime())) {
      const fDate = new Date(input.foundedDate);
      const diffMs = Date.now() - fDate.getTime();
      const preciseYears = Number((diffMs / (365.25 * 86400000)).toFixed(2));
      businessAge = Math.max(0, preciseYears);
      foundedYear = fDate.getFullYear();
      provenance['foundedYear'] = this.createSignal(foundedYear, 'KNOWN', 'OFFICIAL_FOUNDED_DATE', 1.0);
      provenance['businessAge'] = this.createSignal(businessAge, 'KNOWN', 'CALCULATED_PRECISE_DATE', 1.0);
    } else if (typeof input.establishedYear === 'number') {
      const estYr = input.establishedYear;
      foundedYear = estYr;
      businessAge = Math.max(0, new Date().getFullYear() - estYr);
      provenance['foundedYear'] = this.createSignal(foundedYear, 'KNOWN', 'BUSINESS_PROFILE', 1.0);
      provenance['businessAge'] = this.createSignal(businessAge, 'INFERRED', 'CALCULATED_FROM_ESTABLISHED', 1.0);
    } else {
      // Unverifiable: Marked UNKNOWN with 0.0 confidence (never fabricated from domain or copyright date)
      provenance['foundedYear'] = this.createSignal(null, 'UNKNOWN', 'UNAVAILABLE', 0.0, 'Business founding year not found in official listing or registry');
      provenance['businessAge'] = this.createSignal(undefined, 'UNKNOWN', 'UNAVAILABLE', 0.0, 'Business age cannot be reliably verified without official incorporation records');
    }

    // Record website copyright/creation independently so domain age is never mistaken for business age
    if (htmlSignals?.copyrightStartYear) {
      provenance['websiteCopyrightStartYear'] = this.createSignal(
        htmlSignals.copyrightStartYear,
        'INFERRED',
        'HTML_COPYRIGHT_META',
        0.8,
        'Reflects website copyright start date, which is distinct from legal business founding'
      );
    }

    // Employee Count: Do NOT fabricate. Only record if explicit.
    let employeeCount: number | null = null;
    if (typeof input.employeeCount === 'number') {
      employeeCount = input.employeeCount;
      provenance['employeeCount'] = this.createSignal(employeeCount, 'KNOWN', 'ENRICHMENT_API', 0.95);
    } else if (typeof input.employees === 'number') {
      employeeCount = input.employees;
      provenance['employeeCount'] = this.createSignal(employeeCount, 'KNOWN', 'ENRICHMENT_API', 0.95);
    } else {
      provenance['employeeCount'] = this.createSignal(
        null,
        'UNKNOWN',
        'UNAVAILABLE',
        0.0,
        'Employee count requires paid third-party enrichment (e.g. Clearbit/Apollo)'
      );
    }

    // Growth Indicator
    let growthIndicator: 'HIGH_VELOCITY' | 'STEADY' | 'STAGNANT' | 'UNKNOWN' = 'UNKNOWN';
    if (reviewCount >= 100 && (rating || 0) >= 4.2) {
      growthIndicator = 'HIGH_VELOCITY';
    } else if (reviewCount >= 20 && (rating || 0) >= 3.8) {
      growthIndicator = 'STEADY';
    } else if (reviewCount > 0) {
      growthIndicator = 'STAGNANT';
    }
    provenance['growthIndicator'] = this.createSignal(
      growthIndicator,
      growthIndicator !== 'UNKNOWN' ? 'INFERRED' : 'UNKNOWN',
      'REVIEW_GROWTH_HEURISTIC',
      growthIndicator !== 'UNKNOWN' ? 0.8 : 0.0
    );

    // ── Phase 2: Domain Registration Intelligence ──
    const registrableDomain = rawWebsite ? extractRegistrableDomain(rawWebsite) : null;
    let domainData: NormalizedBusiness['domainData'] = null;
    if (input.domainData && typeof input.domainData === 'object') {
      domainData = {
        domain: input.domainData.domain || registrableDomain,
        isRegistered: input.domainData.isRegistered ?? Boolean(input.domainData.registrationDate || input.domainData.registrar),
        registrationDate: input.domainData.registrationDate ? String(input.domainData.registrationDate) : null,
        expirationDate: input.domainData.expirationDate ? String(input.domainData.expirationDate) : null,
        lastChangedDate: input.domainData.lastChangedDate ? String(input.domainData.lastChangedDate) : null,
        registrar: input.domainData.registrar ? String(input.domainData.registrar).trim() : null,
        domainAgeYears: typeof input.domainData.domainAgeYears === 'number' ? input.domainData.domainAgeYears : null,
        daysUntilExpiration: typeof input.domainData.daysUntilExpiration === 'number' ? input.domainData.daysUntilExpiration : null,
      };
    } else if (input.domainRegistration && typeof input.domainRegistration === 'object') {
      const dr = input.domainRegistration;
      domainData = {
        domain: dr.domain || registrableDomain,
        isRegistered: dr.isRegistered ?? true,
        registrationDate: dr.registrationDate ? String(dr.registrationDate) : null,
        expirationDate: dr.expirationDate ? String(dr.expirationDate) : null,
        lastChangedDate: dr.lastChangedDate ? String(dr.lastChangedDate) : null,
        registrar: dr.registrar ? String(dr.registrar).trim() : null,
        domainAgeYears: typeof dr.domainAgeYears === 'number' ? dr.domainAgeYears : null,
        daysUntilExpiration: typeof dr.daysUntilExpiration === 'number' ? dr.daysUntilExpiration : null,
      };
    } else if (registrableDomain) {
      domainData = {
        domain: registrableDomain,
        isRegistered: true,
        registrationDate: null,
        expirationDate: null,
        lastChangedDate: null,
        registrar: null,
        domainAgeYears: null,
        daysUntilExpiration: null,
      };
    }

    provenance['domainData.domainAgeYears'] = this.createSignal(
      domainData?.domainAgeYears ?? null,
      domainData?.domainAgeYears !== null && domainData?.domainAgeYears !== undefined ? 'KNOWN' : 'UNKNOWN',
      'RDAP_BOOTSTRAP',
      domainData?.domainAgeYears !== null && domainData?.domainAgeYears !== undefined ? 1.0 : 0.0,
      'Domain registration date and age (independent of business founding year)'
    );
    provenance['domainData.registrar'] = this.createSignal(
      domainData?.registrar ?? null,
      domainData?.registrar ? 'KNOWN' : 'UNKNOWN',
      'RDAP_BOOTSTRAP',
      domainData?.registrar ? 1.0 : 0.0
    );

    // ── Phase 2: TLS Security Inspection ──
    let tlsData: NormalizedBusiness['tlsData'] = null;
    if (input.tlsData && typeof input.tlsData === 'object') {
      tlsData = {
        httpsConfigured: Boolean(input.tlsData.httpsConfigured ?? isHttps),
        isValid: Boolean(input.tlsData.isValid),
        issuer: input.tlsData.issuer ? String(input.tlsData.issuer) : null,
        subject: input.tlsData.subject ? String(input.tlsData.subject) : null,
        validFrom: input.tlsData.validFrom ? String(input.tlsData.validFrom) : null,
        validTo: input.tlsData.validTo ? String(input.tlsData.validTo) : null,
        daysUntilExpiration: typeof input.tlsData.daysUntilExpiration === 'number' ? input.tlsData.daysUntilExpiration : null,
        protocol: input.tlsData.protocol ? String(input.tlsData.protocol) : null,
        cipher: input.tlsData.cipher ? String(input.tlsData.cipher) : null,
        authorizationError: input.tlsData.authorizationError ? String(input.tlsData.authorizationError) : null,
      };
    } else if (input.tls && typeof input.tls === 'object') {
      const t = input.tls;
      tlsData = {
        httpsConfigured: Boolean(t.httpsConfigured ?? isHttps),
        isValid: Boolean(t.isValid),
        issuer: t.issuer ? String(t.issuer) : null,
        subject: t.subject ? String(t.subject) : null,
        validFrom: t.validFrom ? String(t.validFrom) : null,
        validTo: t.validTo ? String(t.validTo) : null,
        daysUntilExpiration: typeof t.daysUntilExpiration === 'number' ? t.daysUntilExpiration : null,
        protocol: t.protocol ? String(t.protocol) : null,
        cipher: t.cipher ? String(t.cipher) : null,
        authorizationError: t.authorizationError ? String(t.authorizationError) : null,
      };
    } else if (hasWebsite) {
      tlsData = {
        httpsConfigured: isHttps,
        isValid: isHttps,
        issuer: null,
        subject: null,
        validFrom: null,
        validTo: null,
        daysUntilExpiration: null,
        protocol: null,
        cipher: null,
        authorizationError: null,
      };
    }

    provenance['tlsData.isValid'] = this.createSignal(
      tlsData?.isValid ?? false,
      tlsData ? 'KNOWN' : 'UNKNOWN',
      'TLS_SOCKET_HANDSHAKE',
      tlsData ? (input.tlsData || input.tls ? 1.0 : 0.7) : 0.0
    );
    if (tlsData?.issuer) {
      provenance['tlsData.issuer'] = this.createSignal(tlsData.issuer, 'KNOWN', 'TLS_SOCKET_HANDSHAKE', 1.0);
    }

    // ── Phase 2: Technical & Architecture Telemetry ──
    const ttfbMs = typeof input.ttfbMs === 'number' ? input.ttfbMs : 
                   (typeof input.technicalData?.ttfbMs === 'number' ? input.technicalData.ttfbMs : 
                   (typeof auditObj?.loadTimeMs === 'number' ? auditObj.loadTimeMs : null));
    const htmlSizeBytes = typeof input.htmlSizeBytes === 'number' ? input.htmlSizeBytes : 
                          (typeof input.technicalData?.htmlSizeBytes === 'number' ? input.technicalData.htmlSizeBytes : 
                          (rawHtml ? Buffer.byteLength(rawHtml, 'utf8') : null));
    const contentType = input.contentType || input.technicalData?.contentType || null;
    const redirectCount = typeof input.redirectCount === 'number' ? input.redirectCount : 
                          (typeof input.technicalData?.redirectCount === 'number' ? input.technicalData.redirectCount : 0);
    const finalUrl = input.finalUrl || input.technicalData?.finalUrl || rawWebsite;
    
    const hasOpenGraph = htmlSignals ? htmlSignals.hasOpenGraph : 
                         (input.hasOpenGraph !== undefined ? Boolean(input.hasOpenGraph) : 
                         (input.technicalData?.hasOpenGraph !== undefined ? Boolean(input.technicalData.hasOpenGraph) : false));
    const openGraphCompleteness = htmlSignals ? htmlSignals.openGraphCompleteness : 
                                  (typeof input.openGraphCompleteness === 'number' ? input.openGraphCompleteness : 
                                  (typeof input.technicalData?.openGraphCompleteness === 'number' ? input.technicalData.openGraphCompleteness : 0));
    const hasSchemaOrg = htmlSignals ? htmlSignals.hasSchemaOrg : 
                         (input.hasSchemaOrg !== undefined ? Boolean(input.hasSchemaOrg) : 
                         (input.technicalData?.hasSchemaOrg !== undefined ? Boolean(input.technicalData.hasSchemaOrg) : false));
    const schemaTypes = htmlSignals ? htmlSignals.schemaTypes : 
                        (Array.isArray(input.schemaTypes) ? input.schemaTypes : 
                        (Array.isArray(input.technicalData?.schemaTypes) ? input.technicalData.schemaTypes : []));
    const isEcommerce = htmlSignals ? htmlSignals.isEcommerce : 
                        (input.isEcommerce !== undefined ? Boolean(input.isEcommerce) : 
                        (input.technicalData?.isEcommerce !== undefined ? Boolean(input.technicalData.isEcommerce) : false));
    const ecommercePlatform = htmlSignals ? htmlSignals.ecommercePlatform : 
                              (input.ecommercePlatform || input.technicalData?.ecommercePlatform || null);
    const contactPageUrl = htmlSignals ? htmlSignals.contactPageUrl : 
                           (input.contactPageUrl || input.technicalData?.contactPageUrl || null);

    const technicalData: NormalizedBusiness['technicalData'] = {
      ttfbMs,
      htmlSizeBytes,
      contentType,
      redirectCount,
      finalUrl,
      hasOpenGraph,
      openGraphCompleteness,
      hasSchemaOrg,
      schemaTypes,
      isEcommerce,
      ecommercePlatform,
      contactPageUrl,
    };

    provenance['technicalData.hasOpenGraph'] = this.createSignal(hasOpenGraph, 'KNOWN', 'DOM_METADATA', 1.0);
    provenance['technicalData.hasSchemaOrg'] = this.createSignal(hasSchemaOrg, 'KNOWN', 'DOM_METADATA', 1.0);
    provenance['technicalData.isEcommerce'] = this.createSignal(isEcommerce, isEcommerce ? 'KNOWN' : 'INFERRED', 'ECOMMERCE_DETECTOR', 0.95);
    if (ttfbMs !== null) {
      provenance['technicalData.ttfbMs'] = this.createSignal(ttfbMs, 'KNOWN', 'HTTP_TELEMETRY', 0.9, 'Time to first byte (HTML document response)');
    }
    if (htmlSizeBytes !== null) {
      provenance['technicalData.htmlSizeBytes'] = this.createSignal(htmlSizeBytes, 'KNOWN', 'HTTP_TELEMETRY', 1.0);
    }

    const detailedTechnologies = htmlSignals?.detailedTechnologies || 
                                 (Array.isArray(input.detailedTechnologies) ? input.detailedTechnologies : []);

    // ── 5. ASSEMBLE NORMALIZED RESULT ──
    return {
      id: input.id ? String(input.id) : fallbackId ? String(fallbackId) : undefined,
      name,
      slug: input.slug ? String(input.slug) : undefined,
      industry,
      categories,
      website: rawWebsite,
      hasWebsite,
      verifiedWebsite: input.verifiedWebsite ? String(input.verifiedWebsite) : rawWebsite,
      phone,
      hasPhone,
      email,
      hasEmail,
      rating,
      reviewCount,
      city,
      state,
      country,
      address,
      latitude,
      longitude,
      googlePlaceId,
      ownerName,
      hasOwner,
      businessAge,
      websiteQuality,
      websiteData,
      socialProfiles,
      socialProfilesCount: socialProfiles.length,
      opportunities: Array.isArray(input.opportunities) ? input.opportunities : [],
      opportunitiesCount: Array.isArray(input.opportunities) ? input.opportunities.length : 0,
      sourceKeywords: Array.isArray(input.sourceKeywords) ? input.sourceKeywords : [],
      sourceLocations: Array.isArray(input.sourceLocations) ? input.sourceLocations : [],
      raw: input,

      // Phase 2 Signals
      domainData,
      tlsData,
      technicalData,
      detailedTechnologies,

      // Phase 5 Business Signals
      businessStatus,
      hasMultipleLocations,
      foundedYear,
      employeeCount,
      growthIndicator,

      // Phase 5 Website Signals
      isHttps,
      hasSsl,
      cms,
      detectedTechnologies,
      mobileResponsive,
      hasMetaTitle,
      hasMetaDescription,
      h1Count,
      hasContactForm,
      hasWhatsApp,
      hasCta,
      hasAnalytics,
      hasMetaPixel,
      hasBrokenLinks,
      loadTimeMs: websiteData?.loadTimeMs ?? null,
      performanceScore: websiteData?.performanceScore ?? null,
      seoScore: websiteData?.seoScore ?? null,
      lastUpdatedYear,
      websiteAgeYears,

      // Phase 5 Marketing Signals
      hasGoogleMapsPresence,
      reviewActivityTier,
      socialPlatformCount,
      hasInstagram,
      hasFacebook,
      hasLinkedIn,
      hasTwitter,
      hasYouTube,
      socialActivityAvailable,

      // Grouped Signals for clean namespacing
      signals: {
        business: {
          status: businessStatus,
          hasMultipleLocations,
          foundedYear,
          employeeCount,
          growthIndicator,
        },
        website: {
          hasWebsite,
          isHttps,
          cms,
          detectedTechnologies,
          mobileResponsive,
          hasMetaTitle,
          hasMetaDescription,
          h1Count,
          hasContactForm,
          hasWhatsApp,
          hasCta,
          hasAnalytics,
          hasMetaPixel,
          hasBrokenLinks,
          qualityScore: websiteQuality,
          lastUpdatedYear,
          websiteAgeYears,
          domainAgeYears: domainData?.domainAgeYears ?? null,
          isTlsValid: tlsData?.isValid ?? false,
          tlsIssuer: tlsData?.issuer ?? null,
          isEcommerce: technicalData.isEcommerce,
          ecommercePlatform: technicalData.ecommercePlatform,
          hasOpenGraph: technicalData.hasOpenGraph,
          hasSchemaOrg: technicalData.hasSchemaOrg,
          ttfbMs: technicalData.ttfbMs,
          htmlSizeBytes: technicalData.htmlSizeBytes,
        },
        marketing: {
          hasGoogleMapsPresence,
          rating,
          reviewCount,
          reviewActivityTier,
          socialPlatformCount,
          hasInstagram,
          hasFacebook,
          hasLinkedIn,
          hasTwitter,
          hasYouTube,
        },
      },

      // Complete Provenance
      provenance,
    };
  }

  /**
   * Safely merges newly collected enrichment or audit data into an existing NormalizedBusiness.
   * 
   * Guarantees:
   * 1. Failed enrichment (null/unknown/empty) NEVER overwrites previously verified values.
   * 2. Conflicting information is explicitly tracked in `conflicts` rather than silently discarded.
   * 3. Collection timestamps are refreshed for newly verified/updated fields.
   * 4. Provenance is updated or preserved based on source confidence.
   */
  static mergeEnrichment(
    existing: NormalizedBusiness,
    incoming: Partial<NormalizedBusiness> | any,
    enrichmentSource = 'ENRICHMENT_UPDATE'
  ): NormalizedBusiness {
    if (!existing) {
      return this.normalize(incoming);
    }
    if (!incoming || typeof incoming !== 'object') {
      return existing;
    }

    // If incoming is already normalized, use it directly; otherwise normalize it
    const incomingNorm: NormalizedBusiness = (incoming.provenance && incoming.signals)
      ? incoming as NormalizedBusiness
      : this.normalize(incoming, existing.id);

    const merged: NormalizedBusiness = {
      ...existing,
      signals: {
        business: { ...existing.signals.business },
        website: { ...existing.signals.website },
        marketing: { ...existing.signals.marketing },
      },
      provenance: { ...existing.provenance },
      conflicts: Array.isArray(existing.conflicts) ? [...existing.conflicts] : [],
    };

    const isFullNormalized = Boolean(incoming.provenance && incoming.signals);
    const conflictFields: Array<keyof NormalizedBusiness> = [
      'name', 'phone', 'email', 'website', 'address', 'city', 'rating', 'reviewCount', 'ownerName', 'cms'
    ];

    for (const field of conflictFields) {
      // If incoming is a partial update, skip fields not provided in incoming
      if (!isFullNormalized && !(field in incoming)) {
        continue;
      }

      const existVal = existing[field];
      const inVal = incomingNorm[field];
      const existRecord = existing.provenance?.[field as string];
      const inRecord = incomingNorm.provenance?.[field as string];

      const existHasVal = existVal !== undefined && existVal !== null && existVal !== '' && existRecord?.status !== 'UNKNOWN';
      const inHasVal = inVal !== undefined && inVal !== null && inVal !== '' && inRecord?.status !== 'UNKNOWN';

      if (!existHasVal && inHasVal) {
        // Existing was missing/unknown, incoming provides verified/inferred value
        (merged as any)[field] = inVal;
        merged.provenance[field as string] = {
          ...inRecord,
          timestamp: inRecord?.timestamp || new Date().toISOString(),
          source: inRecord?.source || enrichmentSource,
        };
      } else if (existHasVal && !inHasVal) {
        // Failed enrichment or missing incoming value: PRESERVE existing verified value!
        // Do nothing, merged already has existing[field]
      } else if (existHasVal && inHasVal) {
        // Both have values: check for conflict
        const isDifferent = String(existVal).trim().toLowerCase() !== String(inVal).trim().toLowerCase();
        if (isDifferent) {
          const inConf = inRecord?.confidence ?? 0.5;
          const existConf = existRecord?.confidence ?? 0.5;
          const acceptIncoming = inConf > existConf;
          const resolution: 'ACCEPTED_INCOMING' | 'PRESERVED_EXISTING' = acceptIncoming
            ? 'ACCEPTED_INCOMING'
            : 'PRESERVED_EXISTING';

          merged.conflicts!.push({
            field: field as string,
            existingValue: existVal,
            existingSource: existRecord?.source || 'EXISTING_RECORD',
            incomingValue: inVal,
            incomingSource: inRecord?.source || enrichmentSource,
            timestamp: new Date().toISOString(),
            resolution,
          });

          if (acceptIncoming) {
            (merged as any)[field] = inVal;
            merged.provenance[field as string] = {
              ...inRecord,
              timestamp: new Date().toISOString(),
              source: inRecord?.source || enrichmentSource,
              notes: `Updated from higher confidence incoming source (was: ${existVal})`,
            };
          } else {
            merged.provenance[field as string] = {
              ...existRecord,
              notes: `Preserved existing value; conflict detected with incoming "${inVal}" from ${inRecord?.source || enrichmentSource}`,
            };
          }
        }
      }
    }

    // Merge website technical signals safely (only promote if incoming has verified data)
    const webSignals: Array<keyof NormalizedBusiness> = [
      'isHttps', 'hasSsl', 'mobileResponsive', 'hasContactForm', 'hasWhatsApp',
      'hasCta', 'hasAnalytics', 'hasMetaPixel', 'hasBrokenLinks', 'cms', 'websiteQuality'
    ];

    for (const sig of webSignals) {
      // If existing had a verified value, do NOT overwrite with false/null if incoming lacked website or failed audit
      if (existing[sig] && (!incomingNorm.hasWebsite || incomingNorm.provenance?.[sig as string]?.status === 'UNKNOWN')) {
        continue;
      }
      const inVal = incomingNorm[sig];
      const inRecord = incomingNorm.provenance?.[sig as string];
      // Only merge if incoming was audited/observed with confidence
      if (inRecord && inRecord.status !== 'UNKNOWN' && inRecord.confidence > 0 && inVal !== null && inVal !== undefined) {
        (merged as any)[sig] = inVal;
        merged.provenance[sig as string] = inRecord;
      }
    }

    // Merge detected technologies (union of unique items)
    if (incomingNorm.detectedTechnologies && incomingNorm.detectedTechnologies.length > 0) {
      const techSet = new Set([...merged.detectedTechnologies, ...incomingNorm.detectedTechnologies]);
      merged.detectedTechnologies = Array.from(techSet);
      merged.provenance['detectedTechnologies'] = this.createSignal(
        merged.detectedTechnologies,
        'KNOWN',
        'TECH_DETECTOR_MERGED',
        1.0,
        `Merged technology stack: ${merged.detectedTechnologies.join(', ')}`
      );
    }

    // Merge social profiles (union of unique platforms)
    if (incomingNorm.socialProfiles && incomingNorm.socialProfiles.length > 0) {
      const existingPlatforms = new Set(merged.socialProfiles.map(s => s.platform.toUpperCase()));
      for (const sp of incomingNorm.socialProfiles) {
        if (!existingPlatforms.has(sp.platform.toUpperCase())) {
          merged.socialProfiles.push(sp);
          existingPlatforms.add(sp.platform.toUpperCase());
        }
      }
      merged.socialProfilesCount = merged.socialProfiles.length;
    }

    // Merge Phase 2: Domain Registration Intelligence
    if (incomingNorm.domainData && incomingNorm.domainData.isRegistered) {
      if (!existing.domainData || !existing.domainData.isRegistered) {
        merged.domainData = incomingNorm.domainData;
        if (incomingNorm.provenance['domainData.domainAgeYears']) {
          merged.provenance['domainData.domainAgeYears'] = incomingNorm.provenance['domainData.domainAgeYears'];
        }
        if (incomingNorm.provenance['domainData.registrar']) {
          merged.provenance['domainData.registrar'] = incomingNorm.provenance['domainData.registrar'];
        }
      } else {
        // Both have registration data: check for conflicting registrar
        if (
          existing.domainData.registrar &&
          incomingNorm.domainData.registrar &&
          existing.domainData.registrar.toLowerCase().trim() !== incomingNorm.domainData.registrar.toLowerCase().trim()
        ) {
          merged.conflicts!.push({
            field: 'domainData.registrar',
            existingValue: existing.domainData.registrar,
            existingSource: existing.provenance?.['domainData.registrar']?.source || 'EXISTING_RECORD',
            incomingValue: incomingNorm.domainData.registrar,
            incomingSource: enrichmentSource,
            timestamp: new Date().toISOString(),
            resolution: 'ACCEPTED_INCOMING',
          });
          merged.domainData = { ...existing.domainData, ...incomingNorm.domainData };
        } else {
          merged.domainData = { ...existing.domainData, ...incomingNorm.domainData };
        }
      }
    }

    // Merge Phase 2: TLS Security Data
    if (incomingNorm.tlsData && incomingNorm.provenance?.['tlsData.isValid']?.status === 'KNOWN') {
      merged.tlsData = incomingNorm.tlsData;
      if (incomingNorm.provenance['tlsData.isValid']) {
        merged.provenance['tlsData.isValid'] = incomingNorm.provenance['tlsData.isValid'];
      }
      if (incomingNorm.provenance['tlsData.issuer']) {
        merged.provenance['tlsData.issuer'] = incomingNorm.provenance['tlsData.issuer'];
      }
    }

    // Merge Phase 2: Technical & Architecture Telemetry
    if (incomingNorm.technicalData) {
      merged.technicalData = {
        ttfbMs: incomingNorm.technicalData.ttfbMs ?? merged.technicalData?.ttfbMs ?? null,
        htmlSizeBytes: incomingNorm.technicalData.htmlSizeBytes ?? merged.technicalData?.htmlSizeBytes ?? null,
        contentType: incomingNorm.technicalData.contentType || merged.technicalData?.contentType || null,
        redirectCount: incomingNorm.technicalData.redirectCount ?? merged.technicalData?.redirectCount ?? 0,
        finalUrl: incomingNorm.technicalData.finalUrl || merged.technicalData?.finalUrl || null,
        hasOpenGraph: incomingNorm.technicalData.hasOpenGraph || Boolean(merged.technicalData?.hasOpenGraph),
        openGraphCompleteness: Math.max(incomingNorm.technicalData.openGraphCompleteness || 0, merged.technicalData?.openGraphCompleteness || 0),
        hasSchemaOrg: incomingNorm.technicalData.hasSchemaOrg || Boolean(merged.technicalData?.hasSchemaOrg),
        schemaTypes: Array.from(new Set([...(merged.technicalData?.schemaTypes || []), ...(incomingNorm.technicalData.schemaTypes || [])])),
        isEcommerce: incomingNorm.technicalData.isEcommerce || Boolean(merged.technicalData?.isEcommerce),
        ecommercePlatform: incomingNorm.technicalData.ecommercePlatform || merged.technicalData?.ecommercePlatform || null,
        contactPageUrl: incomingNorm.technicalData.contactPageUrl || merged.technicalData?.contactPageUrl || null,
      };
    }

    // Merge detailed technologies
    if (incomingNorm.detailedTechnologies && incomingNorm.detailedTechnologies.length > 0) {
      const detailedMap = new Map<string, DetectedTechnology>();
      (merged.detailedTechnologies || []).forEach(t => detailedMap.set(t.id, t));
      incomingNorm.detailedTechnologies.forEach(t => detailedMap.set(t.id, t));
      merged.detailedTechnologies = Array.from(detailedMap.values());
    }

    // Synchronize boolean helpers
    merged.hasWebsite = Boolean(merged.website);
    merged.hasPhone = Boolean(merged.phone);
    merged.hasEmail = Boolean(merged.email);
    merged.hasOwner = Boolean(merged.ownerName);

    // Synchronize grouped signals
    merged.signals.business.status = merged.businessStatus;
    merged.signals.business.hasMultipleLocations = merged.hasMultipleLocations;
    merged.signals.website.hasWebsite = merged.hasWebsite;
    merged.signals.website.isHttps = merged.isHttps;
    merged.signals.website.cms = merged.cms;
    merged.signals.website.detectedTechnologies = merged.detectedTechnologies;
    merged.signals.website.mobileResponsive = merged.mobileResponsive;
    merged.signals.website.hasContactForm = merged.hasContactForm;
    merged.signals.website.hasWhatsApp = merged.hasWhatsApp;
    merged.signals.website.hasCta = merged.hasCta;
    merged.signals.website.hasAnalytics = merged.hasAnalytics;
    merged.signals.website.hasMetaPixel = merged.hasMetaPixel;
    merged.signals.website.hasBrokenLinks = merged.hasBrokenLinks;
    merged.signals.website.qualityScore = merged.websiteQuality;
    merged.signals.website.domainAgeYears = merged.domainData?.domainAgeYears ?? null;
    merged.signals.website.isTlsValid = merged.tlsData?.isValid ?? false;
    merged.signals.website.tlsIssuer = merged.tlsData?.issuer ?? null;
    merged.signals.website.isEcommerce = merged.technicalData?.isEcommerce ?? false;
    merged.signals.website.ecommercePlatform = merged.technicalData?.ecommercePlatform ?? null;
    merged.signals.website.hasOpenGraph = merged.technicalData?.hasOpenGraph ?? false;
    merged.signals.website.hasSchemaOrg = merged.technicalData?.hasSchemaOrg ?? false;
    merged.signals.website.ttfbMs = merged.technicalData?.ttfbMs ?? null;
    merged.signals.website.htmlSizeBytes = merged.technicalData?.htmlSizeBytes ?? null;
    merged.signals.marketing.rating = merged.rating;
    merged.signals.marketing.reviewCount = merged.reviewCount;

    return merged;
  }
}

export const dataNormalizationService = DataNormalizationService;
