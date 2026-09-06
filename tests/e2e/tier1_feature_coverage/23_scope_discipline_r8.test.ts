import test from 'node:test';
import assert from 'node:assert/strict';
import { UIDriver } from '../harness/ui-driver.ts';

test('F23.1: Scope audit confirms complete absence of session booking or slot-claiming UI', () => {
  const ui = new UIDriver();
  ui.registerElement('schedule_session_card_1', 'View', { title: 'High-Octane Conditioning' });
  ui.registerElement('cancel_session_button', 'Button', { accessibilityLabel: 'Cancel Session' });

  const audit = ui.verifyScopeDiscipline();
  assert.equal(audit.passed, true);
  assert.equal(audit.violations.length, 0);
});

test('F23.2: Scope audit detects violation if booking or slot reservation UI is introduced', () => {
  const ui = new UIDriver();
  ui.registerElement('book_slot_button', 'Button', { children: 'Claim your spot now' });

  const audit = ui.verifyScopeDiscipline();
  assert.equal(audit.passed, false);
  assert.ok(audit.violations.some((v) => v.includes('Violation R8.1')));
});

test('F23.3: Scope audit confirms absence of server-driven recommendation engine UI', () => {
  const ui = new UIDriver();
  ui.registerElement('catalog_pill_filter_chest', 'TouchableOpacity', { accessibilityLabel: 'Filter by chest' });

  const audit = ui.verifyScopeDiscipline();
  assert.equal(audit.passed, true);
});

test('F23.4: Scope audit detects violation if push notification permission prompt is injected', () => {
  const ui = new UIDriver();
  ui.registerElement('push_permission_modal', 'Modal', { accessibilityLabel: 'Allow push notifications' });

  const audit = ui.verifyScopeDiscipline();
  assert.equal(audit.passed, false);
  assert.ok(audit.violations.some((v) => v.includes('Violation R8.3')));
});

test('F23.5: Scope audit detects violation if third-party social login button is present', () => {
  const ui = new UIDriver();
  ui.registerElement('apple_signin_button', 'Button', { accessibilityLabel: 'Sign in with Apple' });

  const audit = ui.verifyScopeDiscipline();
  assert.equal(audit.passed, false);
  assert.ok(audit.violations.some((v) => v.includes('Violation R8.4')));
});
