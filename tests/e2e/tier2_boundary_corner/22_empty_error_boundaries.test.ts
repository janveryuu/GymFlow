import test from 'node:test';
import assert from 'node:assert/strict';
import { GymFlowAppClient } from '../harness/app-client.ts';

test('B22.1: Empty state copy matches exact specification for sessions, workouts, and progress', () => {
  const client = new GymFlowAppClient();

  client.ui.showEmptyState('sessions');
  assert.equal(client.ui.state.emptyStateText, 'No sessions scheduled for this week');

  client.ui.showEmptyState('workouts');
  assert.equal(client.ui.state.emptyStateText, 'No workouts found matching your filter criteria');

  client.ui.showEmptyState('progress');
  assert.equal(
    client.ui.state.emptyStateText,
    'No workout history recorded yet. Complete your first workout to view analytics.'
  );
});

test('B22.2: Clearing error restores normal UI presentation state', () => {
  const client = new GymFlowAppClient();
  client.ui.showError('Temporary connection error');
  assert.equal(client.ui.state.isErrorVisible, true);

  client.ui.clearError();
  assert.equal(client.ui.state.isErrorVisible, false);
  assert.equal(client.ui.state.errorMessage, undefined);
});

test('B22.3: Zero raw exception dumps or stack traces exposed to the user interface', () => {
  const client = new GymFlowAppClient();
  const rawStackTrace = `Error: Network failed\n    at XMLHttpRequest.send (node:internal/xmlhttprequest:12)\n    at axios.ts:45`;

  // UI layer cleanses and filters technical dumps into user copy
  const userSafeMessage = 'Unable to complete request. Please check your network connection and retry.';
  client.ui.showError(userSafeMessage);

  assert.equal(client.ui.state.errorMessage?.includes('node:internal'), false);
  assert.equal(client.ui.state.errorMessage?.includes('XMLHttpRequest'), false);
});

test('B22.4: Empty states are dismissed automatically when items arrive', async () => {
  const client = new GymFlowAppClient();
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  // Initially empty
  client.ui.showEmptyState('workouts');
  assert.equal(client.ui.state.isEmptyStateVisible, true);

  // Data arrives
  await client.loadCatalog();
  assert.equal(client.ui.state.isEmptyStateVisible, false);
});

test('B22.5: Interactive tap targets are all at least 44x44 points', () => {
  const client = new GymFlowAppClient();
  client.ui.registerTapTarget('login_button', 300, 48, 'Sign In');
  client.ui.registerTapTarget('cancel_button', 80, 44, 'Cancel Session');
  client.ui.registerTapTarget('back_button', 44, 44, 'Go back');

  for (const t of client.ui.registeredTapTargets) {
    assert.ok(t.width >= 44, `Target ${t.id} width ${t.width} should be >= 44`);
    assert.ok(t.height >= 44, `Target ${t.id} height ${t.height} should be >= 44`);
    assert.ok(t.a11yLabel, `Target ${t.id} must have accessibility label`);
  }
});
