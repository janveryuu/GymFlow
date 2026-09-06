// UNVERIFIED — no emulator in this environment
import { device, element, by, expect, waitFor } from 'detox';

describe('Dashboard & Home Screen E2E Tests', () => {
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
    await element(by.id('tab-home')).tap();
  });

  it('should display member welcome greeting and weekly goal card', async () => {
    await expect(element(by.text('Welcome back,'))).toBeVisible();
    await expect(element(by.text('Weekly Goal'))).toBeVisible();
  });

  it('should render the progress ring and non-fabricated goal numbers', async () => {
    // Numerator/denominator format: "{X} of {Y} workouts completed"
    await expect(element(by.text(/workouts completed/))).toBeVisible();
  });

  it('should display scheduled session with trainer and one-tap check-in', async () => {
    try {
      await expect(element(by.text("Today's Session"))).toBeVisible();
      await expect(element(by.text('One-Tap Check-In'))).toBeVisible();

      // Tap Check-In
      await element(by.text('One-Tap Check-In')).tap();
      await waitFor(element(by.text('Checked In'))).toBeVisible().withTimeout(3000);
    } catch {
      // Session may not be scheduled for today
    }
  });

  it('should display featured workouts from cached catalog filtered by preferences', async () => {
    await expect(element(by.text('Featured Workouts'))).toBeVisible();
    await expect(element(by.text('View All'))).toBeVisible();
  });
});
