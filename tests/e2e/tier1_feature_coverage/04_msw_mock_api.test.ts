import test from 'node:test';
import assert from 'node:assert/strict';
import { MockServer } from '../harness/mock-server.ts';

test('F4.1: Mock API layer supports configured latency profile (300-800ms)', async () => {
  const server = new MockServer();
  assert.equal(server.simulatedLatencyMin, 300);
  assert.equal(server.simulatedLatencyMax, 800);
});

test('F4.2: Handlers return exact HTTP status codes for valid and invalid queries', async () => {
  const server = new MockServer();
  const token = '1|abc123def456ghi789jkl012mno345pqr678stu901vwx234yz';

  // Valid workouts call -> 200
  const wRes = await server.request('GET', '/member/workouts', null, {
    Authorization: `Bearer ${token}`,
  });
  assert.equal(wRes.status, 200);

  // Missing token -> 401
  const unauthRes = await server.request('GET', '/member/workouts');
  assert.equal(unauthRes.status, 401);

  // Missing workout -> 404
  const notFound = await server.request('GET', '/member/workouts/non_existent_id', null, {
    Authorization: `Bearer ${token}`,
  });
  assert.equal(notFound.status, 404);
});

test('F4.3: Simulated network timeout triggers timeout rejection', async () => {
  const server = new MockServer();
  server.setTimeout('/member/workouts');
  await assert.rejects(
    async () => {
      await server.request('GET', '/member/workouts');
    },
    /Gateway Timeout/
  );
});

test('F4.4: In-memory state persists mutations across calls', async () => {
  const server = new MockServer();
  const token = '1|abc123def456ghi789jkl012mno345pqr678stu901vwx234yz';

  const patchRes = await server.request(
    'PATCH',
    '/member/profile',
    { phone: '+1 (555) 999-0000' },
    { Authorization: `Bearer ${token}` }
  );
  assert.equal(patchRes.status, 200);
  assert.equal(server.profile.phone, '+1 (555) 999-0000');
});

test('F4.5: Reset restores initial seed state fixtures', async () => {
  const server = new MockServer();
  server.profile.must_change_password = true;
  server.reset();
  assert.equal(server.profile.must_change_password, false);
});
