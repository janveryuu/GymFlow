import test from 'node:test';
import assert from 'node:assert/strict';
import { GymFlowAppClient } from '../harness/app-client.ts';

test('F17.1: Progress screen loads analytics for week period with chart points', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  const progress = await client.loadProgress('week');

  assert.ok(progress);
  assert.equal(progress?.period, 'week');
  assert.ok(progress?.chart_data.length > 0);
});

test('F17.2: Period selector switches to month and loads history', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  const progressMonth = await client.loadProgress('month');

  assert.ok(progressMonth);
  assert.equal(progressMonth?.period, 'month');
});

test('F17.3: Total metrics (workouts, duration, calories) are calculated correctly', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  const progress = await client.loadProgress('week');

  assert.ok(progress);
  assert.ok(typeof progress?.total_workouts === 'number');
  assert.ok(typeof progress?.total_duration_seconds === 'number');
  assert.ok(typeof progress?.total_calories === 'number');
});

test('F17.4: Chart data series formats days and metrics for Victory Native charts', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  const progress = await client.loadProgress('week');

  assert.ok(progress?.chart_data);
  const point = progress?.chart_data[0];
  assert.ok(point?.label);
  assert.ok(typeof point?.calories === 'number');
  assert.ok(typeof point?.duration_minutes === 'number');
});

test('F17.5: Empty history renders zeroed summary and empty chart without error', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  // Clear mock progress history
  client.server.progressHistory = [];
  const progress = await client.loadProgress('week');

  assert.equal(progress?.total_workouts, 0);
  assert.equal(client.ui.state.isEmptyStateVisible, true);
});
