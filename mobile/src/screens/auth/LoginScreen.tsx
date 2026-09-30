import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Lock, Mail, AlertCircle, Zap, ArrowLeft, CheckCircle2, Sparkles } from '../../components/icons';
import Svg, { Path } from 'react-native-svg';
import { colors, typography, borderRadius, spacing } from '../../theme';
import { apiClient, setAuthToken } from '../../api/client';
import { getDatabase } from '../../db/connection';
import { useAuthStore } from '../../store/authStore';
import { useDevMockStore } from '../../store/devMockStore';
import { useCustomWorkoutsStore } from '../../store/customWorkoutsStore';
import { GymFlowLogo, GymFlowWordmark } from '../../components/GymFlowBrand';

const GoogleIcon: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
    />
    <Path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
    />
    <Path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.97 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
    />
    <Path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </Svg>
);

const AppleIcon: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = '#000000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      fill={color}
      d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.98.6-2.61 1.34-.56.64-1.04 1.69-.91 2.71 1 .08 2.01-.48 2.6-1.2z"
    />
  </Svg>
);

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginScreenProps {
  route?: {
    params?: {
      onboardingData?: any;
      generatedPlan?: any;
      mode?: 'login' | 'signup';
    };
  };
  navigation: any;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ route, navigation }) => {
  const onboardingData = route?.params?.onboardingData;
  const generatedPlan = route?.params?.generatedPlan;
  const [isSignUp, setIsSignUp] = useState(route?.params?.mode === 'signup');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingProvider, setSubmittingProvider] = useState<'google' | 'apple' | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);

  const defaultEmail = onboardingData?.firstName 
    ? `${onboardingData.firstName.toLowerCase()}.${(onboardingData.lastName || 'doe').toLowerCase()}@gymflow.test` 
    : 'alex.vance@gymflow.com';

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: defaultEmail,
      password: 'password123',
    },
  });

  const syncOnboardingProfile = async () => {
    if (onboardingData?.fullName) {
      try {
        await apiClient.patch('/api/v1/member/profile', {
          name: onboardingData.fullName,
          phone: onboardingData.phone || '',
        });
      } catch {
        // Optional sync in mock/offline
      }
    }

    if (onboardingData?.fitnessGoal) {
      try {
        const db = await getDatabase();
        await db.runAsync(
          `INSERT OR IGNORE INTO Preferences (id, workout_type, intensity, weekly_workout_goal)
           VALUES ('default', 'full-body', 'moderate', 5)`
        );
        await db.runAsync(
          `UPDATE Preferences SET fitness_goal = ? WHERE id = 'default'`,
          [onboardingData.fitnessGoal]
        );
      } catch {
        // Optional sync in mock/offline
      }
    }

    if (generatedPlan?.title) {
      try {
        const customWorkout = {
          id: `plan-${Date.now()}`,
          title: generatedPlan.title,
          description: `Custom ${generatedPlan.daysPerWeek} split synthesized for ${onboardingData?.fullName || 'you'} targeting ${generatedPlan.goal || 'Hypertrophy'}.`,
          category: 'Custom Routine',
          difficulty: generatedPlan.difficulty || 'Intermediate',
          duration_minutes: 50,
          calories: generatedPlan.calories || 440,
          image_url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800&auto=format&fit=crop',
          created_at: new Date().toISOString(),
          isCustomRoutine: true,
          routineExercises: [
            {
              id: 'ex-1',
              title: 'Barbell Back Squats',
              slug: 'barbell-squat',
              category: 'Legs',
              equipment: 'Barbell & Squat Rack',
              difficulty: 'Intermediate',
              preferredSets: 4,
              preferredReps: '8 - 10 reps',
              restTimeSeconds: 90,
              tips: 'Brace your core and descend smoothly to parallel.',
              duration_minutes: 15,
              calories: 120,
            },
            {
              id: 'ex-2',
              title: 'Flat Barbell Bench Press',
              slug: 'bench-press',
              category: 'Chest',
              equipment: 'Barbell & Bench',
              difficulty: 'Intermediate',
              preferredSets: 4,
              preferredReps: '8 - 10 reps',
              restTimeSeconds: 90,
              tips: 'Retract shoulder blades and press with controlled tempo.',
              duration_minutes: 15,
              calories: 110,
            },
            {
              id: 'ex-3',
              title: 'Barbell Bent-Over Row',
              slug: 'bent-over-row',
              category: 'Back',
              equipment: 'Barbell',
              difficulty: 'Intermediate',
              preferredSets: 3,
              preferredReps: '10 - 12 reps',
              restTimeSeconds: 60,
              tips: 'Hinge at the hips and pull towards the belly button.',
              duration_minutes: 12,
              calories: 95,
            },
          ],
        };
        useCustomWorkoutsStore.getState().addCustomWorkout(customWorkout as any);
        useCustomWorkoutsStore.getState().setPendingGeneratedWorkout(customWorkout as any);
      } catch {
        // Ignore
      }
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const response = await apiClient.post('/api/v1/auth/login', {
        email: data.email.trim(),
        password: data.password,
      });

      const { token, user } = response.data;
      const mustChange = user?.must_change_password ?? false;
      const resolvedUser = {
        ...user,
        ...(onboardingData?.fitnessGoal ? { fitness_goal: onboardingData.fitnessGoal } : {}),
      };

      await syncOnboardingProfile();
      await setAuth(token, resolvedUser, mustChange);

      if (mustChange) {
        navigation.navigate('ForcedPasswordReset');
      }
    } catch (err: any) {
      if (err?.code === 'ERR_NETWORK' || !err?.response) {
        useDevMockStore.getState().setMockEnabled(true);
        const fallbackUser = {
          id: 1,
          name: onboardingData?.fullName || 'Jane Doe',
          email: data.email.trim(),
          role: 'member' as const,
          must_change_password: false,
          fitness_goal: onboardingData?.fitnessGoal || 'build_muscle',
        };
        await setAuth('dev-offline-token-gymflow', fallbackUser, false);
        return;
      }

      if (err?.response?.status === 401) {
        setErrorMessage('Invalid email or password. Please check your credentials.');
      } else if (err?.response?.data?.message) {
        setErrorMessage(err.response.data.message);
      } else {
        setErrorMessage('Unable to sign in. Please check your network connection.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAppleLogin = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);
    setSubmittingProvider('apple');

    try {
      const response = await apiClient.post(
        '/api/v1/auth/login',
        {
          email: 'alex.apple@gymflow.test',
          password: 'Password123!',
        },
        { timeout: 2500 }
      );

      const { token, user } = response.data;
      const resolvedUser = {
        ...user,
        ...(onboardingData?.fitnessGoal ? { fitness_goal: onboardingData.fitnessGoal } : {}),
      };
      await syncOnboardingProfile();
      await setAuth(token, resolvedUser, false);
    } catch {
      useDevMockStore.getState().setMockEnabled(true);
      const fallbackUser = {
        id: 2,
        name: onboardingData?.fullName || 'Alex Vance',
        email: 'alex.apple@gymflow.test',
        role: 'member' as const,
        must_change_password: false,
        fitness_goal: onboardingData?.fitnessGoal || 'build_muscle',
      };
      await setAuth('dev-offline-token-gymflow', fallbackUser, false);
    } finally {
      setIsSubmitting(false);
      setSubmittingProvider(null);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);
    setSubmittingProvider('google');

    try {
      const response = await apiClient.post(
        '/api/v1/auth/login',
        {
          email: 'jane.doe@gymflow.test',
          password: 'Password123!',
        },
        { timeout: 2500 }
      );

      const { token, user } = response.data;
      const resolvedUser = {
        ...user,
        ...(onboardingData?.fitnessGoal ? { fitness_goal: onboardingData.fitnessGoal } : {}),
      };
      await syncOnboardingProfile();
      await setAuth(token, resolvedUser, false);
    } catch {
      useDevMockStore.getState().setMockEnabled(true);
      const fallbackUser = {
        id: 1,
        name: onboardingData?.fullName || 'Jane Doe',
        email: 'jane.doe@gymflow.test',
        role: 'member' as const,
        must_change_password: false,
        fitness_goal: onboardingData?.fitnessGoal || 'build_muscle',
      };
      await setAuth('dev-offline-token-gymflow', fallbackUser, false);
    } finally {
      setIsSubmitting(false);
      setSubmittingProvider(null);
    }
  };

  const handleDevBypass = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const response = await apiClient.post(
        '/api/v1/auth/login',
        {
          email: 'jane.doe@gymflow.test',
          password: 'Password123!',
        },
        { timeout: 2500 }
      );

      const { token, user } = response.data;
      const resolvedUser = {
        ...user,
        ...(onboardingData?.fitnessGoal ? { fitness_goal: onboardingData.fitnessGoal } : {}),
      };
      await syncOnboardingProfile();
      await setAuth(token, resolvedUser, false);
    } catch {
      useDevMockStore.getState().setMockEnabled(true);
      const fallbackUser = {
        id: 1,
        name: onboardingData?.fullName || 'Jane Doe',
        email: 'jane.doe@gymflow.test',
        role: 'member' as const,
        must_change_password: false,
        fitness_goal: onboardingData?.fitnessGoal || 'build_muscle',
      };
      await setAuth('dev-offline-token-gymflow', fallbackUser, false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDevDirectHome = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const response = await apiClient.post(
        '/api/v1/auth/login',
        {
          email: 'jane.doe@gymflow.test',
          password: 'Password123!',
        },
        { timeout: 2500 }
      );

      const { token, user } = response.data;
      const resolvedUser = {
        ...user,
        ...(onboardingData?.fitnessGoal ? { fitness_goal: onboardingData.fitnessGoal } : {}),
      };
      await syncOnboardingProfile();
      await setAuth(token, resolvedUser, false);
    } catch {
      useDevMockStore.getState().setMockEnabled(true);
      const fallbackUser = {
        id: 1,
        name: onboardingData?.fullName || 'Jane Doe',
        email: 'jane.doe@gymflow.test',
        role: 'member' as const,
        must_change_password: false,
        fitness_goal: onboardingData?.fitnessGoal || 'build_muscle',
      };
      await syncOnboardingProfile();
      await setAuth('dev-offline-token-gymflow', fallbackUser, false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Welcome');
    }
  };

  if (!showEmailForm) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000000' }}>
        <Image 
          source={require('../../../assets/login-bg.png')} 
          style={{ position: 'absolute', width: '100%', height: '100%' }}
          resizeMode="cover"
        />
        <SafeAreaView style={{ flex: 1, padding: spacing.xl, paddingBottom: spacing.xxl }}>
          {/* Top Row: Back button & Dev Mode Quick Pill */}
          <View style={styles.topDevRow}>
            <TouchableOpacity
              onPress={handleBack}
              style={styles.backButtonLanding}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <ArrowLeft size={20} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleDevDirectHome}
              disabled={isSubmitting}
              style={styles.topDevBadge}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Dev Mode quick bypass to home"
            >
              <Zap size={12} color="#CCFF00" style={{ marginRight: 5 }} />
              <Text style={styles.topDevBadgeText}>SKIP TO HOME</Text>
            </TouchableOpacity>
          </View>

          {/* Spacer to showcase the central GymFlow graphic embedded in the artwork */}
          <View style={{ flex: 1 }} />

          <View style={{ width: '100%' }}>
            {/* If coming from Onboarding with generated plan, show prominent unlock card */}
            {generatedPlan ? (
              <View style={styles.onboardingWelcomeCard}>
                <View style={styles.onboardingCheckIcon}>
                  <Sparkles size={18} color="#CCFF00" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.onboardingWelcomeTitle}>
                    {generatedPlan.title}
                  </Text>
                  <Text style={styles.onboardingWelcomeSub}>
                    {onboardingData?.firstName ? `Welcome, ${onboardingData.firstName}! ` : ''}Sign in to unlock your custom workout plan.
                  </Text>
                </View>
              </View>
            ) : onboardingData?.firstName ? (
              <View style={styles.onboardingWelcomeCard}>
                <View style={styles.onboardingCheckIcon}>
                  <CheckCircle2 size={18} color="#CCFF00" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.onboardingWelcomeTitle}>
                    Welcome, {onboardingData.firstName}!
                  </Text>
                  <Text style={styles.onboardingWelcomeSub}>
                    {isSignUp ? 'Create your login to save your profile' : 'Sign in to access your workout plan'}
                  </Text>
                </View>
              </View>
            ) : null}

            {errorMessage ? (
              <View style={[styles.errorBanner, { marginBottom: spacing.md }]}>
                <AlertCircle size={18} color={colors.error} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Apple Sign-In Button */}
            <TouchableOpacity
              style={styles.appleButton}
              onPress={handleAppleLogin}
              disabled={isSubmitting}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={isSignUp ? 'Sign up with Apple' : 'Sign in with Apple'}
            >
              {isSubmitting && submittingProvider === 'apple' ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <View style={styles.appleButtonContent}>
                  <AppleIcon size={21} color="#000000" />
                  <Text style={styles.appleButtonText}>
                    {isSignUp ? 'Sign up with Apple' : 'Sign in with Apple'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Google Sign-In Button */}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleLogin}
              disabled={isSubmitting}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={isSignUp ? 'Sign up with Google' : 'Sign in with Google'}
            >
              {isSubmitting && submittingProvider === 'google' ? (
                <ActivityIndicator size="small" color="#1F1F1F" />
              ) : (
                <View style={styles.googleButtonContent}>
                  <GoogleIcon size={22} />
                  <Text style={styles.googleButtonText}>
                    {isSignUp ? 'Sign up with Google' : 'Sign in with Google'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Secondary Option: Email */}
            <TouchableOpacity
              onPress={() => setShowEmailForm(true)}
              style={styles.emailOptionButton}
              accessibilityRole="button"
              accessibilityLabel={isSignUp ? 'Sign up with email instead' : 'Sign in with email instead'}
            >
              <Text style={styles.emailOptionText}>
                {isSignUp ? 'Or sign up with email' : 'Or sign in with email'}
              </Text>
            </TouchableOpacity>

            {/* Toggle Mode: Sign In vs Sign Up */}
            <TouchableOpacity
              onPress={() => setIsSignUp(!isSignUp)}
              style={styles.toggleModeButton}
              activeOpacity={0.7}
            >
              <Text style={styles.toggleModeText}>
                {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                <Text style={styles.toggleModeHighlight}>
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </Text>
              </Text>
            </TouchableOpacity>

            {/* Dev Mode Autofill Bypass Button */}
            <TouchableOpacity
              onPress={handleDevBypass}
              disabled={isSubmitting}
              style={styles.devBypassButton}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Dev Mode: Quick Member Sign In"
            >
              <Zap size={14} color="#CCFF00" style={{ marginRight: 6 }} />
              <Text style={styles.devBypassButtonText}>Dev Mode: Quick Member Sign In</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl }}>
            <TouchableOpacity onPress={() => setShowEmailForm(false)}>
              <Text style={{ color: colors.textSecondary, fontWeight: '500' }}>← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDevBypass}
              disabled={isSubmitting}
              style={styles.formDevBadge}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Dev Mode quick bypass"
            >
              <Zap size={11} color={colors.text} style={{ marginRight: 4 }} />
              <Text style={styles.formDevBadgeText}>DEV SKIP</Text>
            </TouchableOpacity>
          </View>

          {/* Brand Header */}
          <View style={styles.brandContainer}>
            <View style={styles.brandIconWrapper}>
              <GymFlowLogo size={30} />
            </View>
            <GymFlowWordmark height={34} style={{ marginTop: spacing.xs }} />
            <Text style={styles.brandSubtitle}>Member Companion</Text>
          </View>

          {/* Form */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </Text>
            <Text style={styles.formSubtitle}>
              {isSignUp ? 'Set up your credentials to get started' : 'Sign in to your member account'}
            </Text>

            {errorMessage ? (
              <View style={styles.errorBanner} accessibilityRole="alert">
                <AlertCircle size={18} color={colors.error} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Email Field */}
            <View style={styles.fieldWrapper}>
              <Text style={styles.label}>Email Address</Text>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={[styles.inputContainer, errors.email && styles.inputError]}>
                    <Mail size={18} color={colors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="alex.vance@gymflow.com"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoCorrect={false}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      accessibilityLabel="Email Address input"
                    />
                  </View>
                )}
              />
              {errors.email ? <Text style={styles.fieldError}>{errors.email.message}</Text> : null}
            </View>

            {/* Password Field */}
            <View style={styles.fieldWrapper}>
              <Text style={styles.label}>Password</Text>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={[styles.inputContainer, errors.password && styles.inputError]}>
                    <Lock size={18} color={colors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="••••••••"
                      placeholderTextColor={colors.textMuted}
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      accessibilityLabel="Password input"
                    />
                  </View>
                )}
              />
              {errors.password ? (
                <Text style={styles.fieldError}>{errors.password.message}</Text>
              ) : null}
            </View>

            {/* Forgot Password Link (Only in Sign In mode) */}
            {!isSignUp ? (
              <TouchableOpacity
                style={styles.forgotButton}
                onPress={() => navigation.navigate('ForgotPassword')}
                accessibilityRole="button"
                accessibilityLabel="Forgot Password"
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            ) : null}

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={isSignUp ? 'Create Account' : 'Sign In'}
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Toggle Sign In / Sign Up */}
            <TouchableOpacity
              onPress={() => setIsSignUp(!isSignUp)}
              style={styles.formToggleBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.formToggleText}>
                {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                <Text style={{ color: colors.primary, fontWeight: '700' }}>
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  brandIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: spacing.sm,
  },
  brandTitle: {
    fontFamily: typography.fonts.headingBlack,
    fontSize: typography.sizes.display,
    color: colors.text,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formTitle: {
    fontFamily: typography.fonts.headingBold,
    fontSize: typography.sizes.xxl,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  formSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.35)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.sizes.sm,
    flex: 1,
  },
  fieldWrapper: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.headingBold,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  inputError: {
    borderColor: colors.error,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: typography.sizes.base,
  },
  fieldError: {
    color: colors.error,
    fontSize: typography.sizes.xs,
    marginTop: 4,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: spacing.lg,
  },
  forgotText: {
    color: colors.primary,
    fontSize: typography.sizes.sm,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  submitButtonText: {
    color: colors.textInverse,
    fontFamily: typography.fonts.headingBold,
    fontSize: typography.sizes.base,
    letterSpacing: 0.3,
  },
  formToggleBtn: {
    marginTop: spacing.lg,
    alignItems: 'center',
    paddingVertical: 4,
  },
  formToggleText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
  },
  appleButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    width: '100%',
  },
  appleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appleButtonText: {
    color: '#000000',
    fontSize: 16,
    fontFamily: typography.fonts.headingBold,
    marginLeft: spacing.sm,
    letterSpacing: 0.2,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    width: '100%',
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: {
    color: '#1F1F1F',
    fontSize: 16,
    fontFamily: typography.fonts.headingBold,
    marginLeft: spacing.sm,
    letterSpacing: 0.2,
  },
  emailOptionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  emailOptionText: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: typography.sizes.sm,
    fontWeight: '500',
  },
  toggleModeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  toggleModeText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: typography.sizes.sm,
  },
  toggleModeHighlight: {
    color: colors.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  topDevRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  backButtonLanding: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  topDevBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 20, 20, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(204, 255, 0, 0.5)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  topDevBadgeText: {
    color: '#CCFF00',
    fontSize: 11,
    fontFamily: typography.fonts.headingBold,
    letterSpacing: 0.8,
  },
  devBypassButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: borderRadius.md,
    minHeight: 48,
    marginTop: spacing.xs,
    width: '100%',
  },
  devBypassButtonText: {
    color: '#F5F5F5',
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.headingSemiBold,
    letterSpacing: 0.3,
  },
  formDevBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  formDevBadgeText: {
    color: colors.text,
    fontSize: 10,
    fontFamily: typography.fonts.headingBold,
    letterSpacing: 0.6,
  },
  onboardingWelcomeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(204, 255, 0, 0.3)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  onboardingCheckIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(204, 255, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onboardingWelcomeTitle: {
    color: '#FFFFFF',
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.headingBold,
  },
  onboardingWelcomeSub: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
});
