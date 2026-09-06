import test from 'node:test';
import assert from 'node:assert/strict';
import { GymFlowAppClient } from '../harness/app-client.ts';
import { UIDriver } from '../harness/ui-driver.ts';

test('Scenario S4: Daily Fitness Routine: Browse, Complete, Track (F12, F13, F14, F17, F18, F6)', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  // ── Step 1: Dashboard review of weekly goal & progress ──
  const dashboard = await client.loadDashboard();
  assert.ok(typeof dashboard.weeklyProgressPercent === 'number');

  // Ring geometry
  const ring = UIDriver.calculateRingGeometry(dashboard.weeklyProgressPercent, 40);
  assert.equal(ring.strokeColor, '#C8FF3D');

  // ── Step 2: Browse Catalog & Apply Filters ──
  client.ui.navigate('CatalogScreen');
  const backWorkouts = await client.loadCatalog({ category: 'back', difficulty: 'advanced' });
  assert.ok(backWorkouts.length > 0);
  const selectedWorkout = backWorkouts.find((w) => w.id === 'wk_back_01');
  assert.ok(selectedWorkout);

  // ── Step 3: Complete Workout with Haptics and Idempotency Key ──
  client.ui.navigate('WorkoutDetailScreen');
  const idempKey = `daily_workout_${Date.now()}`;

  const completeRes = await client.completeWorkout({
    workout_id: selectedWorkout!.id,
    duration_seconds: 3600,
    calories_burned: 620,
    idempotency_key: idempKey,
    heart_rate: null, // Null heart rate per specification
  });

  assert.equal(completeRes.success, true);
  assert.ok(client.ui.state.hapticEvents.includes('notification_success'));

  // ── Step 4: Progress Screen Tracking & Analytics ──
  client.ui.navigate('ProgressScreen');
  const progress = await client.loadProgress('week');

  assert.ok(progress);
  assert.ok(progress?.total_calories! >= 620);
  assert.ok(progress?.total_duration_seconds! >= 3600);
  assert.ok(progress?.chart_data.length! > 0);

  // ── Step 5: Null Heart Rate Formats Strictly as "—" ──
  assert.equal(progress?.average_heart_rate, null);
  const heartRateDisplay = UIDriver.formatHeartRate(progress?.average_heart_rate);
  assert.equal(heartRateDisplay, '—');
  assert.notEqual(heartRateDisplay, '140 bpm');
});
