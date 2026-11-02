import { Worker } from 'bullmq';
import axios from 'axios';
import * as cheerio from 'cheerio';
import redisConnection from '@/lib/redis';
import prisma from '@/lib/prisma';
import { WebsiteRepository } from '@/repositories/WebsiteRepository';
import { detectTechnologies } from '@/lib/tech-detector';
import { Severity } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { isSafePublicUrl } from '@/lib/url-safety';

const websiteRepo = new WebsiteRepository();

export {
  classifyAuditError,
  type AuditFailureCategory,
  type AuditFailureDetail,
} from '@/lib/audit-classifier';
import { classifyAuditError, type AuditFailureDetail } from '@/lib/audit-classifier';
import { inspectTls } from '@/lib/tls-inspector';
import { lookupDomainRegistration } from '@/lib/rdap-client';

function normalizeUrl(url: string): string {
  let cleanUrl = url.trim();
  if (!/^https?:\/\//i.test(cleanUrl)) {
    cleanUrl = 'https://' + cleanUrl;
  }
  return cleanUrl;
}

function getDomain(urlStr: string): string {
  try {
    const parsed = new URL(normalizeUrl(urlStr));
    return parsed.hostname.replace(/^www\./i, '');
  } catch (e) {
    return urlStr;
  }
}

export const auditWorker = new Worker(
  'website-audit',
  async (job) => {
    const { businessId, websiteUrl, mode = 'FAST' } = job.data;
    console.log(`Starting website-audit job ${job.id} for Business ${businessId} (${websiteUrl}) in ${mode} mode`);

    if (!websiteUrl) {
      console.warn(`No website URL provided for business ${businessId}`);
      return;
    }

    const normalizedUrl = normalizeUrl(websiteUrl);
    const domain = getDomain(normalizedUrl);

    // SSRF Guard: reject unsafe internal/private networks before making any request
    if (!isSafePublicUrl(normalizedUrl)) {
      console.warn(`[Audit] SSRF Blocked: ${normalizedUrl} is not a safe public URL`);
      const ssrfFailure = classifyAuditError(new Error('SSRF Blocked: Unsafe internal or private network destination'));
      await saveFailedAudit(businessId, normalizedUrl, domain, ssrfFailure);
      return;
    }

    try {
      if (mode === 'FULL') {
        await executeFullAudit(businessId, normalizedUrl, domain);
      } else {
        await executeFastAudit(businessId, normalizedUrl, domain);
      }
    } catch (err: any) {
      console.error(`Audit failed for business ${businessId} (${normalizedUrl}):`, err);
      const failure = classifyAuditError(err);
      await saveFailedAudit(businessId, normalizedUrl, domain, failure);
    }
  },
  {
    connection: redisConnection as any,
    concurrency: 5, // We can perform multiple audits concurrently
    skipVersionCheck: true,
  }
);

/**
 * Execute FAST AUDIT (HTTP, Cheerio, Regex, < 5 seconds)
 */
