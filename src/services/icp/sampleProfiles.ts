/**
 * Sample / Standard ICP Profiles for Web Development & Marketing Agencies
 * 
 * Demonstrates configurable Ideal Customer Profiles for:
 * 1. Web Development Agency: Website Redesign & Modernization Candidates
 * 2. Digital Marketing Agency: Local SEO & Reputation Clients
 * 3. General Local Business High-Intent Profile
 */

import type { ICPProfile } from '../../types/icp';

/**
 * ICP Profile 1: Web Development Agency - Website Redesign Candidates
 * Targets established businesses with either no website or poor, outdated websites.
 */
export const WebDevRedesignICP: ICPProfile = {
  id: 'icp-webdev-redesign',
  name: 'Web Dev: Redesign & Performance Modernization',
  description: 'Identifies established local businesses with active revenue but broken, slow, or missing websites.',
  targetNiche: 'High-margin local services (Clinics, Law firms, Contractors, High-end Dining)',
  targetService: 'WEBSITE_REDESIGN',
  isActive: true,
  scoringConfig: {
    mode: 'additive',
    maxScore: 100,
    minPassingScore: 30,
    highPriorityThreshold: 70,
    mediumPriorityThreshold: 45,
    zeroScoreOnDisqualification: true,
  },
  rules: [
    // ── HARD FILTERS ──
    {
      id: 'hf-min-reviews',
      name: 'Minimum Established Business (>= 15 Reviews)',
      description: 'Ensures the business is actively operating and generates client flow.',
      type: 'HARD_FILTER',
      condition: {
        field: 'reviewCount',
        operator: 'greater_than_or_equal',
        value: 15,
      },
      failureExplanation: 'Disqualified: Less than 15 Google reviews indicates early-stage or inactive business.',
    },
    {
      id: 'hf-must-have-phone',
      name: 'Direct Phone Number Present',
      description: 'Outreach channel requirement: Must have a phone number to pitch.',
      type: 'HARD_FILTER',
      condition: {
        field: 'phone',
        operator: 'exists',
      },
      failureExplanation: 'Disqualified: Missing phone number makes direct sales outreach impossible.',
    },
    {
      id: 'hf-must-be-operational',
      name: 'Actively Operational Business',
      description: 'Disqualifies permanently closed establishments.',
      type: 'HARD_FILTER',
      condition: {
        field: 'businessStatus',
        operator: 'not_equals',
        value: 'PERMANENTLY_CLOSED',
      },
      failureExplanation: 'Disqualified: Business is marked permanently closed.',
    },

    // ── EXCLUSIONS ──
    {
      id: 'ex-no-competitor-agencies',
      name: 'Exclude Competitor Digital / Web Agencies',
      description: 'Rejects other digital marketing or web development agencies.',
      type: 'EXCLUSION',
      condition: {
        field: 'industry',
        operator: 'contains_any',
        value: ['marketing', 'web design', 'software', 'seo agency'],
      },
      explanation: 'Disqualified: Identified as a peer digital agency / software firm.',
    },
    {
      id: 'ex-no-enterprise-hospitals',
      name: 'Exclude Massive Enterprise Hospital Chains',
      description: 'Enterprise healthcare chains require procurement contracts, not agency pitches.',
      type: 'EXCLUSION',
      condition: {
        field: 'name',
        operator: 'contains_any',
        value: ['apollo', 'fortis', 'max healthcare', 'medanta'],
      },
      explanation: 'Disqualified: National enterprise chain with dedicated internal IT.',
    },

    // ── SOFT SIGNALS (OPPORTUNITY SCORING) ──
    {
      id: 'ss-no-website',
      name: 'No Website Detected (+30 pts)',
      description: 'High-intent need: Actively operating with reviews but zero web presence.',
      type: 'SOFT_SIGNAL',
      condition: {
        field: 'website',
        operator: 'does_not_exist',
      },
      weight: 30,
      explanation: 'Critical Need: Established business has no website; prime candidate for fresh build.',
    },
    {
      id: 'ss-low-overall-score',
      name: 'Poor Overall Website Quality (< 60) (+20 pts)',
      description: 'Existing website score is below modern standards.',
      type: 'SOFT_SIGNAL',
      condition: {
        field: 'websiteData.overallScore',
        operator: 'less_than',
        value: 60,
      },
      weight: 20,
      explanation: 'Technical Need: Overall website quality score is low (<60), signaling redesign opportunity.',
    },
    {
      id: 'ss-slow-performance',
      name: 'Slow Mobile / Performance Score (< 50) (+15 pts)',
      description: 'Poor loading performance damages conversion rates.',
      type: 'SOFT_SIGNAL',
      condition: {
        field: 'websiteData.performanceScore',
        operator: 'less_than',
        value: 50,
      },
      weight: 15,
      explanation: 'Performance Deficit: Mobile loading and website performance is severely impaired (<50).',
    },
    {
      id: 'ss-missing-ssl',
      name: 'Missing or Invalid SSL (+15 pts)',
      description: 'Insecure website warnings scare away visitors.',
      type: 'SOFT_SIGNAL',
      condition: {
        field: 'websiteData.sslEnabled',
        operator: 'equals',
        value: false,
      },
      weight: 15,
      explanation: 'Security Deficit: Missing SSL certificate causes browser security warnings.',
    },
    {
      id: 'ss-high-ability-to-pay',
      name: 'High Ability to Pay (>= 100 Reviews) (+20 pts)',
      description: 'Indicates high customer turnover and budget to invest in web infrastructure.',
      type: 'SOFT_SIGNAL',
      condition: {
        field: 'reviewCount',
        operator: 'greater_than_or_equal',
        value: 100,
      },
      weight: 20,
      explanation: 'Budget Indicator: High review count (>=100) confirms strong revenue capacity.',
    },
  ],
};

