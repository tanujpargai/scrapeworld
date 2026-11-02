/**
 * LeadManagementRepository
 * 
 * Provides lightweight, file-backed lead management for agency prospecting.
 * Stores managed leads in `data/managed-leads.json` with zero external DB bottlenecks,
 * while automatically syncing with ICPEvaluationRepository batches.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { 
  ManagedLead, 
  LeadStatus, 
  LeadNote, 
  LeadFilterOptions, 
  LeadSortField, 
  SortOrder 
} from '@/types/leadManagement';
import { OpportunityAnalysisService } from '@/services/lead/OpportunityAnalysisService';
import { icpEvaluationRepository } from './ICPEvaluationRepository';

export class LeadManagementRepository {
  private dataDir: string;
  private filePath: string;

  constructor() {
    this.dataDir = path.join(process.cwd(), 'data');
    this.filePath = path.join(this.dataDir, 'managed-leads.json');
    this.ensureInitialized();
  }

  private ensureInitialized(): void {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }

      if (!fs.existsSync(this.filePath)) {
        // Initial sample leads for immediate out-of-the-box experience
        const initialLeads: ManagedLead[] = [
          {
            id: 'lead-austin-dental',
            businessId: 'biz-austin-dental-01',
            businessName: 'Austin Dental Associates',
            status: 'QUALIFIED',
            notes: [
              {
                id: 'note-1',
                leadId: 'lead-austin-dental',
                content: 'Discovered via Google Maps dental scrape. Site lacks mobile responsiveness and online booking.',
                author: 'System',
                createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
              },
            ],
            targetService: 'WEBSITE',
            icpId: 'icp-webdev-redesign',
            icpName: 'Web Dev: Redesign & Performance Modernization',
            icpScore: 92,
            priority: 'HIGH',
            matched: true,
            contact: {
              phone: '512-555-8888',
              email: 'contact@austindentalassociates.net',
              ownerName: 'Dr. Robert Miller',
              city: 'Austin',
              state: 'TX',
              country: 'USA',
              address: '10400 Research Blvd, Austin, TX',
            },
            website: 'http://austindentalassociates.net',
            socialLinks: [
              { platform: 'FACEBOOK', url: 'https://facebook.com/austindental' },
            ],
            dateDiscovered: new Date(Date.now() - 86400000 * 2).toISOString(),
            lastEvaluatedDate: new Date().toISOString(),
            opportunity: {
              type: 'WEB DEVELOPMENT OPPORTUNITY',
              priority: 'HIGH',
              whyProspect: 'Established local dental practice losing high-value patient appointments due to non-responsive mobile site and missing booking CTA.',
              relevantService: 'Custom Medical Practice Website & Appointment Booking Engine',
              qualifyingSignals: [
                'Established business with active customer base (65 Google reviews)',
                'Strong customer satisfaction (4.8 Google stars)',
                'Direct phone contact available for sales outreach',
                'Decision maker / owner identified for direct pitch',
              ],
              detectedIssues: [
                'Weak website quality score (< 60)',
                'Poor mobile experience (Missing viewport optimization)',
                'Insecure connection (Missing HTTPS/SSL certificate)',
                'Missing conversion CTA (No appointment or call buttons)',
                'Weak social presence (0-1 platforms active)',
              ],
            },
            passedHardFilters: ['✓ Min 15 Reviews', '✓ Has Phone Number'],
            failedHardFilters: [],
            positiveSignals: ['+35 Needs Website or Redesign', '+20 Mobile Experience Issues'],
            negativeSignals: [],
            unknownSignals: ['Employee Count: Unknown'],
          },
          {
            id: 'lead-grand-heritage',
            businessId: 'biz-grand-heritage-02',
            businessName: 'Grand Heritage Hotel',
            status: 'NEW',
            notes: [],
            targetService: 'MARKETING',
            icpId: 'icp-marketing-agency',
            icpName: 'Marketing Agency: High-Review Local Businesses',
            icpScore: 78,
            priority: 'HIGH',
            matched: true,
            contact: {
              phone: '415-555-0199',
              email: 'concierge@grandheritagehotel.com',
              ownerName: 'Sarah Jenkins',
              city: 'San Francisco',
              state: 'CA',
              country: 'USA',
              address: '450 Powell St, San Francisco, CA',
            },
            website: 'https://grandheritagehotel.com',
            socialLinks: [
              { platform: 'INSTAGRAM', url: 'https://instagram.com/grandheritage' },
              { platform: 'FACEBOOK', url: 'https://facebook.com/grandheritage' },
              { platform: 'LINKEDIN', url: 'https://linkedin.com/company/grandheritage' },
            ],
            dateDiscovered: new Date(Date.now() - 86400000 * 5).toISOString(),
            lastEvaluatedDate: new Date().toISOString(),
            opportunity: {
              type: 'MARKETING OPPORTUNITY',
              priority: 'HIGH',
              whyProspect: 'High-volume luxury boutique hotel with strong review footprint, but lagging in paid retargeting and analytics tracking.',
              relevantService: 'Hospitality Digital Marketing & Retargeting Campaigns',
              qualifyingSignals: [
                'Established business (12 years in operation)',
                'Strong local market footprint (140 public reviews)',
                'Strong customer satisfaction (4.6 Google stars)',
                'Direct phone contact available for sales outreach',
              ],
              detectedIssues: [
                'Missing analytics tracking (No GA4 / GTM detected)',
                'Missing Meta pixel for retargeting advertising',
                'Missing WhatsApp click-to-chat integration',
              ],
            },
            passedHardFilters: ['✓ Business age >= 5 years', '✓ Industry = Hotel'],
            failedHardFilters: [],
            positiveSignals: ['+25 High Review Traction', '+15 Active Hospitality Business'],
            negativeSignals: [],
            unknownSignals: ['Employee Count: Unknown'],
          },
        ];

        fs.writeFileSync(this.filePath, JSON.stringify(initialLeads, null, 2), 'utf-8');
      }
    } catch (err) {
      console.error('Failed to initialize managed leads repository:', err);
    }
  }

  private readAll(): ManagedLead[] {
    try {
      this.ensureInitialized();
      if (!fs.existsSync(this.filePath)) return [];
      const content = fs.readFileSync(this.filePath, 'utf-8');
      if (!content.trim()) return [];
      return JSON.parse(content);
    } catch (err) {
      console.error('Error reading managed leads from disk:', err);
      return [];
    }
  }

  private writeAll(leads: ManagedLead[]): void {
    try {
      this.ensureInitialized();
      fs.writeFileSync(this.filePath, JSON.stringify(leads, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving managed leads to disk:', err);
    }
  }

  /**
   * Retrieves all managed leads with optional filtering and sorting.
   */
  async getAllLeads(
    filters?: LeadFilterOptions,
    sort: { field: LeadSortField; order: SortOrder } = { field: 'icpScore', order: 'desc' }
  ): Promise<ManagedLead[]> {
    let leads = this.readAll();

    // 1. Filtering
    if (filters) {
      if (filters.status && filters.status !== 'ALL') {
        leads = leads.filter((l) => l.status === filters.status);
      }
      if (filters.icpName && filters.icpName !== 'ALL') {
        leads = leads.filter((l) => l.icpName.toLowerCase() === filters.icpName?.toLowerCase());
      }
      if (filters.targetService && filters.targetService !== 'ALL') {
        leads = leads.filter((l) => 
          l.targetService.toUpperCase() === filters.targetService?.toUpperCase() ||
          l.opportunity.relevantService.toUpperCase().includes(filters.targetService?.toUpperCase() || '')
        );
      }
      if (filters.priority && filters.priority !== 'ALL') {
        leads = leads.filter((l) => l.priority === filters.priority);
      }
      if (filters.minScore !== undefined) {
        leads = leads.filter((l) => l.icpScore >= (filters.minScore ?? 0));
      }
      if (filters.maxScore !== undefined) {
        leads = leads.filter((l) => l.icpScore <= (filters.maxScore ?? 100));
      }
      if (filters.search && filters.search.trim()) {
        const query = filters.search.toLowerCase().trim();
        leads = leads.filter((l) =>
          l.businessName.toLowerCase().includes(query) ||
          (l.contact.city && l.contact.city.toLowerCase().includes(query)) ||
          (l.contact.phone && l.contact.phone.includes(query)) ||
          (l.contact.email && l.contact.email.toLowerCase().includes(query)) ||
          (l.opportunity.type.toLowerCase().includes(query)) ||
          (l.notes.some(n => n.content.toLowerCase().includes(query)))
        );
      }
    }

    // 2. Sorting
    const { field, order } = sort;
    const priorityWeight: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };

    leads.sort((a, b) => {
      let comparison = 0;
      switch (field) {
        case 'icpScore':
          comparison = a.icpScore - b.icpScore;
          break;
        case 'businessName':
          comparison = a.businessName.localeCompare(b.businessName);
          break;
        case 'dateDiscovered':
          comparison = new Date(a.dateDiscovered).getTime() - new Date(b.dateDiscovered).getTime();
          break;
        case 'lastEvaluatedDate':
          comparison = new Date(a.lastEvaluatedDate).getTime() - new Date(b.lastEvaluatedDate).getTime();
          break;
        case 'priority':
          comparison = (priorityWeight[a.priority] || 0) - (priorityWeight[b.priority] || 0);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        default:
          comparison = b.icpScore - a.icpScore;
      }
      return order === 'desc' ? -comparison : comparison;
    });

    return leads;
  }

  /**
   * Retrieves a single managed lead by ID or businessId.
   */
  async getLeadById(id: string): Promise<ManagedLead | null> {
    const leads = this.readAll();
    return leads.find((l) => l.id === id || l.businessId === id) || null;
  }

  /**
   * Updates a lead's status (e.g. NEW -> QUALIFIED -> CONTACTED -> MEETING -> WON).
   */
  async updateLeadStatus(id: string, status: LeadStatus): Promise<ManagedLead | null> {
    const leads = this.readAll();
    const index = leads.findIndex((l) => l.id === id || l.businessId === id);
    if (index === -1) return null;

    leads[index].status = status;
    leads[index].lastEvaluatedDate = new Date().toISOString();

    // Auto-log note for status transition audit
    leads[index].notes.unshift({
      id: `note-${Date.now()}`,
      leadId: leads[index].id,
      content: `Status updated to ${status}`,
      author: 'User',
      createdAt: new Date().toISOString(),
    });

    this.writeAll(leads);
    return leads[index];
  }

  /**
   * Adds an agency note to a lead.
   */
  async addNote(id: string, content: string, author: string = 'User'): Promise<LeadNote | null> {
    const leads = this.readAll();
    const index = leads.findIndex((l) => l.id === id || l.businessId === id);
    if (index === -1) return null;

    const note: LeadNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      leadId: leads[index].id,
      content: content.trim(),
      author,
      createdAt: new Date().toISOString(),
    };

    leads[index].notes.unshift(note);
    this.writeAll(leads);
    return note;
  }

  /**
   * Deletes a note from a lead.
   */
  async deleteNote(id: string, noteId: string): Promise<boolean> {
    const leads = this.readAll();
    const index = leads.findIndex((l) => l.id === id || l.businessId === id);
    if (index === -1) return false;

    const initialCount = leads[index].notes.length;
    leads[index].notes = leads[index].notes.filter((n) => n.id !== noteId);
    if (leads[index].notes.length === initialCount) return false;

    this.writeAll(leads);
    return true;
  }

  /**
   * Upserts or creates a managed lead.
   */
  async upsertLead(leadData: Partial<ManagedLead> & { businessName: string }): Promise<ManagedLead> {
    const leads = this.readAll();
    const id = leadData.id || `lead-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const businessId = leadData.businessId || id;

    const existingIndex = leads.findIndex((l) => l.id === id || l.businessId === businessId);

    const opportunity = leadData.opportunity || OpportunityAnalysisService.analyzeOpportunity(
      leadData.rawData || leadData,
      null,
      leadData.icpScore,
      leadData.priority
    );

    const fullLead: ManagedLead = {
      id,
      businessId,
      businessName: leadData.businessName,
      status: leadData.status || 'NEW',
      notes: leadData.notes || [],
      targetService: leadData.targetService || 'WEBSITE',
      icpId: leadData.icpId,
      icpName: leadData.icpName || 'General Opportunity',
      icpScore: leadData.icpScore ?? 50,
      priority: leadData.priority || 'MEDIUM',
      matched: leadData.matched ?? true,
      contact: leadData.contact || {},
      website: leadData.website,
      socialLinks: leadData.socialLinks || [],
      dateDiscovered: leadData.dateDiscovered || new Date().toISOString(),
      lastEvaluatedDate: leadData.lastEvaluatedDate || new Date().toISOString(),
      opportunity,
      passedHardFilters: leadData.passedHardFilters || [],
      failedHardFilters: leadData.failedHardFilters || [],
      positiveSignals: leadData.positiveSignals || [],
      negativeSignals: leadData.negativeSignals || [],
      unknownSignals: leadData.unknownSignals || [],
      collectionId: leadData.collectionId,
      rawData: leadData.rawData,
    };

    if (existingIndex !== -1) {
      leads[existingIndex] = {
        ...leads[existingIndex],
        ...fullLead,
        // Preserve existing notes
        notes: leads[existingIndex].notes.length > 0 ? leads[existingIndex].notes : fullLead.notes,
      };
    } else {
      leads.push(fullLead);
    }

    this.writeAll(leads);
    return existingIndex !== -1 ? leads[existingIndex] : fullLead;
  }

  /**
   * Synchronizes managed leads from ICPEvaluationRepository.
   * Pulls qualified leads discovered across all collections into the lead management layer.
   */
  async syncFromEvaluations(): Promise<{ added: number; updated: number; total: number }> {
    const allEvaluations = await icpEvaluationRepository.listAll();
    const existingLeads = this.readAll();
    let added = 0;
    let updated = 0;

    for (const [collectionId, batch] of Object.entries(allEvaluations)) {
      for (const result of batch.qualified || []) {
        const business = result.business || {};
        const businessId = result.businessId || business.id || `biz-${result.businessName?.replace(/\s+/g, '-').toLowerCase()}`;
        const existing = existingLeads.find((l) => l.businessId === businessId || l.id === businessId);

        const opp = OpportunityAnalysisService.analyzeOpportunity(
          business,
          null,
          result.score,
          result.priority
        );

        const socialLinks: Array<{ platform: string; url?: string }> = [];
        if (Array.isArray(business.socialProfiles)) {
          for (const sp of business.socialProfiles) {
            socialLinks.push({ platform: sp.platform, url: sp.url });
          }
        }

        if (existing) {
          existing.icpScore = result.score;
          existing.priority = result.priority;
          existing.lastEvaluatedDate = result.evaluatedAt || new Date().toISOString();
          existing.opportunity = opp;
          updated++;
        } else {
          existingLeads.push({
            id: `lead-${businessId}`,
            businessId,
            businessName: result.businessName || business.name || 'Business',
            status: 'QUALIFIED',
            notes: [],
            targetService: result.serviceOpportunity || opp.relevantService.includes('Marketing') ? 'MARKETING' : 'WEBSITE',
            icpId: result.icpId || undefined,
            icpName: result.icpName || batch.icpName || 'Qualified Lead',
            icpScore: result.score,
            priority: result.priority,
            matched: result.matched,
            contact: {
              phone: business.phone,
              email: business.email,
              ownerName: business.ownerName,
              city: business.city,
              state: business.state,
              country: business.country,
              address: business.address,
            },
            website: business.website || business.verifiedWebsite,
            socialLinks,
            dateDiscovered: result.evaluatedAt || new Date().toISOString(),
            lastEvaluatedDate: result.evaluatedAt || new Date().toISOString(),
            opportunity: opp,
            passedHardFilters: result.passedHardFilters || [],
            failedHardFilters: result.failedHardFilters || [],
            positiveSignals: result.positiveSignals || [],
            negativeSignals: result.negativeSignals || [],
            unknownSignals: result.formattedExplanations?.unknownSignals || [],
            collectionId,
            rawData: business,
          });
          added++;
        }
      }
    }

    if (added > 0 || updated > 0) {
      this.writeAll(existingLeads);
    }

    return { added, updated, total: existingLeads.length };
  }

  /**
   * Exports leads to a formatted CSV string.
   */
  async exportLeadsToCsv(ids?: string[], qualifiedOnly?: boolean): Promise<string> {
    let leads = this.readAll();

    if (ids && ids.length > 0) {
      const idSet = new Set(ids);
      leads = leads.filter((l) => idSet.has(l.id) || idSet.has(l.businessId));
    } else if (qualifiedOnly) {
      leads = leads.filter((l) => l.status === 'QUALIFIED' || l.icpScore >= 40);
    }

    const headers = [
      'ID',
      'Business Name',
      'Status',
      'Target Service',
      'ICP Profile',
      'ICP Score',
      'Priority',
      'Opportunity Type',
      'Why Prospect',
      'Phone',
      'Email',
      'Owner',
      'Website',
      'City',
      'State',
      'Date Discovered',
      'Last Evaluated',
      'Notes Count',
      'Latest Note',
    ];

    const rows = leads.map((l) => {
      const escape = (val: any) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const latestNote = l.notes && l.notes.length > 0 ? l.notes[0].content : '';

      return [
        escape(l.id),
        escape(l.businessName),
        escape(l.status),
        escape(l.targetService),
        escape(l.icpName),
        escape(l.icpScore),
        escape(l.priority),
        escape(l.opportunity.type),
        escape(l.opportunity.whyProspect),
        escape(l.contact.phone || ''),
        escape(l.contact.email || ''),
        escape(l.contact.ownerName || ''),
        escape(l.website || ''),
        escape(l.contact.city || ''),
        escape(l.contact.state || ''),
        escape(l.dateDiscovered),
        escape(l.lastEvaluatedDate),
        escape(l.notes.length),
        escape(latestNote),
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Exports leads to structured JSON.
   */
  async exportLeadsToJson(ids?: string[], qualifiedOnly?: boolean): Promise<ManagedLead[]> {
    let leads = this.readAll();

    if (ids && ids.length > 0) {
      const idSet = new Set(ids);
      return leads.filter((l) => idSet.has(l.id) || idSet.has(l.businessId));
    }

    if (qualifiedOnly) {
      return leads.filter((l) => l.status === 'QUALIFIED' || l.icpScore >= 40);
    }

    return leads;
  }
}

export const leadManagementRepository = new LeadManagementRepository();
