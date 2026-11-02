/**
 * Local Technology & Technical Architecture Detection Module
 * 
 * Provides evidence-backed technology, CMS, analytics, e-commerce,
 * and structured data detection without external paid lookups.
 * 
 * Rules:
 * 1. Evidence-backed: Every detection cites concrete signatures (tags, scripts, headers).
 * 2. Conservative confidence: Weak evidence does NOT produce definitive claims.
 * 3. Absences are NOT claimed: Lack of signature in single HTML != absence from entire infrastructure.
 * 4. Local execution only: No paid APIs, zero external requests.
 */

import * as cheerio from 'cheerio';

export interface DetectedTechnology {
  id: string;
  name: string;
  category: 'CMS' | 'FRAMEWORK' | 'ANALYTICS' | 'ECOMMERCE' | 'WIDGET' | 'METADATA';
  status: 'DETECTED' | 'CONFIRMED';
  evidence: string[];
  confidence: number; // 0.0 to 1.0
  sourceUrl?: string;
  timestamp: string;
}

export interface OpenGraphMetadata {
  hasOpenGraph: boolean;
  completeness: number; // 0.0 - 1.0 based on title, description, image, url
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  tags: Record<string, string>;
}

export interface SchemaOrgData {
  hasSchemaOrg: boolean;
  types: string[];
  count: number;
}

export interface EcommerceDetection {
  isEcommerce: boolean;
  platform: string | null;
  confidence: number;
  evidence: string[];
}

export interface TechDetectionResult {
  technologies: string[]; // Backwards-compatible string array of names
  cms: string | null;     // Backwards-compatible primary CMS name
  detailedTechnologies: DetectedTechnology[];
  ecommerce: EcommerceDetection;
  openGraph: OpenGraphMetadata;
  schemaOrg: SchemaOrgData;
}