/**
 * ICP Profile 2: Digital Marketing Agency - Local SEO & Ad Clients
 * Targets businesses with good ratings but missing modern SEO and analytics tracking.
 */
export const MarketingAgencyICP: ICPProfile = {
  id: 'icp-marketing-seo',
  name: 'Marketing: Local SEO & Paid Acquisition',
  description: 'Targets high-rated businesses that lack organic search optimization or analytics instrumentation.',
  targetNiche: 'Local service businesses',
  targetService: 'LOCAL_SEO',
  isActive: true,
  scoringConfig: {
    mode: 'additive',
    maxScore: 100,
    minPassingScore: 25,
    highPriorityThreshold: 65,
    mediumPriorityThreshold: 40,
  },
  rules: [
    // ── HARD FILTERS ──
    {
      id: 'hf-min-rating',
      name: 'Good Reputation (Rating >= 4.0)',
      type: 'HARD_FILTER',
      condition: {
        field: 'rating',
        operator: 'greater_than_or_equal',
        value: 4.0,
      },
      failureExplanation: 'Disqualified: Reputation rating below 4.0 makes marketing harder to convert.',
    },
    {
      id: 'hf-has-website',
      name: 'Must Have an Active Website',
      type: 'HARD_FILTER',
      condition: {
        field: 'website',
        operator: 'exists',
      },
      failureExplanation: 'Disqualified: SEO services require an active website.',
    },

    // ── EXCLUSIONS ──
    {
      id: 'ex-no-marketing-agencies',
      name: 'Exclude Marketing Companies',
      type: 'EXCLUSION',
      condition: {
        field: 'industry',
        operator: 'contains_any',
        value: ['seo', 'marketing agency', 'advertising', 'public relations'],
      },
      explanation: 'Disqualified: Agency or marketing company.',
    },

    // ── SOFT SIGNALS ──
    {
      id: 'ss-poor-seo-score',
      name: 'Poor SEO Score (< 50) (+35 pts)',
      type: 'SOFT_SIGNAL',
      condition: {
        field: 'websiteData.seoScore',
        operator: 'less_than',
        value: 50,
      },
      weight: 35,
      explanation: 'High Opportunity: SEO score is below 50, indicating major optimization potential.',
    },
    {
      id: 'ss-active-instagram',
      name: 'Active Social Presence But Weak Web (+25 pts)',
      type: 'SOFT_SIGNAL',
      condition: {
        field: 'socialProfilesCount',
        operator: 'greater_than_or_equal',
        value: 1,
      },
      weight: 25,
      explanation: 'Cross-Channel Gap: Business is active on social media but leaking web traffic.',
    },
    {
      id: 'ss-strong-reviews',
      name: 'Strong Local Authority (>= 50 Reviews) (+20 pts)',
      type: 'SOFT_SIGNAL',
      condition: {
        field: 'reviewCount',
        operator: 'greater_than_or_equal',
        value: 50,
      },
      weight: 20,
      explanation: 'Authority: Strong customer base ready for local search dominance.',
    },
    {
      id: 'ss-has-owner-contact',
      name: 'Identified Decision Maker (+20 pts)',
      type: 'SOFT_SIGNAL',
      condition: {
        field: 'hasOwner',
        operator: 'equals',
        value: true,
      },
      weight: 20,
      explanation: 'High Reachability: Owner or decision-maker contact identified.',
    },
  ],
};

