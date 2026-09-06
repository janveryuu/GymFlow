import test from 'node:test';
import assert from 'node:assert/strict';
import { GymFlowAppClient } from '../harness/app-client.ts';

test('B19.1: Weekly workout goal = 0 (below minimum 1) is rejected with 422', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  const res = await client.updatePreferences({ weekly_workout_goal: 0 });
  assert.equal(res.success, false);
  assert.equal(res.status, 422);
});

test('B19.2: Weekly workout goal = 8 (above maximum 7) is rejected with 422', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  const res = await client.updatePreferences({ weekly_workout_goal: 8 });
  assert.equal(res.success, false);
  assert.equal(res.status, 422);
});

test('B19.3: Invalid photo URL format (non-http string) rejected with 422', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  const res = await client.updateProfile({ photo_url: 'not-a-valid-url' });
  assert.equal(res.success, false);
  assert.equal(res.status, 422);
});

test('B19.4: International phone number format (+63 917 555 0142) preserved accurately', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  const intlPhone = '+63 917 555 0142';
  const res = await client.updateProfile({ phone: intlPhone });
  assert.equal(res.success, true);
  assert.equal(client.server.profile.phone, intlPhone);
});

test('B19.5: Partial preferences update (intensity only) preserves existing workout_type and goal', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  await client.updatePreferences({ workout_type: 'strength', weekly_workout_goal: 4 });
  await client.updatePreferences({ intensity: 'extreme' });

  assert.equal(client.server.preferences.intensity, 'extreme');
  assert.equal(client.server.preferences.workout_type, 'strength');
  assert.equal(client.server.preferences.weekly_workout_goal, 4);
});
