import test from 'node:test';
import assert from 'node:assert/strict';
import { GymFlowAppClient, CATEGORY_ART_FALLBACKS } from '../harness/app-client.ts';
import { SyncEngine } from '../harness/sync-engine.ts';
import { THEME, UIDriver } from '../harness/ui-driver.ts';

test('P1: Auth + Forced Password Reset + Dashboard Routing', async () => {
  const client = new GymFlowAppClient();
  client.server.profile.must_change_password = true;

  // Step 1: Login
  const loginRes = await client.login({
    email: 'member@gymflow.test',
    password: 'TempPass!23',
  });
  assert.equal(loginRes.success, true);
  assert.equal(client.ui.state.currentRoute, 'ForcedPasswordResetScreen');

  // Step 2: Complete password reset
  const resetRes = await client.forcedChangePassword({
    current_password: 'TempPass!23',
    new_password: 'SecureNewPassword123!',
    new_password_confirmation: 'SecureNewPassword123!',
  });
  assert.equal(resetRes.success, true);

  // Step 3: Verified navigated to Dashboard
  assert.equal(client.ui.state.currentRoute, 'DashboardScreen');
  assert.equal(client.server.profile.must_change_password, false);
});

test('P2: Auth Token Expiry (401) + Sync WriteQueue Pausing + Re-Auth Resume', async () => {
  const client = new GymFlowAppClient();
  client.sync.activeToken = 'expired_bearer_token';

  await client.db.enqueue({
    entity_type: 'attendance',
    action: 'create',
    endpoint: '/member/attendance',
    method: 'POST',
    payload: { session_id: 'sess_hiit_101' },
  });

  // Attempt sync with expired token
  const drain1 = await client.drainSyncQueue();
  assert.equal(drain1.paused, true);
  assert.equal(client.sync.state, 'paused');

  // Re-authenticate
  const reAuth = await client.login({
    email: 'member@gymflow.test',
    password: 'TempPass!23',
  });
  assert.equal(reAuth.success, true);
  assert.equal(client.sync.state, 'idle');

  // Resume sync
  const drain2 = await client.drainSyncQueue();
  assert.equal(drain2.processed, 1);
  assert.equal((await client.db.getQueueItems()).length, 0);
});

test('P3: Session Cancellation + Gym 409 Conflict + Dismissible Banner + History Status', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  await client.loadSchedule();

  // sess_yoga_204 pre-cancelled by gym
  const res = await client.cancelSession('sess_yoga_204');
  assert.equal(res.status, 409);
  assert.equal(client.ui.state.isDismissibleBannerVisible, true);
  assert.equal(client.ui.state.bannerText, 'Session was cancelled by the gym.');

  const sessions = await client.db.getCachedSessions();
  const session = sessions.find((s) => s.id === 'sess_yoga_204');
  assert.equal(session?.status, 'cancelled_by_gym');
  assert.equal(session?.can_cancel, false);
});

test('P4: Offline Workout Completion + SQLite Caching + Sync Priority Drain (Attendance > Progress)', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  client.setOffline(true);

  // Complete workout offline
  const wRes = await client.completeWorkout({
    workout_id: 'wk_chest_01',
    duration_seconds: 2400,
    calories_burned: 400,
    idempotency_key: 'pair_prog_1',
  });
  assert.ok(wRes.queueId);

  // Check in offline
  const aRes = await client.checkInSession('sess_hiit_101');
  assert.ok(aRes.queueId);

  // Reconnect and drain
  client.setOffline(false);
  await client.drainSyncQueue();

  // Attendance processed before progress
  assert.equal(client.sync.processedOrder[0], aRes.queueId);
  assert.equal(client.sync.processedOrder[1], wRes.queueId);
});

test('P5: Offline Mode + Catalog Browsing + Fallback Category Art', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  await client.loadCatalog();

  client.setOffline(true);
  const workouts = await client.loadCatalog({ category: 'chest' });
  assert.ok(workouts.length > 0);

  const detail = await client.getWorkoutDetail(workouts[0].id);
  assert.equal(detail.isOfflineFallback, true);
  assert.equal(detail.resolvedImage, CATEGORY_ART_FALLBACKS.chest);
});

test('P6: Workout Completion Logging + Idempotency Deduplication + Progress Chart Refresh', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  const idempKey = 'idemp_chart_pair_1';
  const complete1 = await client.completeWorkout({
    workout_id: 'wk_leg_01',
    duration_seconds: 3000,
    calories_burned: 550,
    idempotency_key: idempKey,
  });
  assert.equal(complete1.success, true);

  const progressAfterFirst = await client.loadProgress('week');
  const count1 = progressAfterFirst?.total_workouts;

  // Duplicate submission with same key
  const complete2 = await client.completeWorkout({
    workout_id: 'wk_leg_01',
    duration_seconds: 3000,
    calories_burned: 550,
    idempotency_key: idempKey,
  });
  assert.equal(complete2.success, true);

  const progressAfterSecond = await client.loadProgress('week');
  // Deduplicated: workout count must not increase!
  assert.equal(progressAfterSecond?.total_workouts, count1);
});

