import test from 'node:test';
import assert from 'node:assert/strict';
import { GymFlowAppClient } from '../harness/app-client.ts';

test('Scenario S1: New/Expired Member Onboarding & First Login (F1, F2, F3, F21, F23)', async () => {
  const client = new GymFlowAppClient();

  // ── Step 1: Forgot Password Recovery Flow ──
  client.ui.navigate('ForgotPasswordScreen');
  assert.equal(client.ui.state.currentRoute, 'ForgotPasswordScreen');

  // Attempt invalid email
  const badForgot = await client.forgotPassword('bad-email');
  assert.equal(badForgot.success, false);
  assert.equal(badForgot.status, 422);
  assert.equal(client.ui.state.isErrorVisible, true);

  // Submit valid email
  const goodForgot = await client.forgotPassword('member@gymflow.test');
  assert.equal(goodForgot.success, true);
  assert.equal(goodForgot.status, 200);
  assert.equal(client.ui.state.isErrorVisible, false);

  // ── Step 2: Login with Temporary Credentials & Detect Forced Reset ──
  client.ui.navigate('LoginScreen');
  client.server.profile.must_change_password = true;

  const loginRes = await client.login({
    email: 'member@gymflow.test',
    password: 'TempPass!23',
  });
  assert.equal(loginRes.success, true);
  assert.equal(loginRes.status, 200);
  assert.ok(client.authToken);

  // Router enforces ForcedPasswordResetScreen
  assert.equal(client.ui.state.currentRoute, 'ForcedPasswordResetScreen');

  // ── Step 3: User Blocked From Dashboard until Password Reset ──
  assert.notEqual(client.ui.state.currentRoute, 'DashboardScreen');

  // ── Step 4: Forced Password Validation & Submission ──
  // Attempt too short password (<8 chars)
  const shortPassRes = await client.forcedChangePassword({
    current_password: 'TempPass!23',
    new_password: 'Pass1!',
    new_password_confirmation: 'Pass1!',
  });
  assert.equal(shortPassRes.success, false);
  assert.equal(shortPassRes.status, 422);

  // Attempt mismatched confirmation
  const mismatchRes = await client.forcedChangePassword({
    current_password: 'TempPass!23',
    new_password: 'BrandNewStrongPass99!',
    new_password_confirmation: 'DifferentPass99!',
  });
  assert.equal(mismatchRes.success, false);
  assert.equal(mismatchRes.status, 422);

  // Submit valid matching password
  const validReset = await client.forcedChangePassword({
    current_password: 'TempPass!23',
    new_password: 'BrandNewStrongPass99!',
    new_password_confirmation: 'BrandNewStrongPass99!',
  });
  assert.equal(validReset.success, true);
  assert.equal(validReset.status, 200);
  assert.equal(client.server.profile.must_change_password, false);

  // ── Step 5: Land on Dashboard & Scope Discipline Audit ──
  assert.equal(client.ui.state.currentRoute, 'DashboardScreen');
  assert.equal(client.ui.state.activeTab, 'Home');

  // Scope discipline audit confirms zero deferred feature leakage
  const audit = client.ui.verifyScopeDiscipline();
  assert.equal(audit.passed, true);
});
