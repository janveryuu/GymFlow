import test from 'node:test';
import assert from 'node:assert/strict';
import { GymFlowAppClient } from '../harness/app-client.ts';

test('B3.1: Malformed email strings ("notanemail", "user@", "@domain.com") return 422', async () => {
  const client = new GymFlowAppClient();
  const res1 = await client.forgotPassword('notanemail');
  const res2 = await client.forgotPassword('user@');
  const res3 = await client.forgotPassword('@domain.com');

  assert.equal(res1.status, 422);
  assert.equal(res2.status, 422);
  assert.equal(res3.status, 422);
});

test('B3.2: Extremely long email (255+ characters) with valid syntax handled safely', async () => {
  const client = new GymFlowAppClient();
  const longPrefix = 'a'.repeat(240);
  const longEmail = `${longPrefix}@example.com`;

  const res = await client.forgotPassword(longEmail);
  assert.equal(res.status, 200);
});

test('B3.3: Empty string email rejected with 422', async () => {
  const client = new GymFlowAppClient();
  const res = await client.forgotPassword('');
  assert.equal(res.status, 422);
  assert.equal(res.success, false);
});

test('B3.4: Special characters and tags in email ("john+tag@example.com") accepted', async () => {
  const client = new GymFlowAppClient();
  const res = await client.forgotPassword('john+fitnesstag@example.com');
  assert.equal(res.status, 200);
  assert.equal(res.success, true);
});

test('B3.5: Network outage during forgot-password fails gracefully without crash', async () => {
  const client = new GymFlowAppClient();
  client.setOffline(true);

  const res = await client.forgotPassword('member@gymflow.test');
  assert.equal(res.success, false);
  assert.equal(client.ui.state.isLoading, false);
});
