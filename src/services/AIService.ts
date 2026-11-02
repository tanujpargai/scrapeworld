import { OpenAI } from 'openai';
import { env } from '@/lib/env';
import { BusinessRepository } from '@/repositories/BusinessRepository';
import { AIReportRepository } from '@/repositories/AIReportRepository';
import { ActivityRepository } from '@/repositories/ActivityRepository';
import { ReportType, AIReport, Prisma } from '@prisma/client';

export class AIService {
  private businessRepo = new BusinessRepository();
  private aiReportRepo = new AIReportRepository();
  private activityRepo = new ActivityRepository();
  private openai: OpenAI | null = null;

  constructor() {
    const apiKey = env.OPENAI_API_KEY;
    // Check if api key is present and not the placeholder
    if (apiKey && apiKey !== 'your-openai-api-key' && !apiKey.startsWith('your-')) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  /**
   * Generates a specific type of AI report for a business and saves it to the DB.
   */
  async generateReport(businessId: string, type: ReportType): Promise<AIReport> {
    console.log(`Generating AI Report (${type}) for business ID: ${businessId}`);

    const business = await this.businessRepo.findById(businessId);
    if (!business) {
      throw new Error(`Business not found: ${businessId}`);
    }

    let reportData: {
      summary: string;
      problems: any;
      recommendations: any;
      opportunities: any;
      salesAngles: any;
      confidenceScore: number;
    };

    if (this.openai) {
      try {
        reportData = await this.generateWithOpenAI(business, type);
      } catch (err) {
        console.error(`OpenAI generation failed, falling back to dynamic mock:`, err);
        reportData = this.generateMockReport(business, type);
      }
    } else {
      console.log(`OpenAI API key not configured or placeholder. Generating dynamic mock report.`);
      reportData = this.generateMockReport(business, type);
    }

    // Save report to database
    const savedReport = await this.aiReportRepo.create(businessId, {
      reportType: type,
      summary: reportData.summary,
      problems: reportData.problems as Prisma.InputJsonValue,
      recommendations: reportData.recommendations as Prisma.InputJsonValue,
      opportunities: reportData.opportunities as Prisma.InputJsonValue,
      salesAngles: reportData.salesAngles as Prisma.InputJsonValue,
      confidenceScore: reportData.confidenceScore,
    });

    // Log activity
    await this.activityRepo.log('REPORT_GENERATED', businessId, {
      reportId: savedReport.id,
      reportType: type,
    });

    return savedReport;
  }

  /**
   * Run the full analysis pipeline generating all reports or the FULL_ANALYSIS report.
   */
  async generateAllReports(businessId: string): Promise<AIReport> {
    // Generate the comprehensive FULL_ANALYSIS report
    return this.generateReport(businessId, ReportType.FULL_ANALYSIS);
  }

  /**
   * Core generator using OpenAI Chat Completion API with JSON mode
   */
  private async generateWithOpenAI(business: any, type: ReportType) {
    if (!this.openai) throw new Error('OpenAI client not initialized');

    const context = this.compileBusinessContext(business);
    const systemPrompt = `You are the Lead Intelligence AI Engine for SCRAPE WORLD.
Your goal is to transform raw business, website, and competitor data into highly actionable, evidence-based sales intelligence.
You must output a JSON object containing the requested details.
NEVER generate assumptions or generic advice that is not backed by facts in the business context.
DO NOT generate any numerical scores.

Output JSON structure:
{
  "summary": "A concise multi-paragraph summary representing the report findings.",
  "problems": [
    { "title": "Problem Title", "severity": "LOW|MEDIUM|HIGH|CRITICAL", "description": "Details about the problem and business impact." }
  ],
  "recommendations": [
    { "title": "Recommendation Title", "details": "Actionable steps to implement the fix." }
  ],
  "opportunities": [
    { "title": "Opportunity Title", "serviceType": "WEBSITE|SEO|AUTOMATION|MARKETING|AI|SOFTWARE|BRANDING", "opportunityScore": 85, "description": "Why this is an opportunity." }
  ],
  "salesAngles": [
    { "channel": "EMAIL|LINKEDIN|CALL|DM", "hook": "Personalized hook/observation", "pitch": "The value proposition/pitch", "script": "Full message text or script" }
  ]
}

Report Type Instructions:
- PROFILE: Focus on overall business summary, market position, and growth signals.
- WEBSITE: Focus on website issues, technology stack gaps, and performance/security fixes.
- COMPETITOR: Focus on competitor gap analysis, benchmarking, and competitive advantages.
- OUTREACH: Focus heavily on the "salesAngles" section, generating direct outreach templates.
- FULL_ANALYSIS: Synthesize all aspects (profile, website, competitors, opportunities, sales angles) comprehensively.`;

    const userPrompt = `Generate a ${type} report based on the following business context:
---
${context}
---`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Empty response from OpenAI');

    return JSON.parse(content);
  }

  /**
   * Helper: Formulate context from business profile details
   */
  private compileBusinessContext(business: any): string {
    const lines: string[] = [];
    lines.push(`Business Name: ${business.name}`);
    lines.push(`Industry: ${business.industry || 'N/A'}`);
    lines.push(`Location: ${business.city || ''}, ${business.state || ''}, ${business.country || ''}`);
    lines.push(`Google Maps Rating: ${business.rating ?? 'N/A'}`);
    lines.push(`Google Maps Review Count: ${business.reviewCount ?? 'N/A'}`);

    if (business.websiteData) {
      const web = business.websiteData;
      lines.push(`\nWebsite Audit:`);
      lines.push(`- URL: ${web.url}`);
      lines.push(`- CMS: ${web.cms || 'Custom/Unknown'}`);
      lines.push(`- SSL Enabled: ${web.sslEnabled}`);
      lines.push(`- Tech Stack: ${JSON.stringify(web.technologyStack)}`);
      lines.push(`- Scores: Performance=${web.performanceScore}/100, SEO=${web.seoScore}/100, Security=${web.securityScore}/100, Accessibility=${web.accessibilityScore ?? 'N/A'}/100, BestPractices=${web.bestPracticesScore ?? 'N/A'}/100, Overall=${web.overallScore}/100`);
      
      if (web.issues && web.issues.length > 0) {
        lines.push(`- Identified Issues:`);
        web.issues.forEach((issue: any) => {
          lines.push(`  * [${issue.severity}] ${issue.title}: ${issue.description || ''} (Rec: ${issue.recommendation || ''})`);
        });
      }
    } else {
      lines.push(`\nWebsite Audit: No website data found. Website might be missing or not audited yet.`);
    }

    if (business.analyses && business.analyses.length > 0) {
      lines.push(`\nCompetitor Benchmarking:`);
      business.analyses.forEach((analysis: any) => {
        const comp = analysis.competitor?.competitorBusiness;
        if (comp) {
          lines.push(`- Competitor: ${comp.name}`);
          lines.push(`  * Rating: ${comp.rating} (${comp.reviewCount} reviews)`);
          lines.push(`  * Web Score: ${comp.websiteData?.overallScore ?? 'N/A'}/100`);
          lines.push(`  * Gaps vs Target: WebScoreGap=${analysis.websiteScoreGap}, SEOGap=${analysis.seoGap}, ReviewGap=${analysis.reviewGap}, SocialGap=${analysis.socialGap}`);
          lines.push(`  * Summary: ${analysis.summary}`);
        }
      });
    }

    if (business.opportunities && business.opportunities.length > 0) {
      lines.push(`\nSuggested Opportunities:`);
      business.opportunities.forEach((opp: any) => {
        lines.push(`- [Score: ${opp.opportunityScore}] ${opp.title} (${opp.serviceType})`);
        lines.push(`  Description: ${opp.description}`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Fallback: Generate a high-quality mock report using local data
   */
  private generateMockReport(business: any, type: ReportType) {
    const name = business.name;
    const industry = business.industry || 'local business';
    const city = business.city || 'your area';
    const webScore = business.websiteData?.overallScore ?? 10;
    const reviewCount = business.reviewCount ?? 0;
    const rating = business.rating ?? 0;

    let summary = '';
    const problems: any[] = [];
    const recommendations: any[] = [];
    const opportunities: any[] = [];
    const salesAngles: any[] = [];
    let confidenceScore = 90;

    // Helper data extraction
    const hasSsl = business.websiteData?.sslEnabled ?? true;
    const hasSlowSite = (business.websiteData?.performanceScore ?? 100) < 60;
    const missingMeta = !(business.websiteData?.seoScore && business.websiteData.seoScore > 70);

    // Problem and Opportunity mapping
    if (webScore <= 30) {
      problems.push({
        title: 'Severe Digital Presence Deficit',
        severity: 'CRITICAL',
        description: `${name} has an extremely low website quality score (${webScore}/100) or lacks a functional website completely. This leads directly to client loss to local competitors.`,
      });
      recommendations.push({
        title: 'Complete Website Rebuild & Modernization',
        details: 'Develop a fast, modern, mobile-friendly landing page with conversion-optimized layouts and clear calls to action.',
      });
      opportunities.push({
        title: 'Website Redesign & Conversion Optimization',
        serviceType: 'WEBSITE',
        opportunityScore: 90,
        description: 'Upgrade the existing slow/unoptimized page to a modern SaaS-inspired conversion funnel.',
      });
    }

    if (!hasSsl) {
      problems.push({
        title: 'Insecure Website Connection (No SSL)',
        severity: 'CRITICAL',
        description: 'The website is served over insecure HTTP. Chrome displays a "Not Secure" warning to users, directly damaging credibility and SEO rankings.',
      });
      recommendations.push({
        title: 'SSL Certificate Setup & HTTPS Redirects',
        details: 'Install a Let\'s Encrypt SSL certificate and configure server-level permanent redirects (301) to force HTTPS.',
      });
      opportunities.push({
        title: 'SSL Security Setup',
        serviceType: 'WEBSITE',
        opportunityScore: 85,
        description: 'Secure the site to remove browser warnings and improve SEO trust signals.',
      });
    }

    if (hasSlowSite) {
      problems.push({
        title: 'Poor Page Load Speed',
        severity: 'HIGH',
        description: 'Website loading latency exceeds 2.5 seconds. Large images, unoptimized code, and lack of browser caching cause high bounce rates.',
      });
      recommendations.push({
        title: 'Performance & Image Optimization',
        details: 'Compress images to Next-Gen WebP formats, minify JS/CSS resources, and configure a Cloudflare CDN.',
      });
    }

    // Competitor gaps
    let competitorCount = 0;
    let avgCompetitorReviews = 100;
    if (business.analyses && business.analyses.length > 0) {
      competitorCount = business.analyses.length;
      let totalCompReviews = 0;
      business.analyses.forEach((a: any) => {
        const comp = a.competitor?.competitorBusiness;
        if (comp) totalCompReviews += comp.reviewCount ?? 0;
      });
      avgCompetitorReviews = Math.round(totalCompReviews / competitorCount);
    }

    if (reviewCount < avgCompetitorReviews - 50) {
      problems.push({
        title: 'Review Gap & Local Map pack Disadvantage',
        severity: 'HIGH',
        description: `${name} has only ${reviewCount} Google reviews, while direct local competitors in ${city} average ${avgCompetitorReviews} reviews. This causes lower visibility in Google Maps local packs.`,
      });
      recommendations.push({
        title: 'Automated Review Acquisition System',
        details: 'Set up automated email/SMS campaigns targeting completed clients requesting Google reviews with direct short-links.',
      });
      opportunities.push({
        title: 'Local SEO & Google Maps Visibility Campaign',
        serviceType: 'SEO',
        opportunityScore: 80,
        description: 'Optimize Google Business Profile listing and trigger campaigns to close the review gap.',
      });
    }

    // Generate summaries and outreach based on type
    if (type === ReportType.PROFILE) {
      summary = `${name} is a ${industry} operating in ${city}, ${business.state || ''}. While holding a baseline rating of ${rating}/5, the digital profile analysis reveals significant gaps. The core limitations center around its online accessibility, website structure, and local competitive posture. Resolving these issues will yield high growth margins.`;
      confidenceScore = 95;
    } else if (type === ReportType.WEBSITE) {
      summary = `The website audit for ${name} reveals a combined digital presence score of ${webScore}/100. Critical issues include ${hasSsl ? '' : 'missing SSL encryption, '}unoptimized load speeds, and lack of modern conversion triggers. Solving these technical bugs will directly elevate site conversion rates.`;
      confidenceScore = 92;
    } else if (type === ReportType.COMPETITOR) {
      summary = `${name} faces stiff local competition in the ${industry} space. Competitors leverage strong reviews (averaging ${avgCompetitorReviews} reviews) and robust website infrastructures. To protect market share, ${name} must prioritize optimizing its page speed and establishing SSL security.`;
      confidenceScore = 90;
    } else if (type === ReportType.OUTREACH) {
      summary = `Outreach blueprint for ${name}. Focuses on highlighting the website performance lag (${webScore}/100) and SSL security warnings as the low-friction entries to capture their attention.`;
      confidenceScore = 88;
      
      salesAngles.push({
        channel: 'EMAIL',
        hook: `I noticed ${name}'s website is currently showing a "Not Secure" warning in browsers.`,
        pitch: `Secure connections are a major ranking factor on Google. We can install an SSL cert and speed up the site in 48 hours.`,
        script: `Subject: Quick question about ${name}'s website security

Hi Team,

I was looking for a ${industry} in ${city} today and clicked onto your website. I noticed that Google Chrome is displaying a prominent "Not Secure" warning next to your domain.

This usually happens when an SSL certificate is missing or expired. It causes a lot of potential customers to bounce because they're worried about inputting their details. 

We specialize in helping local businesses in ${city} secure and speed up their websites. It usually takes less than 48 hours to resolve.

Would you be open to a quick call tomorrow to see how we can get this fixed for you?

Best,
[Your Name]`,
      });

      salesAngles.push({
        channel: 'CALL',
        hook: 'Mentioning the security warning found on their site during casual search.',
        pitch: 'Offering a quick 15-minute fix that removes browser warnings.',
        script: `Intro: "Hi, is this the manager at ${name}? My name is [Your Name], I'm a local developer."
Observation: "I was actually looking at your website just now, and noticed that Google is flagging the site as 'Not Secure' with a big warning symbol."
Value: "Since Google started penalizing sites without SSL certificates, it hurts your maps ranking and bouncers. I wanted to see if anyone is currently working on updating that for you?"
Call to Action: "I can deploy a fix for this in under a day. Let me send over a brief screenshot of the issue. What's the best email to send that to?"`,
      });
    } else {
      // FULL_ANALYSIS
      summary = `${name} is a ${industry} practice based in ${city} with substantial digital growth opportunities. It currently holds a rating of ${rating}/5 across ${reviewCount} reviews. The core digital asset (website score: ${webScore}/100) lacks critical SSL security configurations and experiences severe load latencies. Local competitors currently dominate local search packs due to a review volume gap (competitors average ${avgCompetitorReviews} reviews). Standardizing SSL security, executing speed optimizations, and launching a local review campaign represents a high-confidence growth opportunity.`;
      
      salesAngles.push({
        channel: 'EMAIL',
        hook: `I noticed ${name}'s website is currently showing a "Not Secure" warning in browsers.`,
        pitch: `Secure connections are a major ranking factor on Google. We can install an SSL cert and speed up the site in 48 hours.`,
        script: `Subject: Quick question about ${name}'s website security

Hi Team,

I was looking for a ${industry} in ${city} today and clicked onto your website. I noticed that Google Chrome is displaying a prominent "Not Secure" warning next to your domain.

This usually happens when an SSL certificate is missing or expired. It causes a lot of potential customers to bounce because they're worried about inputting their details. 

We specialize in helping local businesses in ${city} secure and speed up their websites. It usually takes less than 48 hours to resolve.

Would you be open to a quick call tomorrow to see how we can get this fixed for you?

Best,
[Your Name]`,
      });
    }

    return {
      summary,
      problems,
      recommendations,
      opportunities,
      salesAngles,
      confidenceScore,
    };
  }
}
