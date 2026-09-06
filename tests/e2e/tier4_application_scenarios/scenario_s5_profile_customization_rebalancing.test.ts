import test from 'node:test';
import assert from 'node:assert/strict';
import { GymFlowAppClient } from '../harness/app-client.ts';
import { UIDriver } from '../harness/ui-driver.ts';

test('Scenario S5: Member Profile Customization & Schedule Rebalancing (F15, F16, F19, F12, F23)', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  // ── Step 1: Navigate to Profile and inspect membership tier ──
  client.ui.navigate('ProfileScreen');
  assert.equal(client.ui.state.currentRoute, 'ProfileScreen');
  assert.equal(client.server.profile.membership.tier, 'Black Diamond All-Access');
  assert.equal(client.server.profile.membership.status, 'active');

  // ── Step 2: Update Contact Phone and Avatar Photo URL with Haptics ──
  const updateProfileRes = await client.updateProfile({
    phone: '+1 (555) 777-8888',
    photo_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2',
  });
  assert.equal(updateProfileRes.success, true);
  assert.equal(client.server.profile.phone, '+1 (555) 777-8888');
  assert.ok(client.ui.state.hapticEvents.includes('impact_medium'));

  // ── Step 3: Rebalance Workout Preferences (goal: 5 days, intensity: high) ──
  const updatePrefRes = await client.updatePreferences({
    workout_type: 'hiit',
    intensity: 'high',
    weekly_workout_goal: 5,
  });
  assert.equal(updatePrefRes.success, true);
  assert.equal(client.server.preferences.weekly_workout_goal, 5);
  assert.equal(client.server.preferences.workout_type, 'hiit');

  // ── Step 4: Navigate to Schedule and Cancel Conflicting Session ──
  client.ui.navigate('ScheduleScreen');
  const sessions = await client.loadSchedule();
  const sessionToCancel = sessions.find((s) => s.can_cancel && s.status === 'upcoming');
  assert.ok(sessionToCancel);

  const cancelRes = await client.cancelSession(sessionToCancel!.id, 'Work rebalancing conflict');
  assert.equal(cancelRes.success, true);
  assert.equal(cancelRes.status, 200);

  // Verified session status updated to cancelled_by_member
  const updatedSessions = await client.db.getCachedSessions();
  const cancelledSession = updatedSessions.find((s) => s.id === sessionToCancel!.id);
  assert.equal(cancelledSession?.status, 'cancelled_by_member');
  assert.equal(cancelledSession?.can_cancel, false);

  // ── Step 5: Return to Dashboard & Verify Activity Ring Recalculation ──
  client.ui.navigate('DashboardScreen');
  const dashboard = await client.loadDashboard();
  assert.equal(client.server.preferences.weekly_workout_goal, 5);

  const ring = UIDriver.calculateRingGeometry(dashboard.weeklyProgressPercent, 40);
  assert.equal(ring.strokeColor, '#C8FF3D');

  // Scope discipline audit confirms zero leakage across all navigated screens
  const audit = client.ui.verifyScopeDiscipline();
  assert.equal(audit.passed, true);
  assert.equal(audit.violations.length, 0);
});
