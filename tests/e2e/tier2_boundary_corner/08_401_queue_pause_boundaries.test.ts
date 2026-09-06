import test from 'node:test';
import assert from 'node:assert/strict';
import { GymFlowAppClient } from '../harness/app-client.ts';

test('B8.1: 401 encountered on item 3 of 5-item queue pauses immediately at item 3', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  // Enqueue 2 valid items
  await client.db.enqueue({
    entity_type: 'attendance',
    action: 'create',
    endpoint: '/member/attendance',
    method: 'POST',
    payload: { session_id: 'sess_hiit_101' },
    created_at: '2026-09-05T01:00:00Z',
  });
  await client.db.enqueue({
    entity_type: 'attendance',
    action: 'create',
    endpoint: '/member/attendance',
    method: 'POST',
    payload: { session_id: 'sess_strength_305' },
    created_at: '2026-09-05T02:00:00Z',
  });

  // Enqueue 3 progress items
  await client.db.enqueue({
    entity_type: 'progress',
    action: 'create',
    endpoint: '/member/progress',
    method: 'POST',
    payload: { workout_id: 'wk_chest_01' },
    created_at: '2026-09-05T03:00:00Z',
  });
  await client.db.enqueue({
    entity_type: 'progress',
    action: 'create',
    endpoint: '/member/progress',
    method: 'POST',
    payload: { workout_id: 'wk_back_01' },
    created_at: '2026-09-05T04:00:00Z',
  });
  await client.db.enqueue({
    entity_type: 'progress',
    action: 'create',
    endpoint: '/member/progress',
    method: 'POST',
    payload: { workout_id: 'wk_leg_01' },
    created_at: '2026-09-05T05:00:00Z',
  });

  // Force 401 on /member/progress
  client.server.setForcedError('/member/progress', 401);

  const res = await client.drainSyncQueue();
  assert.equal(res.processed, 2); // 2 attendances succeeded
  assert.equal(res.paused, true);   // Paused when hitting first progress
  assert.equal(client.sync.state, 'paused');

  const remaining = await client.db.getQueueItems();
  assert.equal(remaining.length, 3); // All 3 progress items preserved
});

test('B8.2: Items after paused item remain pending and completely untouched', async () => {
  const client = new GymFlowAppClient();
  client.sync.activeToken = 'expired_token';

  const item1 = await client.db.enqueue({
    entity_type: 'attendance',
    action: 'create',
    endpoint: '/member/attendance',
    method: 'POST',
    payload: { session_id: 'sess_hiit_101' },
  });
  const item2 = await client.db.enqueue({
    entity_type: 'attendance',
    action: 'create',
    endpoint: '/member/attendance',
    method: 'POST',
    payload: { session_id: 'sess_strength_305' },
  });

  await client.drainSyncQueue();

  const refreshed1 = (await client.db.getQueueItems()).find((i) => i.id === item1.id);
  const refreshed2 = (await client.db.getQueueItems()).find((i) => i.id === item2.id);

  assert.equal(refreshed1?.status, 'pending');
  assert.equal(refreshed2?.status, 'pending');
});

test('B8.3: Attempting to resume queue with still-invalid token immediately re-pauses', async () => {
  const client = new GymFlowAppClient();
  client.sync.activeToken = 'invalid_token_1';

  await client.db.enqueue({
    entity_type: 'attendance',
    action: 'create',
    endpoint: '/member/attendance',
    method: 'POST',
    payload: { session_id: 'sess_hiit_101' },
  });

  await client.drainSyncQueue();
  assert.equal(client.sync.state, 'paused');

  // Resume queue manually without updating token
  client.sync.resumeQueue();
  assert.equal(client.sync.state, 'idle');

  const drain2 = await client.drainSyncQueue();
  assert.equal(drain2.paused, true);
  assert.equal(client.sync.state, 'paused');
});

test('B8.4: Calling drainSyncQueue while paused does not initiate network calls', async () => {
  const client = new GymFlowAppClient();
  client.sync.state = 'paused';

  const drainRes = await client.drainSyncQueue();
  assert.equal(drainRes.paused, true);
  assert.equal(drainRes.processed, 0);
});

test('B8.5: Queue items pending during 401 retain original created_at timestamps', async () => {
  const client = new GymFlowAppClient();
  client.sync.activeToken = 'expired_token';

  const originalTimestamp = '2026-09-01T10:00:00.000Z';
  const item = await client.db.enqueue({
    entity_type: 'attendance',
    action: 'create',
    endpoint: '/member/attendance',
    method: 'POST',
    payload: { session_id: 'sess_hiit_101' },
    created_at: originalTimestamp,
  });

  await client.drainSyncQueue();

  const refreshed = (await client.db.getQueueItems()).find((i) => i.id === item.id);
  assert.equal(refreshed?.created_at, originalTimestamp);
});
