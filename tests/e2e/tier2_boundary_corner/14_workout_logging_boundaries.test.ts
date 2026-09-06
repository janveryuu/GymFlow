import test from 'node:test';
import assert from 'node:assert/strict';
import { GymFlowAppClient } from '../harness/app-client.ts';

test('B14.1: Zero duration and zero calories logs successfully (minimal session boundary)', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  const res = await client.completeWorkout({
    workout_id: 'wk_chest_01',
    duration_seconds: 0,
    calories_burned: 0,
    idempotency_key: 'zero_boundary_key_1',
  });

  assert.equal(res.success, true);
  assert.equal(res.entry?.duration_seconds, 0);
  assert.equal(res.entry?.calories_burned, 0);
});

test('B14.2: High duration (36000s / 10h) and calories (3000 kcal) handled cleanly', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  const res = await client.completeWorkout({
    workout_id: 'wk_chest_01',
    duration_seconds: 36000,
    calories_burned: 3000,
    idempotency_key: 'high_boundary_key_1',
  });

  assert.equal(res.success, true);
  assert.equal(res.entry?.duration_seconds, 36000);
});

test('B14.3: Duplicate idempotency key receives 200 OK replay and retains original id', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  const idempKey = 'concurrent_idemp_key_1';
  const first = await client.completeWorkout({
    workout_id: 'wk_back_01',
    duration_seconds: 1800,
    calories_burned: 250,
    idempotency_key: idempKey,
  });

  const second = await client.completeWorkout({
    workout_id: 'wk_back_01',
    duration_seconds: 1800,
    calories_burned: 250,
    idempotency_key: idempKey,
  });

  assert.equal(first.success, true);
  assert.equal(second.success, true);
  assert.equal(first.entry?.id, second.entry?.id);
});

test('B14.4: Network drop during completion logging falls back seamlessly to SQLite WriteQueue', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  client.setOffline(true);

  const res = await client.completeWorkout({
    workout_id: 'wk_leg_01',
    duration_seconds: 2400,
    calories_burned: 380,
    idempotency_key: 'offline_queue_key_1',
  });

  assert.equal(res.success, true);
  assert.ok(res.queueId);

  const queued = await client.db.getQueueItems();
  assert.equal(queued.length, 1);
  assert.equal(queued[0].entity_type, 'progress');
});

test('B14.5: Optimistic history contains newly completed workout immediately before sync drain', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  client.setOffline(true);

  await client.completeWorkout({
    workout_id: 'wk_arm_01',
    duration_seconds: 1200,
    calories_burned: 150,
    idempotency_key: 'optimistic_offline_arm_1',
  });

  const localHistory = await client.db.getCachedProgressEntries();
  const found = localHistory.find((p) => p.idempotency_key === 'optimistic_offline_arm_1');
  assert.ok(found);
  assert.equal(found?.duration_seconds, 1200);
});