/**
 * ICP Profile 3: Web Agency - Modern Conversion & Lead Capture Gap
 * Targets businesses that have traffic/reviews but lack modern conversion infrastructure
 * (WhatsApp chat, high-converting CTA, mobile responsive design, contact form).
 */
export const WebDevConversionICP: ICPProfile = {
  id: 'icp-webdev-conversion',
  name: 'Web Dev: Conversion & WhatsApp Lead Capture',
  description: 'Identifies active businesses missing mobile optimization, WhatsApp chat, and prominent call-to-actions.',
  targetNiche: 'High-traffic local service businesses',
  targetService: 'WEBSITE_REDESIGN',
  isActive: true,
  scoringConfig: {
    mode: 'additive',
    maxScore: 100,
    minPassingScore: 30,
    highPriorityThreshold: 65,
    mediumPriorityThreshold: 40,
  },
  rules: [
    // ── HARD FILTERS ──
    {
      id: 'hf-must-have-website',
      name: 'Active Website Present',
      type: 'HARD_FILTER',
      condition: {
        field: 'hasWebsite',
        operator: 'equals',
        value: true,
      },
      failureExplanation: 'Disqualified: Profile requires an existing website to optimize.',
    },
    {
      id: 'hf-operational-status',
      name: 'Business is Operational',
      type: 'HARD_FILTER',
      condition: {
        field: 'businessStatus',
        operator: 'not_equals',
        value: 'CLOSED',
      },
      failureExplanation: 'Disqualified: Permanently closed businesses cannot be pitched.',
    },
    {
      id: 'hf-has-phone',
      name: 'Phone Number Available',
      type: 'HARD_FILTER',
      condition: {
        field: 'hasPhone',
        operator: 'equals',
        value: true,
      },
      failureExplanation: 'Disqualified: Missing phone contact for sales outreach.',
    },

    // ── EXCLUSIONS ──
    {
      id: 'ex-no-tech-agencies',
      name: 'Exclude Peer Software & Design Agencies',
      type: 'EXCLUSION',
      condition: {
        field: 'industry',
        operator: 'contains_any',
        value: ['web design', 'software company', 'marketing agency'],
      },
      explanation: 'Disqualified: Competitor software or marketing firm.',
    },

    // ── SOFT SIGNALS ──
    {
      id: 'ss-missing-whatsapp',
      name: 'Missing WhatsApp Chat Integration (+25 pts)',
      description: 'Massive opportunity for local lead generation: Pitching 1-click WhatsApp booking.',
      type: 'SOFT_SIGNAL',
      condition: {
        field: 'hasWhatsApp',
        operator: 'equals',
        value: false,
      },
      weight: 25,
      explanation: 'Conversion Gap: No WhatsApp integration found; prime candidate for instant chat setup.',
    },
    {
      id: 'ss-missing-cta',
      name: 'Missing Prominent Call-to-Action (+25 pts)',
      description: 'Lacks explicit "Book Now" or "Get a Quote" conversion buttons.',
      type: 'SOFT_SIGNAL',
      condition: {
        field: 'hasCta',
        operator: 'equals',
        value: false,
      },
      weight: 25,
      explanation: 'CRO Deficit (CTA): Site lacks prominent call-to-action buttons, losing visitor leads.',
    },
    {
      id: 'ss-not-mobile-responsive',
      name: 'Missing Mobile Viewport Responsiveness (+25 pts)',
      description: 'Viewport meta tag missing or misconfigured.',
      type: 'SOFT_SIGNAL',
      condition: {
        field: 'mobileResponsive',
        operator: 'equals',
        value: false,
      },
      weight: 25,
      explanation: 'Mobile Deficit: Site is not mobile-responsive, losing mobile search traffic.',
    },
    {
      id: 'ss-high-review-tier',
      name: 'High Review Activity / Volume (+25 pts)',
      description: 'High customer volume confirms revenue to afford modern redesign.',
      type: 'SOFT_SIGNAL',
      condition: {
        field: 'reviewActivityTier',
        operator: 'equals',
        value: 'HIGH',
      },
      weight: 25,
      explanation: 'High Transaction Volume: High review activity confirms strong client demand.',
    },
  ],
};

