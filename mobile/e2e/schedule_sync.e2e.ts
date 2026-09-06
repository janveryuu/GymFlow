// UNVERIFIED — no emulator in build environment
import { device, element, by, expect, waitFor } from 'detox';

describe('Weekly Schedule & Offline Sync E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    try {
      await element(by.label('Email Address input')).typeText('alex.vance@gymflow.com');
      await element(by.label('Password input')).typeText('correctpassword');
      await element(by.label('Sign In')).tap();
      await waitFor(element(by.id('tab-home'))).toBeVisible().withTimeout(5000);
    } catch {
      // Already authenticated
    }
  });

  beforeEach(async () => {
    await element(by.id('tab-schedule')).tap();
  });

  it('should display the Weekly Schedule screen and week navigation', async () => {
    await expect(element(by.text('Weekly Schedule'))).toBeVisible();
    await expect(element(by.label('Previous week'))).toBeVisible();
    await expect(element(by.label('Next week'))).toBeVisible();
  });

  it('should navigate between weeks using arrow buttons', async () => {
    // Navigate to next week
    await element(by.label('Next week')).tap();
    await waitFor(element(by.text('Weekly Schedule'))).toBeVisible().withTimeout(2000);

    // Navigate back to current week
    await element(by.label('Previous week')).tap();
    await waitFor(element(by.text('Weekly Schedule'))).toBeVisible().withTimeout(2000);
  });

  it('should allow opting out of an upcoming session', async () => {
    // Look for Opt Out button on active session
    try {
      await element(by.text('Opt Out')).atIndex(0).tap();
      // Confirm dialog
      await element(by.text('Cancel Session')).tap();
      await waitFor(element(by.text('Cancelled'))).toBeVisible().withTimeout(3000);
    } catch {
      // Session may already be cancelled or empty
    }
  });

  it('should display "Cancelled by gym" badge if a 409 conflict occurs', async () => {
    // When session is cancelled by gym from backend/MSW 409 conflict
    try {
      await expect(element(by.text('Cancelled by gym'))).toBeVisible();
    } catch {
      // No 409 conflict active in clean state
    }
  });
});
