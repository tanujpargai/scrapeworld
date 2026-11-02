import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { OpportunityAnalysisService } from '../src/services/lead/OpportunityAnalysisService';
import { LeadManagementRepository } from '../src/repositories/LeadManagementRepository';
import { ALL_LEAD_STATUSES } from '../src/types/leadManagement';
import type { LeadStatus } from '../src/types/leadManagement';

describe('Phase 7: Lightweight Lead Management & Opportunity Section', () => {
  const repo = new LeadManagementRepository();

  // =========================================================================
  // 1. DETERMINISTIC OPPORTUNITY ANALYSIS LAYER
  // =========================================================================
  describe('1. Deterministic Opportunity Analysis Layer', () => {
    it('should generate a WEB DEVELOPMENT OPPORTUNITY with concrete issues and qualifying signals', () => {
      const mockBusiness = {
        name: 'Hill Country Family Dental',
        industry: 'Dentist',
        hasWebsite: true,
        website: 'http://hillcountrydental.example.com',
        websiteQuality: 42,
        mobileResponsive: false,
        isHttps: false,
        hasCta: false,
        hasContactForm: false,
        hasWhatsApp: false,
        reviewCount: 38,
        rating: 4.7,
        businessAge: 8,
        businessStatus: 'OPERATIONAL',
        phone: '512-555-4321',
        ownerName: 'Dr. Sarah Hill',
      };

      const opp = OpportunityAnalysisService.analyzeOpportunity(
        mockBusiness,
        { targetService: 'WEBSITE' } as any,
        85,
        'HIGH'
      );

      // Verify opportunity type and priority
      assert.equal(opp.type, 'WEB DEVELOPMENT OPPORTUNITY');
      assert.equal(opp.priority, 'HIGH');
      assert.ok(opp.whyProspect.length > 10);
      assert.ok(opp.relevantService.includes('Website') || opp.relevantService.includes('Web'));

      // Verify detected issues contain actual, verified technical deficits
      assert.ok(opp.detectedIssues.includes('Weak website quality score (< 60)'));
      assert.ok(opp.detectedIssues.includes('Poor mobile experience (Missing viewport optimization)'));
      assert.ok(opp.detectedIssues.includes('Insecure connection (Missing HTTPS/SSL certificate)'));
      assert.ok(opp.detectedIssues.includes('Missing conversion CTA (No appointment or call buttons)'));
      assert.ok(opp.detectedIssues.includes('Missing digital contact/lead capture form'));

      // Verify qualifying signals contain actual verified business advantages
      assert.ok(opp.qualifyingSignals.some(s => s.includes('8 years in operation') || s.includes('Established business')));
      assert.ok(opp.qualifyingSignals.some(s => s.includes('Direct phone contact available')));
      assert.ok(opp.qualifyingSignals.some(s => s.includes('Decision maker / owner identified')));
    });

    it('should generate a MARKETING OPPORTUNITY for strong web businesses with low social/analytics presence', () => {
      const mockBusiness = {
        name: 'Metropolitan Bistro',
        industry: 'Restaurant',
        hasWebsite: true,
        website: 'https://metrobistro.com',
        websiteQuality: 88,
        mobileResponsive: true,
        isHttps: true,
        hasCta: true,
        hasContactForm: true,
        hasAnalytics: false,
        hasMetaPixel: false,
        hasWhatsApp: false,
        socialPlatformCount: 1,
        reviewCount: 120,
        rating: 4.6,
        businessAge: 6,
        businessStatus: 'OPERATIONAL',
        phone: '415-555-8765',
      };

      const opp = OpportunityAnalysisService.analyzeOpportunity(
        mockBusiness,
        { targetService: 'MARKETING' } as any,
        75,
        'MEDIUM'
      );

      assert.equal(opp.type, 'MARKETING OPPORTUNITY');
      assert.equal(opp.priority, 'MEDIUM');
      assert.ok(opp.detectedIssues.includes('Weak social presence (0-1 platforms active)'));
      assert.ok(opp.detectedIssues.includes('Missing analytics tracking (No GA4 / GTM detected)'));
      assert.ok(opp.detectedIssues.includes('Missing Meta pixel for retargeting advertising'));
      assert.ok(opp.qualifyingSignals.some(s => s.includes('120 public reviews') || s.includes('Strong local market')));
    });

    it('should not hallucinate issues when business data is clean', () => {
      const perfectWebBusiness = {
        name: 'Apex Modern Clinic',
        hasWebsite: true,
        website: 'https://apexmodern.com',
        websiteQuality: 95,
        mobileResponsive: true,
        isHttps: true,
        hasCta: true,
        hasContactForm: true,
        hasAnalytics: true,
        hasMetaPixel: true,
        hasWhatsApp: true,
        socialPlatformCount: 4,
        reviewCount: 40,
        rating: 4.9,
      };

      const opp = OpportunityAnalysisService.analyzeOpportunity(
        perfectWebBusiness,
        null,
        90,
        'LOW'
      );

      // Should not claim weak website or missing mobile
      assert.equal(opp.detectedIssues.includes('Weak website quality score (< 60)'), false);
      assert.equal(opp.detectedIssues.includes('Poor mobile experience (Missing viewport optimization)'), false);
      assert.equal(opp.detectedIssues.includes('Missing conversion CTA (No appointment or call buttons)'), false);
    });
  });

  // =========================================================================
  // 2. LEAD STATUS LIFECYCLE & NOTE MANAGEMENT
  // =========================================================================
  describe('2. Lead Status Lifecycle & Notes', () => {
    it('should support all 8 mandated lead statuses', () => {
      const expectedStatuses: LeadStatus[] = [
        'NEW',
        'QUALIFIED',
        'CONTACTED',
        'REPLIED',
        'MEETING',
        'WON',
        'LOST',
        'DISQUALIFIED',
      ];

      for (const st of expectedStatuses) {
        assert.ok(ALL_LEAD_STATUSES.includes(st), `Status ${st} should be supported`);
      }
    });

    it('should transition lead statuses and record history in notes', async () => {
      const testLead = await repo.upsertLead({
        id: 'test-lead-status-tracker',
        businessName: 'Status Transition Test Clinic',
        status: 'NEW',
        icpScore: 82,
        priority: 'HIGH',
      });

      assert.equal(testLead.status, 'NEW');

      // Update to CONTACTED
      const contactedLead = await repo.updateLeadStatus(testLead.id, 'CONTACTED');
      assert.ok(contactedLead);
      assert.equal(contactedLead.status, 'CONTACTED');
      assert.ok(contactedLead.notes.some(n => n.content.includes('Status updated to CONTACTED')));

      // Update to MEETING
      const meetingLead = await repo.updateLeadStatus(testLead.id, 'MEETING');
      assert.ok(meetingLead);
      assert.equal(meetingLead.status, 'MEETING');

      // Update to WON
      const wonLead = await repo.updateLeadStatus(testLead.id, 'WON');
      assert.ok(wonLead);
      assert.equal(wonLead.status, 'WON');
    });

    it('should add and delete agency notes on a lead', async () => {
      const testLead = await repo.upsertLead({
        id: 'test-lead-notes',
        businessName: 'Notes Test Practice',
        status: 'QUALIFIED',
      });

      // Add note
      const note = await repo.addNote(
        testLead.id,
        'Called office manager on Tuesday. Interested in custom booking portal.',
        'Sales Rep Alex'
      );

      assert.ok(note);
      assert.equal(note.content, 'Called office manager on Tuesday. Interested in custom booking portal.');
      assert.equal(note.author, 'Sales Rep Alex');

      const updatedLead = await repo.getLeadById(testLead.id);
      assert.ok(updatedLead);
      assert.ok(updatedLead.notes.some(n => n.id === note.id));

      // Delete note
      const deleted = await repo.deleteNote(testLead.id, note.id);
      assert.equal(deleted, true);

      const afterDelete = await repo.getLeadById(testLead.id);
      assert.ok(afterDelete);
      assert.equal(afterDelete.notes.some(n => n.id === note.id), false);
    });
  });

  // =========================================================================
  // 3. MULTI-DIMENSIONAL FILTERING & SORTING
  // =========================================================================
  describe('3. Multi-Dimensional Lead Filtering & Sorting', () => {
    it('should filter leads by status, icpName, targetService, and priority', async () => {
      // Seed test leads
      await repo.upsertLead({
        id: 'filter-test-1',
        businessName: 'Dental One',
        status: 'QUALIFIED',
        icpName: 'Dental Redesign ICP',
        targetService: 'WEBSITE',
        priority: 'HIGH',
        icpScore: 95,
      });

      await repo.upsertLead({
        id: 'filter-test-2',
        businessName: 'Hotel Luxury',
        status: 'CONTACTED',
        icpName: 'Hospitality Marketing ICP',
        targetService: 'MARKETING',
        priority: 'MEDIUM',
        icpScore: 72,
      });

      // Filter by status
      const qualifiedOnly = await repo.getAllLeads({ status: 'QUALIFIED' });
      assert.ok(qualifiedOnly.every(l => l.status === 'QUALIFIED'));

      // Filter by target service
      const websiteOnly = await repo.getAllLeads({ targetService: 'WEBSITE' });
      assert.ok(websiteOnly.some(l => l.id === 'filter-test-1'));

      // Filter by priority
      const highOnly = await repo.getAllLeads({ priority: 'HIGH' });
      assert.ok(highOnly.every(l => l.priority === 'HIGH'));

      // Filter by search text
      const searchMatches = await repo.getAllLeads({ search: 'Dental One' });
      assert.ok(searchMatches.some(l => l.businessName === 'Dental One'));
    });

    it('should sort leads by ICP score in descending and ascending order', async () => {
      const sortedDesc = await repo.getAllLeads(undefined, { field: 'icpScore', order: 'desc' });
      for (let i = 0; i < sortedDesc.length - 1; i++) {
        assert.ok(sortedDesc[i].icpScore >= sortedDesc[i + 1].icpScore);
      }

      const sortedAsc = await repo.getAllLeads(undefined, { field: 'icpScore', order: 'asc' });
      for (let i = 0; i < sortedAsc.length - 1; i++) {
        assert.ok(sortedAsc[i].icpScore <= sortedAsc[i + 1].icpScore);
      }
    });
  });

  // =========================================================================
  // 4. EXPORT FUNCTIONALITY (CSV & JSON)
  // =========================================================================
  describe('4. Export Selected & Qualified Leads', () => {
    it('should export selected leads to a well-formed CSV string', async () => {
      const csv = await repo.exportLeadsToCsv(['filter-test-1', 'filter-test-2']);
      
      assert.ok(csv.startsWith('ID,Business Name,Status'));
      assert.ok(csv.includes('"Dental One"'));
      assert.ok(csv.includes('"Hotel Luxury"'));
      assert.ok(csv.includes('"WEBSITE"'));
      assert.ok(csv.includes('"MARKETING"'));
    });

    it('should export qualified leads to CSV when qualifiedOnly is true', async () => {
      const csv = await repo.exportLeadsToCsv(undefined, true);
      assert.ok(csv.length > 50);
      assert.ok(csv.includes('Business Name'));
    });

    it('should export leads to structured JSON', async () => {
      const json = await repo.exportLeadsToJson(['filter-test-1']);
      assert.equal(json.length, 1);
      assert.equal(json[0].businessName, 'Dental One');
      assert.ok(json[0].opportunity);
    });
  });

  // =========================================================================
  // 5. EVALUATION SYNCHRONIZATION
  // =========================================================================
  describe('5. Synchronization with ICP Evaluations', () => {
    it('should run syncFromEvaluations without errors and return stats', async () => {
      const stats = await repo.syncFromEvaluations();
      assert.ok(typeof stats.added === 'number');
      assert.ok(typeof stats.updated === 'number');
      assert.ok(typeof stats.total === 'number');
    });
  });
});
