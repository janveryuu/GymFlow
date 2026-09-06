import test from 'node:test';
import assert from 'node:assert/strict';
import { GymFlowAppClient, CATEGORY_ART_FALLBACKS } from '../harness/app-client.ts';

test('F11.1: Offline chest workout renders bundled fallback assets/category/chest.png', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  await client.loadCatalog();

  client.setOffline(true);
  const res = await client.getWorkoutDetail('wk_chest_01');
  assert.equal(res.isOfflineFallback, true);
  assert.equal(res.resolvedImage, CATEGORY_ART_FALLBACKS.chest);
});

test('F11.2: Offline back workout renders bundled fallback assets/category/back.png', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  await client.loadCatalog();

  client.setOffline(true);
  const res = await client.getWorkoutDetail('wk_back_01');
  assert.equal(res.isOfflineFallback, true);
  assert.equal(res.resolvedImage, CATEGORY_ART_FALLBACKS.back);
});

test('F11.3: Offline leg workout renders bundled fallback assets/category/leg.png', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  await client.loadCatalog();

  client.setOffline(true);
  const res = await client.getWorkoutDetail('wk_leg_01');
  assert.equal(res.isOfflineFallback, true);
  assert.equal(res.resolvedImage, CATEGORY_ART_FALLBACKS.leg);
});

test('F11.4: Offline arm workout renders bundled fallback assets/category/arm.png', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  await client.loadCatalog();

  client.setOffline(true);
  const res = await client.getWorkoutDetail('wk_arm_01');
  assert.equal(res.isOfflineFallback, true);
  assert.equal(res.resolvedImage, CATEGORY_ART_FALLBACKS.arm);
});

test('F11.5: Offline full-body workout renders bundled fallback assets/category/full-body.png', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  await client.loadCatalog();

  client.setOffline(true);
  const res = await client.getWorkoutDetail('wk_fullbody_01');
  assert.equal(res.isOfflineFallback, true);
  assert.equal(res.resolvedImage, CATEGORY_ART_FALLBACKS['full-body']);
});
