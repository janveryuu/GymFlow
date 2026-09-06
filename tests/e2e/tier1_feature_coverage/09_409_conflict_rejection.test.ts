import test from 'node:test';
import assert from 'node:assert/strict';
import { GymFlowAppClient } from '../harness/app-client.ts';

test('F9.1: Queue item encountering HTTP 409 is marked rejected instead of deleted', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  // sess_yoga_204 is cancelled by gym on server -> triggers 409
  const item = await client.db.enqueue({
    entity_type: 'attendance',
    action: 'create',
    endpoint: '/member/attendance',
    method: 'POST',
    payload: { session_id: 'sess_yoga_204' },
  });

  const drainRes = await client.drainSyncQueue();
  assert.equal(drainRes.rejected, 1);

  const remaining = await client.db.getQueueItems();
  assert.equal(remaining.length, 1); // Not deleted!
  assert.equal(remaining[0].status, 'rejected');
  assert.equal(remaining[0].rejected_reason, 'session_cancelled_by_gym');
});

test('F9.2: 409 Conflict surfaces a dismissible warning banner in the UI', async () => {
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
  assert.equal(client.ui.state.bannerText, 'Session was cancelled by the gym.');
});

test('F9.3: Local Session record status is updated to cancelled_by_gym', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  await client.loadSchedule();

  await client.db.enqueue({
    entity_type: 'attendance',
    action: 'create',
    endpoint: '/member/attendance',
    method: 'POST',
    payload: { session_id: 'sess_yoga_204' },
  });

  await client.drainSyncQueue();

  const sessions = await client.db.getCachedSessions();
  const session = sessions.find((s) => s.id === 'sess_yoga_204');
  assert.equal(session?.status, 'cancelled_by_gym');
  assert.equal(session?.can_cancel, false);
});

test('F9.4: Session history label renders "Cancelled by gym"', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  await client.loadSchedule();

  const sessions = await client.db.getCachedSessions();
  const gymCancelled = sessions.find((s) => s.status === 'cancelled_by_gym');
  assert.ok(gymCancelled);
  assert.equal(gymCancelled.status, 'cancelled_by_gym');
});

test('F9.5: Dismissing the banner clears UI banner while preserving rejected queue record', async () => {
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

  // User dismisses banner
  client.ui.dismissBanner();
  client.sync.dismissBanner();

  assert.equal(client.ui.state.isDismissibleBannerVisible, false);
  assert.equal(client.ui.state.bannerText, undefined);

  // Rejected record remains intact in SQLite
  const rejected = await client.db.getQueueItems('rejected');
  assert.equal(rejected.length, 1);
});
