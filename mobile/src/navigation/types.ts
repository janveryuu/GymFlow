import { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  ForcedPasswordReset: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  DashboardTab: undefined;
  CatalogTab: undefined;
  ProgressTab: undefined;
  ProfileTab: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  WorkoutDetail: { workoutId: string };
  ScheduleScreen: undefined;
  NutritionScreen: undefined;
  BarcodeScannerScreen: undefined;
  AiFoodScannerScreen: undefined;
  WaterIntakeScreen: undefined;
  AiCoachScreen: undefined;
};
