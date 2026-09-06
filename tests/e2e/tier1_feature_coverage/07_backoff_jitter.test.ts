import test from 'node:test';
import assert from 'node:assert/strict';
import { SyncEngine } from '../harness/sync-engine.ts';

test('F7.1: Retry 0 delay starts with base 2000ms and stays within ±20% jitter [1600ms, 2400ms]', () => {
  for (let i = 0; i < 20; i++) {
    const delay = SyncEngine.calculateBackoffDelay(0);
    assert.ok(delay >= 1600, `Delay ${delay} should be >= 1600ms`);
    assert.ok(delay <= 2400, `Delay ${delay} should be <= 2400ms`);
  }
});

test('F7.2: Backoff delay doubles exponentially for retry counts 1, 2, 3', () => {
  const delay0 = SyncEngine.calculateBackoffDelay(0, 0.5); // base 2000 * 1.0 = 2000
  const delay1 = SyncEngine.calculateBackoffDelay(1, 0.5); // base 4000 * 1.0 = 4000
  const delay2 = SyncEngine.calculateBackoffDelay(2, 0.5); // base 8000 * 1.0 = 8000
  const delay3 = SyncEngine.calculateBackoffDelay(3, 0.5); // base 16000 * 1.0 = 16000

  assert.equal(delay0, 2000);
  assert.equal(delay1, 4000);
  assert.equal(delay2, 8000);
  assert.equal(delay3, 16000);
});

test('F7.3: Backoff delay is capped at 5 minutes (300,000ms) for high retry counts (≥8)', () => {
  const delay8 = SyncEngine.calculateBackoffDelay(8, 0.5);
  const delay12 = SyncEngine.calculateBackoffDelay(12, 0.5);
  const delay20 = SyncEngine.calculateBackoffDelay(20, 0.5);

  assert.equal(delay8, 300000);
  assert.equal(delay12, 300000);
  assert.equal(delay20, 300000);
});

test('F7.4: Jitter bounds strictly adhere to ±20% limit across 100 sample trials', () => {
  for (let i = 0; i < 100; i++) {
    const retry = Math.floor(Math.random() * 5);
    const base = Math.min(300000, 2000 * Math.pow(2, retry));
    const delay = SyncEngine.calculateBackoffDelay(retry);
    const ratio = delay / base;
    assert.ok(ratio >= 0.799 && ratio <= 1.201, `Ratio ${ratio} out of ±20% bounds for retry ${retry}`);
  }
});

test('F7.5: Minimum jitter (random=0) gives 0.8x base; maximum jitter (random=1) gives 1.2x base', () => {
  const minDelay = SyncEngine.calculateBackoffDelay(0, 0);
  const maxDelay = SyncEngine.calculateBackoffDelay(0, 1);
  assert.equal(minDelay, 1600); // 2000 * (1 - 0.2) = 1600
  assert.equal(maxDelay, 2400); // 2000 * (1 + 0.2) = 2400
});
