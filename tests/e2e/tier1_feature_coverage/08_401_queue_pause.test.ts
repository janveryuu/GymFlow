import test from 'node:test';
import assert from 'node:assert/strict';
import { GymFlowAppClient } from '../harness/app-client.ts';

test('F8.1: Sync queue transitions to PAUSED immediately upon receiving HTTP 401', async () => {
  const client = new GymFlowAppClient();
  client.authToken = 'expired_invalid_token';
  client.sync.setToken('expired_invalid_token');

  await client.db.enqueue({
    entity_type: 'attendance',
    action: 'create',
    endpoint: '/member/attendance',
    method: 'POST',
    payload: { session_id: 'sess_hiit_101' },
  });

  const drainRes = await client.drainSyncQueue();
  assert.equal(drainRes.paused, true);
  assert.equal(client.sync.state, 'paused');
});

test('F8.2: 401 pauses queue without dropping or deleting any queue items', async () => {
  const client = new GymFlowAppClient();
  client.authToken = 'expired_invalid_token';
  client.sync.setToken('expired_invalid_token');

  await client.db.enqueue({
    entity_type: 'attendance',
    action: 'create',
    endpoint: '/member/attendance',
    method: 'POST',
    payload: { session_id: 'sess_hiit_101' },
  });
  await client.db.enqueue({
    entity_type: 'progress',
    action: 'create',
    endpoint: '/member/progress',
    method: 'POST',
    payload: { workout_id: 'wk_chest_01' },
  });

  await client.drainSyncQueue();

  const remaining = await client.db.getQueueItems();
  assert.equal(remaining.length, 2); // Zero items dropped!
});

test('F8.3: Item triggering 401 retains pending status with last_error recorded', async () => {
  const client = new GymFlowAppClient();
  client.authToken = 'expired_token';
  client.sync.setToken('expired_token');

  const item = await client.db.enqueue({
    entity_type: 'attendance',
    action: 'create',
    endpoint: '/member/attendance',
    method: 'POST',
    payload: { session_id: 'sess_hiit_101' },
  });

  await client.drainSyncQueue();

  const refreshed = (await client.db.getQueueItems()).find((i) => i.id === item.id);
  assert.equal(refreshed?.status, 'pending');
  assert.ok(refreshed?.last_error?.includes('401'));
});

test('F8.4: Queue remains paused on subsequent attempts until re-authenticated', async () => {
  const client = new GymFlowAppClient();
  client.authToken = 'expired_token';
  client.sync.setToken('expired_token');

  await client.db.enqueue({
    entity_type: 'attendance',
    action: 'create',
    endpoint: '/member/attendance',
    method: 'POST',
    payload: { session_id: 'sess_hiit_101' },
  });

  await client.drainSyncQueue();
  assert.equal(client.sync.state, 'paused');

  // Second drain attempt without new token remains paused
  const secondDrain = await client.drainSyncQueue();
  assert.equal(secondDrain.paused, true);
  assert.equal(secondDrain.processed, 0);
});

test('F8.5: Storing a valid auth token resumes queue and processes pending items', async () => {
  const client = new GymFlowAppClient();
  client.authToken = 'expired_token';
  client.sync.setToken('expired_token');

  await client.db.enqueue({
    entity_type: 'attendance',
    action: 'create',
    endpoint: '/member/attendance',
    method: 'POST',
    payload: { session_id: 'sess_hiit_101' },
  });

  await client.drainSyncQueue();
  assert.equal(client.sync.state, 'paused');

  // Re-authenticate with valid credentials
  const loginRes = await client.login({
    email: 'member@gymflow.test',
    password: 'TempPass!23',
  });
  assert.equal(loginRes.success, true);
  assert.equal(client.sync.state, 'idle');

  // Drain now succeeds
  const resumeDrain = await client.drainSyncQueue();
  assert.equal(resumeDrain.processed, 1);
  const remaining = await client.db.getQueueItems();
  assert.equal(remaining.length, 0);
});
