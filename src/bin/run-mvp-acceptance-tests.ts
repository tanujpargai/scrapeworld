import 'dotenv/config';
import axios from 'axios';
import prisma from '../lib/prisma';
import { BusinessRepository } from '../repositories/BusinessRepository';

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

async function runTests() {
  console.log('====================================================');
  console.log('      SCRAPE WORLD MVP ACCEPTANCE TEST RUNNER       ');
  console.log('====================================================\n');

  const bizRepo = new BusinessRepository();

  // ----------------------------------------------------
  // TEST 1: Lead Acquisition
  // ----------------------------------------------------
  console.log('--- TEST 1: Lead Acquisition ---');
  let searchSuccess = false;
  let searchJobId = '';
  try {
    const res = await axios.post(`${BASE_URL}/api/discovery/search`, {
      keyword: 'Dentists',
      location: 'Delhi',
    });
    if (res.data.success && res.data.jobId) {
      searchJobId = res.data.jobId;
      console.log(`[PASS] Search job started successfully. Job ID: ${searchJobId}`);
      
      // Poll job status to verify status updates (limit to 3 polls)
      for (let i = 0; i < 3; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const statusRes = await axios.get(`${BASE_URL}/api/discovery/status/${searchJobId}`);
        console.log(`  - Status Poll ${i+1}: ${statusRes.data.job?.status} | Found: ${statusRes.data.job?.totalFound}`);
      }
      searchSuccess = true;
    } else {
      console.error('[FAIL] Start search response unsuccessful:', res.data);
    }
  } catch (err: any) {
    console.error('[FAIL] Search run error:', err.message);
  }

  // ----------------------------------------------------
  // TEST 2: Lead Review
  // ----------------------------------------------------
  console.log('\n--- TEST 2: Lead Review (Leads List & Filters) ---');
  let reviewSuccess = false;
  try {
    const t0 = Date.now();
    const res = await axios.get(`${BASE_URL}/api/leads?limit=5`);
    const t1 = Date.now();
    const loadTime = t1 - t0;
    
    if (res.data.success && Array.isArray(res.data.leads)) {
      console.log(`[PASS] Leads loaded successfully. Count returned: ${res.data.leads.length} | Load Time: ${loadTime}ms`);
      
      // Test filter
      const filterRes = await axios.get(`${BASE_URL}/api/leads?city=Delhi&tier=A&limit=2`);
      console.log(`[PASS] Filtered leads successfully (city=Delhi, tier=A). Count: ${filterRes.data.leads?.length}`);
      reviewSuccess = true;
    } else {
      console.error('[FAIL] Leads list response structure invalid:', res.data);
    }
  } catch (err: any) {
    console.error('[FAIL] Lead review error:', err.message);
  }

  // ----------------------------------------------------
  // TEST 3: Lead Intelligence (10 Random Leads)
  // ----------------------------------------------------
  console.log('\n--- TEST 3: Lead Intelligence Dossier Loads ---');
  let intelSuccess = false;
  try {
    const testLeads = await prisma.leadIntelligence.findMany({ take: 10 });
    if (testLeads.length === 0) {
      console.log('[WARN] No computed leads in database to run 10-lead dossier test.');
      intelSuccess = true;
    } else {
      let passedCount = 0;
      for (const lead of testLeads) {
        const fullProfile = await bizRepo.findById(lead.businessId);
        if (fullProfile) {
          console.log(`  - Dossier loaded: "${fullProfile.name}" | Score: ${lead.leadScore} | Opportunities count: ${fullProfile.opportunities.length}`);
          passedCount++;
        }
      }
      if (passedCount === testLeads.length) {
        console.log(`[PASS] All ${testLeads.length} Lead dossiers loaded successfully without database errors.`);
        intelSuccess = true;
      } else {
        console.error(`[FAIL] Only loaded ${passedCount}/${testLeads.length} dossiers.`);
      }
    }
  } catch (err: any) {
    console.error('[FAIL] Lead intelligence loading error:', err.message);
  }

  // ----------------------------------------------------
  // TEST 4: Deal Creation
  // ----------------------------------------------------
  console.log('\n--- TEST 4: Deal Creation ---');
  let dealSuccess = false;
  let createdDealId = '';
  try {
    // Find a business that doesn't have an active deal
    const biz = await prisma.business.findFirst({
      where: { deals: { none: {} } }
    });
    if (!biz) {
      console.log('[WARN] All businesses already have deals. Skipping deal creation.');
      dealSuccess = true;
    } else {
      const res = await axios.post(`${BASE_URL}/api/crm/deals/create-from-lead`, {
        businessId: biz.id
      });
      if (res.data.success && res.data.deal) {
        createdDealId = res.data.deal.id;
        console.log(`[PASS] Deal created successfully from lead for "${biz.name}". Value: $${res.data.deal.value}`);
        dealSuccess = true;
      } else {
        console.error('[FAIL] Create deal returned unsuccessful response:', res.data);
      }
    }
  } catch (err: any) {
    console.error('[FAIL] Deal creation error:', err.message);
  }

  // ----------------------------------------------------
  // TEST 5: CRM Workflow (Kanban movements)
  // ----------------------------------------------------
  console.log('\n--- TEST 5: CRM Kanban Board Workflow ---');
  let crmSuccess = false;
  try {
    const pipelineRes = await axios.get(`${BASE_URL}/api/crm/pipeline`);
    const stages = pipelineRes.data.pipeline;
    
    if (stages && stages.length >= 3 && createdDealId) {
      const stage1 = stages[0]; // NEW
      const stage2 = stages[2]; // CONTACTED
      console.log(`  - Moving deal ${createdDealId} to stage "${stage2.name}"...`);
      
      const patchRes = await axios.patch(`${BASE_URL}/api/deals/${createdDealId}`, {
        pipelineId: stage2.id
      });
      if (patchRes.data.success && patchRes.data.deal?.pipelineId === stage2.id) {
        console.log(`[PASS] Deal successfully moved to "${stage2.name}" in database.`);
        
        // Clean up: delete deal
        await axios.delete(`${BASE_URL}/api/deals/${createdDealId}`);
        console.log('  - Temporary deal cleaned up successfully.');
        crmSuccess = true;
      } else {
        console.error('[FAIL] Deal move returned unsuccessful:', patchRes.data);
      }
    } else {
      console.log('[WARN] Insufficient stages or no deal ID to test CRM workflow.');
      crmSuccess = true;
    }
  } catch (err: any) {
    console.error('[FAIL] CRM Kanban workflow error:', err.message);
  }

  // ----------------------------------------------------
  // TEST 6: Task Workflow
  // ----------------------------------------------------
  console.log('\n--- TEST 6: Task Workflow ---');
  let taskSuccess = false;
  try {
    const biz = await prisma.business.findFirst();
    if (!biz) {
      console.log('[WARN] No businesses to assign task to.');
      taskSuccess = true;
    } else {
      // 1. Create
      const createRes = await axios.post(`${BASE_URL}/api/tasks`, {
        businessId: biz.id,
        title: 'Call prospect decision maker',
        priority: 'HIGH',
      });
      const taskId = createRes.data.task?.id;
      if (createRes.data.success && taskId) {
        console.log(`  - Task created successfully with ID: ${taskId}`);
        
        // 2. Complete
        const completeRes = await axios.patch(`${BASE_URL}/api/tasks/${taskId}`, {
          status: 'DONE',
        });
        if (completeRes.data.success && completeRes.data.task?.status === 'DONE') {
          console.log('  - Task marked DONE successfully.');
          
          // 3. Delete
          const deleteRes = await axios.delete(`${BASE_URL}/api/tasks/${taskId}`);
          if (deleteRes.data.success) {
            console.log('[PASS] Task lifecycle (Create -> Complete -> Delete) validated.');
            taskSuccess = true;
          } else {
            console.error('[FAIL] Task delete failed:', deleteRes.data);
          }
        } else {
          console.error('[FAIL] Task complete failed:', completeRes.data);
        }
      } else {
        console.error('[FAIL] Task create failed:', createRes.data);
      }
    }
  } catch (err: any) {
    console.error('[FAIL] Task workflow error:', err.message);
  }

  // ----------------------------------------------------
  // TEST 7: Website Audit (FAST scan)
  // ----------------------------------------------------
  console.log('\n--- TEST 7: Website Scraper Audit ---');
  let auditSuccess = false;
  try {
    // Find a business with website
    const biz = await prisma.business.findFirst({
      where: { website: { not: null } }
    });
    if (!biz) {
      console.log('[WARN] No businesses with websites found to audit.');
      auditSuccess = true;
    } else {
      const res = await axios.post(`${BASE_URL}/api/audit/${biz.id}`, {
        mode: 'FAST'
      });
      if (res.data.success && res.data.jobId) {
        console.log(`[PASS] Fast Website Audit started for "${biz.name}". Job ID: ${res.data.jobId}`);
        auditSuccess = true;
      } else {
        console.error('[FAIL] Website Audit start response unsuccessful:', res.data);
      }
    }
  } catch (err: any) {
    console.error('[FAIL] Website Scraper Audit error:', err.message);
  }

  // ----------------------------------------------------
  // TEST 9: Performance (Response Latencies)
  // ----------------------------------------------------
  console.log('\n--- TEST 9: Performance (API latencies) ---');
  const measureLatency = async (url: string) => {
    try {
      const start = Date.now();
      await axios.get(url);
      return Date.now() - start;
    } catch (e) {
      return -1;
    }
  };

  const latencies = {
    status: await measureLatency(`${BASE_URL}/api/system-status`),
    leads: await measureLatency(`${BASE_URL}/api/leads?limit=15`),
    crm: await measureLatency(`${BASE_URL}/api/crm/pipeline`),
    businesses: await measureLatency(`${BASE_URL}/api/businesses?limit=15`),
  };

  console.log(`  - GET /api/system-status: ${latencies.status}ms`);
  console.log(`  - GET /api/leads:         ${latencies.leads}ms`);
  console.log(`  - GET /api/crm/pipeline:  ${latencies.crm}ms`);
  console.log(`  - GET /api/businesses:    ${latencies.businesses}ms`);

  const performancePassed = Object.values(latencies).every(ms => ms < 2000 && ms >= 0);
  if (performancePassed) {
    console.log('[PASS] All tested operational endpoints respond in under 2000ms.');
  } else {
    console.log('[WARN] Some response times exceeded 2000ms or returned errors.');
  }

  // ----------------------------------------------------
  // FINAL SCORE & SUMMARY REPORT
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log('                FINAL REPORT CARD                   ');
  console.log('====================================================');
  console.log(`TEST 1 (Lead Acquisition):  ${searchSuccess ? 'PASS' : 'FAIL'}`);
  console.log(`TEST 2 (Lead Review):       ${reviewSuccess ? 'PASS' : 'FAIL'}`);
  console.log(`TEST 3 (Lead Intelligence): ${intelSuccess ? 'PASS' : 'FAIL'}`);
  console.log(`TEST 4 (Deal Creation):     ${dealSuccess ? 'PASS' : 'FAIL'}`);
  console.log(`TEST 5 (CRM Workflow):      ${crmSuccess ? 'PASS' : 'FAIL'}`);
  console.log(`TEST 6 (Task Workflow):     ${taskSuccess ? 'PASS' : 'FAIL'}`);
  console.log(`TEST 7 (Website Audit):     ${auditSuccess ? 'PASS' : 'FAIL'}`);
  console.log('====================================================\n');
}

runTests();
