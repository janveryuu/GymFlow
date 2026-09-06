import test from 'node:test';
import assert from 'node:assert/strict';
import { GymFlowAppClient } from '../harness/app-client.ts';

test('B13.1: Filter combination yielding 0 matches engages empty state', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  // Chest category with no beginner workouts in seed data
  const res = await client.loadCatalog({ category: 'chest', difficulty: 'beginner' });
  assert.equal(res.length, 0);
  assert.equal(client.ui.state.isEmptyStateVisible, true);
});

test('B13.2: Rapid toggling between category filters maintains state consistency', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  await client.loadCatalog({ category: 'chest' });
  await client.loadCatalog({ category: 'back' });
  await client.loadCatalog({ category: 'leg' });
  const final = await client.loadCatalog({ category: 'arm' });

  assert.ok(final.length > 0);
  for (const w of final) {
    assert.equal(w.category, 'arm');
  }
});

test('B13.3: Case variation in query parameters handled cleanly', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  const res = await client.server.request('GET', '/member/workouts?category=CHEST', null, {
    Authorization: `Bearer ${client.authToken}`,
  });
  assert.equal(res.status, 200);
});

test('B13.4: Unknown category filter returns empty array with empty state', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  const res = await client.loadCatalog({ category: 'pilates_non_existent' as any });
  assert.equal(res.length, 0);
  assert.equal(client.ui.state.isEmptyStateVisible, true);
});

test('B13.5: Clearing filters restores complete original catalog list', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  await client.loadCatalog({ category: 'chest' });
  const restored = await client.loadCatalog({ category: 'all', difficulty: 'all' });

  assert.equal(restored.length, client.server.workouts.length);
  assert.equal(client.ui.state.isEmptyStateVisible, false);
});
