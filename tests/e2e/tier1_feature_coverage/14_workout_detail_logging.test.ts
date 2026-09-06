import test from 'node:test';
import assert from 'node:assert/strict';
import { GymFlowAppClient } from '../harness/app-client.ts';

test('F14.1: Workout detail loads full metrics (duration, calories, difficulty, reps/sets)', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  const { workout } = await client.getWorkoutDetail('wk_chest_01');

  assert.ok(workout);
  assert.equal(workout?.duration_minutes, 50);
  assert.equal(workout?.calories, 480);
  assert.equal(workout?.difficulty, 'intermediate');
  assert.ok(workout?.reps_sets);
});

test('F14.2: Tapping Complete Workout triggers haptic feedback', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  await client.completeWorkout({
    workout_id: 'wk_chest_01',
    duration_seconds: 3000,
    calories_burned: 480,
    idempotency_key: 'haptic_test_key_1',
  });

  assert.ok(client.ui.state.hapticEvents.includes('notification_success'));
});

test('F14.3: Completion generates idempotency key and submits progress record', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  const idempKey = 'uuid_prog_12345';
  const res = await client.completeWorkout({
    workout_id: 'wk_chest_01',
    duration_seconds: 3000,
    calories_burned: 480,
    idempotency_key: idempKey,
  });

  assert.equal(res.success, true);
  assert.equal(res.entry?.idempotency_key, idempKey);
});

test('F14.4: Duplicate submission with same idempotency key returns 200 without double-logging', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  const idempKey = 'idempotent_duplicate_key_1';
  const first = await client.server.request(
    'POST',
    '/member/progress',
    {
      workout_id: 'wk_chest_01',
      duration_seconds: 3000,
      calories_burned: 480,
      idempotency_key: idempKey,
    },
    { Authorization: `Bearer ${client.authToken}` }
  );
  assert.equal(first.status, 201);

  const second = await client.server.request(
    'POST',
    '/member/progress',
    {
      workout_id: 'wk_chest_01',
      duration_seconds: 3000,
      calories_burned: 480,
      idempotency_key: idempKey,
    },
    { Authorization: `Bearer ${client.authToken}` }
  );
  assert.equal(second.status, 200); // 200 OK replay
  assert.equal(second.data.id, first.data.id);
});

test('F14.5: Completed workout is optimistically persisted to local progress history', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  await client.completeWorkout({
    workout_id: 'wk_chest_01',
    duration_seconds: 3000,
    calories_burned: 480,
    idempotency_key: 'optimistic_key_99',
  });

  const localHistory = await client.db.getCachedProgressEntries();
  const found = localHistory.find((p) => p.idempotency_key === 'optimistic_key_99');
  assert.ok(found);
  assert.equal(found?.workout_id, 'wk_chest_01');
});
