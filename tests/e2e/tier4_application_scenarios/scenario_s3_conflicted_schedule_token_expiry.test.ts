import test from 'node:test';
import assert from 'node:assert/strict';
import { GymFlowAppClient } from '../harness/app-client.ts';

test('Scenario S3: Conflicted Schedule & Token Expiry Recovery (F8, F9, F10, F16, F20, F22)', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  await client.loadSchedule();

  // ── Step 1: Device goes offline; member attempts check-in to gym-cancelled session ──
  client.setOffline(true);

  // sess_yoga_204 is cancelled by gym on server
  const offlineCheckin = await client.checkInSession('sess_yoga_204');
  assert.ok(offlineCheckin.queueId);

  // ── Step 2: Write queue holds a stale item older than 7 days -> amber indicator ──
  const staleDate = new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString();
  await client.db.enqueue({
    entity_type: 'progress',
    action: 'create',
    endpoint: '/member/progress',
    method: 'POST',
    payload: { workout_id: 'wk_leg_01', duration_seconds: 2000, calories_burned: 300 },
    created_at: staleDate,
  });

  const statusWithAmber = await client.sync.getStatus();
  assert.equal(statusWithAmber.has_7day_warning, true);
  assert.equal(statusWithAmber.pending_count, 2);

  // ── Step 3: Device reconnects online but token has expired (401) -> Queue pauses ──
  client.setOffline(false);
  client.authToken = 'expired_bearer_token';
  client.sync.activeToken = 'expired_bearer_token';

  const drain401 = await client.drainSyncQueue();
  assert.equal(drain401.paused, true);
  assert.equal(client.sync.state, 'paused');

  // No items dropped!
  const queueDuringPause = await client.db.getQueueItems();
  assert.equal(queueDuringPause.length, 2);

  // ── Step 4: Re-authenticate via LoginScreen -> Resumes sync queue ──
  const reauth = await client.login({
    email: 'member@gymflow.test',
    password: 'TempPass!23',
  });
  assert.equal(reauth.success, true);
  assert.equal(client.sync.state, 'idle');

  // ── Step 5: Resume queue: 409 conflict handled; stale progress drained; amber clears ──
  const drainResumed = await client.drainSyncQueue();
  assert.equal(drainResumed.rejected, 1);  // sess_yoga_204 hit 409 Conflict
  assert.equal(drainResumed.processed, 1); // Stale progress succeeded

  // Conflict handling: dismissible banner shown
  assert.equal(client.ui.state.isDismissibleBannerVisible, true);
  assert.equal(client.ui.state.bannerText, 'Session was cancelled by the gym.');

  // Session updated in history
  const sessions = await client.db.getCachedSessions();
  const yogaSession = sessions.find((s) => s.id === 'sess_yoga_204');
  assert.equal(yogaSession?.status, 'cancelled_by_gym');

  // Stale item drained -> amber warning cleared
  const finalStatus = await client.sync.getStatus();
  assert.equal(finalStatus.has_7day_warning, false);
  assert.equal(finalStatus.rejected_count, 1); // Preserved in rejected state, not deleted
});
