/**
 * UI State & Presentation Layer Driver for GymFlow Mobile E2E tests.
 * Asserts UI contracts: Skeletons, EmptyStates, ErrorBanners, Dark-first theme tokens,
 * PercentRing SVG mathematics, "—" null heart rate, Floating Tab Bar, 44x44 targets,
 * Accessibility attributes, and R8 Scope Discipline.
 */

import type { UIState } from './types.ts';

export const THEME = {
  colors: {
    base: '#0F0F10',
    surface: '#17171A',
    surfaceRaised: '#1F1F24',
    border: '#26262B',
    accent: '#C8FF3D', // Electric-lime strictly for progress rings, % badges, active tab, sync
    textPrimary: '#FFFFFF',
    textSecondary: '#A0A0A5',
    textMuted: '#66666E',
    warning: '#F59E0B', // Amber for 7-day TTL
    error: '#EF4444',
  },
  typography: {
    headingFont: 'Archivo',
    bodyFont: 'System',
  },
  geometry: {
    minTapTargetSize: 44,
    borderRadiusCard: 16, // rounded-2xl
  },
};

export class UIDriver {
  public state: UIState = {
    currentRoute: 'LoginScreen',
    isLoading: false,
    isSkeletonVisible: false,
    isEmptyStateVisible: false,
    emptyStateText: undefined,
    isErrorVisible: false,
    errorMessage: undefined,
    isDismissibleBannerVisible: false,
    bannerText: undefined,
    activeTab: 'Home',
    hapticEvents: [],
  };

  public registeredTapTargets: { id: string; width: number; height: number; a11yLabel?: string }[] = [];
  public renderedElements: { testId: string; type: string; props: Record<string, any> }[] = [];

  public reset(): void {
    this.state = {
      currentRoute: 'LoginScreen',
      isLoading: false,
      isSkeletonVisible: false,
      isEmptyStateVisible: false,
      emptyStateText: undefined,
      isErrorVisible: false,
      errorMessage: undefined,
      isDismissibleBannerVisible: false,
      bannerText: undefined,
      activeTab: 'Home',
      hapticEvents: [],
    };
    this.registeredTapTargets = [];
    this.renderedElements = [];
  }

  // ── Navigation & Routes ───────────────────────────────────────────────
  public navigate(route: string): void {
    this.state.currentRoute = route;
    if (route === 'DashboardScreen') this.state.activeTab = 'Home';
    else if (route === 'CatalogScreen') this.state.activeTab = 'Workouts';
    else if (route === 'ScheduleScreen') this.state.activeTab = 'Schedule';
    else if (route === 'ProgressScreen') this.state.activeTab = 'Progress';
    else if (route === 'ProfileScreen') this.state.activeTab = 'Profile';
  }

  // ── Loading & Skeletons ───────────────────────────────────────────────
  public startLoading(): void {
    this.state.isLoading = true;
    this.state.isSkeletonVisible = true;
  }

  public finishLoading(): void {
    this.state.isLoading = false;
    this.state.isSkeletonVisible = false;
  }

  // ── Empty & Error States ──────────────────────────────────────────────
  public showEmptyState(reason: 'sessions' | 'workouts' | 'progress'): void {
    this.state.isEmptyStateVisible = true;
    if (reason === 'sessions') {
      this.state.emptyStateText = 'No sessions scheduled for this week';
    } else if (reason === 'workouts') {
      this.state.emptyStateText = 'No workouts found matching your filter criteria';
    } else if (reason === 'progress') {
      this.state.emptyStateText = 'No workout history recorded yet. Complete your first workout to view analytics.';
    }
  }

  public clearEmptyState(): void {
    this.state.isEmptyStateVisible = false;
    this.state.emptyStateText = undefined;
  }

  public showError(msg: string): void {
    this.state.isErrorVisible = true;
    this.state.errorMessage = msg;
  }

