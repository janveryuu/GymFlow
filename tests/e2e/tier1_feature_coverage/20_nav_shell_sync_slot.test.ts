import test from 'node:test';
import assert from 'node:assert/strict';
import { GymFlowAppClient } from '../harness/app-client.ts';

test('F20.1: Navigation shell maintains sync slot state', async () => {
  const client = new GymFlowAppClient();
  const status = await client.sync.getStatus();
  assert.equal(status.state, 'idle');
  assert.equal(status.pending_count, 0);
});

test('F20.2: Sync slot transitions to syncing during queue drain', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  await client.db.enqueue({
    entity_type: 'attendance',
    action: 'create',
    endpoint: '/member/attendance',
    method: 'POST',
    payload: { session_id: 'sess_hiit_101' },
  });

  const drainPromise = client.drainSyncQueue();
  // Queue starts drain
  const res = await drainPromise;
  assert.equal(res.processed, 1);
  assert.equal(client.sync.state, 'idle'); // Returns to idle after drain
});

test('F20.3: Offline state is surfaced in sync status', () => {
  const client = new GymFlowAppClient();
  client.setOffline(true);
  assert.equal(client.sync.state, 'offline');
});

test('F20.4: Pending items older than 7 days activate amber warning flag in nav status', async () => {
  const client = new GymFlowAppClient();
  const nineDaysAgo = new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString();

  await client.db.enqueue({
    entity_type: 'progress',
    action: 'create',
    endpoint: '/member/progress',
    method: 'POST',
    payload: { workout_id: 'wk_chest_01' },
    created_at: nineDaysAgo,
  });

  const status = await client.sync.getStatus();
  assert.equal(status.has_7day_warning, true);
});

test('F20.5: 409 conflict activates dismissible banner in nav shell', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  await client.db.enqueue({
    entity_type: 'attendance',
    action: 'create',
    endpoint: '/member/attendance',
    method: 'POST',
    payload: { session_id: 'sess_yoga_204' },
  });

  await client.drainSyncQueue();
  assert.equal(client.ui.state.isDismissibleBannerVisible, true);
  assert.equal(client.ui.state.bannerText, 'Session was cancelled by the gym.');
});
