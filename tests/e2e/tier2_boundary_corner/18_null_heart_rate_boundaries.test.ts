import test from 'node:test';
import assert from 'node:assert/strict';
import { UIDriver } from '../harness/ui-driver.ts';

test('B18.1: Payload with explicit null heart rate yields "—"', () => {
  const result = UIDriver.formatHeartRate(null);
  assert.equal(result, '—');
});

test('B18.2: Payload with omitted / undefined heart rate yields "—"', () => {
  const result = UIDriver.formatHeartRate(undefined);
  assert.equal(result, '—');
});

test('B18.3: Floating point heart rate (145.7 bpm) rounds cleanly to integer "146 bpm"', () => {
  const result = UIDriver.formatHeartRate(145.7);
  assert.equal(result, '146 bpm');
});

test('B18.4: Low boundary heart rate (45 bpm resting) formats with bpm suffix', () => {
  const result = UIDriver.formatHeartRate(45);
  assert.equal(result, '45 bpm');
});

test('B18.5: High boundary heart rate (210 bpm max exertion) formats with bpm suffix', () => {
  const result = UIDriver.formatHeartRate(210);
  assert.equal(result, '210 bpm');
});
