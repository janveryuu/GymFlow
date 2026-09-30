import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useAuthStore } from '../store/authStore';
import { colors } from '../theme';
import { GymTabBar } from '../components/GymTabBar';
import { GymFlowLogo, GymFlowWordmark } from '../components/GymFlowBrand';

import { WelcomeScreen } from '../screens/auth/WelcomeScreen';
import { OnboardingScreen } from '../screens/auth/OnboardingScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { ForcedPasswordResetScreen } from '../screens/auth/ForcedPasswordResetScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { ProfileSetupScreen } from '../screens/auth/ProfileSetupScreen';

import { DashboardScreen } from '../screens/DashboardScreen';
import { CatalogScreen } from '../screens/CatalogScreen';
import { ScheduleScreen } from '../screens/ScheduleScreen';
import { ProgressScreen } from '../screens/ProgressScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { WorkoutDetailScreen } from '../screens/WorkoutDetailScreen';
import { NutritionScreen } from '../screens/NutritionScreen';
import { BarcodeScannerScreen } from '../screens/BarcodeScannerScreen';
import { AiFoodScannerScreen } from '../screens/AiFoodScannerScreen';
import { WaterIntakeScreen } from '../screens/WaterIntakeScreen';
import { AiCoachScreen } from '../screens/AiCoachScreen';
import { WorkoutSelectScreen } from '../screens/WorkoutSelectScreen';
import { CustomWorkoutDetailScreen } from '../screens/CustomWorkoutDetailScreen';
import { WorkoutHistoryScreen } from '../screens/WorkoutHistoryScreen';
import { AiWorkoutGenerateScreen } from '../screens/AiWorkoutGenerateScreen';
import { StreakScreen } from '../screens/StreakScreen';
import { ExerciseDetailScreen } from '../screens/ExerciseDetailScreen';

import type { RootStackParamList, AuthStackParamList, MainTabParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const AuthNavigator: React.FC = () => {
  return (
    <AuthStack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'fade',
      }}
    >
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
      <AuthStack.Screen name="Onboarding" component={OnboardingScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen
        name="ProfileSetup"
        component={ProfileSetupScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <AuthStack.Screen name="ForcedPasswordReset" component={ForcedPasswordResetScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
};

const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <GymTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tab.Screen name="DashboardTab" component={DashboardScreen} />
      <Tab.Screen name="CatalogTab" component={CatalogScreen} />
      <Tab.Screen name="ProgressTab" component={ProgressScreen} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
  },
};

export const RootNavigator: React.FC = () => {
  const { isAuthenticated, mustChangePassword, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <GymFlowLogo size={44} style={{ marginBottom: 12 }} />
        <GymFlowWordmark height={26} style={{ marginBottom: 24 }} />
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {!isAuthenticated || mustChangePassword ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            <Stack.Screen
              name="ProfileSetup"
              component={ProfileSetupScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="WorkoutDetail"
              component={WorkoutDetailScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="ScheduleScreen"
              component={ScheduleScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen name="NutritionScreen" component={NutritionScreen} options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="BarcodeScannerScreen" component={BarcodeScannerScreen} options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="AiFoodScannerScreen" component={AiFoodScannerScreen} options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="WaterIntakeScreen" component={WaterIntakeScreen} options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="AiCoachScreen" component={AiCoachScreen} options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="WorkoutSelectScreen" component={WorkoutSelectScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="CustomWorkoutDetailScreen" component={CustomWorkoutDetailScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="WorkoutHistoryScreen" component={WorkoutHistoryScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="AiWorkoutGenerateScreen" component={AiWorkoutGenerateScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="StreakScreen" component={StreakScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="ExerciseDetailScreen" component={ExerciseDetailScreen} options={{ animation: 'slide_from_right' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
