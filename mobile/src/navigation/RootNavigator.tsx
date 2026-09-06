import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useAuthStore } from '../store/authStore';
import { colors } from '../theme';
import { GymTabBar } from '../components/GymTabBar';
import { GymFlowLogo, GymFlowWordmark } from '../components/GymFlowBrand';

import { LoginScreen } from '../screens/auth/LoginScreen';
import { ForcedPasswordResetScreen } from '../screens/auth/ForcedPasswordResetScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';

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

import type { RootStackParamList, AuthStackParamList, MainTabParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const AuthNavigator: React.FC = () => {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'fade',
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
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
    <NavigationContainer>
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
