/**
 * OfferIntelligenceService - V4.5
 *
 * Determines:
 *   1. What should be sold (primary + secondary offer)
 *   2. Why they need it (offer reason)
 *   3. How to contact them (preferred contact method)
 *   4. What outreach angle should be used (first touch strategy)
 */

interface BusinessSignals {
  name: string;
  industry: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  rating: number | null;
  reviewCount: number | null;
  verifiedWebsite: string | null;
  ownerName: string | null;
  ownerLinkedIn: string | null;
  ownerEmail: string | null;
  ownerConfidence: number | null;
  enterpriseFlag: boolean;
  franchiseFlag: boolean;
  websiteData: {
    overallScore: number | null;
    seoScore: number | null;
    performanceScore: number | null;
    sslEnabled: boolean | null;
    securityScore: number | null;
  } | null;
  socialProfiles: Array<{
    platform: string;
    url: string;
    followersEstimate?: number | null;
    activityScore?: number | null;
  }>;
  opportunities: Array<{ serviceType: string }>;
}

interface OfferIntelligenceResult {
  primaryOffer: string;
  secondaryOffer: string;
  offerConfidence: number;
  offerReason: string;
  preferredContactMethod: string;
  contactMethodReason: string;
  outreachDifficultyScore: number;   // 0-100 (higher = harder)
  outreachDifficultyLevel: string;   // Easy / Medium / Hard / Very Hard
  firstTouchStrategy: string;
  firstTouchReason: string;
  businessSize: string;              // Small / Medium / Large
  abilityToPay: string;             // Low / Medium / High
}

// Industry → offer mapping
const INDUSTRY_OFFER_MAP: Record<string, { primary: string; secondary: string; reason: string }> = {
  // Healthcare / Clinics
  dental: {
    primary: 'Appointment Booking System',
    secondary: 'Local SEO & Google Reviews',
    reason: 'Dental clinics convert heavily through online booking — every missed call is a lost patient.',
  },
  dentist: {
    primary: 'Appointment Booking System',
    secondary: 'Local SEO & Google Reviews',
    reason: 'Dental clinics convert heavily through online booking — every missed call is a lost patient.',
  },
  clinic: {
    primary: 'Booking System',
    secondary: 'Local SEO',
    reason: 'Medical clinics depend on trust signals and easy booking — weak digital presence means patients choose competitors.',
  },
  doctor: {
    primary: 'Booking System',
    secondary: 'Local SEO',
    reason: 'Patients search online before choosing a doctor — poor digital presence means lost consultations.',
  },
  hospital: {
    primary: 'Patient Portal & Booking System',
    secondary: 'Local SEO & Reputation Management',
    reason: 'Hospitals need frictionless digital patient journeys to compete with larger chains.',
  },
  // Food & Beverage
  restaurant: {
    primary: 'Website Redesign',
    secondary: 'Google Reviews Optimization',
    reason: 'Restaurants lose orders daily to competitors with better online presence and review counts.',
  },
  cafe: {
    primary: 'Website Redesign',
    secondary: 'Google Reviews Optimization',
    reason: 'Cafes live and die by social discovery — no online presence means invisible to new customers.',
  },
  bakery: {
    primary: 'Instagram Funnel & Order Automation',
    secondary: 'WhatsApp Business Integration',
    reason: 'Bakeries generate huge impulse orders through social — without a funnel, revenue leaks.',
  },
  // Beauty & Wellness
  salon: {
    primary: 'Instagram Funnel',
    secondary: 'Booking Automation',
    reason: 'Salons with strong Instagram presence see 3x more walk-ins — a booking automation system closes the loop.',
  },
  spa: {
    primary: 'Booking Automation & Instagram Funnel',
    secondary: 'Google Reviews & Local SEO',
    reason: 'Spas rely on repeat clients and referrals — automation retains customers between visits.',
  },
  gym: {
    primary: 'Lead Capture Website',
    secondary: 'WhatsApp Automation & Trial Offers',
    reason: 'Gyms that automate their trial-to-member pipeline see significantly higher conversion rates.',
  },
  fitness: {
    primary: 'Lead Capture Website',
    secondary: 'WhatsApp Automation & Trial Offers',
    reason: 'Fitness businesses that follow up within minutes convert 5x more enquiries into memberships.',
  },
  yoga: {
    primary: 'Booking System & Lead Capture',
    secondary: 'Instagram Content & Community Building',
    reason: 'Yoga studios rely on community — a lead capture + booking system automates enrollment.',
  },
  // Real Estate
  'real estate': {
    primary: 'Lead Capture System',
    secondary: 'WhatsApp Automation',
    reason: 'Real estate agents lose high-value leads to slow follow-up — automation qualifies and routes enquiries instantly.',
  },
  realtor: {
    primary: 'Lead Capture System',
    secondary: 'WhatsApp Automation',
    reason: 'Speed-to-lead is critical in real estate — automated follow-up captures deals competitors miss.',
  },
  property: {
    primary: 'Lead Capture System',
    secondary: 'WhatsApp Automation',
    reason: 'Property businesses with automated lead pipelines close significantly more deals.',
  },
  // Education
  coaching: {
    primary: 'Student Lead Capture & WhatsApp Funnel',
    secondary: 'Local SEO & Google Ads Landing Page',
    reason: 'Coaching institutes that capture leads 24/7 and follow up instantly dominate local enrollment.',
  },
  school: {
    primary: 'Admission Enquiry System',
    secondary: 'WhatsApp Automation & Parent Portal',
    reason: 'Schools with digital admission funnels reduce manual follow-up and improve enrollment rates.',
  },
  tutor: {
    primary: 'Student Lead Capture System',
    secondary: 'WhatsApp Automation',
    reason: 'Tutors who respond instantly to enquiries convert significantly more interested students.',
  },
  // Legal
  lawyer: {
    primary: 'Professional Website & Lead Capture',
    secondary: 'Google Reviews & Local SEO',
    reason: 'Legal clients vet lawyers online before calling — a professional presence establishes trust before first contact.',
  },
  advocate: {
    primary: 'Professional Website & Lead Capture',
    secondary: 'Google Reviews & Local SEO',
    reason: 'Advocates without digital presence lose clients to those who show up in search results.',
  },
  // Default fallback
  default: {
    primary: 'Website Redesign & Lead Capture',
    secondary: 'Local SEO & Google Reviews',
    reason: 'Most local businesses lose customers daily to better-presented competitors — a modern website with clear CTAs is the first fix.',
  },
};

