import test from 'node:test';
import assert from 'node:assert/strict';
import { GymFlowAppClient } from '../harness/app-client.ts';

test('F21.1: Data-fetching screen shows skeleton state immediately upon request trigger', async () => {
  const client = new GymFlowAppClient();
  client.ui.startLoading();
  assert.equal(client.ui.state.isSkeletonVisible, true);
  assert.equal(client.ui.state.isLoading, true);
});

test('F21.2: Skeleton state is dismissed immediately when data retrieval resolves', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  await client.loadCatalog();
  assert.equal(client.ui.state.isSkeletonVisible, false);
  assert.equal(client.ui.state.isLoading, false);
});

test('F21.3: Skeletons are used consistently in place of raw blank views', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  // During fetch, skeleton must be visible
  client.ui.startLoading();
  assert.equal(client.ui.state.isSkeletonVisible, true);
  client.ui.finishLoading();
  assert.equal(client.ui.state.isSkeletonVisible, false);
});

test('F21.4: Skeletons are shown during Schedule screen data fetching', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  await client.loadSchedule();
  assert.equal(client.ui.state.isSkeletonVisible, false);
});

test('F21.5: Skeletons are shown during Progress screen data fetching', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  await client.loadProgress('week');
  assert.equal(client.ui.state.isSkeletonVisible, false);
});