async function executeFastAudit(businessId: string, url: string, domain: string) {
  let response;
  let sslEnabled = true;
  const startTime = Date.now();

  const safeRedirectHandler = (options: any, responseDetails: any) => {
    const nextLocation = responseDetails.headers?.location;
    if (nextLocation) {
      let resolvedUrl: string;
      try {
        resolvedUrl = new URL(nextLocation, options.href || url).href;
      } catch {
        throw new Error(`SSRF Blocked: Invalid redirect URL ${nextLocation}`);
      }
      if (!isSafePublicUrl(resolvedUrl)) {
        throw new Error(`SSRF Blocked: Redirect destination ${resolvedUrl} is unsafe`);
      }
    }
  };

  try {
    response = await axios.get(url, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      maxRedirects: 5,
      beforeRedirect: safeRedirectHandler,
    });
  } catch (err: any) {
    const isSslError = err.code === 'DEPTH_ZERO_SELF_SIGNED_CERT' || 
                        err.code === 'CERT_HAS_EXPIRED' || 
                        err.code === 'ERR_TLS_CERT_ALTNAME_INVALID' ||
                        err.message?.includes('certificate') ||
                        err.message?.includes('ssl') ||
                        err.message?.includes('tls');
    
    if (isSslError) {
      sslEnabled = false;
      // Retry without SSL verification to inspect the HTML
      try {
        const https = await import('https');
        const agent = new https.Agent({ rejectUnauthorized: false });
        response = await axios.get(url, {
          timeout: 5000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          maxRedirects: 5,
          httpsAgent: agent,
          beforeRedirect: safeRedirectHandler,
        });
      } catch (retryErr: any) {
        throw retryErr;
      }
    } else if (url.startsWith('https://')) {
      // Try HTTP fallback
      const httpUrl = url.replace('https://', 'http://');
      sslEnabled = false;
      try {
        response = await axios.get(httpUrl, {
          timeout: 5000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          maxRedirects: 5,
          beforeRedirect: safeRedirectHandler,
        });
      } catch (httpErr: any) {
        throw err; // preserve original HTTPS error containing status and headers
      }
    } else {
      throw err;
    }
  }

  const responseTime = Date.now() - startTime;
  const html = response.data;
  if (typeof html !== 'string') {
    throw new Error('Inaccessible: Response body is not HTML text');
  }

  const $ = cheerio.load(html);

  // 1. Core Meta Tags
  const title = $('title').text().trim() || $('meta[property="og:title"]').attr('content')?.trim() || '';
  const metaDescription = $('meta[name="description"]').attr('content')?.trim() || $('meta[property="og:description"]').attr('content')?.trim() || '';
  const h1Count = $('h1').length;
  const domSize = $('*').length;

  // 2. Contact Details Detection
  const bodyText = $('body').text();
  let phonePresence = false;
  let emailPresence = false;
  let hasContactForm = false;

  const phoneNumbers = new Set<string>();
  const emails = new Set<string>();

  // Check tel: links
  $('a[href^="tel:"]').each((_, el) => {
    const val = $(el).attr('href')?.replace('tel:', '').trim();
    if (val) phoneNumbers.add(val);
  });

  // Check mailto: links
  $('a[href^="mailto:"]').each((_, el) => {
    const val = $(el).attr('href')?.replace('mailto:', '').split('?')[0].trim();
    if (val) emails.add(val);
  });

  // Body text phone scan
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const textPhones = bodyText.match(phoneRegex) || [];
  textPhones.forEach(p => {
    if (p.replace(/[^0-9]/g, '').length >= 7) {
      phoneNumbers.add(p.trim());
    }
  });

  // Body text email scan
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const textEmails = bodyText.match(emailRegex) || [];
  textEmails.forEach(e => emails.add(e.trim()));

  phonePresence = phoneNumbers.size > 0;
  emailPresence = emails.size > 0;

  // Contact Form scan
  $('form').each((_, el) => {
    const action = $(el).attr('action')?.toLowerCase() || '';
    const id = $(el).attr('id')?.toLowerCase() || '';
    const className = $(el).attr('class')?.toLowerCase() || '';
    if (
      action.includes('contact') || action.includes('support') || action.includes('submit') || 
      id.includes('contact') || className.includes('contact') || className.includes('form-contact')
    ) {
      hasContactForm = true;
    }
  });

  if (!hasContactForm) {
    $('a').each((_, el) => {
      const linkText = $(el).text().toLowerCase();
      const linkHref = $(el).attr('href')?.toLowerCase() || '';
      if (
        (linkText.includes('contact') || linkText.includes('get in touch') || linkText.includes('support')) && 
        (linkHref.includes('contact') || linkHref.includes('support') || linkHref.includes('form') || linkHref.includes('ticket'))
      ) {
        hasContactForm = true;
      }
    });
  }

  // 3. Technology Detection with Phase 2 Extensions
  const techResult = detectTechnologies(html, url);
  const { technologies, cms, detailedTechnologies, ecommerce, openGraph, schemaOrg } = techResult;
  const hasAnalytics = technologies.includes('Google Analytics') || technologies.includes('GTM') || technologies.includes('Meta Pixel');

  // Inspect TLS Certificate if domain is public
  let tlsResult: any = null;
  if (isSafePublicUrl(url)) {
    try {
      tlsResult = await inspectTls(domain, { timeoutMs: 3500 });
      if (tlsResult && !tlsResult.isValid) {
        sslEnabled = false;
      }
    } catch {
      // Non-fatal for fast audit
    }
  }

  // Lookup Domain Registration if domain is valid
  let domainResult: any = null;
  if (isSafePublicUrl(url)) {
    try {
      domainResult = await lookupDomainRegistration(domain, { timeoutMs: 3500 });
    } catch {
      // Non-fatal for fast audit
    }
  }

  // 4. Scoring Formulas
  // A. Performance Score
  let performanceScore = 100;
  if (responseTime < 600) {
    performanceScore -= 0;
  } else if (responseTime < 1500) {
    performanceScore -= 15;
  } else if (responseTime < 3000) {
    performanceScore -= 35;
  } else {
    performanceScore -= 55;
  }
  if (domSize > 1500) {
    performanceScore -= 15;
  }
  performanceScore = Math.max(10, performanceScore);

  // B. SEO Score
  let seoScore = 100;
  if (!title) seoScore -= 30;
  if (!metaDescription) seoScore -= 30;
  if (h1Count === 0) {
    seoScore -= 20;
  } else if (h1Count > 1) {
    seoScore -= 10;
  }
  if (!phonePresence && !emailPresence) {
    seoScore -= 10;
  }
  seoScore = Math.max(10, seoScore);

  // C. Security Score
  const securityScore = sslEnabled ? 100 : 20;

  // D. Technology Score
  let technologyScore = 50;
  for (const tech of technologies) {
    technologyScore += 10;
  }
  technologyScore = Math.min(100, technologyScore);

  // E. Overall Score
  const overallScore = Math.round(
    performanceScore * 0.2 +
    seoScore * 0.3 +
    securityScore * 0.3 +
    technologyScore * 0.2
  );

  // 5. Generate Issues
  interface TempIssue {
    type: string;
    severity: Severity;
    title: string;
    description: string;
    recommendation: string;
  }

  const issuesList: TempIssue[] = [];

  if (!sslEnabled) {
    issuesList.push({
      type: 'Missing SSL',
      severity: Severity.CRITICAL,
      title: 'Missing SSL Certificate',
      description: 'The website does not use HTTPS or has an invalid/expired SSL certificate.',
      recommendation: 'Install a valid SSL certificate and redirect all HTTP traffic to HTTPS.',
    });
  }

  if (!metaDescription) {
    issuesList.push({
      type: 'Missing Meta Description',
      severity: Severity.HIGH,
      title: 'Missing Meta Description',
      description: 'The website is missing a meta description tag.',
      recommendation: 'Add a compelling meta description tag of 150-160 characters to improve search engine click-through rates.',
    });
  }

  if (!hasContactForm) {
    issuesList.push({
      type: 'No Contact Form',
      severity: Severity.MEDIUM,
      title: 'No Contact Form Detected',
      description: 'We could not locate a contact form on the homepage.',
      recommendation: 'Embed a clear contact form to increase visitor inquiries and conversion rates.',
    });
  }

  if (!hasAnalytics) {
    issuesList.push({
      type: 'No Analytics',
      severity: Severity.MEDIUM,
      title: 'No Analytics Tools Installed',
      description: 'The website does not seem to have Google Analytics, Google Tag Manager, or Meta Pixel installed.',
      recommendation: 'Install Google Tag Manager or Google Analytics to track visitor behavior and performance metrics.',
    });
  }

  if (!emailPresence) {
    issuesList.push({
      type: 'No Email',
      severity: Severity.MEDIUM,
      title: 'No Public Email Address',
      description: 'No contact email address was found on the homepage.',
      recommendation: 'Add a contact email address in the header, footer, or contact section to make it easier for customers to reach you.',
    });
  }

  if (!phonePresence) {
    issuesList.push({
      type: 'No Phone',
      severity: Severity.MEDIUM,
      title: 'No Phone Number Detected',
      description: 'No contact phone number was found on the homepage.',
      recommendation: 'Display a prominent phone number to build trust and allow direct customer calls.',
    });
  }

  if (responseTime > 2000) {
    issuesList.push({
      type: 'Slow Response',
      severity: Severity.HIGH,
      title: 'Slow Website Loading Time',
      description: `The website took ${responseTime}ms to respond, which is slower than the recommended threshold of 2 seconds.`,
      recommendation: 'Optimize images, leverage browser caching, and consider a faster hosting provider or CDN.',
    });
  }

  if (domSize > 1500) {
    issuesList.push({
      type: 'Large DOM',
      severity: Severity.LOW,
      title: 'Large DOM Size',
      description: `The page contains ${domSize} elements, which exceeds the recommended limit of 1500 elements.`,
      recommendation: 'Simplify the HTML structure, reduce nested elements, and paginate or lazy load content.',
    });
  }

  if (cms === 'WordPress' && responseTime > 2500) {
    issuesList.push({
      type: 'Outdated CMS',
      severity: Severity.MEDIUM,
      title: 'WordPress CMS Performance Optimization Needed',
      description: 'The site runs on WordPress and exhibits slower load times, suggesting outdated packages or missing performance optimization.',
      recommendation: 'Update all WordPress core, theme, and plugin files, and install a caching plugin like WP Rocket.',
    });
  }

  if (!openGraph.hasOpenGraph) {
    issuesList.push({
      type: 'Missing Open Graph',
      severity: Severity.LOW,
      title: 'Missing Social Media (Open Graph) Metadata',
      description: 'The website lacks Open Graph meta tags (og:title, og:description, og:image), reducing social media share visibility.',
      recommendation: 'Add Open Graph meta tags to ensure rich link previews when shared on WhatsApp, LinkedIn, and Facebook.',
    });
  }

  if (!schemaOrg.hasSchemaOrg) {
    issuesList.push({
      type: 'Missing Structured Data',
      severity: Severity.LOW,
      title: 'No Schema.org Structured Data Detected',
      description: 'Search engines rely on Schema.org structured data (JSON-LD) to understand business information and display rich snippets.',
      recommendation: 'Implement Schema.org LocalBusiness or Organization structured data in JSON-LD format.',
    });
  }

  if (tlsResult && !tlsResult.isValid && tlsResult.authorizationError) {
    issuesList.push({
      type: 'TLS Certificate Error',
      severity: Severity.CRITICAL,
      title: 'TLS / SSL Certificate Verification Failed',
      description: `The SSL certificate for ${domain} failed verification: ${tlsResult.authorizationError}.`,
      recommendation: 'Renew or reconfigure the SSL/TLS certificate with a trusted Certificate Authority.',
    });
  }

  if (domainResult && domainResult.daysUntilExpiration !== null && domainResult.daysUntilExpiration <= 30 && domainResult.daysUntilExpiration > 0) {
    issuesList.push({
      type: 'Domain Expiring Soon',
      severity: Severity.HIGH,
      title: 'Domain Registration Expiring Soon',
      description: `The domain ${domain} is scheduled to expire in ${domainResult.daysUntilExpiration} days.`,
      recommendation: 'Renew the domain registration with your registrar to prevent downtime or domain hijacking.',
    });
  }

  // 6. Save results to database
  const website = await websiteRepo.upsert(businessId, url, domain, {
    technologyStack: technologies,
    cms,
    sslEnabled,
    performanceScore,
    seoScore,
    securityScore,
    bestPracticesScore: technologyScore,
    overallScore,
    lastScanAt: new Date(),
  });

  await websiteRepo.saveIssues(website.id, issuesList);

  // Log audit completed activity
  await prisma.activity.create({
    data: {
      businessId,
      type: 'AUDIT_COMPLETED',
      metadata: {
        overallScore,
        performanceScore,
        seoScore,
        securityScore,
        issuesCount: issuesList.length,
      },
    },
  });

  // Sync back email and phone number to the Business record if they weren't present
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (business) {
    const updateData: any = {};
    if (!business.email && emails.size > 0) {
      updateData.email = Array.from(emails)[0];
    }
    if (!business.phone && phoneNumbers.size > 0) {
      updateData.phone = Array.from(phoneNumbers)[0];
    }
    if (Object.keys(updateData).length > 0) {
      await prisma.business.update({
        where: { id: businessId },
        data: updateData,
      });
      console.log(`Synced website contact details to Business ${businessId}:`, updateData);
    }
  }

  // Trigger competitor pipeline
  try {
    const { CompetitorService } = await import('@/services/CompetitorService');
    const competitorService = new CompetitorService();
    const result = await competitorService.runCompetitorPipeline(businessId);
    console.log(`[Auto-Trigger] Competitor pipeline completed for Business ${businessId}:`, result);
  } catch (compErr) {
    console.error(`[Auto-Trigger] Failed to run competitor pipeline for Business ${businessId}:`, compErr);
  }

  console.log(`FAST Audit completed for Business ${businessId}. Overall Score: ${overallScore}, Issues Found: ${issuesList.length}`);
}