function normalizeIndustry(industry: string | null): string {
  if (!industry) return 'default';
  const lower = industry.toLowerCase();
  for (const key of Object.keys(INDUSTRY_OFFER_MAP)) {
    if (lower.includes(key)) return key;
  }
  return 'default';
}

function getHasSocialPresence(profiles: BusinessSignals['socialProfiles']): boolean {
  return profiles.some(p =>
    p.platform === 'INSTAGRAM' || p.platform === 'FACEBOOK' || p.platform === 'YOUTUBE'
  );
}

function getInstagram(profiles: BusinessSignals['socialProfiles']) {
  return profiles.find(p => p.platform === 'INSTAGRAM');
}

export class OfferIntelligenceService {
  calculate(business: BusinessSignals): OfferIntelligenceResult {
    const industryKey = normalizeIndustry(business.industry);
    const baseOffer = INDUSTRY_OFFER_MAP[industryKey] || INDUSTRY_OFFER_MAP['default'];

    const web = business.websiteData;
    const socials = business.socialProfiles || [];
    const hasSocial = getHasSocialPresence(socials);
    const instagram = getInstagram(socials);
    const reviewCount = business.reviewCount ?? 0;
    const rating = business.rating ?? 0;

    // ----------------------------------------------------------------
    // 1. Refine primary offer based on website signals
    // ----------------------------------------------------------------
    let primaryOffer = baseOffer.primary;
    let secondaryOffer = baseOffer.secondary;
    let offerReason = baseOffer.reason;
    let offerConfidence = 70;

    // No website → Website build is always primary
    if (!business.verifiedWebsite) {
      primaryOffer = 'Website Design & Development';
      offerReason = 'No professional website detected — this business is invisible online and losing customers to competitors daily.';
      offerConfidence = 95;
    } else if (web) {
      const websiteScore = web.overallScore ?? 50;
      const seoScore = web.seoScore ?? 50;
      const perfScore = web.performanceScore ?? 50;

      if (!web.sslEnabled) {
        primaryOffer = 'Website Security & SSL Fix';
        offerReason = `Website has no SSL — browsers flag it as insecure, causing visitors to bounce immediately. Critical fix needed.`;
        offerConfidence = 98;
      } else if (websiteScore < 40) {
        primaryOffer = 'Full Website Redesign';
        offerReason = `Website score is critically low (${websiteScore}/100) — poor design and performance are actively costing this business customers.`;
        offerConfidence = 90;
      } else if (seoScore < 40) {
        primaryOffer = 'Local SEO & Google Business Optimization';
        offerReason = `SEO score is ${seoScore}/100 — this business is invisible in local search results where competitors are capturing clients.`;
        offerConfidence = 88;
      } else if (perfScore < 40) {
        primaryOffer = 'Website Speed & Performance Overhaul';
        offerReason = `Page speed score is ${perfScore}/100 — slow load times cause 53% of visitors to abandon, directly impacting revenue.`;
        offerConfidence = 85;
      } else {
        // Website is decent — promote what's truly missing
        if (
          industryKey === 'restaurant' || industryKey === 'cafe' ||
          industryKey === 'salon' || industryKey === 'gym' || industryKey === 'fitness'
        ) {
          if (instagram && (instagram.followersEstimate ?? 0) > 500) {
            primaryOffer = 'Instagram Funnel & Lead Capture';
            offerReason = 'Active Instagram presence detected but no clear booking or lead capture flow — significant revenue is being left on the table.';
            offerConfidence = 85;
          }
        }
      }
    }

    // Boost confidence for high-signal businesses
    if (reviewCount >= 100 && rating >= 4.0) {
      offerConfidence = Math.min(99, offerConfidence + 5);
    }
    if (business.ownerName && (business.ownerConfidence ?? 0) >= 75) {
      offerConfidence = Math.min(99, offerConfidence + 3);
    }

    // ----------------------------------------------------------------
    // 2. Preferred Contact Method
    // ----------------------------------------------------------------
    let preferredContactMethod: string;
    let contactMethodReason: string;

    if (business.ownerLinkedIn && (business.ownerConfidence ?? 0) >= 80) {
      preferredContactMethod = 'LinkedIn DM';
      contactMethodReason = 'Decision maker identified with LinkedIn profile — direct DM to owner has highest response rate.';
    } else if (business.ownerEmail) {
      preferredContactMethod = 'Owner Email';
      contactMethodReason = 'Direct email to owner is highly effective for B2B outreach.';
    } else if (business.email) {
      preferredContactMethod = 'Business Email';
      contactMethodReason = 'General business email available — outreach with a strong subject line referencing a specific problem is recommended.';
    } else if (getInstagram(socials)) {
      preferredContactMethod = 'Instagram DM';
      contactMethodReason = 'Active Instagram presence — direct message is the best available channel.';
    } else if (socials.some(p => p.platform === 'FACEBOOK')) {
      preferredContactMethod = 'Facebook DM';
      contactMethodReason = 'Active Facebook presence — direct message is the best available channel.';
    } else if (business.phone) {
      preferredContactMethod = 'WhatsApp / Phone Call';
      contactMethodReason = 'Phone number available — WhatsApp or direct call is the fastest path.';
    } else {
      preferredContactMethod = 'Walk-in / Physical Visit';
      contactMethodReason = 'No digital contact info available — the business may only be reachable in person.';
    }

    // ----------------------------------------------------------------
    // 3. Outreach Difficulty Score (0-100, higher = harder)
    // ----------------------------------------------------------------
    let outreachDifficultyScore = 50;

    // Easy signals
    if (business.phone) outreachDifficultyScore -= 20;
    if (business.email) outreachDifficultyScore -= 10;
    if (business.ownerName && (business.ownerConfidence ?? 0) >= 75) outreachDifficultyScore -= 15;
    if (business.ownerLinkedIn) outreachDifficultyScore -= 10;
    if (reviewCount >= 50) outreachDifficultyScore -= 5;

    // Hard signals
    if (business.enterpriseFlag) outreachDifficultyScore += 40;
    if (business.franchiseFlag) outreachDifficultyScore += 25;
    if (!business.phone && !business.email) outreachDifficultyScore += 30;
    if (reviewCount > 1000) outreachDifficultyScore += 10; // Large, likely has internal procurement

    outreachDifficultyScore = Math.max(0, Math.min(100, outreachDifficultyScore));

    let outreachDifficultyLevel: string;
    if (outreachDifficultyScore <= 20) outreachDifficultyLevel = 'Easy';
    else if (outreachDifficultyScore <= 40) outreachDifficultyLevel = 'Medium';
    else if (outreachDifficultyScore <= 65) outreachDifficultyLevel = 'Hard';
    else outreachDifficultyLevel = 'Very Hard';

    // ----------------------------------------------------------------
    // 4. First Touch Strategy
    // ----------------------------------------------------------------
    let firstTouchStrategy: string;
    let firstTouchReason: string;

    const ownerRef = business.ownerName ? `Hi ${business.ownerName.split(' ')[0]}` : 'Hi there';

    if (!business.verifiedWebsite) {
      firstTouchStrategy = `${ownerRef}, I noticed ${business.name} doesn't have a website yet. I help ${business.industry || 'local businesses'} in ${business.city || 'Delhi'} get online and start getting calls within 30 days. Can I show you what we built for similar businesses nearby?`;
      firstTouchReason = 'No website — lead with the problem (invisibility) and social proof from local competitors.';
    } else if (web && !web.sslEnabled) {
      firstTouchStrategy = `${ownerRef}, I noticed your website for ${business.name} currently shows a security warning to visitors. This is likely costing you patients/customers every day. We can fix this in 24 hours. Want to see?`;
      firstTouchReason = 'SSL missing — security warning is a tangible, provable problem that creates urgency.';
    } else if (reviewCount >= 100 && rating >= 4.2) {
      firstTouchStrategy = `${ownerRef}, ${business.name} has great reviews (${rating}★ from ${reviewCount} people) — that's a real asset. The issue is your digital presence doesn't match the quality. We help businesses like yours turn that reputation into consistent leads online. Can we show you how?`;
      firstTouchReason = 'Strong reviews but weak digital presence — compliment the proof, highlight the gap.';
    } else if (hasSocial) {
      firstTouchStrategy = `${ownerRef}, saw ${business.name} on social media — great content! The gap I noticed is that you don't have a clear way for people who find you online to book or contact you directly. We solve exactly this. 2 min call?`;
      firstTouchReason = 'Active social presence but no booking flow — lead with what they\'re already doing well and show the conversion gap.';
    } else {
      firstTouchStrategy = `${ownerRef}, we help ${business.industry || 'local businesses'} in ${business.city || 'Delhi'} get more clients from Google. I looked at ${business.name} and noticed a few quick wins that could bring you more leads this month. Worth a quick chat?`;
      firstTouchReason = 'Generic but personalized — references the business name, city, and creates curiosity with "quick wins".';
    }

    // ----------------------------------------------------------------
    // 5. Business Size & Ability to Pay
    // ----------------------------------------------------------------
    // Do NOT infer revenue or ability to pay from review counts or public engagement.
    // Explicitly distinguish verified organizational classifications (enterprise/franchise)
    // from unverified financials. Unknown financial capacity remains 'Unknown'.
    let businessSize: string;
    let abilityToPay: string;

    if (business.enterpriseFlag) {
      businessSize = 'Large';
      abilityToPay = 'High';
    } else if (business.franchiseFlag) {
      businessSize = 'Medium';
      abilityToPay = 'Medium';
    } else {
      businessSize = 'Unknown';
      abilityToPay = 'Unknown';
    }

    return {
      primaryOffer,
      secondaryOffer,
      offerConfidence,
      offerReason,
      preferredContactMethod,
      contactMethodReason,
      outreachDifficultyScore,
      outreachDifficultyLevel,
      firstTouchStrategy,
      firstTouchReason,
      businessSize,
      abilityToPay,
    };
  }
}
