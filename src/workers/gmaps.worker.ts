import { Worker } from 'bullmq';
import { chromium } from 'playwright';
import redisConnection from '@/lib/redis';
import prisma from '@/lib/prisma';
import { parseGmapsPlace } from '@/lib/gmaps-parser';
import { BusinessStatus } from '@prisma/client';

const rejectedDomains = [
  'instagram.com', 'facebook.com', 'fb.com', 'linkedin.com',
  'youtube.com', 'youtu.be', 'linktr.ee', 'x.com', 'twitter.com', 'tiktok.com'
];

import { getExpandedLocations } from '@/lib/location-expansion';

export const gmapsWorker = new Worker(
  'gmaps-scrape',
  async (job) => {
    const { collectionId } = job.data;
    console.log(`Starting gmaps-scrape job ${job.id} for Collection ${collectionId}`);

    // 1. Fetch Collection details
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
    });

    if (!collection) {
      console.error(`Collection ${collectionId} not found.`);
      return;
    }

    const primaryKeywords = collection.keywords && collection.keywords.length > 0 
      ? collection.keywords 
      : [collection.keyword];
    
    const primaryLocations = collection.locations && collection.locations.length > 0 
      ? collection.locations 
      : [collection.location];

    const target = collection.targetCount || 100;

    await prisma.collection.update({
      where: { id: collectionId },
      data: {
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    
    const page = await context.newPage();
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
    });

    let currentLeads = await prisma.business.count({ where: { collectionId } });
    let estimatedAvailable = 0;
    let totalProcessed = 0;
    let businessesFailed = 0;
    let businessesAudited = 0;

    const autoExpand = primaryLocations.length === 1;
    const locationsList = getExpandedLocations(primaryLocations, autoExpand);
    const keywordsList = [...primaryKeywords];
    
    const stats: any = {
      byKeyword: {},
      byLocation: {}
    };

    // Initialize stats keys
    for (const kw of keywordsList) stats.byKeyword[kw] = 0;
    for (const loc of locationsList) stats.byLocation[loc] = 0;

    let locationIndex = 0;
    let keywordIndex = 0;
    let targetReached = currentLeads >= target;
    let isSaturated = false;

    try {
      while (!targetReached && !isSaturated) {
        if (locationIndex >= locationsList.length) {
          console.log('Locations exhausted. Stopping search.');
          break;
        }

        const currentLocation = locationsList[locationIndex];
        const currentKeyword = keywordsList[keywordIndex];

        console.log(`Searching: "${currentKeyword}" in "${currentLocation}"`);
        
        await prisma.collection.update({
          where: { id: collectionId },
          data: {
            currentKeyword,
            currentLocation,
          },
        });

        const queryStr = `${currentKeyword} ${currentLocation}`.trim();
        const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(queryStr)}`;
        
        try {
          await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

          // Cookie dismiss
          try {
            const cookieButton = page.locator('button:has-text("Reject all"), button:has-text("Accept all"), button:has-text("I agree"), button:has-text("Consent")').first();
            if (await cookieButton.isVisible({ timeout: 3000 })) {
              await cookieButton.click();
            }
          } catch (e) {}

          await page.waitForSelector('[role="feed"]', { timeout: 8000 }).catch(() => {});
          const feed = await page.$('[role="feed"]');
          let links: string[] = [];
          
          // Calculate a fair quota so we pull equally from all cities/keywords
          const totalQueries = locationsList.length * keywordsList.length;
          const currentQueryIndex = (locationIndex * keywordsList.length) + keywordIndex;
          const remainingQueries = totalQueries - currentQueryIndex;
          const remainingLeads = target - currentLeads;
          const limit = Math.max(10, Math.ceil(remainingLeads / remainingQueries));

          if (feed) {
            let previousCount = 0;
            let noNewCount = 0;
            while (links.length < limit && noNewCount < 4) {
              await feed.evaluate(el => el.scrollBy(0, el.scrollHeight));
              await new Promise(resolve => setTimeout(resolve, 1500));
              
              const currentLinks = await page.evaluate(() => 
                Array.from(document.querySelectorAll('a'))
                  .map(a => a.href)
                  .filter(href => href.startsWith('https://www.google.com/maps/place/'))
              );
              links = [...new Set(currentLinks)];
              
              if (links.length === previousCount) {
                noNewCount++;
              } else {
                noNewCount = 0;
                previousCount = links.length;
              }
            }
          } else {
            await new Promise(resolve => setTimeout(resolve, 3000));
            const currentLinks = await page.evaluate(() => 
              Array.from(document.querySelectorAll('a'))
                .map(a => a.href)
                .filter(href => href.startsWith('https://www.google.com/maps/place/'))
            );
            links = [...new Set(currentLinks)];
          }

          estimatedAvailable += links.length;
          console.log(`Found ${links.length} potential businesses for "${queryStr}"`);

          // Update totalFound estimate
          await prisma.collection.update({
            where: { id: collectionId },
            data: { totalFound: estimatedAvailable },
          });

          // Iterate through results
          for (const link of links.slice(0, limit)) {
            // Re-evaluate limits before parsing next link
            currentLeads = await prisma.business.count({ where: { collectionId } });
            if (currentLeads >= target) {
              targetReached = true;
              break;
            }

            const saturationRatio = estimatedAvailable > 0 ? (currentLeads / estimatedAvailable) : 0;
            if (saturationRatio >= 0.95) {
              console.log(`Market Saturation reached for this location (${Math.round(saturationRatio * 100)}%). Moving to next query.`);
              break; // Only break the inner loop so it moves to the next city/keyword
            }

            try {
              await page.goto(link, { waitUntil: 'load', timeout: 30000 });
              await page.waitForSelector('h1', { timeout: 6000 }).catch(() => {});
              await new Promise(resolve => setTimeout(resolve, 500));

              const rawData = await page.evaluate(`(() => {
                const w = window;
                if (!w.APP_INITIALIZATION_STATE) return 'ERROR';
                const findRawDataList = (obj, acc = []) => {
                  if (!obj) return acc;
                  if (typeof obj === 'string' && obj.startsWith(")]}'")) {
                    acc.push(obj);
                    return acc;
                  }
                  if (Array.isArray(obj)) {
                    for (const item of obj) findRawDataList(item, acc);
                  } else if (typeof obj === 'object') {
                    for (const key of Object.keys(obj)) {
                      try { findRawDataList(obj[key], acc); } catch (e) {}
                    }
                  }
                  return acc;
                };
                const results = findRawDataList(w.APP_INITIALIZATION_STATE);
                if (results.length > 0) {
                  results.sort((a, b) => b.length - a.length);
                  return results[0];
                }
                return 'ERROR';
              })()`) as string | null;

              if (!rawData || rawData === 'ERROR') continue;

              const cleanJsonString = rawData.replace(/^\)\]\}'\n/, '');
              let parsedRaw = null;
              try {
                parsedRaw = JSON.parse(cleanJsonString);
              } catch (e) {
                continue;
              }

              const scrapeResult = await prisma.scrapeResult.create({
                data: {
                  collectionId,
                  rawData: parsedRaw,
                  processed: false,
                },
              });

              const place = parseGmapsPlace(rawData);
              if (!place || !place.title) continue;

              // Website Classification Fix
              let websiteUrl = place.website;
              let socialPlatformFromWebsite: string | null = null;
              let socialUrl: string | null = null;

              if (websiteUrl) {
                const lowerWebsite = websiteUrl.toLowerCase();
                const isRejected = rejectedDomains.some(domain => lowerWebsite.includes(domain));
                if (isRejected) {
                  socialUrl = websiteUrl;
                  websiteUrl = null; // Reject as business website
                  
                  if (lowerWebsite.includes('instagram.com')) socialPlatformFromWebsite = 'INSTAGRAM';
                  else if (lowerWebsite.includes('facebook.com') || lowerWebsite.includes('fb.com')) socialPlatformFromWebsite = 'FACEBOOK';
                  else if (lowerWebsite.includes('linkedin.com')) socialPlatformFromWebsite = 'LINKEDIN';
                  else if (lowerWebsite.includes('youtube.com') || lowerWebsite.includes('youtu.be')) socialPlatformFromWebsite = 'YOUTUBE';
                  else if (lowerWebsite.includes('twitter.com') || lowerWebsite.includes('x.com')) socialPlatformFromWebsite = 'TWITTER';
                  else if (lowerWebsite.includes('tiktok.com')) socialPlatformFromWebsite = 'TIKTOK';
                }
              }

              // Deduplicate Check by Place ID, Phone, or Website
              let existingBusiness = null;
              if (place.googlePlaceId) {
                existingBusiness = await prisma.business.findFirst({
                  where: { googlePlaceId: place.googlePlaceId },
                });
              }
              if (!existingBusiness && place.phone) {
                existingBusiness = await prisma.business.findFirst({
                  where: { phone: place.phone },
                });
              }
              if (!existingBusiness && websiteUrl) {
                existingBusiness = await prisma.business.findFirst({
                  where: { website: websiteUrl },
                });
              }

              const slug = place.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.floor(1000 + Math.random() * 9000);
              let savedBusinessId = '';
              let savedWebsiteUrl = '';

              const mergedKeywords = [...new Set([...(existingBusiness?.sourceKeywords || []), currentKeyword])];
              const mergedLocations = [...new Set([...(existingBusiness?.sourceLocations || []), currentLocation])];

              if (existingBusiness) {
                const updatedBiz = await prisma.business.update({
                  where: { id: existingBusiness.id },
                  data: {
                    name: place.title,
                    website: websiteUrl || existingBusiness.website,
                    phone: place.phone || existingBusiness.phone,
                    industry: place.categories[0] || existingBusiness.industry,
                    address: place.address || existingBusiness.address,
                    city: place.city || existingBusiness.city,
                    state: place.state || existingBusiness.state,
                    country: place.country || existingBusiness.country,
                    rating: place.rating !== null ? place.rating : existingBusiness.rating,
                    reviewCount: place.reviewCount !== null ? place.reviewCount : existingBusiness.reviewCount,
                    latitude: place.latitude !== null ? place.latitude : existingBusiness.latitude,
                    longitude: place.longitude !== null ? place.longitude : existingBusiness.longitude,
                    googlePlaceId: place.googlePlaceId || existingBusiness.googlePlaceId,
                    collectionId,
                    sourceKeywords: mergedKeywords,
                    sourceLocations: mergedLocations,
                  },
                });
                savedBusinessId = updatedBiz.id;
                savedWebsiteUrl = updatedBiz.website || '';
              } else {
                const newBiz = await prisma.business.create({
                  data: {
                    name: place.title,
                    slug,
                    website: websiteUrl,
                    phone: place.phone,
                    industry: place.categories[0] || 'Unknown',
                    description: place.description,
                    address: place.address,
                    city: place.city,
                    state: place.state,
                    country: place.country,
                    rating: place.rating,
                    reviewCount: place.reviewCount,
                    latitude: place.latitude,
                    longitude: place.longitude,
                    googlePlaceId: place.googlePlaceId,
                    status: BusinessStatus.NEW,
                    collectionId,
                    sourceKeywords: [currentKeyword],
                    sourceLocations: [currentLocation],
                  },
                });
                savedBusinessId = newBiz.id;
                savedWebsiteUrl = newBiz.website || '';
              }

              // Create/Update Social Profile if verified from Maps website field
              if (socialPlatformFromWebsite && socialUrl) {
                const existingSocial = await prisma.socialProfile.findFirst({
                  where: {
                    businessId: savedBusinessId,
                    platform: socialPlatformFromWebsite as any,
                  }
                });
                if (existingSocial) {
                  await prisma.socialProfile.update({
                    where: { id: existingSocial.id },
                    data: { url: socialUrl }
                  });
                } else {
                  await prisma.socialProfile.create({
                    data: {
                      businessId: savedBusinessId,
                      platform: socialPlatformFromWebsite as any,
                      url: socialUrl,
                      confidenceScore: 100,
                    }
                  });
                }
              }

              // Queue FAST website audit
              if (savedWebsiteUrl) {
                try {
                  const { auditQueue } = await import('@/queues/audit.queue');
                  await auditQueue.add('audit-website', {
                    businessId: savedBusinessId,
                    websiteUrl: savedWebsiteUrl,
                    mode: 'FAST',
                  });
                  businessesAudited++;
                } catch (queueErr) {}
              }

              await prisma.scrapeResult.update({
                where: { id: scrapeResult.id },
                data: { processed: true },
              });

              stats.byKeyword[currentKeyword] = (stats.byKeyword[currentKeyword] || 0) + 1;
              stats.byLocation[currentLocation] = (stats.byLocation[currentLocation] || 0) + 1;

              totalProcessed++;

              // Update live stats in DB
              await prisma.collection.update({
                where: { id: collectionId },
                data: {
                  totalProcessed,
                  businessesFailed,
                  businessesAudited,
                  stats,
                },
              });

            } catch (err) {
              console.error(`Error scraping link ${link}:`, err);
              businessesFailed++;
            }
          }
        } catch (searchErr) {
          console.error(`Error processing search for query ${queryStr}:`, searchErr);
        }

        // Advance indices
        keywordIndex++;
        if (keywordIndex >= keywordsList.length) {
          keywordIndex = 0;
          locationIndex++;
        }
      }
    } catch (loopErr) {
      console.error('Loop error in scraper worker:', loopErr);
    } finally {
      await browser.close();
    }

    // Determine final status
    const finalRatio = estimatedAvailable > 0 ? (currentLeads / estimatedAvailable) : 0;
    let finalStatus = 'COMPLETED';
    if (currentLeads >= target) finalStatus = 'COMPLETED';
    else if (finalRatio >= 0.90) finalStatus = 'SATURATED';

    await prisma.collection.update({
      where: { id: collectionId },
      data: {
        status: finalStatus,
        completedAt: new Date(),
      },
    });

    console.log(`Gmaps-scrape job finished. Collection: ${collectionId} | Leads found: ${currentLeads} | Status: ${finalStatus}`);
  },
  {
    connection: redisConnection as any,
    concurrency: 4,
    skipVersionCheck: true,
  }
);
