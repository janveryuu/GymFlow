import test from 'node:test';
import assert from 'node:assert/strict';
import { UIDriver } from '../harness/ui-driver.ts';

test('B12.1: Goal = 7, completed = 0 -> progress = 0%, strokeDashoffset = circumference', () => {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const geom = UIDriver.calculateRingGeometry(0, radius);

  assert.equal(Math.round(geom.strokeDashoffset), Math.round(circumference));
});

test('B12.2: Goal = 4, completed = 4 -> progress = 100%, strokeDashoffset = 0', () => {
  const geom = UIDriver.calculateRingGeometry(100, 40);
  assert.equal(Math.round(geom.strokeDashoffset), 0);
});

test('B12.3: Goal = 3, completed = 5 (166%) -> clamped at 100%, strokeDashoffset = 0', () => {
  const geom = UIDriver.calculateRingGeometry(166, 40);
  assert.equal(Math.round(geom.strokeDashoffset), 0);
});

test('B12.4: Goal = 1 (minimum allowed goal) handles single completion gracefully', () => {
  const geom = UIDriver.calculateRingGeometry(100, 40);
  assert.equal(Math.round(geom.strokeDashoffset), 0);
});

test('B12.5: Goal = 7 (maximum allowed goal) with 3 completions (43%) computes accurate ratio', () => {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const geom = UIDriver.calculateRingGeometry(43, radius);

  const expectedOffset = circumference - (43 / 100) * circumference;
  assert.equal(Math.round(geom.strokeDashoffset), Math.round(expectedOffset));
});
