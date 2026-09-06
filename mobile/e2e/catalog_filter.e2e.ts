// UNVERIFIED — no emulator in build environment
import { device, element, by, expect, waitFor } from 'detox';

describe('Workout Catalog & Filtering E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    // Perform login if required to get to authenticated tabs
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
    // Navigate to Workouts tab
    await element(by.id('tab-workouts')).tap();
  });

  it('should display the Workout Catalog title and filter pills', async () => {
    await expect(element(by.text('Workout Catalog'))).toBeVisible();
    await expect(element(by.label('Filter by All'))).toBeVisible();
    await expect(element(by.label('Filter by Chest'))).toBeVisible();
    await expect(element(by.label('Filter by Legs'))).toBeVisible();
  });

  it('should filter workouts by category when tapping pills', async () => {
    // Tap Chest filter pill
    await element(by.label('Filter by Chest')).tap();
    await waitFor(element(by.text('CHEST'))).toBeVisible().withTimeout(3000);

    // Tap Legs filter pill
    await element(by.label('Filter by Legs')).tap();
    await waitFor(element(by.text('LEG'))).toBeVisible().withTimeout(3000);

    // Return to All
    await element(by.label('Filter by All')).tap();
    await expect(element(by.label('Filter by All'))).toBeVisible();
  });

  it('should navigate to Workout Detail when tapping a workout card', async () => {
    // Tap first workout card in the list
    await element(by.label('Filter by All')).tap();
    await element(by.text('Full Body Strength')).tap();

    // Verify detail screen elements
    await waitFor(element(by.text('Exercise Breakdown'))).toBeVisible().withTimeout(4000);
    await expect(element(by.label('Log Workout'))).toBeVisible();

    // Navigate back to catalog
    await element(by.label('Back to workouts')).tap();
    await expect(element(by.text('Workout Catalog'))).toBeVisible();
  });
});
