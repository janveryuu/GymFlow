import test from 'node:test';
import assert from 'node:assert/strict';
import { UIDriver, THEME } from '../harness/ui-driver.ts';

test('B23.1: Scope audit rejects slot-claiming CTA buttons', () => {
  const ui = new UIDriver();
  ui.registerElement('reserve_slot_now_btn', 'TouchableOpacity', {
    accessibilityLabel: 'Book session slot',
  });

  const audit = ui.verifyScopeDiscipline();
  assert.equal(audit.passed, false);
  assert.ok(audit.violations.some((v) => v.includes('Violation R8.1')));
});

test('B23.2: Scope audit rejects algorithmic workout recommendation feeds', () => {
  const ui = new UIDriver();
  ui.registerElement('server_suggested_workouts_carousel', 'FlatList', {
    accessibilityLabel: 'Recommended for you by algorithm',
  });

  const audit = ui.verifyScopeDiscipline();
  assert.equal(audit.passed, false);
  assert.ok(audit.violations.some((v) => v.includes('Violation R8.2')));
});

test('B23.3: Scope audit rejects push notification permission modals', () => {
  const ui = new UIDriver();
  ui.registerElement('enable_notifications_modal', 'Modal', {
    accessibilityLabel: 'Allow push notifications to remind you of workouts',
  });

  const audit = ui.verifyScopeDiscipline();
  assert.equal(audit.passed, false);
  assert.ok(audit.violations.some((v) => v.includes('Violation R8.3')));
});

test('B23.4: Scope audit rejects Google and Apple OAuth sign-in buttons', () => {
  const ui = new UIDriver();
  ui.registerElement('google_signin_btn', 'Button', {
    accessibilityLabel: 'Sign in with Google',
  });

  const audit = ui.verifyScopeDiscipline();
  assert.equal(audit.passed, false);
  assert.ok(audit.violations.some((v) => v.includes('Violation R8.4')));
});

test('B23.5: Design system enforces dark-first palette tokens exclusively', () => {
  assert.equal(THEME.colors.base, '#0F0F10');
  assert.equal(THEME.colors.surface, '#17171A');
  assert.equal(THEME.colors.accent, '#C8FF3D');
  assert.equal(THEME.typography.headingFont, 'Archivo');
});
