// UNVERIFIED — no emulator in build environment
import { device, element, by, expect, waitFor } from 'detox';

describe('Auth Flow E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should display the login screen on cold launch', async () => {
    await expect(element(by.text('Welcome Back'))).toBeVisible();
    await expect(element(by.label('Email Address input'))).toBeVisible();
    await expect(element(by.label('Password input'))).toBeVisible();
    await expect(element(by.label('Sign In'))).toBeVisible();
  });

  it('should show error banner when submitting invalid credentials (401)', async () => {
    await element(by.label('Email Address input')).typeText('wrong@gymflow.com');
    await element(by.label('Password input')).typeText('wrongpassword');
    await element(by.label('Sign In')).tap();

    await waitFor(element(by.text('Invalid email or password. Please check your credentials.')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should successfully sign in with valid credentials and transition to Dashboard', async () => {
    await element(by.label('Email Address input')).clearText();
    await element(by.label('Email Address input')).typeText('alex.vance@gymflow.com');
    await element(by.label('Password input')).clearText();
    await element(by.label('Password input')).typeText('correctpassword');
    await element(by.label('Sign In')).tap();

    // Verify transition to main tabs / dashboard
    await waitFor(element(by.text('Weekly Goal')))
      .toBeVisible()
      .withTimeout(5000);
    await expect(element(by.id('tab-home'))).toBeVisible();
  });

  it('should redirect to ForcedPasswordReset when user.must_change_password is true', async () => {
    await element(by.label('Email Address input')).clearText();
    await element(by.label('Email Address input')).typeText('mustchange@gymflow.com');
    await element(by.label('Password input')).clearText();
    await element(by.label('Password input')).typeText('tempPass123!');
    await element(by.label('Sign In')).tap();

    await waitFor(element(by.text('Change Your Password')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should navigate to Forgot Password and submit reset email', async () => {
    await element(by.label('Forgot Password')).tap();
    await waitFor(element(by.text('Reset Password')))
      .toBeVisible()
      .withTimeout(3000);

    await element(by.label('Email Address input')).typeText('alex.vance@gymflow.com');
    await element(by.label('Send Reset Link')).tap();

    await waitFor(element(by.text('Check Your Inbox')))
      .toBeVisible()
      .withTimeout(5000);
  });
});
