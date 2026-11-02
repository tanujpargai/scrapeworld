import type { ICPOperator, ICPRuleType, ScoringMode } from '@/types/icp';

export interface FieldOption {
  value: string;
  label: string;
  type: 'number' | 'text' | 'boolean' | 'list' | 'keywords';
  category: string;
  description?: string;
}

export const COMMON_FIELDS: FieldOption[] = [
  // Reviews & Reputation (Marketing Signals)
  { value: 'reviewCount', label: 'Review Count (Google)', type: 'number', category: 'Reviews & Reputation', description: 'Total number of Google reviews' },
  { value: 'rating', label: 'Star Rating (Google)', type: 'number', category: 'Reviews & Reputation', description: 'Average rating 1.0 - 5.0' },
  { value: 'reviewActivityTier', label: 'Review Activity Tier (HIGH / MODERATE / LOW / INACTIVE)', type: 'text', category: 'Reviews & Reputation', description: 'Review volume velocity tier' },
  { value: 'hasGoogleMapsPresence', label: 'Google Maps Profile Exists (Boolean)', type: 'boolean', category: 'Reviews & Reputation', description: 'Whether business has an active Google Maps profile' },

  // Website & Online Presence
  { value: 'website', label: 'Website URL', type: 'text', category: 'Online Presence', description: 'Existing website address' },
  { value: 'hasWebsite', label: 'Has Website (Boolean)', type: 'boolean', category: 'Online Presence', description: 'Whether a website exists' },
  { value: 'isHttps', label: 'Has HTTPS / SSL (Boolean)', type: 'boolean', category: 'Online Presence', description: 'Secure TLS/SSL protocol enabled' },
  { value: 'cms', label: 'Detected CMS / Platform', type: 'text', category: 'Online Presence', description: 'e.g. WordPress, Shopify, Webflow, Wix, Squarespace' },
  { value: 'detectedTechnologies', label: 'Detected Technologies (List)', type: 'list', category: 'Online Presence', description: 'List of detected CMS, frameworks, and tools' },

  // Website Conversion & Feature Signals (Agency Sales Opportunities)
  { value: 'hasWhatsApp', label: 'Has WhatsApp Integration (Boolean)', type: 'boolean', category: 'Website Features & Conversion', description: 'WhatsApp click-to-chat integration detected (wa.me link)' },
  { value: 'hasCta', label: 'Has Call-to-Action / CTA Button (Boolean)', type: 'boolean', category: 'Website Features & Conversion', description: 'Prominent booking/quote/consultation CTA buttons' },
  { value: 'hasContactForm', label: 'Has Contact Form (Boolean)', type: 'boolean', category: 'Website Features & Conversion', description: 'HTML lead capture or contact form present' },
  { value: 'mobileResponsive', label: 'Mobile Responsive Viewport (Boolean)', type: 'boolean', category: 'Website Features & Conversion', description: 'Viewport meta tag configured for mobile displays' },
  { value: 'hasAnalytics', label: 'Has Analytics Tracking (Boolean)', type: 'boolean', category: 'Website Features & Conversion', description: 'Google Analytics or GTM tracking detected' },
  { value: 'hasMetaPixel', label: 'Has Meta / Facebook Pixel (Boolean)', type: 'boolean', category: 'Website Features & Conversion', description: 'Meta advertising pixel detected' },
  { value: 'hasBrokenLinks', label: 'Has Broken or Empty Links (Boolean)', type: 'boolean', category: 'Website Features & Conversion', description: 'Placeholder empty or javascript void links detected' },
  { value: 'lastUpdatedYear', label: 'Website Copyright / Last Updated Year', type: 'number', category: 'Website Features & Conversion', description: 'Year detected in footer copyright notice (e.g. 2018 signals outdated site)' },
  { value: 'websiteAgeYears', label: 'Estimated Website Age (Years)', type: 'number', category: 'Website Features & Conversion', description: 'Years since website copyright inception' },

  // Website Audit & Performance
  { value: 'websiteQuality', label: 'Website Quality (0-100)', type: 'number', category: 'Website Audit', description: 'Overall website audit & design quality score' },
  { value: 'hasMetaTitle', label: 'Has SEO Title Tag (Boolean)', type: 'boolean', category: 'Website Audit', description: 'Title tag exists in document head' },
  { value: 'hasMetaDescription', label: 'Has Meta Description (Boolean)', type: 'boolean', category: 'Website Audit', description: 'SEO meta description tag exists' },
  { value: 'h1Count', label: 'H1 Tag Count', type: 'number', category: 'Website Audit', description: 'Number of H1 headings found on page' },
  { value: 'websiteData.overallScore', label: 'Website Overall Score (0-100)', type: 'number', category: 'Website Audit', description: 'Composite audit score' },
  { value: 'websiteData.performanceScore', label: 'Performance Score (Lighthouse 0-100)', type: 'number', category: 'Website Audit', description: 'Lighthouse speed score' },
  { value: 'websiteData.seoScore', label: 'SEO Audit Score (0-100)', type: 'number', category: 'Website Audit', description: 'Search engine optimization health' },
  { value: 'websiteData.mobileScore', label: 'Mobile Optimization Score (0-100)', type: 'number', category: 'Website Audit', description: 'Mobile responsiveness score' },
  { value: 'websiteData.cms', label: 'Detected CMS / Tech Stack', type: 'text', category: 'Website Audit', description: 'e.g. WordPress, Wix, Squarespace, Shopify' },
  { value: 'websiteData.hasSsl', label: 'Has SSL / HTTPS (Boolean)', type: 'boolean', category: 'Website Audit', description: 'Whether site has valid SSL certificate' },
  { value: 'websiteData.loadTimeMs', label: 'Page Load Time (ms)', type: 'number', category: 'Website Audit', description: 'Time taken to load page in milliseconds' },

  // Social Media Presence
  { value: 'socialPlatformCount', label: 'Social Platforms Count (Number)', type: 'number', category: 'Social Media', description: 'Total number of active social profiles detected' },
  { value: 'hasInstagram', label: 'Has Instagram Profile (Boolean)', type: 'boolean', category: 'Social Media', description: 'Active Instagram link found' },
  { value: 'hasFacebook', label: 'Has Facebook Page (Boolean)', type: 'boolean', category: 'Social Media', description: 'Active Facebook link found' },
  { value: 'hasLinkedIn', label: 'Has LinkedIn Profile (Boolean)', type: 'boolean', category: 'Social Media', description: 'Company LinkedIn profile found' },
  { value: 'hasTwitter', label: 'Has Twitter / X Profile (Boolean)', type: 'boolean', category: 'Social Media', description: 'Twitter or X link found' },
  { value: 'hasYouTube', label: 'Has YouTube Channel (Boolean)', type: 'boolean', category: 'Social Media', description: 'YouTube channel link found' },
  { value: 'instagram', label: 'Instagram Profile URL', type: 'text', category: 'Social Media', description: 'Active Instagram link' },
  { value: 'facebook', label: 'Facebook Page URL', type: 'text', category: 'Social Media', description: 'Active Facebook page link' },
  { value: 'linkedin', label: 'LinkedIn Company URL', type: 'text', category: 'Social Media', description: 'Company LinkedIn profile' },

  // Contactability & Decision Makers
  { value: 'phone', label: 'Phone Number', type: 'text', category: 'Contactability', description: 'Business phone contact' },
  { value: 'hasPhone', label: 'Has Phone (Boolean)', type: 'boolean', category: 'Contactability', description: 'Whether phone number is available' },
  { value: 'email', label: 'Email Address', type: 'text', category: 'Contactability', description: 'Direct business contact email' },
  { value: 'hasEmail', label: 'Has Email (Boolean)', type: 'boolean', category: 'Contactability', description: 'Whether email contact was resolved' },
  { value: 'ownerName', label: 'Owner / Contact Name', type: 'text', category: 'Contactability', description: 'Identified owner or decision maker' },
  { value: 'hasOwner', label: 'Has Owner Name (Boolean)', type: 'boolean', category: 'Contactability', description: 'Whether owner name was resolved' },

  // Business Profile & Operations
  { value: 'businessStatus', label: 'Business Status (e.g. OPERATIONAL)', type: 'text', category: 'Business Profile', description: 'Operating status of the business' },
  { value: 'hasMultipleLocations', label: 'Has Multiple Locations (Boolean)', type: 'boolean', category: 'Business Profile', description: 'Multi-location or franchise branch indicator' },
  { value: 'growthIndicator', label: 'Growth Indicator (HIGH_VELOCITY, STEADY)', type: 'text', category: 'Business Profile', description: 'Reputation velocity and customer volume growth tier' },
  { value: 'businessAge', label: 'Business Age (Years)', type: 'number', category: 'Business Profile', description: 'Years in operation / business age' },
  { value: 'foundedYear', label: 'Founded Year', type: 'number', category: 'Business Profile', description: 'Year the business was established' },
  { value: 'employeeCount', label: 'Employee Count', type: 'number', category: 'Business Profile', description: 'Total employee headcount' },
  { value: 'name', label: 'Business Name', type: 'text', category: 'Business Profile', description: 'Company / business trading name' },
  { value: 'industry', label: 'Industry / Primary Category', type: 'text', category: 'Business Profile', description: 'Main business category' },
  { value: 'city', label: 'City / Location', type: 'text', category: 'Business Profile', description: 'Primary city or municipality' },
  { value: 'address', label: 'Full Address', type: 'text', category: 'Business Profile', description: 'Physical street address' },
];

