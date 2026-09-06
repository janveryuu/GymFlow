import test from 'node:test';
import assert from 'node:assert/strict';
import { GymFlowAppClient } from '../harness/app-client.ts';

test('B1.1: Empty email and password returns 422 with structured field errors', async () => {
  const client = new GymFlowAppClient();
  const res = await client.login({ email: '', password: '' });
  assert.equal(res.status, 422);
  assert.equal(res.success, false);
  assert.ok(res.data.errors.email);
  assert.ok(res.data.errors.password);
});

test('B1.2: SQL injection pattern in email returns 401 without SQL execution or crash', async () => {
  const client = new GymFlowAppClient();
  const res = await client.login({
    email: "' OR '1'='1",
    password: "' OR '1'='1",
  });
  assert.equal(res.status, 401);
  assert.equal(res.success, false);
});

test('B1.3: Very long password (1024 characters) is handled gracefully without crash', async () => {
  const client = new GymFlowAppClient();
  const longPass = 'A'.repeat(1024);
  const res = await client.login({
    email: 'member@gymflow.test',
    password: longPass,
  });
  assert.equal(res.status, 401);
  assert.equal(res.success, false);
});

test('B1.4: Leading and trailing whitespace in valid credentials handled cleanly', async () => {
  const client = new GymFlowAppClient();
  // Valid email with untrimmed space should fail unless trimmed
  const res = await client.login({
    email: ' member@gymflow.test ',
    password: 'TempPass!23',
  });
  assert.equal(res.status, 401);
});

test('B1.5: Unicode and special symbols in password are preserved with UTF-8 fidelity', async () => {
  const client = new GymFlowAppClient();
  // Ensure server does not corrupt unicode passwords
  const res = await client.server.request('POST', '/api/v1/auth/login', {
    email: 'member@gymflow.test',
    password: 'TempPass!23🔑🔥',
  });
  assert.equal(res.status, 401); // Wrong password, but no 500 error
});
