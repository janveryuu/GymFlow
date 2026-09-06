import test from 'node:test';
import assert from 'node:assert/strict';
import { GymFlowAppClient } from '../harness/app-client.ts';

test('F10.1: Pending items older than 7 days trigger amber warning indicator', async () => {
  const client = new GymFlowAppClient();
  const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();

  await client.db.enqueue({
    entity_type: 'progress',
    action: 'create',
    endpoint: '/member/progress',
    method: 'POST',
    payload: { workout_id: 'wk_chest_01' },
    created_at: eightDaysAgo,
  });

  const status = await client.sync.getStatus();
  assert.equal(status.has_7day_warning, true);
});

test('F10.2: Pending items younger than 7 days do NOT trigger amber warning', async () => {
  const client = new GymFlowAppClient();
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  await client.db.enqueue({
    entity_type: 'progress',
    action: 'create',
    endpoint: '/member/progress',
    method: 'POST',
    payload: { workout_id: 'wk_chest_01' },
    created_at: threeDaysAgo,
  });

  const status = await client.sync.getStatus();
  assert.equal(status.has_7day_warning, false);
});

test('F10.3: Mixed queue with one >7 day item surfaces amber warning', async () => {
  const client = new GymFlowAppClient();
  const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
  const today = new Date().toISOString();

  await client.db.enqueue({
    entity_type: 'attendance',
    action: 'create',
    endpoint: '/member/attendance',
    method: 'POST',
    payload: { session_id: 'sess_hiit_101' },
    created_at: today,
  });
  await client.db.enqueue({
    entity_type: 'progress',
    action: 'create',
    endpoint: '/member/progress',
    method: 'POST',
    payload: { workout_id: 'wk_chest_01' },
    created_at: eightDaysAgo,
  });

  const status = await client.sync.getStatus();
  assert.equal(status.has_7day_warning, true);
  assert.equal(status.pending_count, 2);
});

test('F10.4: Amber indicator state is reflected in sync engine status payload', async () => {
  const client = new GymFlowAppClient();
  const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();

  await client.db.enqueue({
    entity_type: 'progress',
    action: 'create',
    endpoint: '/member/progress',
    method: 'POST',
    payload: { workout_id: 'wk_leg_01' },
    created_at: tenDaysAgo,
  });

  const status = await client.sync.getStatus();
  assert.equal(typeof status.has_7day_warning, 'boolean');
  assert.equal(status.has_7day_warning, true);
});

test('F10.5: Clearing or successfully draining expired item removes amber warning', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();

  await client.db.enqueue({
    entity_type: 'attendance',
    action: 'create',
    endpoint: '/member/attendance',
    method: 'POST',
    payload: { session_id: 'sess_hiit_101' },
    created_at: eightDaysAgo,
  });

  assert.equal((await client.sync.getStatus()).has_7day_warning, true);

  await client.drainSyncQueue();

  const refreshed = await client.sync.getStatus();
  assert.equal(refreshed.has_7day_warning, false);
  assert.equal(refreshed.pending_count, 0);
});
