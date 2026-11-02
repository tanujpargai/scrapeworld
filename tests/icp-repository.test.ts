import { test, describe } from 'node:test';
import assert from 'node:assert';
import { ICPRepository } from '../src/repositories/ICPRepository';
import type { ICPProfile } from '../src/types/icp';

describe('ICPRepository Unit Tests', () => {
  const repo = new ICPRepository();

  test('should list profiles and auto-initialize with default agency profiles', async () => {
    const list = await repo.list();
    assert.ok(Array.isArray(list));
    assert.ok(list.length >= 2, 'Should have at least 2 default seeded profiles');
    const webDev = list.find((p) => p.id === 'icp-webdev-redesign');
    assert.ok(webDev, 'Should include Web Dev Redesign ICP');
    assert.strictEqual(webDev.targetService, 'WEBSITE_REDESIGN');
  });

  test('should create a new ICP profile and retrieve it by ID', async () => {
    const newProfileData: Omit<ICPProfile, 'id'> = {
      name: 'Test Dental Clinic SEO Profile',
      description: 'Targets dental practices with low SEO visibility',
      targetService: 'LOCAL_SEO',
      targetNiche: 'Dental Clinics',
      isActive: true,
      rules: [
        {
          id: 'rule-test-1',
          name: 'Must have at least 15 reviews',
          type: 'HARD_FILTER',
          condition: {
            field: 'reviewCount',
            operator: 'greater_than_or_equal',
            value: 15,
          },
        },
        {
          id: 'rule-test-2',
          name: 'Low Google Rating boost',
          type: 'SOFT_SIGNAL',
          weight: 25,
          condition: {
            field: 'rating',
            operator: 'less_than',
            value: 4.2,
          },
        },
      ],
    };

    const created = await repo.create(newProfileData);
    assert.ok(created.id, 'Created profile must have an ID');
    assert.strictEqual(created.name, newProfileData.name);
    assert.strictEqual(created.rules.length, 2);

    const fetched = await repo.findById(created.id);
    assert.ok(fetched);
    assert.strictEqual(fetched.id, created.id);
    assert.strictEqual(fetched.name, newProfileData.name);
  });

  test('should update an existing ICP profile', async () => {
    const created = await repo.create({
      name: 'Original ICP Profile',
      targetService: 'SOCIAL_MEDIA',
      rules: [],
    });

    const updated = await repo.update(created.id, {
      name: 'Updated ICP Profile Name',
      targetNiche: 'E-commerce',
    });

    assert.ok(updated);
    assert.strictEqual(updated.name, 'Updated ICP Profile Name');
    assert.strictEqual(updated.targetNiche, 'E-commerce');

    const fetched = await repo.findById(created.id);
    assert.strictEqual(fetched?.name, 'Updated ICP Profile Name');
  });

  test('should duplicate an ICP profile with fresh IDs', async () => {
    const created = await repo.create({
      name: 'Base Profile to Duplicate',
      targetService: 'PPC_ADS',
      rules: [
        {
          id: 'r1',
          name: 'Rule 1',
          type: 'HARD_FILTER',
          condition: { field: 'phone', operator: 'exists' },
        },
      ],
    });

    const duplicated = await repo.duplicate(created.id);
    assert.ok(duplicated);
    assert.notStrictEqual(duplicated.id, created.id);
    assert.strictEqual(duplicated.name, 'Base Profile to Duplicate (Copy)');
    assert.strictEqual(duplicated.rules.length, 1);
    assert.notStrictEqual(duplicated.rules[0].id, 'r1', 'Rule ID should be unique in duplicate');
  });

  test('should toggle active status of a profile', async () => {
    const created = await repo.create({
      name: 'Active Toggle Profile',
      isActive: true,
      rules: [],
    });

    const toggledOff = await repo.toggleActive(created.id);
    assert.ok(toggledOff);
    assert.strictEqual(toggledOff.isActive, false);

    const toggledOn = await repo.toggleActive(created.id);
    assert.ok(toggledOn);
    assert.strictEqual(toggledOn.isActive, true);

    const explicitSet = await repo.toggleActive(created.id, false);
    assert.ok(explicitSet);
    assert.strictEqual(explicitSet.isActive, false);
  });

  test('should filter by active status in list', async () => {
    const activeOnly = await repo.list(true);
    assert.ok(activeOnly.every((p) => p.isActive !== false));
  });

  test('should delete an ICP profile by ID', async () => {
    const created = await repo.create({
      name: 'Profile to Delete',
      rules: [],
    });

    const deleteSuccess = await repo.delete(created.id);
    assert.strictEqual(deleteSuccess, true);

    const fetched = await repo.findById(created.id);
    assert.strictEqual(fetched, null);
  });
});
