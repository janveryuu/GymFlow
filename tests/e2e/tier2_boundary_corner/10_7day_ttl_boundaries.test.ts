import test from 'node:test';
import assert from 'node:assert/strict';
import { SQLiteStorageEngine } from '../harness/sqlite-storage.ts';

test('B10.1: Boundary test: item created 6 days, 23 hours, 59 minutes ago -> NO warning', async () => {
  const db = new SQLiteStorageEngine();
  const now = new Date('2026-09-08T12:00:00Z');
  // 6 days, 23 hours, 59 mins ago = (6*24 + 23)*60 + 59 = 10079 mins ago
  const created = new Date(now.getTime() - 10079 * 60 * 1000).toISOString();

  await db.enqueue({
    entity_type: 'progress',
    action: 'create',
    endpoint: '/member/progress',
    method: 'POST',
    payload: { workout_id: 'wk_chest_01' },
    created_at: created,
  });

  assert.equal(db.has7DayTtlExpired(now), false);
});

test('B10.2: Boundary test: item created 7 days, 1 minute ago -> TRIGGERS warning', async () => {
  const db = new SQLiteStorageEngine();
  const now = new Date('2026-09-08T12:00:00Z');
  // 7 days + 1 min ago
  const created = new Date(now.getTime() - (7 * 24 * 60 + 1) * 60 * 1000).toISOString();

  await db.enqueue({
    entity_type: 'progress',
    action: 'create',
    endpoint: '/member/progress',
    method: 'POST',
    payload: { workout_id: 'wk_chest_01' },
    created_at: created,
  });

  assert.equal(db.has7DayTtlExpired(now), true);
});

test('B10.3: Extreme aging test: item created 30 days ago triggers warning', async () => {
  const db = new SQLiteStorageEngine();
  const now = new Date('2026-09-30T12:00:00Z');
  const created = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  await db.enqueue({
    entity_type: 'progress',
    action: 'create',
    endpoint: '/member/progress',
    method: 'POST',
    payload: { workout_id: 'wk_leg_01' },
    created_at: created,
  });

  assert.equal(db.has7DayTtlExpired(now), true);
});

test('B10.4: Queue with 5 fresh items and 1 expired item triggers amber warning', async () => {
  const db = new SQLiteStorageEngine();
  const now = new Date('2026-09-08T12:00:00Z');

  for (let i = 1; i <= 5; i++) {
    await db.enqueue({
      entity_type: 'progress',
      action: 'create',
      endpoint: '/member/progress',
      method: 'POST',
      payload: { workout_id: `wk_fresh_${i}` },
      created_at: new Date(now.getTime() - i * 3600 * 1000).toISOString(),
    });
  }

  // 1 item older than 7 days
  await db.enqueue({
    entity_type: 'progress',
    action: 'create',
    endpoint: '/member/progress',
    method: 'POST',
    payload: { workout_id: 'wk_expired_1' },
    created_at: new Date(now.getTime() - 8 * 24 * 3600 * 1000).toISOString(),
  });

  assert.equal(db.has7DayTtlExpired(now), true);
});

test('B10.5: Removing the expired item immediately clears amber warning', async () => {
  const db = new SQLiteStorageEngine();
  const now = new Date('2026-09-08T12:00:00Z');

  const expiredItem = await db.enqueue({
    entity_type: 'progress',
    action: 'create',
    endpoint: '/member/progress',
    method: 'POST',
    payload: { workout_id: 'wk_expired_1' },
    created_at: new Date(now.getTime() - 8 * 24 * 3600 * 1000).toISOString(),
  });

  assert.equal(db.has7DayTtlExpired(now), true);

  await db.removeQueueItem(expiredItem.id);
  assert.equal(db.has7DayTtlExpired(now), false);
});
