import test from 'node:test';
import assert from 'node:assert/strict';
import { GymFlowAppClient } from '../harness/app-client.ts';

test('B2.1: 7-character new password (one char below minimum 8) rejected with 422', async () => {
  const client = new GymFlowAppClient();
  client.server.profile.must_change_password = true;
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  const res = await client.forcedChangePassword({
    current_password: 'TempPass!23',
    new_password: 'Short1!', // 7 chars
    new_password_confirmation: 'Short1!',
  });
  assert.equal(res.status, 422);
  assert.equal(res.success, false);
});

test('B2.2: Password confirmation mismatch rejected with 422', async () => {
  const client = new GymFlowAppClient();
  client.server.profile.must_change_password = true;
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  const res = await client.forcedChangePassword({
    current_password: 'TempPass!23',
    new_password: 'ValidPassword123!',
    new_password_confirmation: 'MismatchedPassword123!',
  });
  assert.equal(res.status, 422);
  assert.equal(res.success, false);
});

test('B2.3: Unauthenticated change password attempt returns 401 Unauthorized', async () => {
  const client = new GymFlowAppClient();
  // No login -> no auth token
  const res = await client.forcedChangePassword({
    current_password: 'TempPass!23',
    new_password: 'ValidPassword123!',
    new_password_confirmation: 'ValidPassword123!',
  });
  assert.equal(res.status, 401);
});

test('B2.4: Unicode password with accents and emoji accepted when length >= 8', async () => {
  const client = new GymFlowAppClient();
  client.server.profile.must_change_password = true;
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  const secureUnicode = 'P@sswørd🔒123!';
  const res = await client.forcedChangePassword({
    current_password: 'TempPass!23',
    new_password: secureUnicode,
    new_password_confirmation: secureUnicode,
  });
  assert.equal(res.status, 200);
  assert.equal(res.success, true);
});

test('B2.5: Rapid double submission of change password handles gracefully', async () => {
  const client = new GymFlowAppClient();
  client.server.profile.must_change_password = true;
  await client.login({ email: 'member@gymflow.test', password: 'TempPass!23' });

  const [res1, res2] = await Promise.all([
    client.forcedChangePassword({
      current_password: 'TempPass!23',
      new_password: 'DoubleSubmitPass123!',
      new_password_confirmation: 'DoubleSubmitPass123!',
    }),
    client.forcedChangePassword({
      current_password: 'TempPass!23',
      new_password: 'DoubleSubmitPass123!',
      new_password_confirmation: 'DoubleSubmitPass123!',
    }),
  ]);

  assert.ok(res1.success || res2.success);
  assert.equal(client.server.profile.must_change_password, false);
});
