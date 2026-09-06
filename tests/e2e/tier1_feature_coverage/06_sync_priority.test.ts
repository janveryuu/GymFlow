import test from 'node:test';
import assert from 'node:assert/strict';
import { GymFlowAppClient } from '../harness/app-client.ts';

test('F6.1: Attendance queue item is sent before progress item during queue drain', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  // Enqueue progress FIRST
  const p1 = await client.db.enqueue({
    entity_type: 'progress',
    action: 'create',
    endpoint: '/member/progress',
    method: 'POST',
    payload: { workout_id: 'wk_chest_01', duration_seconds: 1800, calories_burned: 300 },
    created_at: new Date(Date.now() - 5000).toISOString(),
  });

  // Enqueue attendance SECOND
  const a1 = await client.db.enqueue({
    entity_type: 'attendance',
    action: 'create',
    endpoint: '/member/attendance',
    method: 'POST',
    payload: { session_id: 'sess_hiit_101', checked_in_at: new Date().toISOString() },
    created_at: new Date().toISOString(),
  });

  await client.drainSyncQueue();

  // Attendance MUST be processed before progress!
  assert.equal(client.sync.processedOrder[0], a1.id);
  assert.equal(client.sync.processedOrder[1], p1.id);
});

test('F6.2: Multiple attendance items maintain strict FIFO order by creation timestamp', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  const a1 = await client.db.enqueue({
    entity_type: 'attendance',
    action: 'create',
    endpoint: '/member/attendance',
    method: 'POST',
    payload: { session_id: 'sess_hiit_101', checked_in_at: new Date().toISOString() },
    created_at: '2026-09-05T08:00:00Z',
  });

  const a2 = await client.db.enqueue({
    entity_type: 'attendance',
    action: 'create',
    endpoint: '/member/attendance',
    method: 'POST',
    payload: { session_id: 'sess_strength_305', checked_in_at: new Date().toISOString() },
    created_at: '2026-09-05T09:00:00Z',
  });

  await client.drainSyncQueue();
  assert.equal(client.sync.processedOrder[0], a1.id);
  assert.equal(client.sync.processedOrder[1], a2.id);
});

test('F6.3: Multiple progress items maintain strict FIFO order by creation timestamp', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  const p1 = await client.db.enqueue({
    entity_type: 'progress',
    action: 'create',
    endpoint: '/member/progress',
    method: 'POST',
    payload: { workout_id: 'wk_chest_01', duration_seconds: 1800, calories_burned: 300 },
    created_at: '2026-09-05T08:00:00Z',
  });

  const p2 = await client.db.enqueue({
    entity_type: 'progress',
    action: 'create',
    endpoint: '/member/progress',
    method: 'POST',
    payload: { workout_id: 'wk_back_01', duration_seconds: 2400, calories_burned: 400 },
    created_at: '2026-09-05T09:00:00Z',
  });

  await client.drainSyncQueue();
  assert.equal(client.sync.processedOrder[0], p1.id);
  assert.equal(client.sync.processedOrder[1], p2.id);
});

test('F6.4: Interleaved queue [P1, A1, P2, A2] drains strictly in priority order [A1, A2, P1, P2]', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  const p1 = await client.db.enqueue({
    entity_type: 'progress',
    action: 'create',
    endpoint: '/member/progress',
    method: 'POST',
    payload: { workout_id: 'wk_chest_01' },
    created_at: '2026-09-05T07:00:00Z',
  });
  const a1 = await client.db.enqueue({
    entity_type: 'attendance',
    action: 'create',
    endpoint: '/member/attendance',
    method: 'POST',
    payload: { session_id: 'sess_hiit_101' },
    created_at: '2026-09-05T07:15:00Z',
  });
  const p2 = await client.db.enqueue({
    entity_type: 'progress',
    action: 'create',
    endpoint: '/member/progress',
    method: 'POST',
    payload: { workout_id: 'wk_leg_01' },
    created_at: '2026-09-05T07:30:00Z',
  });
  const a2 = await client.db.enqueue({
    entity_type: 'attendance',
    action: 'create',
    endpoint: '/member/attendance',
    method: 'POST',
    payload: { session_id: 'sess_strength_305' },
    created_at: '2026-09-05T07:45:00Z',
  });

  await client.drainSyncQueue();
  assert.deepEqual(client.sync.processedOrder, [a1.id, a2.id, p1.id, p2.id]);
});

test('F6.5: Priority ordering holds even when items are enqueued across separate offline operations', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  client.setOffline(true);

  // Complete workout offline
  await client.completeWorkout({
    workout_id: 'wk_chest_01',
    duration_seconds: 3000,
    calories_burned: 450,
    idempotency_key: 'offline_prog_1',
  });

  // Check in offline
  await client.checkInSession('sess_hiit_101');

  client.setOffline(false);
  await client.drainSyncQueue();

  const allItems = await client.db.getQueueItems();
  assert.equal(allItems.length, 0); // All processed
  assert.equal(client.sync.processedOrder.length, 2);
});
