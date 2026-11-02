async function runPhase2() {
  console.log('Starting Phase 2: Discovery Validation');

  const payload = {
    keyword: 'Dentist',
    location: 'Delhi',
    keywords: ['Dentist'],
    locations: ['Delhi', 'Noida', 'Ghaziabad'],
    targetCount: 300
  };

  try {
    const res = await fetch('http://localhost:3000/api/discovery/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log('Search Job Created:', data);

    if (!data.success) {
      console.error('Failed to create search job');
      return;
    }

    const searchJobId = data.jobId;
    console.log(`Polling for search job status: ${searchJobId}...`);

    let isComplete = false;
    while (!isComplete) {
      await new Promise(r => setTimeout(r, 5000));
      const statusRes = await fetch(`http://localhost:3000/api/discovery/status/${searchJobId}`);
      const statusData = await statusRes.json();
      
      if (!statusData.success) {
        console.error('Failed to get status', statusData);
        continue;
      }

      const job = statusData.job;
      console.log(`Status: ${job.status}, Leads: ${job.leadCount}/${job.targetCount || 300}, Completed: ${job.completionPercent}%`);

      if (job.status === 'COMPLETED' || job.status === 'FAILED') {
        isComplete = true;
        console.log(`Job finished with status: ${job.status}`);
      }
    }
  } catch (err: any) {
    console.error('Phase 2 Script Error:', err.message);
  }
}

runPhase2();
