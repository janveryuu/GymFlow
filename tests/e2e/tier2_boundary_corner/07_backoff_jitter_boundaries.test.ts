import test from 'node:test';
import assert from 'node:assert/strict';
import { SyncEngine } from '../harness/sync-engine.ts';

test('B7.1: Boundary test: retryCount = 0 gives base 2000ms exactly', () => {
  const delayNoJitter = SyncEngine.calculateBackoffDelay(0, 0.5); // jitter factor = 1.0
  assert.equal(delayNoJitter, 2000);
});

test('B7.2: Boundary test: retryCount = 7 gives base 256000ms (within 5m ceiling)', () => {
  const delay7 = SyncEngine.calculateBackoffDelay(7, 0.5); // 2000 * 2^7 = 256000
  assert.equal(delay7, 256000);
});

test('B7.3: Boundary test: retryCount = 8 reaches and caps at 300000ms (5 min ceiling)', () => {
  const delay8 = SyncEngine.calculateBackoffDelay(8, 0.5); // 2000 * 2^8 = 512000 -> capped at 300000
  assert.equal(delay8, 300000);
});

test('B7.4: Boundary test: retryCount = 100 stays strictly capped at 300000ms', () => {
  const delay100 = SyncEngine.calculateBackoffDelay(100, 0.5);
  assert.equal(delay100, 300000);
});

test('B7.5: Minimum jitter (random=0) is exactly 0.8x base; maximum jitter (random=1) is 1.2x base', () => {
  const minDelay = SyncEngine.calculateBackoffDelay(0, 0); // 2000 * (1 - 0.2) = 1600
  const maxDelay = SyncEngine.calculateBackoffDelay(0, 1); // 2000 * (1 + 0.2) = 2400
  assert.equal(minDelay, 1600);
  assert.equal(maxDelay, 2400);

  const minDelayCap = SyncEngine.calculateBackoffDelay(8, 0); // 300000 * 0.8 = 240000
  const maxDelayCap = SyncEngine.calculateBackoffDelay(8, 1); // 300000 * 1.2 = 360000
  assert.equal(minDelayCap, 240000);
  assert.equal(maxDelayCap, 360000);
});
