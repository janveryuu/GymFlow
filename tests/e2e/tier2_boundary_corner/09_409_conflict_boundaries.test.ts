import test from 'node:test';
import assert from 'node:assert/strict';
import { GymFlowAppClient } from '../harness/app-client.ts';

test('B9.1: Multiple conflicting sessions in queue are all marked rejected without data loss', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  // sess_yoga_204 returns 409
  await client.db.enqueue({
    entity_type: 'attendance',
    action: 'create',
    endpoint: '/member/attendance',
    method: 'POST',
    payload: { session_id: 'sess_yoga_204' },
    created_at: '2026-09-05T01:00:00Z',
  });
  await client.db.enqueue({
    entity_type: 'attendance',
    action: 'create',
    endpoint: '/member/attendance',
    method: 'POST',
    payload: { session_id: 'sess_yoga_204' },
    created_at: '2026-09-05T02:00:00Z',
  });

  const drainRes = await client.drainSyncQueue();
  assert.equal(drainRes.rejected, 2);

  const rejected = await client.db.getQueueItems('rejected');
  assert.equal(rejected.length, 2);
});

test('B9.2: Dismissing conflict banner does not purge other rejected queue records', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  await client.db.enqueue({
    entity_type: 'attendance',
    action: 'create',
    endpoint: '/member/attendance',
    method: 'POST',
    payload: { session_id: 'sess_yoga_204' },
  });

  await client.drainSyncQueue();
  assert.equal(client.ui.state.isDismissibleBannerVisible, true);

  client.ui.dismissBanner();
  assert.equal(client.ui.state.isDismissibleBannerVisible, false);

  const rejected = await client.db.getQueueItems('rejected');
  assert.equal(rejected.length, 1);
});

test('B9.3: Session status remains cancelled_by_gym across subsequent schedule loads', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  await client.loadSchedule();

  const sessions = await client.db.getCachedSessions();
  const yoga = sessions.find((s) => s.id === 'sess_yoga_204');
  assert.equal(yoga?.status, 'cancelled_by_gym');

  // Go offline and re-read
  client.setOffline(true);
  const offlineSessions = await client.loadSchedule();
  const offlineYoga = offlineSessions.find((s) => s.id === 'sess_yoga_204');
  assert.equal(offlineYoga?.status, 'cancelled_by_gym');
});

test('B9.4: Offline checkin to gym-cancelled session is detected upon sync', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  client.setOffline(true);

  // Offline check-in
  await client.checkInSession('sess_yoga_204');

  // Re-connect and drain
  client.setOffline(false);
  const drainRes = await client.drainSyncQueue();
  assert.equal(drainRes.rejected, 1);
  assert.equal(client.ui.state.isDismissibleBannerVisible, true);
});

test('B9.5: Rejected items are excluded from active pending sync count', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  await client.db.enqueue({
    entity_type: 'attendance',
    action: 'create',
    endpoint: '/member/attendance',
    method: 'POST',
    payload: { session_id: 'sess_yoga_204' },
  });

  await client.drainSyncQueue();

  const status = await client.sync.getStatus();
  assert.equal(status.pending_count, 0);
  assert.equal(status.rejected_count, 1);
});
