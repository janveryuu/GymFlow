import test from 'node:test';
import assert from 'node:assert/strict';
import { GymFlowAppClient } from '../harness/app-client.ts';

test('F19.1: Profile displays member details, photo, and membership tier', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  assert.equal(client.server.profile.name, 'Jane Doe');
  assert.equal(client.server.profile.membership.tier, 'Black Diamond All-Access');
  assert.equal(client.server.profile.membership.status, 'active');
});

test('F19.2: Updating contact details (name, phone) submits PATCH and updates profile', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  const res = await client.updateProfile({
    name: 'Jane Smith',
    phone: '+1 (555) 345-6789',
  });
  assert.equal(res.success, true);
  assert.equal(client.server.profile.name, 'Jane Smith');
  assert.equal(client.server.profile.phone, '+1 (555) 345-6789');
});

test('F19.3: Updating workout preferences (workout_type, intensity) saves to server & db', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  const res = await client.updatePreferences({
    workout_type: 'cardio',
    intensity: 'high',
  });
  assert.equal(res.success, true);
  assert.equal(client.server.preferences.workout_type, 'cardio');
  assert.equal(client.server.preferences.intensity, 'high');
});

test('F19.4: Updating weekly workout goal to valid integer (1-7) succeeds', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  const res = await client.updatePreferences({ weekly_workout_goal: 6 });
  assert.equal(res.success, true);
  assert.equal(client.server.preferences.weekly_workout_goal, 6);
});

test('F19.5: Updating profile triggers haptic feedback', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  await client.updateProfile({ name: 'Jane Updated' });
  assert.ok(client.ui.state.hapticEvents.includes('impact_medium'));
});
