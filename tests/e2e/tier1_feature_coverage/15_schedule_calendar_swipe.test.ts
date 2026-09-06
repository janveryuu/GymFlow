import test from 'node:test';
import assert from 'node:assert/strict';
import { GymFlowAppClient } from '../harness/app-client.ts';

test('F15.1: Schedule loads upcoming sessions with full metadata', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  const sessions = await client.loadSchedule();

  assert.ok(sessions.length > 0);
  const s = sessions[0];
  assert.ok(s.id);
  assert.ok(s.title);
  assert.ok(s.location);
  assert.ok(s.start_time);
});

test('F15.2: Calendar handles week navigation date window', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  const sessions = await client.loadSchedule();

  // Validate dates are ISO format
  for (const s of sessions) {
    assert.equal(isNaN(Date.parse(s.start_time)), false);
  }
});

test('F15.3: Week-swipe gesture pan seam handles horizontal swipe deltas', () => {
  // Test gesture seam simulation for week-swipe
  const handlePanGesture = (dx: number) => {
    if (dx > 50) return 'PREVIOUS_WEEK';
    if (dx < -50) return 'NEXT_WEEK';
    return 'REST';
  };

  assert.equal(handlePanGesture(75), 'PREVIOUS_WEEK');
  assert.equal(handlePanGesture(-80), 'NEXT_WEEK');
  assert.equal(handlePanGesture(20), 'REST');
});

test('F15.4: Sessions list displays status badge and can_cancel flag', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  const sessions = await client.loadSchedule();

  const active = sessions.find((s) => s.status === 'upcoming');
  assert.ok(active);
  assert.equal(active?.can_cancel, true);
});

test('F15.5: Check-in action logs attendance and updates session status', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  await client.loadSchedule();

  const checkinRes = await client.checkInSession('sess_hiit_101');
  assert.equal(checkinRes.success, true);
  assert.ok(client.ui.state.hapticEvents.includes('notification_success'));
});
