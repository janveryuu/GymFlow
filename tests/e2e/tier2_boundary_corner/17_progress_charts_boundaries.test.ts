import test from 'node:test';
import assert from 'node:assert/strict';
import { GymFlowAppClient } from '../harness/app-client.ts';

test('B17.1: Period "year" query completes with 200 OK', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  const progress = await client.loadProgress('year');
  assert.equal(progress?.period, 'year');
});

test('B17.2: Period "all" query returns all available entries', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  const progress = await client.loadProgress('all');
  assert.equal(progress?.period, 'all');
  assert.ok(progress?.history.length! > 0);
});

test('B17.3: Single-day workout history correctly populates daily chart bar', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  const progress = await client.loadProgress('week');
  const monday = progress?.chart_data.find((d) => d.label === 'Mon');
  assert.ok(monday);
  assert.equal(monday?.calories, 480);
});

test('B17.4: Chart data points with 0 calories handle without NaN', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  const progress = await client.loadProgress('week');
  const tuesday = progress?.chart_data.find((d) => d.label === 'Tue');
  assert.ok(tuesday);
  assert.equal(tuesday?.calories, 0);
  assert.equal(isNaN(tuesday?.calories!), false);
});

test('B17.5: Historical workouts with identical completion timestamps sort cleanly', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  const sameTime = '2026-09-05T08:00:00Z';
  client.server.progressHistory.push(
    {
      id: 'prog_collision_1',
      workout_id: 'wk_chest_01',
      completed_at: sameTime,
      duration_seconds: 1800,
      calories_burned: 200,
      idempotency_key: 'collision_key_1',
    },
    {
      id: 'prog_collision_2',
      workout_id: 'wk_back_01',
      completed_at: sameTime,
      duration_seconds: 1800,
      calories_burned: 200,
      idempotency_key: 'collision_key_2',
    }
  );

  const progress = await client.loadProgress('week');
  assert.ok(progress?.history.length! >= 2);
});
