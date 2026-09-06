import test from 'node:test';
import assert from 'node:assert/strict';
import { GymFlowAppClient } from '../harness/app-client.ts';

test('F5.1: Workout catalog fetched online is cached into local SQLite Workout table', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  const onlineWorkouts = await client.loadCatalog();
  assert.ok(onlineWorkouts.length > 0);

  const cached = await client.db.getCachedWorkouts();
  assert.equal(cached.length, onlineWorkouts.length);
  assert.equal(cached[0].id, onlineWorkouts[0].id);
});

test('F5.2: Disabling network serves workout catalog transparently from SQLite cache', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  await client.loadCatalog();

  // Go offline
  client.setOffline(true);
  const offlineWorkouts = await client.loadCatalog();
  assert.ok(offlineWorkouts.length > 0);
  assert.equal(offlineWorkouts[0].id, 'wk_chest_01');
});

test('F5.3: Sessions fetched online are cached into local SQLite Session table', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  const onlineSessions = await client.loadSchedule();
  assert.ok(onlineSessions.length > 0);

  const cachedSessions = await client.db.getCachedSessions();
  assert.equal(cachedSessions.length, onlineSessions.length);
});

test('F5.4: Offline schedule loads from SQLite cache without network requests', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  await client.loadSchedule();

  client.setOffline(true);
  const offlineSessions = await client.loadSchedule();
  assert.ok(offlineSessions.length > 0);
  assert.equal(offlineSessions[0].id, 'sess_hiit_101');
});

test('F5.5: Preferences saved in SQLite persist across storage reads', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  await client.updatePreferences({ workout_type: 'hiit', intensity: 'extreme', weekly_workout_goal: 5 });

  const cached = await client.db.getPreferences();
  assert.equal(cached?.workout_type, 'hiit');
  assert.equal(cached?.intensity, 'extreme');
  assert.equal(cached?.weekly_workout_goal, 5);
});
