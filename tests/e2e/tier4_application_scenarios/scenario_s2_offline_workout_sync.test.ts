import test from 'node:test';
import assert from 'node:assert/strict';
import { GymFlowAppClient, CATEGORY_ART_FALLBACKS } from '../harness/app-client.ts';

test('Scenario S2: Full Offline Workout & Sync Recovery Cycle (F4, F5, F6, F7, F11, F20, F21)', async () => {
  const client = new GymFlowAppClient();

  // ── Step 1: Online session caches catalog and schedule ──
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  const onlineWorkouts = await client.loadCatalog();
  const onlineSessions = await client.loadSchedule();
  assert.ok(onlineWorkouts.length > 0);
  assert.ok(onlineSessions.length > 0);

  // ── Step 2: Device enters gym basement with zero network (offline) ──
  client.setOffline(true);
  assert.equal(client.sync.state, 'offline');

  // Workouts and schedule remain available offline from SQLite
  const offlineCatalog = await client.loadCatalog();
  assert.equal(offlineCatalog.length, onlineWorkouts.length);

  // ── Step 3: View workout detail offline -> category fallback art rendered ──
  const detail = await client.getWorkoutDetail('wk_chest_01');
  assert.ok(detail.workout);
  assert.equal(detail.isOfflineFallback, true);
  assert.equal(detail.resolvedImage, CATEGORY_ART_FALLBACKS.chest);

  // ── Step 4: Complete workout & check-in offline -> queued in priority queue ──
  const progressRes = await client.completeWorkout({
    workout_id: 'wk_chest_01',
    duration_seconds: 3000,
    calories_burned: 480,
    idempotency_key: 'offline_cycle_p1',
  });
  assert.ok(progressRes.queueId);

  const checkinRes = await client.checkInSession('sess_hiit_101');
  assert.ok(checkinRes.queueId);

  // Queue holds 2 pending items
  const statusOffline = await client.sync.getStatus();
  assert.equal(statusOffline.pending_count, 2);

  // Optimistic local history is updated immediately
  const localHistory = await client.db.getCachedProgressEntries();
  assert.ok(localHistory.some((p) => p.idempotency_key === 'offline_cycle_p1'));

  // ── Step 5: Device re-emerges online -> sync engine drains in strict priority ──
  client.setOffline(false);
  const drainRes = await client.drainSyncQueue();

  assert.equal(drainRes.processed, 2);
  assert.equal(drainRes.failed, 0);

  // Attendance MUST be sent before progress
  assert.equal(client.sync.processedOrder[0], checkinRes.queueId);
  assert.equal(client.sync.processedOrder[1], progressRes.queueId);

  // Final sync status: idle with 0 pending items
  const finalStatus = await client.sync.getStatus();
  assert.equal(finalStatus.state, 'idle');
  assert.equal(finalStatus.pending_count, 0);
});
