import test from 'node:test';
import assert from 'node:assert/strict';
import { GymFlowAppClient } from '../harness/app-client.ts';

test('B20.1: Transition from online to offline to online toggles sync engine state correctly', () => {
  const client = new GymFlowAppClient();
  assert.equal(client.sync.state, 'idle');

  client.setOffline(true);
  assert.equal(client.sync.state, 'offline');

  client.setOffline(false);
  assert.equal(client.sync.state, 'idle');
});

test('B20.2: Pending count in sync slot accurately counts items in SQLite WriteQueue', async () => {
  const client = new GymFlowAppClient();
  client.setOffline(true);

  await client.completeWorkout({
    workout_id: 'wk_chest_01',
    duration_seconds: 1200,
    calories_burned: 150,
    idempotency_key: 'count_key_1',
  });
  await client.completeWorkout({
    workout_id: 'wk_back_01',
    duration_seconds: 1800,
    calories_burned: 200,
    idempotency_key: 'count_key_2',
  });

  const status = await client.sync.getStatus();
  assert.equal(status.pending_count, 2);
});

test('B20.3: Amber TTL indicator takes visual precedence over regular pending count', async () => {
  const client = new GymFlowAppClient();
  const oldDate = new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString();

  await client.db.enqueue({
    entity_type: 'progress',
    action: 'create',
    endpoint: '/member/progress',
    method: 'POST',
    payload: { workout_id: 'wk_chest_01' },
    created_at: oldDate,
  });

  const status = await client.sync.getStatus();
  assert.equal(status.has_7day_warning, true);
  assert.equal(status.pending_count, 1);
});

test('B20.4: Dismissible banner clears without affecting queue status', async () => {
  const client = new GymFlowAppClient();
  client.sync.activeBanner = 'Session was cancelled by the gym.';
  client.ui.showDismissibleBanner('Session was cancelled by the gym.');

  assert.equal(client.ui.state.isDismissibleBannerVisible, true);

  client.ui.dismissBanner();
  client.sync.dismissBanner();

  assert.equal(client.ui.state.isDismissibleBannerVisible, false);
  assert.equal(client.sync.activeBanner, null);
});

test('B20.5: Active tab changes update navigation state and highlighted tab', () => {
  const client = new GymFlowAppClient();
  assert.equal(client.ui.state.activeTab, 'Home');

  client.ui.navigate('CatalogScreen');
  assert.equal(client.ui.state.activeTab, 'Workouts');

  client.ui.navigate('ScheduleScreen');
  assert.equal(client.ui.state.activeTab, 'Schedule');

  client.ui.navigate('ProgressScreen');
  assert.equal(client.ui.state.activeTab, 'Progress');

  client.ui.navigate('ProfileScreen');
  assert.equal(client.ui.state.activeTab, 'Profile');
});
