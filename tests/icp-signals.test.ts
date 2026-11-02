import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DataNormalizationService, dataNormalizationService } from '../src/services/icp/DataNormalizationService';
import { ICPEngineService } from '../src/services/icp/ICPEngineService';
import { ICPScraperIntegrationService } from '../src/services/icp/ICPScraperIntegrationService';
import { 
  WebDevConversionICP, 
  MarketingAnalyticsOpportunityICP 
} from '../src/services/icp/sampleProfiles';
import type { ICPProfile } from '../src/types/icp';

describe('Phase 5: Actionable Sales Signals & Provenance Tracking', () => {
  const engine = new ICPEngineService();
  const integrationService = new ICPScraperIntegrationService(engine);

  // =========================================================================
  // 1. HTML SIGNAL EXTRACTION LAYER
  // =========================================================================
  describe('1. HTML Signal Extraction Layer', () => {
    it('should extract WhatsApp, CTA, forms, viewport, SEO, CMS and copyright from HTML', () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <title>Austin Premier Dental Studio</title>
            <meta name="description" content="Top rated cosmetic and family dentist in Austin, TX." />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <meta name="generator" content="WordPress 6.4.2" />
            <script src="https://www.googletagmanager.com/gtag/js?id=G-123456"></script>
          </head>
          <body>
            <header>
              <nav>
                <a href="/">Home</a>
                <a href="/about">About</a>
                <a href="https://wa.me/15125550199" class="whatsapp-btn">Chat on WhatsApp</a>
              </nav>
            </header>
            <main>
              <h1>Austin Cosmetic Dental Center</h1>
              <p>Providing exceptional dentistry for over 10 years.</p>
              <div class="hero">
                <a href="/book" class="btn btn-primary">Book Free Consultation</a>
              </div>
              <form action="/api/contact" method="POST" id="lead-form">
                <input type="text" name="name" placeholder="Your Name" />
                <input type="email" name="email" placeholder="Email" />
                <textarea name="message"></textarea>
                <button type="submit">Send Message</button>
              </form>
            </main>
            <footer>
              <p>&copy; 2016 - 2024 Austin Premier Dental Studio. All rights reserved.</p>
              <div class="socials">
                <a href="https://www.instagram.com/austindental">Instagram</a>
                <a href="https://www.facebook.com/austindental">Facebook</a>
              </div>
            </footer>
          </body>
        </html>
      `;

      const normalized = dataNormalizationService.normalize({
        name: 'Austin Premier Dental Studio',
        website: 'https://austinpremierdental.com',
        phone: '+1 512-555-0199',
        rating: 4.9,
        reviewCount: 180,
        address: '100 Congress Ave, Austin, TX 78701',
        html: mockHtml,
      });

      // Website Signals
      assert.equal(normalized.hasWebsite, true);
      assert.equal(normalized.isHttps, true);
      assert.equal(normalized.hasSsl, true);
      assert.equal(normalized.hasWhatsApp, true);
      assert.equal(normalized.hasCta, true);
      assert.equal(normalized.hasContactForm, true);
      assert.equal(normalized.mobileResponsive, true);
      assert.equal(normalized.hasMetaTitle, true);
      assert.equal(normalized.hasMetaDescription, true);
      assert.equal(normalized.h1Count, 1);
      assert.equal(normalized.cms, 'WordPress');
      assert.ok(normalized.detectedTechnologies.includes('WordPress'));
      assert.ok(normalized.detectedTechnologies.includes('Google Analytics'));
      assert.equal(normalized.hasAnalytics, true);
      assert.equal(normalized.hasMetaPixel, false);
      assert.equal(normalized.lastUpdatedYear, 2024);
      assert.ok((normalized.websiteAgeYears ?? 0) >= 8);

      // Social Signals
      assert.equal(normalized.socialPlatformCount, 2);
      assert.equal(normalized.hasInstagram, true);
      assert.equal(normalized.hasFacebook, true);
      assert.equal(normalized.hasLinkedIn, false);

      // Marketing Signals
      assert.equal(normalized.hasGoogleMapsPresence, true);
      assert.equal(normalized.reviewActivityTier, 'HIGH');
      assert.equal(normalized.growthIndicator, 'HIGH_VELOCITY');
    });

    it('should accurately detect missing conversion signals on a bare/outdated HTML page', () => {
      const bareHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <!-- Missing title, meta description, and viewport -->
          </head>
          <body>
            <h2>Welcome to Joe's Plumbing</h2>
            <p>Call us for emergency leak repairs.</p>
            <p>&copy; 2014 Joe's Plumbing Inc.</p>
            <a href="#">Link 1</a>
            <a href="#">Link 2</a>
            <a href="javascript:void(0)">Link 3</a>
          </body>
        </html>
      `;

      const normalized = dataNormalizationService.normalize({
        name: "Joe's Plumbing",
        website: 'http://joes-old-plumbing.com', // Insecure HTTP
        phone: '+1 312-555-8899',
        rating: 4.4,
        reviewCount: 35,
        html: bareHtml,
      });

      assert.equal(normalized.isHttps, false);
      assert.equal(normalized.hasWhatsApp, false);
      assert.equal(normalized.hasCta, false);
      assert.equal(normalized.hasContactForm, false);
      assert.equal(normalized.mobileResponsive, false);
      assert.equal(normalized.hasMetaTitle, false);
      assert.equal(normalized.hasMetaDescription, false);
      assert.equal(normalized.h1Count, 0);
      assert.equal(normalized.hasAnalytics, false);
      assert.equal(normalized.hasBrokenLinks, true);
      assert.equal(normalized.lastUpdatedYear, 2014); // Outdated copyright
      assert.equal(normalized.socialPlatformCount, 0);
      assert.equal(normalized.reviewActivityTier, 'MODERATE');
    });
  });

  // =========================================================================
  // 2. STRICT PROVENANCE & UNKNOWN HANDLING (ZERO FABRICATION)
  // =========================================================================
  describe('2. Strict Provenance Tracking & Zero Fabrication', () => {
    it('should classify signals into KNOWN, INFERRED, and UNKNOWN with exact provenance', () => {
      const lead = {
        name: 'Apex Orthopedic Clinic',
        industry: 'Orthopedic Clinic',
        website: 'https://apexortho.com',
        phone: '+1 512-555-4321',
        rating: 4.8,
        reviewCount: 125,
        address: '500 E 8th St, Austin, TX',
      };

      const normalized = dataNormalizationService.normalize(lead);

      // Verify KNOWN facts
      assert.equal(normalized.provenance['name'].status, 'KNOWN');
      assert.equal(normalized.provenance['name'].confidence, 1.0);
      assert.equal(normalized.provenance['industry'].status, 'KNOWN');
      assert.equal(normalized.provenance['rating'].status, 'KNOWN');
      assert.equal(normalized.provenance['rating'].confidence, 1.0);
      assert.equal(normalized.provenance['reviewCount'].status, 'KNOWN');
      assert.equal(normalized.provenance['reviewCount'].value, 125);
      assert.equal(normalized.provenance['hasWebsite'].status, 'KNOWN');
      assert.equal(normalized.provenance['isHttps'].status, 'KNOWN');
      assert.equal(normalized.provenance['hasPhone'].status, 'KNOWN');
      assert.equal(normalized.provenance['hasGoogleMapsPresence'].status, 'KNOWN');

      // Verify INFERRED estimates
      assert.equal(normalized.provenance['reviewActivityTier'].status, 'INFERRED');
      assert.equal(normalized.provenance['reviewActivityTier'].value, 'HIGH');
      assert.equal(normalized.provenance['growthIndicator'].status, 'INFERRED');
      assert.equal(normalized.provenance['growthIndicator'].value, 'HIGH_VELOCITY');
      assert.equal(normalized.provenance['websiteQuality'].status, 'INFERRED');

      // Verify STRICT UNKNOWN handling (Do NOT fabricate!)
      assert.equal(normalized.provenance['employeeCount'].status, 'UNKNOWN');
      assert.equal(normalized.provenance['employeeCount'].value, null);
      assert.equal(normalized.provenance['employeeCount'].confidence, 0.0);
      assert.equal(normalized.employeeCount, null);

      assert.equal(normalized.provenance['foundedYear'].status, 'UNKNOWN');
      assert.equal(normalized.provenance['foundedYear'].value, null);
      assert.equal(normalized.provenance['foundedYear'].confidence, 0.0);
      assert.equal(normalized.foundedYear, null);
      assert.equal(normalized.businessAge, undefined);
    });

    it('should record explicit employee count or founded year as KNOWN when supplied', () => {
      const enrichedLead = {
        name: 'Heritage Roofing Co.',
        industry: 'Roofing Contractor',
        foundedYear: 1998,
        employeeCount: 45,
        website: 'https://heritageroofing.com',
        phone: '+1 512-555-9000',
      };

      const normalized = dataNormalizationService.normalize(enrichedLead);

      assert.equal(normalized.provenance['foundedYear'].status, 'KNOWN');
      assert.equal(normalized.provenance['foundedYear'].value, 1998);
      assert.equal(normalized.provenance['foundedYear'].confidence, 1.0);
      assert.equal(normalized.foundedYear, 1998);
      assert.ok((normalized.businessAge ?? 0) >= 25);

      assert.equal(normalized.provenance['employeeCount'].status, 'KNOWN');
      assert.equal(normalized.provenance['employeeCount'].value, 45);
      assert.equal(normalized.provenance['employeeCount'].confidence, 0.95);
      assert.equal(normalized.employeeCount, 45);
    });
  });

  // =========================================================================
  // 3. ICP EVALUATION USING EXPANDED PHASE 5 SIGNALS
  // =========================================================================
  describe('3. ICP Rule Evaluation with Phase 5 Signals', () => {
    it('should evaluate WebDevConversionICP and identify high-opportunity conversion gaps', () => {
      // Established clinic with high reviews, but missing WhatsApp, CTA, and mobile responsiveness
      const business = {
        name: 'St. Jude Physical Therapy Clinic',
        industry: 'Physical Therapy',
        status: 'OPERATIONAL',
        phone: '+1 512-555-3344',
        website: 'http://stjude-pt.com', // Insecure & outdated
        rating: 4.7,
        reviewCount: 140, // Tier HIGH (+25 pts)
        html: `
          <html>
            <head><title>St. Jude PT</title></head>
            <body>
              <p>Welcome to our therapy center.</p>
              <!-- No WhatsApp, no CTA, no viewport -->
            </body>
          </html>
        `,
      };

      const normalized = dataNormalizationService.normalize(business);
      const evalResult = engine.evaluate(normalized, WebDevConversionICP);

      assert.equal(evalResult.matched, true);
      assert.equal(evalResult.failedHardFilters.length, 0);
      assert.equal(evalResult.triggeredExclusions.length, 0);

      // Scoring Breakdown:
      // Missing WhatsApp (+25) + Missing CTA (+25) + Not Mobile Responsive (+25) + High Review Tier (+25) = 100
      assert.equal(evalResult.score, 100);
      assert.equal(evalResult.priority, 'HIGH');
      assert.ok(evalResult.positiveSignals.some(s => s.includes('WhatsApp')));
      assert.ok(evalResult.positiveSignals.some(s => s.includes('CTA') || s.toLowerCase().includes('call-to-action')));
      assert.ok(evalResult.positiveSignals.some(s => s.includes('Mobile Deficit')));
      assert.ok(evalResult.positiveSignals.some(s => s.includes('Transaction Volume')));
    });

    it('should evaluate MarketingAnalyticsOpportunityICP identifying analytics and retargeting deficits', () => {
      // Local boutique with great reviews and 2 active social profiles, but no analytics or pixel
      const boutique = {
        name: 'Velvet Rose Fashion Boutique',
        industry: 'Clothing Store',
        rating: 4.8,
        reviewCount: 65,
        website: 'https://velvetroseboutique.com',
        phone: '+1 512-555-7788',
        googlePlaceId: 'place_velvet_rose',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Velvet Rose Boutique</title>
              <!-- No meta description, no GA, no FB Pixel -->
            </head>
            <body>
              <h1>Handcrafted Luxury Apparel</h1>
              <footer>
                <a href="https://instagram.com/velvetrose">Instagram</a>
                <a href="https://facebook.com/velvetrose">Facebook</a>
              </footer>
            </body>
          </html>
        `,
      };

      const normalized = dataNormalizationService.normalize(boutique);
      const evalResult = engine.evaluate(normalized, MarketingAnalyticsOpportunityICP);

      assert.equal(evalResult.matched, true);
      assert.equal(evalResult.failedHardFilters.length, 0);
      // Soft scores:
      // No Analytics (+35) + No Meta Pixel (+25) + Multi Social (+25) + Missing Meta Desc (+15) = 100
      assert.equal(evalResult.score, 100);
      assert.equal(evalResult.priority, 'HIGH');
      assert.ok(evalResult.positiveSignals.some(s => s.includes('Attribution Gap')));
      assert.ok(evalResult.positiveSignals.some(s => s.includes('Retargeting Deficit')));
      assert.ok(evalResult.positiveSignals.some(s => s.includes('Social Engagement')));
    });

    it('should reject closed businesses using businessStatus hard filter', () => {
      const closedClinic = {
        name: 'Downtown Dental Studio (Permanently Closed)',
        industry: 'Dentist',
        status: 'CLOSED',
        phone: '+1 512-555-0000',
        website: 'https://downtowndental.com',
        rating: 4.5,
        reviewCount: 50,
      };

      const normalized = dataNormalizationService.normalize(closedClinic);
      const evalResult = engine.evaluate(normalized, WebDevConversionICP);

      assert.equal(evalResult.matched, false);
      assert.ok(evalResult.failedHardFilters.some(f => f.includes('Business is Operational')));
    });
  });

  // =========================================================================
  // 4. SCRAPER INTEGRATION PIPELINE VERIFICATION
  // =========================================================================
  describe('4. Scraper Pipeline Qualification with Phase 5 Signals', () => {
    it('should qualify lead through integration pipeline preserving full provenance', () => {
      const scrapedLead = {
        title: 'Austin Artisan Bakery',
        industry: 'Bakery',
        website: 'https://austinartisanbakery.com',
        phone: '+1 512-555-2211',
        rating: 4.6,
        reviewsCount: 110,
        address: '1204 S Congress Ave, Austin, TX',
        googlePlaceId: 'place_artisan_bakery',
        html: `
          <!DOCTYPE html>
          <html>
            <head><title>Austin Artisan Bakery</title></head>
            <body>
              <p>Fresh sourdough daily.</p>
              <a href="https://instagram.com/austinbakery">Instagram</a>
              <a href="https://facebook.com/austinbakery">Facebook</a>
            </body>
          </html>
        `,
      };

      const qualifiedLead = integrationService.qualifyBusiness(scrapedLead, MarketingAnalyticsOpportunityICP);

      assert.equal(qualifiedLead.matched, true);
      assert.equal(qualifiedLead.priority, 'HIGH');
      assert.ok(qualifiedLead.score >= 70);

      // Verify normalized lead retains full Phase 5 metadata
      const norm = qualifiedLead.business;
      assert.equal(norm.hasGoogleMapsPresence, true);
      assert.equal(norm.reviewActivityTier, 'HIGH');
      assert.equal(norm.hasAnalytics, false);
      assert.equal(norm.hasMetaPixel, false);
      assert.equal(norm.hasInstagram, true);
      assert.equal(norm.hasFacebook, true);
      assert.equal(norm.socialPlatformCount, 2);

      // Verify provenance is intact on business object
      assert.ok(norm.provenance);
      assert.equal(norm.provenance['hasGoogleMapsPresence'].status, 'KNOWN');
      assert.equal(norm.provenance['reviewActivityTier'].status, 'INFERRED');
      assert.equal(norm.provenance['employeeCount'].status, 'UNKNOWN');
    });
  });
});