export interface OperatorOption {
  value: ICPOperator;
  label: string;
  category: string;
  description: string;
  requiresSecondValue?: boolean;
}

export const OPERATOR_OPTIONS: OperatorOption[] = [
  // Boolean & Existence
  { value: 'equals', label: 'Equals (=)', category: 'Boolean & Exact', description: 'Value equals target' },
  { value: 'not_equals', label: 'Not Equals (≠)', category: 'Boolean & Exact', description: 'Value does not equal target' },
  { value: 'exists', label: 'Exists (Not Empty)', category: 'Existence', description: 'Field is present and non-empty' },
  { value: 'does_not_exist', label: 'Does Not Exist (Empty)', category: 'Existence', description: 'Field is missing, null, or empty' },

  // Numeric
  { value: 'greater_than', label: 'Greater Than (>)', category: 'Numeric', description: 'Numeric value strictly greater' },
  { value: 'greater_than_or_equal', label: 'Greater Than or Equal (≥)', category: 'Numeric', description: 'Numeric value greater than or equal' },
  { value: 'less_than', label: 'Less Than (<)', category: 'Numeric', description: 'Numeric value strictly less' },
  { value: 'less_than_or_equal', label: 'Less Than or Equal (≤)', category: 'Numeric', description: 'Numeric value less than or equal' },
  { value: 'between', label: 'Between Range [Min, Max]', category: 'Numeric', description: 'Value is within inclusive range', requiresSecondValue: true },

  // Text
  { value: 'contains', label: 'Contains Substring', category: 'Text', description: 'Text contains specified phrase' },
  { value: 'does_not_contain', label: 'Does Not Contain Substring', category: 'Text', description: 'Text does not contain phrase' },
  { value: 'exact_match', label: 'Exact Match', category: 'Text', description: 'Text matches exactly' },
  { value: 'starts_with', label: 'Starts With', category: 'Text', description: 'Text starts with prefix' },
  { value: 'ends_with', label: 'Ends With', category: 'Text', description: 'Text ends with suffix' },

  // List
  { value: 'is_one_of', label: 'Is One Of (Any in List)', category: 'List', description: 'Matches any comma-separated item' },
  { value: 'is_not_one_of', label: 'Is Not One Of (None in List)', category: 'List', description: 'Does not match any item in list' },

  // Keywords
  { value: 'must_contain', label: 'Must Contain (All Keywords)', category: 'Keywords', description: 'All keywords must be present' },
  { value: 'must_not_contain', label: 'Must Not Contain (Prohibited)', category: 'Keywords', description: 'None of the keywords may be present' },
  { value: 'contains_any', label: 'Contains Any (At Least One)', category: 'Keywords', description: 'At least one keyword must be present' },
  { value: 'contains_all', label: 'Contains All Keywords', category: 'Keywords', description: 'All keywords must be present' },
];

