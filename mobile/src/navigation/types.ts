import { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Welcome: undefined;
  Onboarding: { autofill?: boolean } | undefined;
  Login: { onboardingData?: any; generatedPlan?: any; mode?: 'login' | 'signup' } | undefined;
  ForcedPasswordReset: undefined;
  ForgotPassword: undefined;
  ProfileSetup?: { token?: string; user?: any; isGoogleAuth?: boolean; isAppleAuth?: boolean; autofill?: boolean } | undefined;
};

export type MainTabParamList = {
  DashboardTab: { profileSetupJustCompleted?: boolean } | undefined;
  CatalogTab: undefined;
  ProgressTab: undefined;
  ProfileTab: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  ProfileSetup?: { token?: string; user?: any; isGoogleAuth?: boolean; isAppleAuth?: boolean; autofill?: boolean } | undefined;
  WorkoutDetail: { workoutId?: string; exercise?: any; routineId?: string };
  ScheduleScreen: undefined;
  NutritionScreen: { openManualEntry?: boolean } | undefined;
  BarcodeScannerScreen: undefined;
  AiFoodScannerScreen: undefined;
  WaterIntakeScreen: undefined;
  AiCoachScreen: undefined;
  WorkoutSelectScreen: undefined;
  CustomWorkoutDetailScreen: { routineId: string };
  WorkoutHistoryScreen: undefined;
  AiWorkoutGenerateScreen: undefined;
  StreakScreen: undefined;
};
