/**
 * Phase 2 Business Intelligence & Zero-Cost Technical Enrichment Test Suite
 * 
 * Deterministic unit and regression tests using mocked responses and local fixtures:
 * 1. RDAP Domain Registration Intelligence
 * 2. TLS Certificate & Handshake Inspection
 * 3. Enhanced Technology, E-commerce, Open Graph & Structured Data Detection
 * 4. Provenance Preservation & Conflict Tracking
 * 5. SSRF Protections & Redirect Guardrails
 * 6. ICP Compatibility & New Property Rules
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractRegistrableDomain,
  parseRdapResponse,
  lookupDomainRegistration,
  clearRdapCache,
  type DomainRegistrationInfo,
} from '../src/lib/rdap-client';
import {
  inspectTls,
  extractHostname,
  type TlsInspectionResult,
} from '../src/lib/tls-inspector';
import {
  detectTechnologies,
  type TechDetectionResult,
} from '../src/lib/tech-detector';
import {
  isSafePublicUrl,
  sanitizeExternalUrl,
  validateRedirectTarget,
} from '../src/lib/url-safety';
import {
  DataNormalizationService,
  ICPEngineService,
  WebDevRedesignICP,
  MarketingAgencyICP,
} from '../src/services/icp';
import type { ICPProfile } from '../src/types/icp';

describe('Phase 2: Business Intelligence & Zero-Cost Technical Enrichment', () => {

  beforeEach(() => {
    clearRdapCache();
  });

  // =========================================================================
  // 1. RDAP DOMAIN REGISTRATION INTELLIGENCE
  // =========================================================================
  describe('1. RDAP Domain Registration Intelligence', () => {
    it('should extract registrable domain from various URL and subdomain formats', () => {
      assert.equal(extractRegistrableDomain('https://www.example.com/path'), 'example.com');
      assert.equal(extractRegistrableDomain('http://sub.deep.example.co.uk:8080/'), 'example.co.uk');
      assert.equal(extractRegistrableDomain('https://shop.artisanbakery.co.in'), 'artisanbakery.co.in');
      assert.equal(extractRegistrableDomain('https://www.metroclinic.com.au/contact'), 'metroclinic.com.au');
      assert.equal(extractRegistrableDomain('justdomain.org'), 'justdomain.org');

      // Unsafe or invalid domains return null
      assert.equal(extractRegistrableDomain('http://localhost:3000'), null);
      assert.equal(extractRegistrableDomain('http://127.0.0.1/test'), null);
      assert.equal(extractRegistrableDomain('http://169.254.169.254/latest'), null);
      assert.equal(extractRegistrableDomain('invalid-domain-without-tld'), null);
    });

    it('should parse valid RDAP response and calculate domain age and expiration', () => {
      const mockRdap = {
        handle: 'EXAMPLE-DOM',
        events: [
          { eventAction: 'registration', eventDate: '2018-05-15T10:00:00Z' },
          { eventAction: 'last changed', eventDate: '2023-05-10T12:30:00Z' },
          { eventAction: 'expiration', eventDate: '2028-05-15T10:00:00Z' },
        ],
        entities: [
          {
            roles: ['registrar'],
            handle: 'REG-123',
            vcardArray: [
              'vcard',
              [
                ['version', {}, 'text', '4.0'],
                ['fn', {}, 'text', 'GoDaddy.com, LLC'],
              ],
            ],
          },
        ],
      };

      const result = parseRdapResponse('example.com', mockRdap);

      assert.equal(result.isRegistered, true);
      assert.equal(result.domain, 'example.com');
      assert.equal(result.registrationDate, '2018-05-15T10:00:00Z');
      assert.equal(result.expirationDate, '2028-05-15T10:00:00Z');
      assert.equal(result.registrar, 'GoDaddy.com, LLC');
      assert.ok(typeof result.domainAgeYears === 'number');
      assert.ok(result.domainAgeYears! >= 5);
      assert.ok(typeof result.daysUntilExpiration === 'number');
      assert.ok(result.daysUntilExpiration! > 300);
      assert.equal(result.status, 'KNOWN');
    });

    it('should handle RDAP responses missing registration events gracefully without crashing', () => {
      const incompleteRdap = {
        handle: 'INCOMPLETE-DOM',
        events: [],
        entities: [],
      };

      const result = parseRdapResponse('incomplete.org', incompleteRdap);
      assert.equal(result.registrationDate, null);
      assert.equal(result.expirationDate, null);
      assert.equal(result.registrar, null);
      assert.equal(result.domainAgeYears, null);
      assert.equal(result.daysUntilExpiration, null);
    });

    it('should handle unsupported domain extensions or 404 not found cleanly', async () => {
      const customFetcher = async () => {
        const err: any = new Error('Not Found');
        err.response = { status: 404 };
        throw err;
      };

      const result = await lookupDomainRegistration('obscure-service.xyz', { customFetcher });
      assert.equal(result.isRegistered, false);
      assert.equal(result.status, 'UNKNOWN');
      assert.ok(result.notes?.includes('not found') || result.notes?.includes('support'));
    });

    it('should handle RDAP rate limiting (HTTP 429) and timeouts with FAILED_TO_COLLECT status', async () => {
      const rateLimitFetcher = async () => {
        const err: any = new Error('Too Many Requests');
        err.response = { status: 429 };
        throw err;
      };

      const result429 = await lookupDomainRegistration('ratelimited.com', { customFetcher: rateLimitFetcher });
      assert.equal(result429.status, 'FAILED_TO_COLLECT');
      assert.ok(result429.notes?.includes('rate limit'));

      const timeoutFetcher = async () => {
        const err: any = new Error('timeout of 3500ms exceeded');
        err.code = 'ECONNABORTED';
        throw err;
      };

      const resultTimeout = await lookupDomainRegistration('timeout.com', { customFetcher: timeoutFetcher });
      assert.equal(resultTimeout.status, 'FAILED_TO_COLLECT');
      assert.ok(resultTimeout.notes?.includes('timed out'));
    });

    it('should cache successful RDAP lookups in memory without invoking fetcher twice', async () => {
      let fetchCount = 0;
      const cachedFetcher = async () => {
        fetchCount++;
        return {
          events: [{ eventAction: 'registration', eventDate: '2020-01-01T00:00:00Z' }],
          entities: [{ roles: ['registrar'], handle: 'Namecheap' }],
        };
      };

      const res1 = await lookupDomainRegistration('cached-test.com', { customFetcher: cachedFetcher });
      const res2 = await lookupDomainRegistration('cached-test.com', { customFetcher: cachedFetcher });

      assert.equal(fetchCount, 1);
      assert.equal(res1.registrar, 'Namecheap');
      assert.equal(res2.registrar, 'Namecheap');
    });

    it('should strictly distinguish domain age from legal business age and not infer founding year', () => {
      const rawListing = {
        name: 'Apex Modern Dental Practice',
        industry: 'Dental',
        website: 'https://apexmoderndental.com',
        phone: '+91 11 2345 6789',
        domainData: {
          domain: 'apexmoderndental.com',
          isRegistered: true,
          registrationDate: '2021-06-15T00:00:00Z',
          domainAgeYears: 3.5,
          registrar: 'Cloudflare, Inc.',
        },
      };

      const normalized = DataNormalizationService.normalize(rawListing);

      // Domain age is captured
      assert.equal(normalized.domainData?.domainAgeYears, 3.5);
      assert.equal(normalized.domainData?.registrar, 'Cloudflare, Inc.');
      assert.equal(normalized.signals.website.domainAgeYears, 3.5);

      // BUT legal business age and founding year remain strictly UNKNOWN!
      assert.equal(normalized.foundedYear, null);
      assert.equal(normalized.businessAge, undefined);
      assert.equal(normalized.provenance['foundedYear'].status, 'UNKNOWN');
      assert.equal(normalized.provenance['businessAge'].status, 'UNKNOWN');
    });
  });

  // =========================================================================
  // 2. TLS CERTIFICATE & HANDSHAKE INSPECTION
  // =========================================================================
  describe('2. TLS Certificate & Handshake Inspection', () => {
    it('should extract hostname cleanly from various inputs', () => {
      assert.equal(extractHostname('https://secure.example.com/login'), 'secure.example.com');
      assert.equal(extractHostname('http://sub.domain.org:8443'), 'sub.domain.org');
      assert.equal(extractHostname('mybank.co.in'), 'mybank.co.in');
      assert.equal(extractHostname(''), null);
    });

    it('should parse valid TLS certificate metadata', async () => {
      const mockValidInspector = async () => ({
        httpsConfigured: true,
        isValid: true,
        issuer: "Let's Encrypt",
        subject: 'healthcareclinic.example.com',
        validFrom: '2025-01-01T00:00:00Z',
        validTo: '2027-01-01T00:00:00Z',
        daysUntilExpiration: 400,
        protocol: 'TLSv1.3',
        cipher: 'TLS_AES_256_GCM_SHA384',
        authorizationError: null,
        status: 'KNOWN' as const,
        source: 'TLS_SOCKET_HANDSHAKE',
      });

      const result = await inspectTls('healthcareclinic.example.com', { customInspector: mockValidInspector });

      assert.equal(result.httpsConfigured, true);
      assert.equal(result.isValid, true);
      assert.equal(result.issuer, "Let's Encrypt");
      assert.equal(result.protocol, 'TLSv1.3');
      assert.equal(result.daysUntilExpiration, 400);
      assert.equal(result.authorizationError, null);
    });

    it('should handle expired or invalid TLS certificates without throwing errors', async () => {
      const mockExpiredInspector = async () => ({
        httpsConfigured: true,
        isValid: false,
        issuer: 'ZeroSSL',
        subject: 'expired-lawfirm.example.com',
        validFrom: '2022-01-01T00:00:00Z',
        validTo: '2023-01-01T00:00:00Z',
        daysUntilExpiration: -300,
        protocol: 'TLSv1.2',
        cipher: 'ECDHE-RSA-AES256-GCM-SHA384',
        authorizationError: 'CERT_HAS_EXPIRED',
        status: 'KNOWN' as const,
        source: 'TLS_SOCKET_HANDSHAKE',
        notes: 'Certificate issue detected: CERT_HAS_EXPIRED',
      });

      const result = await inspectTls('expired-lawfirm.example.com', { customInspector: mockExpiredInspector });

      assert.equal(result.httpsConfigured, true);
      assert.equal(result.isValid, false);
      assert.equal(result.authorizationError, 'CERT_HAS_EXPIRED');
      assert.ok(result.daysUntilExpiration! < 0);
    });

    it('should reject unsafe loopback and internal targets before establishing TLS socket', async () => {
      const resultLocal = await inspectTls('localhost');
      assert.equal(resultLocal.isValid, false);
      assert.equal(resultLocal.authorizationError, 'SSRF_BLOCKED');

      const resultIp = await inspectTls('127.0.0.1');
      assert.equal(resultIp.isValid, false);
      assert.equal(resultIp.authorizationError, 'SSRF_BLOCKED');

      const resultMeta = await inspectTls('169.254.169.254');
      assert.equal(resultMeta.isValid, false);
      assert.equal(resultMeta.authorizationError, 'SSRF_BLOCKED');
    });
  });

  // =========================================================================
  // 3. ENHANCED TECHNOLOGY, E-COMMERCE & STRUCTURED DATA DETECTION
  // =========================================================================
  describe('3. Enhanced Technology, E-commerce, Open Graph & Structured Data Detection', () => {
    it('should detect WordPress CMS with concrete evidence and high confidence', () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="generator" content="WordPress 6.4.2" />
          <link rel="stylesheet" href="/wp-content/themes/lawyer/style.css" />
        </head>
        <body>
          <script src="/wp-includes/js/jquery/jquery.min.js"></script>
        </body>
        </html>
      `;

      const result = detectTechnologies(html, 'https://lawfirm.example.com');
      assert.equal(result.cms, 'WordPress');
      assert.ok(result.technologies.includes('WordPress'));

      const wpDetail = result.detailedTechnologies.find(t => t.id === 'wordpress');
      assert.ok(wpDetail);
      assert.equal(wpDetail.category, 'CMS');
      assert.equal(wpDetail.status, 'CONFIRMED');
      assert.ok(wpDetail.confidence >= 0.95);
      assert.ok(wpDetail.evidence.length >= 2);
    });

    it('should detect Shopify and flag e-commerce capability', () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <link rel="stylesheet" href="https://cdn.shopify.com/s/files/1/0001/theme.css" />
        </head>
        <body>
          <script>
            window.Shopify = { shop: 'artisan-goods.myshopify.com', theme: { id: 12345 } };
          </script>
        </body>
        </html>
      `;

      const result = detectTechnologies(html, 'https://artisan-goods.example.com');
      assert.equal(result.cms, 'Shopify');
      assert.ok(result.technologies.includes('Shopify'));
      assert.equal(result.ecommerce.isEcommerce, true);
      assert.equal(result.ecommerce.platform, 'Shopify');
    });

    it('should detect WooCommerce with Stripe payment elements', () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head><title>Boutique</title></head>
        <body class="woocommerce woocommerce-page">
          <div class="woocommerce-cart">
            <span class="woocommerce-Price-amount">Rs. 2,499</span>
          </div>
          <script src="https://js.stripe.com/v3/"></script>
          <script>const stripe = Stripe('pk_test_123');</script>
        </body>
        </html>
      `;

      const result = detectTechnologies(html);
      assert.equal(result.ecommerce.isEcommerce, true);
      assert.equal(result.ecommerce.platform, 'WooCommerce');
      assert.ok(result.technologies.includes('WooCommerce'));
      assert.ok(result.technologies.includes('Stripe'));
    });

    it('should detect Wix, Squarespace, and Webflow website builders', () => {
      const wixHtml = `<html><head><meta name="generator" content="Wix.com Website Builder"/></head><body><div class="wix-image"></div></body></html>`;
      assert.equal(detectTechnologies(wixHtml).cms, 'Wix');

      const sqspHtml = `<html><head><script>Static = { SQUARESPACE_CONTEXT: { websiteId: '123' } };</script></head><body></body></html>`;
      assert.equal(detectTechnologies(sqspHtml).cms, 'Squarespace');

      const wfHtml = `<html><head></head><body data-wf-page="60a" data-wf-site="60b"></body></html>`;
      assert.equal(detectTechnologies(wfHtml).cms, 'Webflow');
    });

    it('should detect Next.js and React frameworks', () => {
      const nextHtml = `
        <!DOCTYPE html>
        <html>
        <head><title>App</title></head>
        <body>
          <div id="__next">Hello</div>
          <script src="/_next/static/chunks/main.js"></script>
          <script id="__NEXT_DATA__" type="application/json">{"props":{}}</script>
        </body>
        </html>
      `;

      const result = detectTechnologies(nextHtml);
      assert.ok(result.technologies.includes('Next.js'));
      assert.ok(result.technologies.includes('React'));
      const nextDetail = result.detailedTechnologies.find(t => t.id === 'nextjs');
      assert.ok(nextDetail);
      assert.equal(nextDetail.category, 'FRAMEWORK');
      assert.equal(nextDetail.confidence, 1.0);
    });

    it('should detect Google Analytics 4, GTM, and Meta Pixel', () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <script src="https://www.googletagmanager.com/gtag/js?id=G-ABC123XYZ"></script>
          <script>
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('config', 'G-ABC123XYZ');
          </script>
          <script src="https://www.googletagmanager.com/gtm.js?id=GTM-TEST99"></script>
        </head>
        <body>
          <script>
            !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};f._fbq=n;
            n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
            document,'script','https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '1234567890');
          </script>
        </body>
        </html>
      `;

      const result = detectTechnologies(html);
      assert.ok(result.technologies.includes('Google Analytics'));
      assert.ok(result.technologies.includes('Google Analytics 4'));
      assert.ok(result.technologies.includes('GTM'));
      assert.ok(result.technologies.includes('Meta Pixel'));
    });

    it('should compute Open Graph metadata completeness accurately', () => {
      const completeOgHtml = `
        <html>
        <head>
          <meta property="og:title" content="Elite Dental Clinic" />
          <meta property="og:description" content="Award-winning dental care in Delhi" />
          <meta property="og:image" content="https://example.com/clinic.jpg" />
          <meta property="og:url" content="https://example.com" />
          <meta property="og:type" content="website" />
        </head>
        <body></body>
        </html>
      `;

      const completeResult = detectTechnologies(completeOgHtml);
      assert.equal(completeResult.openGraph.hasOpenGraph, true);
      assert.equal(completeResult.openGraph.completeness, 1.0);
      assert.equal(completeResult.openGraph.title, 'Elite Dental Clinic');

      const partialOgHtml = `
        <html>
        <head>
          <meta property="og:title" content="Elite Dental Clinic" />
        </head>
        <body></body>
        </html>
      `;

      const partialResult = detectTechnologies(partialOgHtml);
      assert.equal(partialResult.openGraph.hasOpenGraph, true);
      assert.equal(partialResult.openGraph.completeness, 0.25);
    });

    it('should parse Schema.org structured data JSON-LD', () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            "name": "Delhi Skin Specialists",
            "telephone": "+91-11-22334455"
          }
          </script>
        </head>
        <body></body>
        </html>
      `;

      const result = detectTechnologies(html);
      assert.equal(result.schemaOrg.hasSchemaOrg, true);
      assert.ok(result.schemaOrg.types.includes('LocalBusiness'));
    });
  });

  // =========================================================================
  // 4. PROVENANCE PRESERVATION & CONFLICT HANDLING
  // =========================================================================
  describe('4. Provenance Preservation & Conflict Handling', () => {
    it('should assign explicit field-level provenance for domain, TLS, and technical signals', () => {
      const listing = {
        name: 'Apex Orthodontics',
        website: 'https://apexortho.example.com',
        phone: '+91 99111 22334',
        html: `<!DOCTYPE html><html><head><meta property="og:title" content="Apex"/></head><body></body></html>`,
        domainData: {
          domain: 'apexortho.example.com',
          isRegistered: true,
          domainAgeYears: 4.2,
          registrar: 'GoDaddy',
        },
        tlsData: {
          httpsConfigured: true,
          isValid: true,
          issuer: "Let's Encrypt",
        },
        ttfbMs: 380,
      };

      const normalized = DataNormalizationService.normalize(listing);

      assert.equal(normalized.provenance['domainData.domainAgeYears'].status, 'KNOWN');
      assert.equal(normalized.provenance['domainData.domainAgeYears'].value, 4.2);
      assert.equal(normalized.provenance['domainData.domainAgeYears'].source, 'RDAP_BOOTSTRAP');

      assert.equal(normalized.provenance['tlsData.isValid'].status, 'KNOWN');
      assert.equal(normalized.provenance['tlsData.isValid'].value, true);

      assert.equal(normalized.provenance['technicalData.hasOpenGraph'].value, true);
      assert.equal(normalized.provenance['technicalData.ttfbMs'].value, 380);
    });

    it('should preserve verified domain and technical data when a subsequent crawl fails', () => {
      const verified = DataNormalizationService.normalize({
        id: 'biz-sec-1',
        name: 'Prime Legal Advocates',
        website: 'https://primelegal.example.com',
        phone: '+91 11 4455 6677',
        domainData: {
          domain: 'primelegal.example.com',
          isRegistered: true,
          domainAgeYears: 6.5,
          registrar: 'Network Solutions',
        },
        tlsData: {
          httpsConfigured: true,
          isValid: true,
          issuer: 'DigiCert Global Root CA',
        },
        technicalData: {
          hasOpenGraph: true,
          hasSchemaOrg: true,
          isEcommerce: false,
        },
      });

      // Failed audit crawl returning nulls
      const failedEnrichment = {
        website: null,
        domainData: null,
        tlsData: null,
        technicalData: null,
      };

      const merged = DataNormalizationService.mergeEnrichment(
        verified,
        failedEnrichment,
        'FAILED_AUDIT_WORKER'
      );

      // Verified domain intelligence must NOT be wiped out
      assert.equal(merged.domainData?.domainAgeYears, 6.5);
      assert.equal(merged.domainData?.registrar, 'Network Solutions');
      assert.equal(merged.tlsData?.isValid, true);
      assert.equal(merged.tlsData?.issuer, 'DigiCert Global Root CA');
      assert.equal(merged.technicalData?.hasOpenGraph, true);
    });

    it('should log conflict when differing registrars are reported across sources', () => {
      const existing = DataNormalizationService.normalize({
        name: 'Heritage Grand Hotel',
        website: 'https://heritagegrand.example.com',
        phone: '+91 11 2334 5566',
        domainData: {
          domain: 'heritagegrand.example.com',
          isRegistered: true,
          registrar: 'GoDaddy.com, LLC',
        },
      });

      const incoming = {
        domainData: {
          domain: 'heritagegrand.example.com',
          isRegistered: true,
          registrar: 'Cloudflare Registrar',
        },
      };

      const merged = DataNormalizationService.mergeEnrichment(
        existing,
        incoming,
        'NEW_RDAP_POLL'
      );

      assert.ok(merged.conflicts);
      assert.equal(merged.conflicts.length, 1);
      assert.equal(merged.conflicts[0].field, 'domainData.registrar');
      assert.equal(merged.conflicts[0].existingValue, 'GoDaddy.com, LLC');
      assert.equal(merged.conflicts[0].incomingValue, 'Cloudflare Registrar');
    });
  });

  // =========================================================================
  // 5. SSRF PROTECTIONS & REDIRECT GUARDRAILS
  // =========================================================================
  describe('5. SSRF Protections & Redirect Guardrails', () => {
    it('should reject loopback, RFC 1918, link-local, and cloud metadata targets', () => {
      // Loopback
      assert.equal(isSafePublicUrl('http://127.0.0.1:8080'), false);
      assert.equal(isSafePublicUrl('http://127.0.0.2'), false);
      assert.equal(isSafePublicUrl('http://localhost'), false);
      assert.equal(isSafePublicUrl('http://[::1]'), false);

      // RFC 1918
      assert.equal(isSafePublicUrl('http://10.0.0.1'), false);
      assert.equal(isSafePublicUrl('http://172.16.0.1'), false);
      assert.equal(isSafePublicUrl('http://172.31.255.255'), false);
      assert.equal(isSafePublicUrl('http://192.168.1.100'), false);

      // Cloud metadata
      assert.equal(isSafePublicUrl('http://169.254.169.254/latest/meta-data/'), false);
      assert.equal(isSafePublicUrl('http://metadata.google.internal'), false);

      // IPv6 link-local and unique local
      assert.equal(isSafePublicUrl('http://[fe80::1]'), false);
      assert.equal(isSafePublicUrl('http://[fc00::1]'), false);

      // Valid public URLs
      assert.equal(isSafePublicUrl('https://example.com'), true);
      assert.equal(isSafePublicUrl('https://delhimedicalcenter.org/about'), true);
    });

    it('should enforce redirect destination safety and max hop limits', () => {
      // Safe redirect
      const safeRedirect = validateRedirectTarget('https://example.com', '/about', 0, 5);
      assert.equal(safeRedirect.isSafe, true);
      assert.equal(safeRedirect.resolvedUrl, 'https://example.com/about');

      // Unsafe redirect to loopback
      const unsafeRedirect = validateRedirectTarget('https://example.com', 'http://127.0.0.1:8080/admin', 1, 5);
      assert.equal(unsafeRedirect.isSafe, false);
      assert.ok(unsafeRedirect.error?.includes('unsafe network'));

      // Redirect chain exceeding max hops
      const exceededHops = validateRedirectTarget('https://example.com/hop4', '/hop5', 5, 5);
      assert.equal(exceededHops.isSafe, false);
      assert.ok(exceededHops.error?.includes('exceeded limit'));
    });
  });

  // =========================================================================
  // 6. ICP COMPATIBILITY & NEW PROPERTY RULES
  // =========================================================================
  describe('6. ICP Compatibility & New Property Rules', () => {
    it('should support ICP rules evaluating domain age', () => {
      const domainAgeIcp: ICPProfile = {
        id: 'icp-established-domain',
        name: 'Established Domain Targets',
        targetService: 'WEBSITE_REDESIGN',
        isActive: true,
        rules: [
          {
            id: 'hf-domain-age',
            name: 'Domain Age >= 3 Years',
            type: 'HARD_FILTER',
            condition: {
              field: 'domainAge',
              operator: 'greater_than_or_equal',
              value: 3,
            },
          },
        ],
      };

      const candidateA = DataNormalizationService.normalize({
        name: 'Established Law Office',
        website: 'https://establishedlaw.com',
        domainData: { domainAgeYears: 5.2, isRegistered: true },
      });
      const evalA = ICPEngineService.evaluate(candidateA, domainAgeIcp);
      assert.equal(evalA.matched, true);

      const candidateB = DataNormalizationService.normalize({
        name: 'Brand New Startup',
        website: 'https://brandnewstartup.com',
        domainData: { domainAgeYears: 0.8, isRegistered: true },
      });
      const evalB = ICPEngineService.evaluate(candidateB, domainAgeIcp);
      assert.equal(evalB.matched, false);
    });

    it('should support ICP rules identifying invalid or insecure TLS certificates', () => {
      const tlsAuditIcp: ICPProfile = {
        id: 'icp-security-opportunity',
        name: 'Security Modernization Candidates',
        targetService: 'SECURITY_AUDIT',
        isActive: true,
        rules: [
          {
            id: 'ss-insecure-cert',
            name: 'Invalid or Expired TLS',
            type: 'SOFT_SIGNAL',
            condition: {
              field: 'isTlsValid',
              operator: 'equals',
              value: false,
            },
            weight: 30,
          },
        ],
      };

      const insecureSite = DataNormalizationService.normalize({
        name: 'Vulnerable Portal',
        website: 'https://vulnerable.example.com',
        tlsData: { isValid: false, httpsConfigured: true },
      });

      const evalResult = ICPEngineService.evaluate(insecureSite, tlsAuditIcp);
      assert.equal(evalResult.matched, true);
      assert.equal(evalResult.score, 30);
      assert.ok(evalResult.positiveSignals.includes('Invalid or Expired TLS (+30 pts)'));
    });

    it('should support ICP rules targeting e-commerce stores', () => {
      const ecommerceIcp: ICPProfile = {
        id: 'icp-ecommerce-scaling',
        name: 'E-commerce Store Optimization',
        targetService: 'ECOMMERCE_OPTIMIZATION',
        isActive: true,
        rules: [
          {
            id: 'hf-must-be-ecommerce',
            name: 'Must be E-commerce Store',
            type: 'HARD_FILTER',
            condition: {
              field: 'isEcommerce',
              operator: 'equals',
              value: true,
            },
          },
        ],
      };

      const shopifyStore = DataNormalizationService.normalize({
        name: 'Handcrafted Shoes',
        website: 'https://handcraftedshoes.example.com',
        technicalData: { isEcommerce: true, ecommercePlatform: 'Shopify' },
      });
      assert.equal(ICPEngineService.evaluate(shopifyStore, ecommerceIcp).matched, true);

      const dentalClinic = DataNormalizationService.normalize({
        name: 'Smile Care Dental',
        website: 'https://smilecaredental.example.com',
        technicalData: { isEcommerce: false, ecommercePlatform: null },
      });
      assert.equal(ICPEngineService.evaluate(dentalClinic, ecommerceIcp).matched, false);
    });

    it('should preserve 100% compatibility with standard default ICP profiles', () => {
      const prospect = DataNormalizationService.normalize({
        name: 'City Premier Dental Care',
        industry: 'Dental Clinic',
        rating: 4.7,
        reviewCount: 75,
        website: 'https://citypremierdental.example.com',
        phone: '+91 11 4455 6677',
        businessStatus: 'OPERATIONAL',
        websiteData: {
          overallScore: 40,
          performanceScore: 35,
          sslEnabled: false,
        },
        domainData: { domainAgeYears: 4.0, isRegistered: true },
      });

      const evalWebDev = ICPEngineService.evaluate(prospect, WebDevRedesignICP);
      assert.equal(evalWebDev.matched, true);
      assert.ok(evalWebDev.score >= 30);

      const competitorAgency = DataNormalizationService.normalize({
        name: 'Digital Edge Web Design Agency',
        industry: 'web design',
        rating: 4.9,
        reviewCount: 150,
        phone: '+91 99111 22334',
        website: 'https://digitaledge.example.com',
        businessStatus: 'OPERATIONAL',
      });
      const evalCompetitor = ICPEngineService.evaluate(competitorAgency, WebDevRedesignICP);
      assert.equal(evalCompetitor.matched, false);
      assert.ok(evalCompetitor.triggeredExclusions.length > 0);
    });
  });
});
