import test from 'node:test';
import assert from 'node:assert/strict';
import { GymFlowAppClient } from '../harness/app-client.ts';

test('F1.1: Valid member credentials authenticate with 200 OK and token', async () => {
  const client = new GymFlowAppClient();
  const res = await client.login({
    email: 'member@gymflow.test',
    password: 'TempPass!23',
  });
  assert.equal(res.success, true);
  assert.equal(res.status, 200);
  assert.ok(res.data.token.startsWith('1|'));
  assert.equal(client.authToken, res.data.token);
});

test('F1.2: Alternative valid credentials authenticate with 200 OK', async () => {
  const client = new GymFlowAppClient();
  const res = await client.login({
    email: 'jane.doe@example.com',
    password: 'Password123!',
  });
  assert.equal(res.success, true);
  assert.equal(res.status, 200);
  assert.equal(res.data.user.name, 'Jane Doe');
});

test('F1.3: Response payload matches confirmed login contract byte-for-byte schema', async () => {
  const client = new GymFlowAppClient();
  const res = await client.login({
    email: 'member@gymflow.test',
    password: 'TempPass!23',
  });
  assert.equal(typeof res.data.token, 'string');
  assert.equal(typeof res.data.user.id, 'number');
  assert.equal(typeof res.data.user.name, 'string');
  assert.equal(res.data.user.role, 'member');
});

test('F1.4: Client stores auth token and updates current authenticated user', async () => {
  const client = new GymFlowAppClient();
  await client.login({
    email: 'member@gymflow.test',
    password: 'TempPass!23',
  });
  assert.ok(client.authToken);
  assert.equal(client.currentUser?.role, 'member');
  assert.equal(client.sync.activeToken, client.authToken);
});

test('F1.5: Navigation routes to DashboardScreen when must_change_password is false', async () => {
  const client = new GymFlowAppClient();
  client.server.profile.must_change_password = false;
  await client.login({
    email: 'member@gymflow.test',
    password: 'TempPass!23',
  });
  assert.equal(client.ui.state.currentRoute, 'DashboardScreen');
  assert.equal(client.ui.state.activeTab, 'Home');
});
