import test from 'node:test';
import assert from 'node:assert/strict';
import { GymFlowAppClient } from '../harness/app-client.ts';

test('F22.1: Schedule with zero sessions renders intentional empty state copy', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  client.server.sessions = [];
  await client.loadSchedule();

  assert.equal(client.ui.state.isEmptyStateVisible, true);
  assert.equal(client.ui.state.emptyStateText, 'No sessions scheduled for this week');
});

test('F22.2: Workout catalog with zero matching filter results renders intentional empty state', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  // Filter for non-matching difficulty
  const res = await client.loadCatalog({ difficulty: 'non_existent' as any });
  assert.equal(res.length, 0);
  assert.equal(client.ui.state.isEmptyStateVisible, true);
  assert.equal(client.ui.state.emptyStateText, 'No workouts found matching your filter criteria');
});

test('F22.3: Progress with zero history entries renders intentional empty state', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  client.server.progressHistory = [];
  await client.loadProgress('week');

  assert.equal(client.ui.state.isEmptyStateVisible, true);
  assert.equal(
    client.ui.state.emptyStateText,
    'No workout history recorded yet. Complete your first workout to view analytics.'
  );
});

test('F22.4: Form validation error displays user-friendly message without application crash', async () => {
  const client = new GymFlowAppClient();
  const res = await client.login({ email: '', password: '' });

  assert.equal(res.success, false);
  assert.equal(client.ui.state.isErrorVisible, true);
  assert.ok(client.ui.state.errorMessage);
  assert.notEqual(client.ui.state.errorMessage, '');
});

test('F22.5: Network error displays friendly error card without raw stack trace dump', async () => {
  const client = new GymFlowAppClient();
  client.server.setForcedError('/api/v1/auth/login', 500, { message: 'Internal server error' });

  const res = await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });
  assert.equal(res.success, false);
  assert.equal(client.ui.state.isErrorVisible, true);
  // Ensure no raw stack traces in user-facing message
  assert.equal(client.ui.state.errorMessage?.includes('at Object.'), false);
  assert.equal(client.ui.state.errorMessage?.includes('node:internal'), false);
});
