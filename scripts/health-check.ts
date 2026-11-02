

async function checkSystemHealth() {
  console.log('--- Phase 1: Pre-flight Checklist ---');
  
  // Check API health
  try {
    const res = await fetch('http://localhost:3000/api/system-status');
    const data = await res.json();
    console.log('Next.js API Status:', res.status, data);
  } catch (e: any) {
    console.error('Next.js API failed:', e.message);
  }

  // Check queues/workers
  try {
    const res = await fetch('http://localhost:3000/api/discovery/jobs');
    const data = await res.json();
    console.log('Jobs API Status:', res.status, 'Total Jobs:', data.jobs?.length);
  } catch (e: any) {
    console.error('Jobs API failed:', e.message);
  }
}

checkSystemHealth();