/**
 * ICP Profile 4: Digital Marketing Agency - Analytics & Pixel Tracking Gap
 * Targets businesses with strong ratings and multi-channel social presence
 * that are completely blind to web attribution because they lack GA/GTM and Meta Pixel.
 */
export const MarketingAnalyticsOpportunityICP: ICPProfile = {
  id: 'icp-marketing-analytics',
  name: 'Marketing: Web Analytics & Retargeting Gap',
  description: 'Targets established businesses active on social media but leaking paid ad ROI due to missing analytics and tracking pixels.',
  targetNiche: 'Local retail, hospitality, clinics, and professional services',
  targetService: 'PERFORMANCE_MARKETING',
  isActive: true,
  scoringConfig: {
    mode: 'additive',
    maxScore: 100,
    minPassingScore: 35,
    highPriorityThreshold: 70,
    mediumPriorityThreshold: 45,
  },
  rules: [
    // ── HARD FILTERS ──
    {
      id: 'hf-maps-presence',
      name: 'Active Google Maps Profile',
      type: 'HARD_FILTER',
      condition: {
        field: 'hasGoogleMapsPresence',
        operator: 'equals',
        value: true,
      },
      failureExplanation: 'Disqualified: Requires verified Google presence.',
    },
    {
      id: 'hf-good-rating',
      name: 'Minimum Rating (>= 4.2)',
      type: 'HARD_FILTER',
      condition: {
        field: 'rating',
        operator: 'greater_than_or_equal',
        value: 4.2,
      },
      failureExplanation: 'Disqualified: Rating below 4.2 impairs performance marketing conversion.',
    },
    {
      id: 'hf-has-website-url',
      name: 'Active Website Present',
      type: 'HARD_FILTER',
      condition: {
        field: 'hasWebsite',
        operator: 'equals',
        value: true,
      },
      failureExplanation: 'Disqualified: Digital advertising campaigns require a destination landing page.',
    },

    // ── EXCLUSIONS ──
    {
      id: 'ex-no-advertising-agencies',
      name: 'Exclude Peer Advertising Agencies',
      type: 'EXCLUSION',
      condition: {
        field: 'industry',
        operator: 'contains_any',
        value: ['advertising', 'marketing agency', 'pr agency', 'digital agency'],
      },
      explanation: 'Disqualified: Identified as peer advertising / marketing company.',
    },

    // ── SOFT SIGNALS ──
    {
      id: 'ss-missing-analytics-tracking',
      name: 'No Analytics Tracking Detected (+35 pts)',
      description: 'Missing Google Analytics / GTM tracking tag.',
      type: 'SOFT_SIGNAL',
      condition: {
        field: 'hasAnalytics',
        operator: 'equals',
        value: false,
      },
      weight: 35,
      explanation: 'Attribution Gap: Business is running blind with no Google Analytics or GTM tracking.',
    },
    {
      id: 'ss-missing-meta-pixel',
      name: 'No Meta / FB Pixel Detected (+25 pts)',
      description: 'Not tracking conversions or retargeting site visitors on Instagram/Facebook.',
      type: 'SOFT_SIGNAL',
      condition: {
        field: 'hasMetaPixel',
        operator: 'equals',
        value: false,
      },
      weight: 25,
      explanation: 'Retargeting Deficit: No Meta advertising pixel installed for ad audience building.',
    },
    {
      id: 'ss-multi-social-presence',
      name: 'Multi-Channel Social Presence (>= 2 Platforms) (+25 pts)',
      description: 'Active on 2 or more social channels, proving marketing awareness.',
      type: 'SOFT_SIGNAL',
      condition: {
        field: 'socialPlatformCount',
        operator: 'greater_than_or_equal',
        value: 2,
      },
      weight: 25,
      explanation: 'Social Engagement: Active across multiple social platforms with audience to retarget.',
    },
    {
      id: 'ss-missing-meta-description',
      name: 'Missing SEO Meta Description (+15 pts)',
      description: 'Organic search listings lack custom meta descriptions.',
      type: 'SOFT_SIGNAL',
      condition: {
        field: 'hasMetaDescription',
        operator: 'equals',
        value: false,
      },
      weight: 15,
      explanation: 'SEO Deficit: Missing search engine meta description impairs organic click-through rates.',
    },
  ],
};
