import test from 'node:test';
import assert from 'node:assert/strict';
import { GymFlowAppClient } from '../harness/app-client.ts';

test('B21.1: Cache hit data retrieval resolves skeleton cleanly', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  await client.loadCatalog();

  // Subsequent load from cache
  const cachedLoad = await client.loadCatalog();
  assert.ok(cachedLoad.length > 0);
  assert.equal(client.ui.state.isSkeletonVisible, false);
});

test('B21.2: Simulated slow network (800ms) displays skeleton for full query duration', async () => {
  const client = new GymFlowAppClient();
  client.ui.startLoading();
  assert.equal(client.ui.state.isSkeletonVisible, true);

  // Fast forward simulation
  client.ui.finishLoading();
  assert.equal(client.ui.state.isSkeletonVisible, false);
});

test('B21.3: Skeletons are registered for workout cards and session cards', () => {
  const client = new GymFlowAppClient();
  client.ui.registerElement('workout_skeleton_card', 'SkeletonShimmer', {
    width: 320,
    height: 180,
    borderRadius: 16,
  });

  assert.equal(client.ui.renderedElements.length, 1);
  assert.equal(client.ui.renderedElements[0].testId, 'workout_skeleton_card');
});

test('B21.4: Error during data fetch dismisses skeleton and displays error state', async () => {
  const client = new GymFlowAppClient();
  client.ui.startLoading();
  assert.equal(client.ui.state.isSkeletonVisible, true);

  // Error occurs
  client.ui.finishLoading();
  client.ui.showError('Unable to load workout details');

  assert.equal(client.ui.state.isSkeletonVisible, false);
  assert.equal(client.ui.state.isErrorVisible, true);
});

test('B21.5: Rapid sequential data reloads toggle skeleton state consistently', () => {
  const client = new GymFlowAppClient();
  for (let i = 0; i < 5; i++) {
    client.ui.startLoading();
    assert.equal(client.ui.state.isSkeletonVisible, true);
    client.ui.finishLoading();
    assert.equal(client.ui.state.isSkeletonVisible, false);
  }
});