export function detectTechnologies(html: string, sourceUrl?: string): TechDetectionResult {
  if (!html || typeof html !== 'string') {
    return {
      technologies: [],
      cms: null,
      detailedTechnologies: [],
      ecommerce: { isEcommerce: false, platform: null, confidence: 0.0, evidence: [] },
      openGraph: { hasOpenGraph: false, completeness: 0.0, tags: {} },
      schemaOrg: { hasSchemaOrg: false, types: [], count: 0 },
    };
  }

  const $ = cheerio.load(html);
  const technologies = new Set<string>();
  const detailedMap = new Map<string, DetectedTechnology>();
  let primaryCms: string | null = null;
  const now = new Date().toISOString();

  const addTech = (
    id: string,
    name: string,
    category: DetectedTechnology['category'],
    evidenceItems: string[],
    confidence: number,
    isCms = false
  ) => {
    technologies.add(name);
    if (isCms && !primaryCms) {
      primaryCms = name;
    }

    const existing = detailedMap.get(id);
    if (existing) {
      const mergedEvidence = Array.from(new Set([...existing.evidence, ...evidenceItems]));
      existing.evidence = mergedEvidence;
      existing.confidence = Math.max(existing.confidence, confidence);
      if (existing.confidence >= 0.9) existing.status = 'CONFIRMED';
    } else {
      detailedMap.set(id, {
        id,
        name,
        category,
        status: confidence >= 0.9 ? 'CONFIRMED' : 'DETECTED',
        evidence: evidenceItems,
        confidence,
        sourceUrl,
        timestamp: now,
      });
    }
  };

  // ── 1. EXTRACT COMMON HTML ELEMENTS & METADATA ──
  const metaGenerator = $('meta[name="generator"]').attr('content') || '';
  const scripts: string[] = [];
  const scriptContents: string[] = [];
  const links: string[] = [];

  $('script').each((_, el) => {
    const src = $(el).attr('src');
    if (src) {
      scripts.push(src.toLowerCase());
    } else {
      const text = $(el).text();
      if (text) {
        scriptContents.push(text);
      }
    }
  });

  $('link').each((_, el) => {
    const href = $(el).attr('href');
    if (href) {
      links.push(href.toLowerCase());
    }
  });

  const fullHtmlLower = html.toLowerCase();

  // ── 2. CMS & WEBSITE BUILDERS ──

  // WordPress
  const wpEvidence: string[] = [];
  if (metaGenerator.toLowerCase().includes('wordpress')) {
    wpEvidence.push(`meta generator: "${metaGenerator}"`);
  }
  if (links.some(l => l.includes('wp-content') || l.includes('wp-includes'))) {
    wpEvidence.push('link tag references wp-content or wp-includes');
  }
  if (scripts.some(s => s.includes('wp-content') || s.includes('wp-includes'))) {
    wpEvidence.push('script tag references wp-content or wp-includes');
  }
  if (fullHtmlLower.includes('wp-json/')) {
    wpEvidence.push('REST API wp-json endpoint found in HTML');
  }
  if (wpEvidence.length > 0) {
    addTech('wordpress', 'WordPress', 'CMS', wpEvidence, wpEvidence.length > 1 ? 1.0 : 0.9, true);
  }

  // Shopify
  const shopifyEvidence: string[] = [];
  if (metaGenerator.toLowerCase().includes('shopify')) {
    shopifyEvidence.push(`meta generator: "${metaGenerator}"`);
  }
  if (links.some(l => l.includes('cdn.shopify.com'))) {
    shopifyEvidence.push('link tag references cdn.shopify.com');
  }
  if (scripts.some(s => s.includes('cdn.shopify.com'))) {
    shopifyEvidence.push('script tag references cdn.shopify.com');
  }
  if (scriptContents.some(c => c.includes('Shopify.shop') || c.includes('Shopify.theme'))) {
    shopifyEvidence.push('Shopify global JavaScript context object found');
  }
  if (shopifyEvidence.length > 0) {
    addTech('shopify', 'Shopify', 'CMS', shopifyEvidence, 1.0, true);
  }

  // Webflow
  const webflowEvidence: string[] = [];
  if (metaGenerator.toLowerCase().includes('webflow')) {
    webflowEvidence.push(`meta generator: "${metaGenerator}"`);
  }
  if ($('[data-wf-page]').length > 0 || $('[data-wf-site]').length > 0) {
    webflowEvidence.push('Webflow DOM attributes (data-wf-page, data-wf-site) detected');
  }
  if (fullHtmlLower.includes('uploads-ssl.webflow.com') || fullHtmlLower.includes('assets.website-files.com')) {
    webflowEvidence.push('Webflow CDN asset URLs found');
  }
  if (webflowEvidence.length > 0) {
    addTech('webflow', 'Webflow', 'CMS', webflowEvidence, 1.0, true);
  }

  // Wix
  const wixEvidence: string[] = [];
  if (metaGenerator.toLowerCase().includes('wix')) {
    wixEvidence.push(`meta generator: "${metaGenerator}"`);
  }
  if (links.some(l => l.includes('wixstatic.com')) || scripts.some(s => s.includes('wixstatic.com'))) {
    wixEvidence.push('wixstatic.com assets referenced in scripts/links');
  }
  if (fullHtmlLower.includes('wix-image') || fullHtmlLower.includes('wix-dropdown')) {
    wixEvidence.push('Wix custom element classes detected');
  }
  if (wixEvidence.length > 0) {
    addTech('wix', 'Wix', 'CMS', wixEvidence, 1.0, true);
  }

  // Squarespace
  const sqspEvidence: string[] = [];
  if (links.some(l => l.includes('squarespace.com') || l.includes('static1.squarespace.com'))) {
    sqspEvidence.push('Squarespace CDN links detected');
  }
  if (scriptContents.some(c => c.includes('SQUARESPACE_CONTEXT'))) {
    sqspEvidence.push('SQUARESPACE_CONTEXT javascript object found');
  }
  if (fullHtmlLower.includes('squarespace-id')) {
    sqspEvidence.push('squarespace-id class or attribute detected');
  }
  if (sqspEvidence.length > 0) {
    addTech('squarespace', 'Squarespace', 'CMS', sqspEvidence, 1.0, true);
  }

  // ── 3. MODERN WEB FRAMEWORKS ──

  // Next.js
  const nextEvidence: string[] = [];
  if ($('#__next').length > 0) {
    nextEvidence.push('DOM root element #__next present');
  }
  if (scripts.some(s => s.includes('/_next/'))) {
    nextEvidence.push('Script loaded from /_next/ static bundle');
  }
  if (scriptContents.some(c => c.includes('__NEXT_DATA__'))) {
    nextEvidence.push('__NEXT_DATA__ hydration script detected');
  }
  if (nextEvidence.length > 0) {
    addTech('nextjs', 'Next.js', 'FRAMEWORK', nextEvidence, 1.0);
    // Next.js always uses React
    addTech('react', 'React', 'FRAMEWORK', ['Inherited from Next.js runtime'], 1.0);
  }

  // React (Standalone)
  if (!detailedMap.has('react')) {
    const reactEvidence: string[] = [];
    if ($('[data-reactroot]').length > 0) {
      reactEvidence.push('DOM element with [data-reactroot] detected');
    }
    if (scripts.some(s => s.includes('react') || s.includes('react-dom'))) {
      reactEvidence.push('React or ReactDOM referenced in script src');
    }
    if (scriptContents.some(c => c.includes('react.production') || c.includes('_reactListenSplit'))) {
      reactEvidence.push('React production runtime markers found in inline script');
    }
    if (reactEvidence.length > 0) {
      addTech('react', 'React', 'FRAMEWORK', reactEvidence, reactEvidence.length > 1 ? 0.95 : 0.85);
    }
  }

  // Vue.js
  const vueEvidence: string[] = [];
  if ($('[data-v-]').length > 0 || $('[v-cloak]').length > 0) {
    vueEvidence.push('Vue scoped CSS attribute or v-cloak detected');
  }
  if (scripts.some(s => s.includes('vue.js') || s.includes('vue.min.js') || s.includes('vue.runtime'))) {
    vueEvidence.push('Vue script src detected');
  }
  if (vueEvidence.length > 0) {
    addTech('vue', 'Vue.js', 'FRAMEWORK', vueEvidence, 0.95);
  }

  // ── 4. ANALYTICS & TAG MANAGERS ──

  // Google Analytics 4 (GA4)
  const ga4Evidence: string[] = [];
  if (scripts.some(s => s.includes('googletagmanager.com/gtag/js?id=g-') || s.includes('google-analytics.com/analytics.js'))) {
    ga4Evidence.push('Google Analytics gtag loader found with G- measurement ID');
  }
  if (scriptContents.some(c => /(?:gtag\s*\(\s*['"]config['"]\s*,\s*['"]G-[A-Z0-9]+['"])/i.test(c))) {
    ga4Evidence.push('gtag config invocation with G- measurement ID found');
  }
  if (ga4Evidence.length > 0) {
    addTech('ga4', 'Google Analytics 4', 'ANALYTICS', ga4Evidence, 1.0);
    technologies.add('Google Analytics');
  } else if (
    scripts.some(s => s.includes('google-analytics.com/analytics.js')) ||
    scriptContents.some(c => c.includes('ga(') || c.includes('google_analytics'))
  ) {
    addTech('ga_universal', 'Google Analytics', 'ANALYTICS', ['Legacy Universal Analytics script or ga() call'], 0.9);
  }

  // Google Tag Manager (GTM)
  const gtmEvidence: string[] = [];
  if (scripts.some(s => s.includes('googletagmanager.com/gtm.js'))) {
    gtmEvidence.push('googletagmanager.com/gtm.js loaded');
  }
  if (scriptContents.some(c => c.includes('gtm.start') || /GTM-[A-Z0-9]+/i.test(c))) {
    gtmEvidence.push('gtm.start event or GTM container ID present in script');
  }
  if (gtmEvidence.length > 0) {
    addTech('gtm', 'GTM', 'ANALYTICS', gtmEvidence, 1.0);
  }

  // Meta Pixel
  const metaPixelEvidence: string[] = [];
  if (scripts.some(s => s.includes('connect.facebook.net/en_us/fbevents.js') || s.includes('connect.facebook.net'))) {
    metaPixelEvidence.push('connect.facebook.net/en_US/fbevents.js loaded');
  }
  if (scriptContents.some(c => c.includes('fbq(') || c.includes('fbq.push') || c.includes('_fbq'))) {
    metaPixelEvidence.push('fbq() initialization or tracking call detected');
  }
  if (metaPixelEvidence.length > 0) {
    addTech('meta_pixel', 'Meta Pixel', 'ANALYTICS', metaPixelEvidence, 1.0);
  }

  // ── 5. E-COMMERCE PLATFORMS & GATEWAYS ──
  let isEcommerce = false;
  let ecommercePlatform: string | null = null;
  const ecommerceEvidence: string[] = [];

  // WooCommerce
  if (
    fullHtmlLower.includes('woocommerce') ||
    $('.woocommerce, .woocommerce-page').length > 0 ||
    scripts.some(s => s.includes('woocommerce'))
  ) {
    isEcommerce = true;
    ecommercePlatform = 'WooCommerce';
    ecommerceEvidence.push('WooCommerce stylesheet/scripts or CSS container classes present');
    addTech('woocommerce', 'WooCommerce', 'ECOMMERCE', ecommerceEvidence, 1.0);
  }

  // Shopify as E-commerce
  if (detailedMap.has('shopify')) {
    isEcommerce = true;
    if (!ecommercePlatform) ecommercePlatform = 'Shopify';
    ecommerceEvidence.push('Shopify store infrastructure detected');
  }

  // Magento
  if (
    scripts.some(s => s.includes('mage/cookies.js') || s.includes('varien/')) ||
    fullHtmlLower.includes('mage-init')
  ) {
    isEcommerce = true;
    if (!ecommercePlatform) ecommercePlatform = 'Magento';
    ecommerceEvidence.push('Magento mage/cookies.js or data-mage-init scripts detected');
    addTech('magento', 'Magento', 'ECOMMERCE', ['Magento core scripts loaded'], 0.95);
  }

  // BigCommerce
  if (links.some(l => l.includes('cdn11.bigcommerce.com')) || scripts.some(s => s.includes('stencil-utils'))) {
    isEcommerce = true;
    if (!ecommercePlatform) ecommercePlatform = 'BigCommerce';
    ecommerceEvidence.push('BigCommerce CDN or Stencil framework detected');
    addTech('bigcommerce', 'BigCommerce', 'ECOMMERCE', ['BigCommerce CDN assets loaded'], 0.95);
  }

  // Stripe Payment Integration
  if (
    scripts.some(s => s.includes('js.stripe.com')) ||
    scriptContents.some(c => c.includes('Stripe(') || c.includes('elements.create'))
  ) {
    addTech('stripe', 'Stripe', 'ECOMMERCE', ['js.stripe.com SDK or Stripe Elements initialized'], 0.95);
    ecommerceEvidence.push('Stripe checkout or payment elements detected');
    isEcommerce = true;
    if (!ecommercePlatform) ecommercePlatform = 'Stripe Elements';
  }

  // Generic Cart/Checkout signals
  if (!isEcommerce) {
    const hasCart = $('[id*="cart"], [class*="cart"], a[href*="/cart"], a[href*="/checkout"]').length > 0;
    const hasPrice = $('[class*="price"], [itemprop="price"]').length > 0;
    if (hasCart && hasPrice) {
      isEcommerce = true;
      ecommerceEvidence.push('Generic cart and pricing elements present in DOM');
    }
  }

  // ── 6. OPEN GRAPH METADATA ──
  const ogTags: Record<string, string> = {};
  $('meta[property^="og:"], meta[name^="og:"]').each((_, el) => {
    const prop = $(el).attr('property') || $(el).attr('name') || '';
    const content = $(el).attr('content') || '';
    if (prop && content) {
      ogTags[prop.toLowerCase()] = content.trim();
    }
  });

  const ogTitle = ogTags['og:title'];
  const ogDesc = ogTags['og:description'];
  const ogImage = ogTags['og:image'];
  const ogUrl = ogTags['og:url'];
  const ogType = ogTags['og:type'];

  let ogKeyCount = 0;
  if (ogTitle) ogKeyCount++;
  if (ogDesc) ogKeyCount++;
  if (ogImage) ogKeyCount++;
  if (ogUrl) ogKeyCount++;

  const hasOpenGraph = Object.keys(ogTags).length > 0;
  const openGraphCompleteness = Number((ogKeyCount / 4).toFixed(2));

  if (hasOpenGraph) {
    addTech('opengraph', 'Open Graph', 'METADATA', [`${Object.keys(ogTags).length} Open Graph meta tags found`], 1.0);
  }

  // ── 7. SCHEMA.ORG STRUCTURED DATA ──
  const schemaTypes: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const text = $(el).text().trim();
      if (!text) return;
      const parsed = JSON.parse(text);
      const extractType = (obj: any) => {
        if (!obj || typeof obj !== 'object') return;
        if (obj['@type']) {
          const t = Array.isArray(obj['@type']) ? obj['@type'] : [obj['@type']];
          t.forEach((item: any) => {
            if (typeof item === 'string') schemaTypes.push(item);
          });
        }
        if (Array.isArray(obj['@graph'])) {
          obj['@graph'].forEach(extractType);
        }
      };
      extractType(parsed);
    } catch {
      // Malformed JSON-LD ignored
    }
  });

  // Microdata fallback
  $('[itemtype]').each((_, el) => {
    const itemType = $(el).attr('itemtype') || '';
    if (itemType.includes('schema.org/')) {
      const typeName = itemType.split('schema.org/')[1]?.split('/')[0];
      if (typeName) schemaTypes.push(typeName);
    }
  });

  const uniqueSchemaTypes = Array.from(new Set(schemaTypes));
  const hasSchemaOrg = uniqueSchemaTypes.length > 0;

  if (hasSchemaOrg) {
    addTech(
      'schema_org',
      'Schema.org',
      'METADATA',
      [`Structured data types detected: ${uniqueSchemaTypes.join(', ')}`],
      1.0
    );
  }

  // ── 8. WIDGETS & CRM INTEGRATIONS ──
  if (scripts.some(s => s.includes('calendly.com')) || links.some(l => l.includes('calendly.com'))) {
    addTech('calendly', 'Calendly', 'WIDGET', ['Calendly script or stylesheet loaded'], 1.0);
  }
  if (scripts.some(s => s.includes('widget.intercom.io'))) {
    addTech('intercom', 'Intercom', 'WIDGET', ['Intercom widget script loaded'], 1.0);
  }
  if (scripts.some(s => s.includes('js.hs-scripts.com') || s.includes('js.hsadspixel.net'))) {
    addTech('hubspot', 'HubSpot', 'WIDGET', ['HubSpot tracking script loaded'], 1.0);
  }

  return {
    technologies: Array.from(technologies),
    cms: primaryCms,
    detailedTechnologies: Array.from(detailedMap.values()),
    ecommerce: {
      isEcommerce,
      platform: ecommercePlatform,
      confidence: isEcommerce ? 0.9 : 0.0,
      evidence: ecommerceEvidence,
    },
    openGraph: {
      hasOpenGraph,
      completeness: openGraphCompleteness,
      title: ogTitle,
      description: ogDesc,
      image: ogImage,
      url: ogUrl,
      type: ogType,
      tags: ogTags,
    },
    schemaOrg: {
      hasSchemaOrg,
      types: uniqueSchemaTypes,
      count: uniqueSchemaTypes.length,
    },
  };
}