/**
 * Execute FULL AUDIT (Playwright, screenshot, performance metrics, 30-60 seconds)
 */
async function executeFullAudit(businessId: string, url: string, domain: string) {
  console.log(`Executing FULL Audit using Playwright for ${url}`);
  const { chromium } = await import('playwright');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  try {
    const startTime = Date.now();
    await page.goto(url, { waitUntil: 'load', timeout: 15000 });
    const responseTime = Date.now() - startTime;

    // A. Accessibility check: Alt tags on images
    const accessibilityStats = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      const missingAlt = images.filter(img => !img.alt).length;
      return {
        totalImages: images.length,
        missingAlt,
      };
    });

    // B. Performance timing check
    const timingStats = await page.evaluate(() => {
      const [nav] = performance.getEntriesByType('navigation') as any[];
      return {
        domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd - nav.startTime) : null,
        loadTime: nav ? Math.round(nav.loadEventEnd - nav.startTime) : null,
      };
    });

    // Capture screenshot and save to public/screenshots/
    const screenshotDir = path.join(process.cwd(), 'public', 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    const screenshotPath = path.join(screenshotDir, `${businessId}.jpg`);
    await page.screenshot({ path: screenshotPath, type: 'jpeg', quality: 75 });
    console.log(`Saved screenshot to ${screenshotPath}`);

    // Get the HTML content to perform the standard FAST audit logic on it
    const html = await page.content();
    const $ = cheerio.load(html);

    // Core SEO details
    const title = $('title').text().trim() || '';
    const metaDescription = $('meta[name="description"]').attr('content')?.trim() || '';
    const h1Count = $('h1').length;
    const domSize = $('*').length;

    // Contact Details
    const bodyText = $('body').text();
    const phoneNumbers = new Set<string>();
    const emails = new Set<string>();

    $('a[href^="tel:"]').each((_, el) => {
      const val = $(el).attr('href')?.replace('tel:', '').trim();
      if (val) phoneNumbers.add(val);
    });

    $('a[href^="mailto:"]').each((_, el) => {
      const val = $(el).attr('href')?.replace('mailto:', '').split('?')[0].trim();
      if (val) emails.add(val);
    });

    const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    const textPhones = bodyText.match(phoneRegex) || [];
    textPhones.forEach(p => {
      if (p.replace(/[^0-9]/g, '').length >= 7) {
        phoneNumbers.add(p.trim());
      }
    });

    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const textEmails = bodyText.match(emailRegex) || [];
    textEmails.forEach(e => emails.add(e.trim()));

    const phonePresence = phoneNumbers.size > 0;
    const emailPresence = emails.size > 0;

    let hasContactForm = false;
    $('form').each((_, el) => {
      const action = $(el).attr('action')?.toLowerCase() || '';
      const id = $(el).attr('id')?.toLowerCase() || '';
      const className = $(el).attr('class')?.toLowerCase() || '';
      if (action.includes('contact') || action.includes('support') || id.includes('contact') || className.includes('contact')) {
        hasContactForm = true;
      }
    });

    // Tech stack
    const { technologies, cms } = detectTechnologies(html);
    const hasAnalytics = technologies.includes('Google Analytics') || technologies.includes('GTM') || technologies.includes('Meta Pixel');

    // Dynamic metrics calculation
    const sslEnabled = url.startsWith('https://');

    // Performance score calculations incorporating DOM Content Loaded
    let performanceScore = 100;
    const dclTime = timingStats.domContentLoaded || responseTime;
    if (dclTime < 800) {
      performanceScore -= 0;
    } else if (dclTime < 2000) {
      performanceScore -= 15;
    } else if (dclTime < 4000) {
      performanceScore -= 35;
    } else {
      performanceScore -= 50;
    }
    if (domSize > 1500) {
      performanceScore -= 15;
    }
    performanceScore = Math.max(10, performanceScore);

    // SEO Score
    let seoScore = 100;
    if (!title) seoScore -= 30;
    if (!metaDescription) seoScore -= 30;
    if (h1Count === 0) {
      seoScore -= 20;
    } else if (h1Count > 1) {
      seoScore -= 10;
    }
    if (!phonePresence && !emailPresence) {
      seoScore -= 10;
    }
    seoScore = Math.max(10, seoScore);

    // Security Score
    const securityScore = sslEnabled ? 100 : 20;

    // Accessibility score based on missing alt tags
    let accessibilityScore = 100;
    if (accessibilityStats.totalImages > 0) {
      const missingPercent = accessibilityStats.missingAlt / accessibilityStats.totalImages;
      accessibilityScore = Math.round(100 - (missingPercent * 80));
    }
    accessibilityScore = Math.max(10, accessibilityScore);

    // Tech score
    let technologyScore = 50;
    for (const tech of technologies) {
      technologyScore += 10;
    }
    technologyScore = Math.min(100, technologyScore);

    // Overall Score
    const overallScore = Math.round(
      performanceScore * 0.2 +
      seoScore * 0.25 +
      securityScore * 0.2 +
      accessibilityScore * 0.15 +
      technologyScore * 0.2
    );

    // Generate issues list
    const issuesList: any[] = [];

    if (!sslEnabled) {
      issuesList.push({
        type: 'Missing SSL',
        severity: Severity.CRITICAL,
        title: 'Missing SSL Certificate',
        description: 'The website does not use HTTPS or has an invalid/expired SSL certificate.',
        recommendation: 'Install a valid SSL certificate and redirect all HTTP traffic to HTTPS.',
      });
    }

    if (!metaDescription) {
      issuesList.push({
        type: 'Missing Meta Description',
        severity: Severity.HIGH,
        title: 'Missing Meta Description',
        description: 'The website is missing a meta description tag.',
        recommendation: 'Add a compelling meta description tag of 150-160 characters to improve search engine click-through rates.',
      });
    }

    if (!hasContactForm) {
      issuesList.push({
        type: 'No Contact Form',
        severity: Severity.MEDIUM,
        title: 'No Contact Form Detected',
        description: 'We could not locate a contact form on the homepage.',
        recommendation: 'Embed a clear contact form to increase visitor inquiries and conversion rates.',
      });
    }

    if (!hasAnalytics) {
      issuesList.push({
        type: 'No Analytics',
        severity: Severity.MEDIUM,
        title: 'No Analytics Tools Installed',
        description: 'The website does not seem to have Google Analytics, Google Tag Manager, or Meta Pixel installed.',
        recommendation: 'Install Google Tag Manager or Google Analytics to track visitor behavior and performance metrics.',
      });
    }

    if (!emailPresence) {
      issuesList.push({
        type: 'No Email',
        severity: Severity.MEDIUM,
        title: 'No Public Email Address',
        description: 'No contact email address was found on the homepage.',
        recommendation: 'Add a contact email address in the header, footer, or contact section to make it easier for customers to reach you.',
      });
    }

    if (!phonePresence) {
      issuesList.push({
        type: 'No Phone',
        severity: Severity.MEDIUM,
        title: 'No Phone Number Detected',
        description: 'No contact phone number was found on the homepage.',
        recommendation: 'Display a prominent phone number to build trust and allow direct customer calls.',
      });
    }

    if (responseTime > 2000) {
      issuesList.push({
        type: 'Slow Response',
        severity: Severity.HIGH,
        title: 'Slow Website Loading Time',
        description: `The website took ${responseTime}ms to load, which is slower than the recommended threshold of 2 seconds.`,
        recommendation: 'Optimize images, leverage browser caching, and consider a faster hosting provider or CDN.',
      });
    }

    if (domSize > 1500) {
      issuesList.push({
        type: 'Large DOM',
        severity: Severity.LOW,
        title: 'Large DOM Size',
        description: `The page contains ${domSize} elements, which exceeds the recommended limit of 1500 elements.`,
        recommendation: 'Simplify the HTML structure, reduce nested elements, and paginate or lazy load content.',
      });
    }

    if (accessibilityStats.missingAlt > 0) {
      issuesList.push({
        type: 'Accessibility Issues',
        severity: Severity.LOW,
        title: 'Missing Image Alt Attributes',
        description: `Found ${accessibilityStats.missingAlt} images out of ${accessibilityStats.totalImages} without alternate descriptive text.`,
        recommendation: 'Add alternative (alt) text to all images to improve screen reader accessibility and image SEO search rankings.',
      });
    }

    if (cms === 'WordPress' && responseTime > 2500) {
      issuesList.push({
        type: 'Outdated CMS',
        severity: Severity.MEDIUM,
        title: 'WordPress CMS Performance Optimization Needed',
        description: 'The site runs on WordPress and exhibits slower load times, suggesting outdated packages or missing performance optimization.',
        recommendation: 'Update all WordPress core, theme, and plugin files, and install a caching plugin like WP Rocket.',
      });
    }

    // Save to Database
    const website = await websiteRepo.upsert(businessId, url, domain, {
      technologyStack: technologies,
      cms,
      sslEnabled,
      performanceScore,
      seoScore,
      securityScore,
      accessibilityScore,
      bestPracticesScore: technologyScore,
      overallScore,
      lastScanAt: new Date(),
    });

    await websiteRepo.saveIssues(website.id, issuesList);

    // Log audit completed activity
    await prisma.activity.create({
      data: {
        businessId,
        type: 'AUDIT_COMPLETED',
        metadata: {
          overallScore,
          performanceScore,
          seoScore,
          securityScore,
          accessibilityScore,
          issuesCount: issuesList.length,
        },
      },
    });

    // Sync back email and phone
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (business) {
      const updateData: any = {};
      if (!business.email && emails.size > 0) {
        updateData.email = Array.from(emails)[0];
      }
      if (!business.phone && phoneNumbers.size > 0) {
        updateData.phone = Array.from(phoneNumbers)[0];
      }
      if (Object.keys(updateData).length > 0) {
        await prisma.business.update({
          where: { id: businessId },
          data: updateData,
        });
      }
    }

    // Trigger competitor pipeline
    try {
      const { CompetitorService } = await import('@/services/CompetitorService');
      const competitorService = new CompetitorService();
      const result = await competitorService.runCompetitorPipeline(businessId);
      console.log(`[Auto-Trigger] Competitor pipeline completed for Business ${businessId}:`, result);
    } catch (compErr) {
      console.error(`[Auto-Trigger] Failed to run competitor pipeline for Business ${businessId}:`, compErr);
    }

    console.log(`FULL Audit completed for Business ${businessId}. Overall Score: ${overallScore}, Issues Found: ${issuesList.length}`);

  } finally {
    await browser.close();
  }
}

