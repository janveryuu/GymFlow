import test from 'node:test';
import assert from 'node:assert/strict';
import { MockServer } from '../harness/mock-server.ts';

test('B4.1: 401 Unauthorized returns correct JSON payload shape { message: "Unauthenticated." }', async () => {
  const server = new MockServer();
  const res = await server.request('GET', '/member/profile', null, {
    Authorization: 'Bearer invalid_or_expired_token',
  });
  assert.equal(res.status, 401);
  assert.equal(res.data.message, 'Unauthenticated.');
});

test('B4.2: 404 Not Found returns clean JSON message without throwing unexpected errors', async () => {
  const server = new MockServer();
  const token = '1|abc123def456ghi789jkl012mno345pqr678stu901vwx234yz';
  const res = await server.request('GET', '/member/workouts/invalid_uuid_9999', null, {
    Authorization: `Bearer ${token}`,
  });
  assert.equal(res.status, 404);
  assert.equal(res.data.message, 'Workout not found');
});

test('B4.3: 500 Internal Server Error simulation handled cleanly by caller', async () => {
  const server = new MockServer();
  server.setForcedError('/member/workouts', 500, { message: 'Database connection failed' });

  const token = '1|abc123def456ghi789jkl012mno345pqr678stu901vwx234yz';
  const res = await server.request('GET', '/member/workouts', null, {
    Authorization: `Bearer ${token}`,
  });
  assert.equal(res.status, 500);
  assert.equal(res.data.message, 'Database connection failed');
});

test('B4.4: Network timeout simulator rejects promise with Gateway Timeout', async () => {
  const server = new MockServer();
  server.setTimeout('/member/profile');

  await assert.rejects(async () => {
    await server.request('GET', '/member/profile');
  }, /Gateway Timeout/);
});

test('B4.5: Query parameters with special URI encoding handled properly', async () => {
  const server = new MockServer();
  const token = '1|abc123def456ghi789jkl012mno345pqr678stu901vwx234yz';

  const res = await server.request('GET', '/member/workouts?category=full-body&difficulty=intermediate', null, {
    Authorization: `Bearer ${token}`,
  });
  assert.equal(res.status, 200);
  assert.ok(res.data.length > 0);
});