export const TARGET_SERVICES = [
  { value: 'WEBSITE_REDESIGN', label: 'Website Redesign & Modernization' },
  { value: 'LOCAL_SEO', label: 'Local SEO & Maps Ranking' },
  { value: 'GOOGLE_ADS', label: 'Google Ads & Paid Search' },
  { value: 'PERFORMANCE_MARKETING', label: 'Performance & Growth Marketing' },
  { value: 'REPUTATION_MANAGEMENT', label: 'Reputation & Review Generation' },
  { value: 'SOCIAL_MEDIA', label: 'Social Media Management' },
  { value: 'CUSTOM', label: 'Custom Agency Service' },
];

export const RULE_TYPES: Array<{ value: ICPRuleType; label: string; badge: string; description: string }> = [
  {
    value: 'HARD_FILTER',
    label: 'Hard Filter',
    badge: 'MUST PASS',
    description: 'Mandatory requirement. If failed, lead is immediately disqualified from this ICP.',
  },
  {
    value: 'SOFT_SIGNAL',
    label: 'Scoring Signal',
    badge: 'POINTS (+/-)',
    description: 'Contributes weighted points to the opportunity score (0–100). Higher scores indicate higher sales urgency.',
  },
  {
    value: 'EXCLUSION',
    label: 'Exclusion',
    badge: 'AUTO-REJECT',
    description: 'Disqualifying signal. If matched (e.g. competitor, government agency, student housing), lead is rejected.',
  },
];

