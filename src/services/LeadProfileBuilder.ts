import { LeadIntelligence, Business, Website, SocialProfile, Opportunity, CompetitorAnalysis } from '@prisma/client';

export interface FullLeadDetails {
  id: string;
  leadScore: number;
  leadTier: string;
  urgencyScore: number;
  buyingIntent: string | null;
  salesConfidence: string | null;
  leadSummary: string | null;
  leadPriorityRank: number | null;
  salesReadinessScore: number | null;
  salesReadinessTier: string | null;
  reachabilityScore: number | null;
  contactabilityTier: string | null;
  business: Business & {
    websiteData: Website | null;
    socialProfiles: SocialProfile[];
    opportunities: Opportunity[];
    analyses: (CompetitorAnalysis & {
      competitor: {
        competitorBusiness: Business & {
          websiteData: Website | null;
        };
      };
    })[];
  };
}

export class LeadProfileBuilder {
  /**
   * Generates a fully formatted 360 dossier text block for a lead.
   */
  buildProfileText(lead: FullLeadDetails): string {
    const biz = lead.business;
    const web = biz.websiteData;
    const socialPlatforms = biz.socialProfiles.map(p => {
      let platInfo = p.platform.toString();
      if (p.followersEstimate) {
        platInfo += ` (${p.followersEstimate.toLocaleString()} followers)`;
      }
      return platInfo;
    }).join(', ') || 'None';

    // Best Contact Method Heuristic
    let bestContactMethod = 'Cold Visit / Direct Message on Socials';
    if (biz.email && biz.ownerName) {
      bestContactMethod = `Email (Personalized Pitch to ${biz.ownerName} at ${biz.email})`;
    } else if (biz.email) {
      bestContactMethod = `Email (General Pitch to ${biz.email})`;
    } else if (biz.phone) {
      bestContactMethod = `Phone / WhatsApp (${biz.phone})`;
    }

    // Missing Information List
    const missingInfo: string[] = [];
    if (!biz.ownerName) missingInfo.push('Owner Name');
    if (!biz.email) missingInfo.push('Business Email');
    if (!biz.phone) missingInfo.push('Phone Number');
    if (!biz.verifiedWebsite) missingInfo.push('Verified Website Link');
    if (biz.socialProfiles.length === 0) missingInfo.push('Social Profile Pages');

    const missingInfoText = missingInfo.length > 0 ? missingInfo.join(', ') : 'None (Fully Enriched Dossier)';

    // Competitors listing (Top 5)
    let competitorsText = '';
    const sortedAnalyses = [...biz.analyses]
      .sort((a, b) => (b.websiteScoreGap ?? 0) - (a.websiteScoreGap ?? 0))
      .slice(0, 5);

    if (sortedAnalyses.length > 0) {
      sortedAnalyses.forEach((a, idx) => {
        const compBiz = a.competitor.competitorBusiness;
        const compWebScore = compBiz.websiteData?.overallScore ?? 'N/A';
        competitorsText += `     ${idx + 1}. ${compBiz.name} (Web Score: ${compWebScore}/100 | Gap: ${a.websiteScoreGap ?? 0} points)\n`;
      });
    } else {
      competitorsText = '     No local competitors mapped.\n';
    }

    // AI Summary / Pitching Info
    const services = biz.opportunities.map(o => o.serviceType).join(', ') || 'General Digital Optimization';
    const firstService = biz.opportunities.length > 0 ? biz.opportunities[0].serviceType : 'Website & SEO Setup';
    
    // Construct dossier layout
    let doc = `================================================================================\n`;
    doc += `RANK #${lead.leadPriorityRank} | LEAD SCORE: ${lead.leadScore}/100 (Tier: ${lead.leadTier})\n`;
    doc += `================================================================================\n`;
    
    doc += `1. BUSINESS PROFILE\n`;
    doc += `   - Name:            ${biz.name}\n`;
    doc += `   - Category:        ${biz.industry || 'Local Business'}\n`;
    doc += `   - Address:         ${biz.address || 'Delhi'}\n`;
    doc += `   - City:            ${biz.city || 'Delhi'}\n`;
    doc += `   - Google Reviews:  ${biz.reviewCount ?? 0} | Rating: ${biz.rating ?? 0}/5\n\n`;

    doc += `2. CONTACT DETAILS\n`;
    doc += `   - Phone:           ${biz.phone ?? 'None'}\n`;
    doc += `   - Email:           ${biz.email ?? 'None'}\n`;
    doc += `   - Website (Maps):  ${biz.website ?? 'None'}\n`;
    doc += `   - Verified URL:    ${biz.verifiedWebsite ?? 'None'} (Conf: ${biz.websiteConfidence}%, Source: ${biz.websiteSource})\n`;
    doc += `   - Owner/Decision:  ${biz.ownerName ?? 'None'} (Role: ${biz.ownerRole ?? 'None'}, Conf: ${biz.ownerConfidence}%)\n`;
    doc += `   - LinkedIn Profile: ${biz.ownerLinkedIn ?? 'None'}\n\n`;

    doc += `3. DIGITAL PRESENCE\n`;
    doc += `   - Website Overall: ${web?.overallScore ?? 'N/A'}/100\n`;
    doc += `   - SEO Score:       ${web?.seoScore ?? 'N/A'}/100\n`;
    doc += `   - Performance:     ${web?.performanceScore ?? 'N/A'}/100\n`;
    doc += `   - Social Channels: ${socialPlatforms}\n`;
    doc += `   - Reachability:    ${lead.reachabilityScore ?? 0}/100 (Tier: ${lead.contactabilityTier ?? 'UNREACHABLE'})\n\n`;

    doc += `4. COMPETITIVE LANDSCAPE\n`;
    doc += `   - Competitive Gap: ${competitorsText}`;

    doc += `5. OPPORTUNITIES\n`;
    doc += `   - Rec. Services:   ${services}\n`;
    doc += `   - Buying Intent:   ${lead.buyingIntent ?? 'Unknown'}\n\n`;

    doc += `6. SALES SUITABILITY\n`;
    doc += `   - Sales Readiness: ${lead.salesReadinessScore ?? 0}/100 (Tier: ${lead.salesReadinessTier ?? 'D'})\n`;
    doc += `   - Suitability Score: ${biz.outreachSuitabilityScore ?? 0}/100\n`;
    doc += `   - Enterprise Brand: ${biz.enterpriseFlag} | Franchise Chain: ${biz.franchiseFlag}\n\n`;

    doc += `7. CLOSING ANALYSIS\n`;
    doc += `   - Sales Confidence:    ${lead.salesConfidence ?? 'Unknown'}\n`;
    doc += `   - Reachability Score:  ${lead.reachabilityScore ?? 0}/100\n`;
    doc += `   - Best Contact Method: ${bestContactMethod}\n`;
    doc += `   - Missing Information: ${missingInfoText}\n\n`;

    doc += `8. AI SALES STRATEGY SUMMARY\n`;
    doc += `   - Outreach Goal:       Pitch ${firstService} first. ${biz.name} has a strong reputation (${biz.reviewCount ?? 0} reviews) but lags in digital accessibility.\n`;
    doc += `   - Core Weakness:       ${!biz.verifiedWebsite ? 'Missing verified, functional website.' : 'Poor website metrics (overall score: ' + (web?.overallScore ?? 50) + '/100).'}\n`;
    doc += `   - Value Proposition:   Enable bookings, increase lead capture, and outshine local competitors using modern web architectures.\n`;
    doc += `--------------------------------------------------------------------------------\n\n`;

    return doc;
  }
}