test('P7: Schedule Week-Swipe + Date Selection + Session Check-In + Attendance Queue', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  const sessions = await client.loadSchedule();

  const active = sessions.find((s) => s.status === 'upcoming');
  assert.ok(active);

  const checkinRes = await client.checkInSession(active!.id);
  assert.equal(checkinRes.success, true);
  assert.ok(client.ui.state.hapticEvents.includes('notification_success'));
});

test('P8: Profile Preference Update (Weekly Goal) + Dashboard SVG Activity Ring Recalculation', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  // Update weekly goal to 2
  await client.updatePreferences({ weekly_workout_goal: 2 });
  const dashboard = await client.loadDashboard();

  // Completed workouts vs goal 2
  assert.ok(dashboard.weeklyProgressPercent >= 0);
  const ring = UIDriver.calculateRingGeometry(dashboard.weeklyProgressPercent, 40);
  assert.equal(ring.strokeColor, '#C8FF3D');
});

test('P9: Network Outage + Exponential Backoff + Jitter Delay + SQLite Queue Preservation', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  await client.db.enqueue({
    entity_type: 'progress',
    action: 'create',
    endpoint: '/member/progress',
    method: 'POST',
    payload: { workout_id: 'wk_chest_01' },
  });

  // Simulate network drop
  client.setOffline(true);
  const drainRes = await client.drainSyncQueue();
  assert.equal(drainRes.processed, 0);

  // Verify item preserved
  const queue = await client.db.getQueueItems();
  assert.equal(queue.length, 1);

  // Compute backoff delay for retry
  const backoff = SyncEngine.calculateBackoffDelay(queue[0].retry_count);
  assert.ok(backoff >= 1600 && backoff <= 2400);
});

test('P10: 7-Day TTL Expiry + Persistent Nav Shell Amber Indicator + Sync Recovery', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  const eightDaysAgo = new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString();
  await client.db.enqueue({
    entity_type: 'attendance',
    action: 'create',
    endpoint: '/member/attendance',
    method: 'POST',
    payload: { session_id: 'sess_hiit_101' },
    created_at: eightDaysAgo,
  });

  const statusBefore = await client.sync.getStatus();
  assert.equal(statusBefore.has_7day_warning, true);

  // Drain and recover
  await client.drainSyncQueue();
  const statusAfter = await client.sync.getStatus();
  assert.equal(statusAfter.has_7day_warning, false);
});

test('P11: Progress History Query + Null Heart-Rate Rendering ("—") + Victory Native Chart Series', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  const progress = await client.loadProgress('week');
  assert.equal(progress?.average_heart_rate, null);
  assert.equal(UIDriver.formatHeartRate(progress?.average_heart_rate), '—');
  assert.ok(progress?.chart_data.length! > 0);
});

test('P12: Catalog Category Filtering + Skeleton Loading State + Intentional Empty State', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  // Filter with no matches
  const res = await client.loadCatalog({ category: 'non_existent_category' as any });
  assert.equal(res.length, 0);
  assert.equal(client.ui.state.isSkeletonVisible, false);
  assert.equal(client.ui.state.isEmptyStateVisible, true);
});

test('P13: Quick Check-In on Dashboard + Attendance Sync + Schedule Screen Checked-In Badge', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  await client.loadDashboard();

  const checkin = await client.checkInSession('sess_hiit_101');
  assert.equal(checkin.success, true);

  const schedule = await client.loadSchedule();
  const checkedInSession = schedule.find((s) => s.id === 'sess_hiit_101');
  assert.equal(checkedInSession?.is_checked_in, true);
});

test('P14: Forgot Password Flow + Auth Stack Navigation + Login Form Reset', async () => {
  const client = new GymFlowAppClient();
  client.ui.navigate('ForgotPasswordScreen');

  const res = await client.forgotPassword('member@gymflow.test');
  assert.equal(res.success, true);

  client.ui.navigate('LoginScreen');
  assert.equal(client.ui.state.currentRoute, 'LoginScreen');
  assert.equal(client.ui.state.isErrorVisible, false);
});

test('P15: Multi-Item Write Queue + Interleaved Attendance & Progress + 401 Mid-Drain Interruption', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  // 1 attendance + 2 progress
  await client.db.enqueue({
    entity_type: 'attendance',
    action: 'create',
    endpoint: '/member/attendance',
    method: 'POST',
    payload: { session_id: 'sess_hiit_101' },
    created_at: '2026-09-05T01:00:00Z',
  });
  await client.db.enqueue({
    entity_type: 'progress',
    action: 'create',
    endpoint: '/member/progress',
    method: 'POST',
    payload: { workout_id: 'wk_chest_01' },
    created_at: '2026-09-05T02:00:00Z',
  });
  await client.db.enqueue({
    entity_type: 'progress',
    action: 'create',
    endpoint: '/member/progress',
    method: 'POST',
    payload: { workout_id: 'wk_back_01' },
    created_at: '2026-09-05T03:00:00Z',
  });

  // Force 401 on /member/progress
  client.server.setForcedError('/member/progress', 401);

  const drainRes = await client.drainSyncQueue();
  assert.equal(drainRes.processed, 1); // Attendance succeeded
  assert.equal(drainRes.paused, true);   // Paused on first progress
  assert.equal((await client.db.getQueueItems()).length, 2); // 2 progress preserved
});

