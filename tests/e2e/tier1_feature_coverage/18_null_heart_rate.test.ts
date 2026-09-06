import test from 'node:test';
import assert from 'node:assert/strict';
import { GymFlowAppClient } from '../harness/app-client.ts';
import { UIDriver } from '../harness/ui-driver.ts';

test('F18.1: API returning average_heart_rate: null renders strictly "—" in UI', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  const progress = await client.loadProgress('week');

  assert.equal(progress?.average_heart_rate, null);
  const formatted = UIDriver.formatHeartRate(progress?.average_heart_rate);
  assert.equal(formatted, '—');
});

test('F18.2: Individual progress entry with heart_rate: null renders "—"', () => {
  const formatted = UIDriver.formatHeartRate(null);
  assert.equal(formatted, '—');
});

test('F18.3: Undefined heart rate input renders strictly "—"', () => {
  const formatted = UIDriver.formatHeartRate(undefined);
  assert.equal(formatted, '—');
});

test('F18.4: Prohibited from fabricating simulated heart rates (e.g. 142 bpm) on null data', () => {
  const formatted = UIDriver.formatHeartRate(null);
  assert.notEqual(formatted, '142 bpm');
  assert.notEqual(formatted, '120 bpm');
  assert.notEqual(formatted, '0 bpm');
  assert.equal(formatted, '—');
});

test('F18.5: Valid positive numeric heart rate formats correctly with bpm suffix', () => {
  const formatted = UIDriver.formatHeartRate(135);
  assert.equal(formatted, '135 bpm');
});