/**
 * Save state when audit fails or is restricted (WAF, DNS, Timeout, SSRF, Unavailable).
 * Preserves previously verified data and avoids falsely penalizing WAF-protected sites as broken.
 */
async function saveFailedAudit(
  businessId: string,
  url: string,
  domain: string,
  failure: AuditFailureDetail | string
) {
  const detail: AuditFailureDetail = typeof failure === 'string'
    ? classifyAuditError(new Error(failure))
    : failure;

  let existing = null;
  try {
    existing = await websiteRepo.findByBusinessId(businessId);
  } catch {}

  const isWaf = detail.category === 'WAF_PROTECTED';

  const updateData = isWaf ? {
    // WAF Protected: Website is online. Do NOT zero out scores or claim it is broken.
    technologyStack: existing?.technologyStack && Array.isArray(existing.technologyStack) && existing.technologyStack.length > 0
      ? existing.technologyStack
      : ['WAF/Anti-Bot Protected'],
    cms: existing?.cms || null,
    sslEnabled: existing?.sslEnabled ?? url.startsWith('https://'),
    performanceScore: existing?.performanceScore ?? null,
    seoScore: existing?.seoScore ?? null,
    securityScore: existing?.securityScore ?? (url.startsWith('https://') ? 80 : 40),
    bestPracticesScore: existing?.bestPracticesScore ?? null,
    overallScore: existing?.overallScore ?? null,
    lastScanAt: new Date(),
  } : {
    // Other errors (DNS, Timeout, Refused, etc.)
    // Preserve existing verified technologyStack/CMS if previously recorded
    technologyStack: existing?.technologyStack || [],
    cms: existing?.cms || null,
    sslEnabled: existing?.sslEnabled ?? false,
    performanceScore: existing?.performanceScore ?? 10,
    seoScore: existing?.seoScore ?? 10,
    securityScore: existing?.securityScore ?? 10,
    bestPracticesScore: existing?.bestPracticesScore ?? 10,
    overallScore: existing?.overallScore ?? 10,
    lastScanAt: new Date(),
  };

  const website = await websiteRepo.upsert(businessId, url, domain, updateData as any);

  const issuesList = [
    {
      type: detail.issueType,
      severity: detail.severity,
      title: detail.issueTitle,
      description: `Audit diagnostics: ${detail.message}`,
      recommendation: detail.recommendation,
    }
  ];

  await websiteRepo.saveIssues(website.id, issuesList);
}
