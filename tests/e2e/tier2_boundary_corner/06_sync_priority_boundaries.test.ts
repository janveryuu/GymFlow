import test from 'node:test';
import assert from 'node:assert/strict';
import { GymFlowAppClient } from '../harness/app-client.ts';

test('B6.1: Timestamp collision between attendance and progress still prioritizes attendance', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  const exactSameTime = '2026-09-05T12:00:00.000Z';

  const prog = await client.db.enqueue({
    entity_type: 'progress',
    action: 'create',
    endpoint: '/member/progress',
    method: 'POST',
    payload: { workout_id: 'wk_chest_01' },
    created_at: exactSameTime,
  });

  const att = await client.db.enqueue({
    entity_type: 'attendance',
    action: 'create',
    endpoint: '/member/attendance',
    method: 'POST',
    payload: { session_id: 'sess_hiit_101' },
    created_at: exactSameTime,
  });

  await client.drainSyncQueue();
  assert.equal(client.sync.processedOrder[0], att.id);
  assert.equal(client.sync.processedOrder[1], prog.id);
});

test('B6.2: Queue with zero attendance items drains all progress items in FIFO order', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  const p1 = await client.db.enqueue({
    entity_type: 'progress',
    action: 'create',
    endpoint: '/member/progress',
    method: 'POST',
    payload: { workout_id: 'wk_chest_01' },
    created_at: '2026-09-05T01:00:00Z',
  });
  const p2 = await client.db.enqueue({
    entity_type: 'progress',
    action: 'create',
    endpoint: '/member/progress',
    method: 'POST',
    payload: { workout_id: 'wk_back_01' },
    created_at: '2026-09-05T02:00:00Z',
  });

  await client.drainSyncQueue();
  assert.deepEqual(client.sync.processedOrder, [p1.id, p2.id]);
});

test('B6.3: Queue with zero progress items drains all attendance items in FIFO order', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  const a1 = await client.db.enqueue({
    entity_type: 'attendance',
    action: 'create',
    endpoint: '/member/attendance',
    method: 'POST',
    payload: { session_id: 'sess_hiit_101' },
    created_at: '2026-09-05T01:00:00Z',
  });
  const a2 = await client.db.enqueue({
    entity_type: 'attendance',
    action: 'create',
    endpoint: '/member/attendance',
    method: 'POST',
    payload: { session_id: 'sess_strength_305' },
    created_at: '2026-09-05T02:00:00Z',
  });

  await client.drainSyncQueue();
  assert.deepEqual(client.sync.processedOrder, [a1.id, a2.id]);
});

test('B6.4: Network failure during queue drain halts execution and preserves remaining items', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  await client.db.enqueue({
    entity_type: 'attendance',
    action: 'create',
    endpoint: '/member/attendance',
    method: 'POST',
    payload: { session_id: 'sess_hiit_101' },
  });

  const p = await client.db.enqueue({
    entity_type: 'progress',
    action: 'create',
    endpoint: '/member/progress',
    method: 'POST',
    payload: { workout_id: 'wk_chest_01' },
  });

  // Inject timeout on progress endpoint
  client.server.setTimeout('/member/progress');

  const drainRes = await client.drainSyncQueue();
  assert.equal(drainRes.processed, 1); // Attendance succeeded
  assert.equal(drainRes.failed, 1);    // Progress failed

  const remaining = await client.db.getQueueItems();
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].id, p.id);
});

test('B6.5: Interleaved queue of 10 attendances and 10 progress items drains all 10 attendances first', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  const attIds: string[] = [];
  const progIds: string[] = [];

  for (let i = 0; i < 10; i++) {
    const p = await client.db.enqueue({
      entity_type: 'progress',
      action: 'create',
      endpoint: '/member/progress',
      method: 'POST',
      payload: { workout_id: `wk_chest_01`, idempotency_key: `key_p_${i}` },
      created_at: new Date(Date.now() + i * 1000).toISOString(),
    });
    progIds.push(p.id);

    const a = await client.db.enqueue({
      entity_type: 'attendance',
      action: 'create',
      endpoint: '/member/attendance',
      method: 'POST',
      payload: { session_id: `sess_hiit_101`, idempotency_key: `key_a_${i}` },
      created_at: new Date(Date.now() + i * 1000 + 500).toISOString(),
    });
    attIds.push(a.id);
  }

  await client.drainSyncQueue();

  // All 10 attendances must precede all 10 progress items
  const firstTen = client.sync.processedOrder.slice(0, 10);
  const nextTen = client.sync.processedOrder.slice(10, 20);

  for (const id of attIds) {
    assert.ok(firstTen.includes(id));
  }
  for (const id of progIds) {
    assert.ok(nextTen.includes(id));
  }
});
