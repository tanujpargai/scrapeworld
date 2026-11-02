import { test, describe } from 'node:test';
import assert from 'node:assert';
import { GET as listProfiles, POST as createProfile } from '../src/app/api/icp/route';
import { GET as getProfileById, PUT as updateProfile, DELETE as deleteProfile } from '../src/app/api/icp/[id]/route';
import { POST as duplicateProfile } from '../src/app/api/icp/[id]/duplicate/route';
import { PATCH as toggleProfile } from '../src/app/api/icp/[id]/toggle/route';
import { POST as evaluateLead } from '../src/app/api/icp/evaluate/route';

describe('ICP API Route Integration Tests', () => {
  let createdProfileId: string = '';

  test('GET /api/icp should return list of profiles', async () => {
    const req = new Request('http://localhost:3000/api/icp');
    const res = await listProfiles(req);
    assert.strictEqual(res.status, 200);

    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(Array.isArray(json.data));
    assert.ok(json.data.length >= 2, 'Should contain at least 2 default profiles');
  });

  test('POST /api/icp should create a new profile with valid rules', async () => {
    const payload = {
      name: 'High-Ticket MedSpa Redesign',
      description: 'Targets established MedSpas with high review volume but low website performance',
      targetService: 'WEBSITE_REDESIGN',
      targetNiche: 'Medical Aesthetics',
      rules: [
        {
          name: 'At least 25 Google Reviews',
          type: 'HARD_FILTER',
          condition: {
            field: 'reviewCount',
            operator: 'greater_than_or_equal',
            value: 25,
          },
          explanation: 'Demonstrates proven market demand and local cash flow',
        },
        {
          name: 'Poor Mobile Score',
          type: 'SOFT_SIGNAL',
          weight: 25,
          condition: {
            field: 'websiteData.mobileScore',
            operator: 'less_than',
            value: 50,
          },
          explanation: 'Major mobile UX bottleneck representing redesign opportunity',
        },
        {
          name: 'Disqualify National Chains',
          type: 'EXCLUSION',
          condition: {
            field: 'name',
            operator: 'contains_any',
            value: 'corporate, national, franchise',
          },
          explanation: 'Cannot sell direct design services to rigid corporate chains',
        },
      ],
      scoringConfig: {
        mode: 'additive',
        highPriorityThreshold: 75,
        mediumPriorityThreshold: 45,
      },
    };

    const req = new Request('http://localhost:3000/api/icp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const res = await createProfile(req);
    assert.strictEqual(res.status, 201);

    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(json.data.id, 'Created profile must have an ID');
    assert.strictEqual(json.data.name, payload.name);
    assert.strictEqual(json.data.rules.length, 3);
    assert.ok(json.data.rules[0].id, 'Rules must have auto-assigned IDs');

    createdProfileId = json.data.id;
  });

  test('GET /api/icp/[id] should retrieve the created profile', async () => {
    assert.ok(createdProfileId, 'Need createdProfileId from previous step');
    const req = new Request(`http://localhost:3000/api/icp/${createdProfileId}`);
    const res = await getProfileById(req, { params: Promise.resolve({ id: createdProfileId }) });

    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.id, createdProfileId);
    assert.strictEqual(json.data.name, 'High-Ticket MedSpa Redesign');
  });

  test('PUT /api/icp/[id] should update the profile and its rules', async () => {
    const updatePayload = {
      name: 'High-Ticket MedSpa Redesign (Updated)',
      targetNiche: 'Aesthetic Clinics & Dermatologists',
    };

    const req = new Request(`http://localhost:3000/api/icp/${createdProfileId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatePayload),
    });

    const res = await updateProfile(req, { params: Promise.resolve({ id: createdProfileId }) });
    assert.strictEqual(res.status, 200);

    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.name, 'High-Ticket MedSpa Redesign (Updated)');
    assert.strictEqual(json.data.targetNiche, 'Aesthetic Clinics & Dermatologists');
  });

  test('POST /api/icp/[id]/duplicate should duplicate profile with (Copy) name', async () => {
    const req = new Request(`http://localhost:3000/api/icp/${createdProfileId}/duplicate`, {
      method: 'POST',
    });

    const res = await duplicateProfile(req, { params: Promise.resolve({ id: createdProfileId }) });
    assert.strictEqual(res.status, 200);

    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.notStrictEqual(json.data.id, createdProfileId);
    assert.strictEqual(json.data.name, 'High-Ticket MedSpa Redesign (Updated) (Copy)');

    // Cleanup duplicate
    const delReq = new Request(`http://localhost:3000/api/icp/${json.data.id}`);
    await deleteProfile(delReq, { params: Promise.resolve({ id: json.data.id }) });
  });

  test('PATCH /api/icp/[id]/toggle should toggle active status', async () => {
    const req = new Request(`http://localhost:3000/api/icp/${createdProfileId}/toggle`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: false }),
    });

    const res = await toggleProfile(req, { params: Promise.resolve({ id: createdProfileId }) });
    assert.strictEqual(res.status, 200);

    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.isActive, false);
  });

  test('POST /api/icp/evaluate should evaluate a candidate business against profile', async () => {
    // 1. Qualified test business (MedSpa with 40 reviews, mobile score 35)
    const testLead = {
      name: 'Glow Aesthetics Clinic',
      reviewCount: 40,
      websiteData: {
        mobileScore: 35,
      },
    };

    const req = new Request('http://localhost:3000/api/icp/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profileId: createdProfileId,
        business: testLead,
      }),
    });

    const res = await evaluateLead(req);
    assert.strictEqual(res.status, 200);

    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.matched, true, 'Lead should match all hard filters');
    assert.strictEqual(json.data.score, 25, 'Should score 25 from poor mobile score signal');
    assert.strictEqual(json.data.passedHardFilters.length, 1);
    assert.strictEqual(json.data.failedHardFilters.length, 0);

    // 2. Disqualified test business (Corporate Chain franchise)
    const corporateLead = {
      name: 'National Aesthetic Corporate Franchise',
      reviewCount: 60,
      websiteData: {
        mobileScore: 20,
      },
    };

    const reqCorp = new Request('http://localhost:3000/api/icp/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profileId: createdProfileId,
        business: corporateLead,
      }),
    });

    const resCorp = await evaluateLead(reqCorp);
    const jsonCorp = await resCorp.json();
    assert.strictEqual(jsonCorp.data.matched, false, 'Lead should be disqualified by exclusion rule');
    assert.strictEqual(jsonCorp.data.triggeredExclusions.length, 1);
  });

  test('DELETE /api/icp/[id] should delete the profile', async () => {
    const req = new Request(`http://localhost:3000/api/icp/${createdProfileId}`, {
      method: 'DELETE',
    });

    const res = await deleteProfile(req, { params: Promise.resolve({ id: createdProfileId }) });
    assert.strictEqual(res.status, 200);

    const json = await res.json();
    assert.strictEqual(json.success, true);

    // Verify it is gone
    const getReq = new Request(`http://localhost:3000/api/icp/${createdProfileId}`);
    const getRes = await getProfileById(getReq, { params: Promise.resolve({ id: createdProfileId }) });
    assert.strictEqual(getRes.status, 404);
  });
});