export const SAMPLE_TEST_BUSINESSES = [
  {
    name: 'Apex Orthopedic Clinic',
    category: 'High-Value Clinic (Outdated Site)',
    business: {
      name: 'Apex Orthopedic Clinic',
      industry: 'Orthopedic Surgeon',
      city: 'Austin',
      reviewCount: 145,
      rating: 4.8,
      phone: '+1-512-555-0199',
      hasPhone: true,
      website: 'http://apexortho-old.com',
      hasWebsite: true,
      ownerName: 'Dr. Marcus Vance',
      hasOwner: true,
      websiteData: {
        overallScore: 38,
        performanceScore: 32,
        seoScore: 45,
        mobileScore: 35,
        cms: 'WordPress',
        hasSsl: false,
        loadTimeMs: 4800,
      },
      instagram: 'https://instagram.com/apexortho',
    },
  },
  {
    name: 'Bella Vita Artisan Trattoria',
    category: 'High-Rated Restaurant (No Website)',
    business: {
      name: 'Bella Vita Artisan Trattoria',
      industry: 'Italian Restaurant',
      city: 'Chicago',
      reviewCount: 320,
      rating: 4.7,
      phone: '+1-312-555-0144',
      hasPhone: true,
      website: '',
      hasWebsite: false,
      ownerName: 'Gianni Rossi',
      hasOwner: true,
      instagram: 'https://instagram.com/bellavitachicago',
      websiteData: null,
    },
  },
  {
    name: 'Vanguard Digital Media Agency',
    category: 'Competitor / Peer Agency (Should be Excluded)',
    business: {
      name: 'Vanguard Digital Media Agency',
      industry: 'Marketing Agency',
      city: 'New York',
      reviewCount: 88,
      rating: 4.9,
      phone: '+1-212-555-0122',
      hasPhone: true,
      website: 'https://vanguarddigital.io',
      hasWebsite: true,
      ownerName: 'Elena Rostova',
      hasOwner: true,
      websiteData: {
        overallScore: 94,
        performanceScore: 92,
        seoScore: 96,
        mobileScore: 95,
        cms: 'Next.js',
        hasSsl: true,
        loadTimeMs: 800,
      },
    },
  },
  {
    name: 'Summit HVAC & Heating Solutions',
    category: 'Local Trade Business (Wix Site, Low SEO)',
    business: {
      name: 'Summit HVAC & Heating Solutions',
      industry: 'HVAC Contractor',
      city: 'Denver',
      reviewCount: 42,
      rating: 4.3,
      phone: '+1-303-555-0182',
      hasPhone: true,
      website: 'https://summithvacdenver.wixsite.com/site',
      hasWebsite: true,
      ownerName: 'Dave Miller',
      hasOwner: true,
      websiteData: {
        overallScore: 48,
        performanceScore: 40,
        seoScore: 35,
        mobileScore: 42,
        cms: 'Wix',
        hasSsl: true,
        loadTimeMs: 3900,
      },
    },
  },
];
