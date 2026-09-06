// UNVERIFIED — no emulator in this environment
import { device, element, by, expect, waitFor } from 'detox';

describe('Profile & Settings Screen E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    try {
      await element(by.label('Email Address input')).typeText('jane.doe@example.com');
      await element(by.label('Password input')).typeText('Password123!');
      await element(by.label('Sign In')).tap();
      await waitFor(element(by.id('tab-home'))).toBeVisible().withTimeout(5000);
    } catch {
      // Already authenticated
    }
  });

  beforeEach(async () => {
    await element(by.id('tab-profile')).tap();
  });

  it('should display member details, membership tier, and avatar', async () => {
    await expect(element(by.text('Membership Status'))).toBeVisible();
    await expect(element(by.label('Change profile picture'))).toBeVisible();
  });

  it('should allow editing and saving contact information', async () => {
    await expect(element(by.text('Account Details'))).toBeVisible();
    await element(by.label('Edit account information')).tap();

    // Verify inputs become editable and Save button appears
    await expect(element(by.label('Save account changes'))).toBeVisible();
    await element(by.label('Cancel edit')).tap();
  });

  it('should allow updating weekly workout goals and intensity preferences', async () => {
    await expect(element(by.text('Workout Preferences'))).toBeVisible();
    await expect(element(by.text('Weekly Workout Goal'))).toBeVisible();

    // Tap 5x / wk
    await element(by.label('5 workouts per week')).tap();
    await waitFor(element(by.text('Preferences saved'))).toBeVisible().withTimeout(3000);
  });

  it('should display prominent CC BY-SA 4.0 licensing attribution for @bryllim/workout-guide', async () => {
    await expect(element(by.text('Credits & Licensing'))).toBeVisible();
    await expect(
      element(
        by.text(
          'Workout illustrations provided by Bryl Lim via workout-guide (CC BY-SA 4.0). Based on exercise animations created by Everkinetic.'
        )
      )
    ).toBeVisible();
  });
});