  public clearError(): void {
    this.state.isErrorVisible = false;
    this.state.errorMessage = undefined;
  }

  public showDismissibleBanner(text: string): void {
    this.state.isDismissibleBannerVisible = true;
    this.state.bannerText = text;
  }

  public dismissBanner(): void {
    this.state.isDismissibleBannerVisible = false;
    this.state.bannerText = undefined;
  }

  // ── Haptic Feedback Simulation ────────────────────────────────────────
  public triggerHaptic(type: 'notification_success' | 'impact_medium' | 'selection'): void {
    this.state.hapticEvents.push(type);
  }

  // ── Circular Progress Ring Geometry & SVG Math ────────────────────────
  public static calculateRingGeometry(
    percentage: number,
    radius: number = 40,
    strokeWidth: number = 8
  ): {
    radius: number;
    strokeWidth: number;
    circumference: number;
    strokeDashoffset: number;
    strokeColor: string;
  } {
    const circumference = 2 * Math.PI * radius;
    const clampedPercent = Math.max(0, Math.min(100, percentage));
    const strokeDashoffset = circumference - (clampedPercent / 100) * circumference;
    return {
      radius,
      strokeWidth,
      circumference,
      strokeDashoffset,
      strokeColor: THEME.colors.accent,
    };
  }

  // ── Null Heart Rate Rendering Rule ────────────────────────────────────
  public static formatHeartRate(val: number | null | undefined): string {
    if (val === null || val === undefined) {
      return '—'; // Must render em-dash or en-dash per R4 requirement
    }
    return `${Math.round(val)} bpm`;
  }

  // ── Tap Target & Accessibility Registration ───────────────────────────
  public registerTapTarget(id: string, width: number, height: number, a11yLabel?: string): void {
    this.registeredTapTargets.push({ id, width, height, a11yLabel });
  }

  public registerElement(testId: string, type: string, props: Record<string, any> = {}): void {
    this.renderedElements.push({ testId, type, props });
  }

  // ── R8 Scope Discipline Verification ──────────────────────────────────
  /**
   * Scans rendered components to ensure complete absence of deferred features:
   * 1. Booking / slot claiming
   * 2. Server-driven workout recommendation widgets
   * 3. Push notification permission prompts
   * 4. Social login buttons (Apple, Google, Facebook)
   */
  public verifyScopeDiscipline(): {
    passed: boolean;
    violations: string[];
  } {
    const violations: string[] = [];

    for (const el of this.renderedElements) {
      const id = el.testId.toLowerCase();
      const label = (el.props?.accessibilityLabel || '').toLowerCase();
      const text = (el.props?.children || '').toString().toLowerCase();

      // 1. Booking / slot claiming
      if (
        id.includes('book_slot') ||
        id.includes('claim_slot') ||
        id.includes('reserve_session') ||
        label.includes('book session') ||
        text.includes('claim your spot')
      ) {
        violations.push(`Violation R8.1 (Booking UI present): ${el.testId}`);
      }

      // 2. Server recommendations
      if (
        id.includes('ai_recommendations') ||
        id.includes('server_suggested_workouts') ||
        label.includes('recommended for you by algorithm')
      ) {
        violations.push(`Violation R8.2 (Recommendation UI present): ${el.testId}`);
      }

      // 3. Push notifications prompt
      if (
        id.includes('push_permission') ||
        id.includes('enable_notifications_modal') ||
        label.includes('allow push notifications')
      ) {
        violations.push(`Violation R8.3 (Push Notification prompt present): ${el.testId}`);
      }

      // 4. Social logins
      if (
        id.includes('apple_signin') ||
        id.includes('google_signin') ||
        id.includes('facebook_login') ||
        label.includes('sign in with apple') ||
        label.includes('sign in with google')
      ) {
        violations.push(`Violation R8.4 (Social login button present): ${el.testId}`);
      }
    }

    return {
      passed: violations.length === 0,
      violations,
    };
  }
}
