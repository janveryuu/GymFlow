import test from 'node:test';
import assert from 'node:assert/strict';
import { GymFlowAppClient } from '../harness/app-client.ts';

test('F2.1: Member with must_change_password=true routes to ForcedPasswordResetScreen on login', async () => {
  const client = new GymFlowAppClient();
  client.server.profile.must_change_password = true;
  await client.login({
    email: 'member@gymflow.test',
    password: 'TempPass!23',
  });
  assert.equal(client.ui.state.currentRoute, 'ForcedPasswordResetScreen');
});

test('F2.2: Submitting valid new password updates password with 200 OK', async () => {
  const client = new GymFlowAppClient();
  client.server.profile.must_change_password = true;
  await client.login({
    email: 'member@gymflow.test',
    password: 'TempPass!23',
  });
  const res = await client.forcedChangePassword({
    current_password: 'TempPass!23',
    new_password: 'BrandNewSecurePass99!',
    new_password_confirmation: 'BrandNewSecurePass99!',
  });
  assert.equal(res.success, true);
  assert.equal(res.status, 200);
});

test('F2.3: Profile must_change_password flag flips to false after successful reset', async () => {
  const client = new GymFlowAppClient();
  client.server.profile.must_change_password = true;
  await client.login({
    email: 'member@gymflow.test',
    password: 'TempPass!23',
  });
  await client.forcedChangePassword({
    current_password: 'TempPass!23',
    new_password: 'BrandNewSecurePass99!',
    new_password_confirmation: 'BrandNewSecurePass99!',
  });
  assert.equal(client.server.profile.must_change_password, false);
});

test('F2.4: Navigation proceeds to DashboardScreen after password update', async () => {
  const client = new GymFlowAppClient();
  client.server.profile.must_change_password = true;
  await client.login({
    email: 'member@gymflow.test',
    password: 'TempPass!23',
  });
  await client.forcedChangePassword({
    current_password: 'TempPass!23',
    new_password: 'BrandNewSecurePass99!',
    new_password_confirmation: 'BrandNewSecurePass99!',
  });
  assert.equal(client.ui.state.currentRoute, 'DashboardScreen');
});

test('F2.5: User cannot reach DashboardScreen while must_change_password remains true', async () => {
  const client = new GymFlowAppClient();
  client.server.profile.must_change_password = true;
  await client.login({
    email: 'member@gymflow.test',
    password: 'TempPass!23',
  });
  assert.notEqual(client.ui.state.currentRoute, 'DashboardScreen');
  assert.equal(client.ui.state.currentRoute, 'ForcedPasswordResetScreen');
});
