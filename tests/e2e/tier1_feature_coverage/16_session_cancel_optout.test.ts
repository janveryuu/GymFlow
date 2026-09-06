import test from 'node:test';
import assert from 'node:assert/strict';
import { GymFlowAppClient } from '../harness/app-client.ts';

test('F16.1: Member can cancel upcoming scheduled session with reason', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  await client.loadSchedule();

  const cancelRes = await client.cancelSession('sess_hiit_101', 'Schedule conflict');
  assert.equal(cancelRes.success, true);
  assert.equal(cancelRes.status, 200);
});

test('F16.2: Successful cancellation updates session status to cancelled_by_member', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  await client.loadSchedule();

  await client.cancelSession('sess_hiit_101', 'Doctor appointment');
  const sessions = await client.db.getCachedSessions();
  const session = sessions.find((s) => s.id === 'sess_hiit_101');

  assert.equal(session?.status, 'cancelled_by_member');
});

test('F16.3: Cancelled session disables further cancellation actions (can_cancel=false)', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  await client.loadSchedule();

  await client.cancelSession('sess_hiit_101');
  const sessions = await client.db.getCachedSessions();
  const session = sessions.find((s) => s.id === 'sess_hiit_101');

  assert.equal(session?.can_cancel, false);
});

test('F16.4: Cancelling session already cancelled by gym triggers 409 Conflict', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  await client.loadSchedule();

  // sess_yoga_204 is cancelled_by_gym on mock server
  const cancelRes = await client.cancelSession('sess_yoga_204');
  assert.equal(cancelRes.success, false);
  assert.equal(cancelRes.status, 409);
});

test('F16.5: 409 Conflict surfaces dismissible banner informing member', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  await client.loadSchedule();

  await client.cancelSession('sess_yoga_204');
  assert.equal(client.ui.state.isDismissibleBannerVisible, true);
  assert.equal(client.ui.state.bannerText, 'Session was cancelled by the gym.');
});