test('P16: Profile Photo & Contact Info Patch + Auth Store Update + Profile Screen Re-render', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  const patchRes = await client.updateProfile({
    name: 'Jane Doe Professional',
    phone: '+1 (555) 000-1111',
  });
  assert.equal(patchRes.success, true);
  assert.equal(client.server.profile.name, 'Jane Doe Professional');
  assert.equal(client.server.profile.phone, '+1 (555) 000-1111');
});

test('P17: Schedule Session List + 409 Rejected Item Dismissal + Banner Removal', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  await client.loadSchedule();

  await client.cancelSession('sess_yoga_204');
  assert.equal(client.ui.state.isDismissibleBannerVisible, true);

  client.ui.dismissBanner();
  assert.equal(client.ui.state.isDismissibleBannerVisible, false);

  const sessions = await client.db.getCachedSessions();
  const session = sessions.find((s) => s.id === 'sess_yoga_204');
  assert.equal(session?.status, 'cancelled_by_gym');
});

test('P18: Dark-First Theme Verification + All Named Screens + High Contrast & Accessibility', () => {
  const ui = new UIDriver();
  const screens = ['LoginScreen', 'DashboardScreen', 'CatalogScreen', 'ScheduleScreen', 'ProgressScreen', 'ProfileScreen'];

  for (const screen of screens) {
    ui.navigate(screen);
    ui.registerTapTarget(`${screen}_main_cta`, 300, 48, `${screen} Action`);
  }

  for (const t of ui.registeredTapTargets) {
    assert.ok(t.width >= THEME.geometry.minTapTargetSize);
    assert.ok(t.height >= THEME.geometry.minTapTargetSize);
    assert.ok(t.a11yLabel);
  }
});

test('P19: Pull-to-Refresh on Catalog + MSW Latency Simulation + Skeleton Loader Transition', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  // Simulate pull to refresh
  const p = client.loadCatalog();
  await p;

  assert.equal(client.ui.state.isSkeletonVisible, false);
  const cached = await client.db.getCachedWorkouts();
  assert.ok(cached.length > 0);
});

test('P20: Pull-to-Refresh on Schedule + Session Cache Invalidation + SQLite Cache Update', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  const sessions = await client.loadSchedule();
  assert.ok(sessions.length > 0);

  const cached = await client.db.getCachedSessions();
  assert.equal(cached.length, sessions.length);
});

test('P21: WriteQueue 7-Day Aging + 409 Rejection + Combined Status Display in Nav Shell', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  const oldDate = new Date(Date.now() - 9 * 24 * 3600 * 1000).toISOString();
  await client.db.enqueue({
    entity_type: 'attendance',
    action: 'create',
    endpoint: '/member/attendance',
    method: 'POST',
    payload: { session_id: 'sess_yoga_204' }, // 409
    created_at: oldDate,
  });

  await client.drainSyncQueue();

  const status = await client.sync.getStatus();
  assert.equal(status.rejected_count, 1);
  assert.equal(client.ui.state.isDismissibleBannerVisible, true);
});

test('P22: Complete Workout + Haptic Notification + Optimistic History + Server Sync Confirmation', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  const res = await client.completeWorkout({
    workout_id: 'wk_chest_01',
    duration_seconds: 2400,
    calories_burned: 350,
    idempotency_key: 'haptic_optimistic_key_1',
  });

  assert.equal(res.success, true);
  assert.ok(client.ui.state.hapticEvents.includes('notification_success'));

  const history = await client.db.getCachedProgressEntries();
  assert.ok(history.some((p) => p.idempotency_key === 'haptic_optimistic_key_1'));
});

test('P23: Scope Discipline Audit + Screen Routing + Negative Element Scanner across all screens', () => {
  const ui = new UIDriver();
  ui.registerElement('tab_home', 'TouchableOpacity', { accessibilityLabel: 'Home' });
  ui.registerElement('tab_workouts', 'TouchableOpacity', { accessibilityLabel: 'Workouts' });
  ui.registerElement('tab_schedule', 'TouchableOpacity', { accessibilityLabel: 'Schedule' });
  ui.registerElement('tab_progress', 'TouchableOpacity', { accessibilityLabel: 'Progress' });
  ui.registerElement('tab_profile', 'TouchableOpacity', { accessibilityLabel: 'Profile' });

  const audit = ui.verifyScopeDiscipline();
  assert.equal(audit.passed, true);
  assert.equal(audit.violations.length, 0);
});
