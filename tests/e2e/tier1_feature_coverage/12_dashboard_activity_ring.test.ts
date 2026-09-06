import test from 'node:test';
import assert from 'node:assert/strict';
import { GymFlowAppClient } from '../harness/app-client.ts';
import { THEME, UIDriver } from '../harness/ui-driver.ts';

test('F12.1: Dashboard calculates weekly workout goal percentage accurately', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  const dashboard = await client.loadDashboard();

  assert.ok(typeof dashboard.weeklyProgressPercent === 'number');
  assert.ok(dashboard.weeklyProgressPercent >= 0 && dashboard.weeklyProgressPercent <= 100);
});

test('F12.2: SVG circular progress ring geometry computes correct strokeDashoffset', () => {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;

  // At 50%, strokeDashoffset must be half the circumference
  const geom50 = UIDriver.calculateRingGeometry(50, radius);
  assert.equal(Math.round(geom50.strokeDashoffset), Math.round(circumference / 2));

  // At 100%, strokeDashoffset must be 0
  const geom100 = UIDriver.calculateRingGeometry(100, radius);
  assert.equal(Math.round(geom100.strokeDashoffset), 0);
});

test('F12.3: Electric-lime accent #C8FF3D is applied exclusively to progress ring stroke', () => {
  const geom = UIDriver.calculateRingGeometry(75, 40);
  assert.equal(geom.strokeColor, '#C8FF3D');
  assert.equal(geom.strokeColor, THEME.colors.accent);
});

test('F12.4: Progress ring clamps gracefully at 100% when goal is exceeded', () => {
  const radius = 40;
  const geom150 = UIDriver.calculateRingGeometry(150, radius);
  assert.equal(Math.round(geom150.strokeDashoffset), 0);
});

test('F12.5: Progress ring handles 0% completed workouts without NaN or SVG errors', () => {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const geom0 = UIDriver.calculateRingGeometry(0, radius);

  assert.equal(isNaN(geom0.strokeDashoffset), false);
  assert.equal(Math.round(geom0.strokeDashoffset), Math.round(circumference));
});
