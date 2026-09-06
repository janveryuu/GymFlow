// UNVERIFIED — no emulator in build environment
import { device, element, by, expect, waitFor } from 'detox';

describe('Progress Analytics & Metrics E2E Tests', () => {
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
    await element(by.id('tab-progress')).tap();
  });

  it('should display progress analytics header and metric cards', async () => {
    await expect(element(by.text('Progress & Analytics'))).toBeVisible();
    await expect(element(by.text('Total Workouts'))).toBeVisible();
    await expect(element(by.text('Total Time'))).toBeVisible();
    await expect(element(by.text('Calories'))).toBeVisible();
  });

  it('should strictly render " — " for Heart Rate when null or unmeasured', async () => {
    // Constraint check: Heart rate must render "—", never a fabricated number
    await expect(element(by.text('Avg Heart Rate'))).toBeVisible();
    await expect(element(by.text('—'))).toBeVisible();
  });

  it('should switch between time periods (7d, 30d, 90d)', async () => {
    // Switch to 30 Days
    await element(by.text('30 Days')).tap();
    await waitFor(element(by.text('Progress & Analytics'))).toBeVisible().withTimeout(2000);

    // Switch to 90 Days
    await element(by.text('90 Days')).tap();
    await waitFor(element(by.text('Progress & Analytics'))).toBeVisible().withTimeout(2000);

    // Switch back to 7 Days
    await element(by.text('7 Days')).tap();
    await waitFor(element(by.text('Progress & Analytics'))).toBeVisible().withTimeout(2000);
  });
});
