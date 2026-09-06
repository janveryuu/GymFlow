import test from 'node:test';
import assert from 'node:assert/strict';
import { GymFlowAppClient, CATEGORY_ART_FALLBACKS } from '../harness/app-client.ts';

test('B11.1: Unknown or unmapped category falls back safely to full-body.png', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  // Add custom workout with unmapped category
  client.server.workouts.push({
    id: 'wk_unknown_cat',
    title: 'Functional Circuit',
    category: 'unknown_category' as any,
    difficulty: 'intermediate',
    source: 'trainer',
    duration_minutes: 30,
    calories: 200,
    description: 'Unknown category test',
    media_url: '',
  });

  // Fetch online first so it is cached in local SQLite
  await client.getWorkoutDetail('wk_unknown_cat');

  client.setOffline(true);
  const res = await client.getWorkoutDetail('wk_unknown_cat');
  assert.equal(res.isOfflineFallback, true);
  assert.equal(res.resolvedImage, CATEGORY_ART_FALLBACKS['full-body']);
});

test('B11.2: Empty string category falls back safely to full-body.png', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  client.server.workouts.push({
    id: 'wk_empty_cat',
    title: 'Core Blast',
    category: '' as any,
    difficulty: 'beginner',
    source: 'trainer',
    duration_minutes: 20,
    calories: 150,
    description: 'Empty category test',
    media_url: '',
  });

  // Fetch online first so it is cached in local SQLite
  await client.getWorkoutDetail('wk_empty_cat');

  client.setOffline(true);
  const res = await client.getWorkoutDetail('wk_empty_cat');
  assert.equal(res.isOfflineFallback, true);
  assert.equal(res.resolvedImage, CATEGORY_ART_FALLBACKS['full-body']);
});

test('B11.3: Online mode with valid remote image URL uses remote URL', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  const res = await client.getWorkoutDetail('wk_chest_01');
  assert.equal(res.isOfflineFallback, false);
  assert.ok(res.resolvedImage.startsWith('https://'));
});

test('B11.4: Toggling offline immediately switches workout image to bundled category asset', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  // Online
  const online = await client.getWorkoutDetail('wk_back_01');
  assert.equal(online.isOfflineFallback, false);

  // Switch to offline
  client.setOffline(true);
  const offline = await client.getWorkoutDetail('wk_back_01');
  assert.equal(offline.isOfflineFallback, true);
  assert.equal(offline.resolvedImage, CATEGORY_ART_FALLBACKS.back);
});

test('B11.5: Bundled fallback image paths all follow assets/category/*.png pattern', () => {
  for (const [cat, path] of Object.entries(CATEGORY_ART_FALLBACKS)) {
    assert.ok(path.startsWith('assets/category/'), `Path for ${cat} should start with assets/category/`);
    assert.ok(path.endsWith('.png'), `Path for ${cat} should end with .png`);
  }
});
