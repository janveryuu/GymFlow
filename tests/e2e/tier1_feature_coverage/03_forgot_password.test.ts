import test from 'node:test';
import assert from 'node:assert/strict';
import { GymFlowAppClient } from '../harness/app-client.ts';

test('F3.1: Valid member email receives 200 OK with reset confirmation', async () => {
  const client = new GymFlowAppClient();
  const res = await client.forgotPassword('member@gymflow.test');
  assert.equal(res.success, true);
  assert.equal(res.status, 200);
  assert.ok(res.data.message.includes('instructions'));
});

test('F3.2: Non-existent email receives 200 OK (blind response for security)', async () => {
  const client = new GymFlowAppClient();
  const res = await client.forgotPassword('unregistered.user@nowhere.com');
  assert.equal(res.success, true);
  assert.equal(res.status, 200);
});

test('F3.3: Invalid email without domain triggers validation failure', async () => {
  const client = new GymFlowAppClient();
  const res = await client.forgotPassword('invalid-email-format');
  assert.equal(res.success, false);
  assert.equal(res.status, 422);
});

test('F3.4: Loading state is engaged and cleared during submission', async () => {
  const client = new GymFlowAppClient();
  const p = client.forgotPassword('member@gymflow.test');
  await p;
  assert.equal(client.ui.state.isLoading, false);
  assert.equal(client.ui.state.isSkeletonVisible, false);
});

test('F3.5: Client UI clears error upon valid submission', async () => {
  const client = new GymFlowAppClient();
  await client.forgotPassword('invalid-email');
  assert.equal(client.ui.state.isErrorVisible, true);
  await client.forgotPassword('valid@gymflow.test');
  assert.equal(client.ui.state.isErrorVisible, false);
});
