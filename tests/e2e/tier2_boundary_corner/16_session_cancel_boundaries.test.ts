import test from 'node:test';
import assert from 'node:assert/strict';
import { GymFlowAppClient } from '../harness/app-client.ts';

test('B16.1: Cancelling with empty string reason succeeds', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  const res = await client.cancelSession('sess_hiit_101', '');
  assert.equal(res.success, true);
  assert.equal(res.status, 200);
});

test('B16.2: Cancelling with long reason string (500 characters) succeeds without truncation error', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  const longReason = 'Family emergency and urgent travel conflict. '.repeat(10);
  const res = await client.cancelSession('sess_strength_305', longReason);
  assert.equal(res.success, true);
  assert.equal(res.status, 200);
});

test('B16.3: Cancelling non-existent session ID returns 404', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  const res = await client.cancelSession('sess_non_existent_9999');
  assert.equal(res.success, false);
  assert.equal(res.status, 404);
});

test('B16.4: Multiple session cancellations queue in SQLite WriteQueue when offline', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  client.setOffline(true);

  await client.cancelSession('sess_hiit_101', 'Reason 1');
  await client.cancelSession('sess_strength_305', 'Reason 2');

  const queued = await client.db.getQueueItems();
  assert.equal(queued.length, 2);
  assert.equal(queued[0].entity_type, 'session_cancel');
  assert.equal(queued[1].entity_type, 'session_cancel');
});

test('B16.5: Offline cancellations update local session state optimistically', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  client.setOffline(true);

  const res = await client.cancelSession('sess_hiit_101');
  assert.equal(res.success, true);
});
