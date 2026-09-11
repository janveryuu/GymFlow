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
import { Lock, Mail, AlertCircle, Zap } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, typography, borderRadius, spacing } from '../../theme';
import { apiClient, setAuthToken } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { useDevMockStore } from '../../store/devMockStore';
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

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginScreenProps {
  navigation: any;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'alex.vance@gymflow.com',
      password: 'password123',
    },
  });

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

      await setAuth(token, user, mustChange);

      if (mustChange) {
        navigation.navigate('ForcedPasswordReset');
      }
    } catch (err: any) {
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

  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const response = await apiClient.post('/api/v1/auth/login', {
        email: 'jane.doe@gymflow.test',
        password: 'Password123!',
      });

      const { token, user } = response.data;
      // Set active auth token for client requests during setup
      setAuthToken(token);

      // Transition immediately to the multi-step Profile Setup onboarding flow
      navigation.navigate('ProfileSetup', { token, user, isGoogleAuth: true, autofill: true });
    } catch (err: any) {
      if (err?.response?.data?.message) {
        setErrorMessage(err.response.data.message);
      } else {
        setErrorMessage('Unable to connect to database. Please check your network connection.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDevBypass = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      // 1. Attempt quick authentication with seeded member credentials
      const response = await apiClient.post(
        '/api/v1/auth/login',
        {
          email: 'jane.doe@gymflow.test',
          password: 'Password123!',
        },
        { timeout: 2500 }
      );

      const { token, user } = response.data;
      setAuthToken(token);
      navigation.navigate('ProfileSetup', { token, user, isGoogleAuth: true, autofill: true });
    } catch {
      // 2. Offline / Mock fallback: proceed to ProfileSetup with member profile autofilled
      useDevMockStore.getState().setMockEnabled(true);
      const fallbackUser = {
        id: 1,
        name: 'Jane Doe',
        email: 'jane.doe@gymflow.test',
        role: 'member' as const,
        must_change_password: false,
      };
      setAuthToken('dev-offline-token-gymflow');
      navigation.navigate('ProfileSetup', { token: 'dev-offline-token-gymflow', user: fallbackUser, isGoogleAuth: true, autofill: true });
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
      await setAuth(token, user, false);
    } catch {
      useDevMockStore.getState().setMockEnabled(true);
      const fallbackUser = {
        id: 1,
        name: 'Jane Doe',
        email: 'jane.doe@gymflow.test',
        role: 'member' as const,
        must_change_password: false,
      };
      await setAuth('dev-offline-token-gymflow', fallbackUser, false);
    } finally {
      setIsSubmitting(false);
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
          {/* Top Dev Mode Quick Pill */}
          <View style={styles.topDevRow}>
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
            {errorMessage ? (
              <View style={[styles.errorBanner, { marginBottom: spacing.md }]}>
                <AlertCircle size={18} color={colors.error} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Single Google Sign-In Button */}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleLogin}
              disabled={isSubmitting}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Sign in with Google"
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#1F1F1F" />
              ) : (
                <View style={styles.googleButtonContent}>
                  <GoogleIcon size={22} />
                  <Text style={styles.googleButtonText}>Sign in with Google</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Secondary Option */}
            <TouchableOpacity
              onPress={() => setShowEmailForm(true)}
              style={styles.emailOptionButton}
              accessibilityRole="button"
              accessibilityLabel="Sign in with email instead"
            >
              <Text style={styles.emailOptionText}>Or sign in with email</Text>
            </TouchableOpacity>

            {/* Dev Mode Autofill Bypass Button */}
            <TouchableOpacity
              onPress={handleDevBypass}
              disabled={isSubmitting}
              style={styles.devBypassButton}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Dev Mode: Autofill Profile Setup"
            >
              <Zap size={14} color="#CCFF00" style={{ marginRight: 6 }} />
              <Text style={styles.devBypassButtonText}>Dev Mode: Autofill Profile Setup</Text>
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
            <Text style={styles.formTitle}>Welcome Back</Text>
            <Text style={styles.formSubtitle}>Sign in to your member account</Text>

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

            {/* Forgot Password Link */}
            <TouchableOpacity
              style={styles.forgotButton}
              onPress={() => navigation.navigate('ForgotPassword')}
              accessibilityRole="button"
              accessibilityLabel="Forgot Password"
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            {/* Sign In Button */}
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Sign In"
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text style={styles.submitButtonText}>Sign In</Text>
              )}
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
  },
  formSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorMuted,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    marginLeft: spacing.sm,
    flex: 1,
  },
  fieldWrapper: {
    marginBottom: 10,
  },
  label: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
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
    minHeight: 44,
  },
  fieldError: {
    color: colors.error,
    fontSize: typography.sizes.xs,
    marginTop: 4,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    minHeight: 44, // 44px tap target
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  forgotText: {
    color: colors.primary,
    fontSize: typography.sizes.sm,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: colors.primary,
    minHeight: 52, // 52px tap target
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  submitButtonText: {
    color: colors.textInverse,
    fontSize: typography.sizes.base,
    fontWeight: '700',
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    minHeight: 52,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: {
    color: '#1F1F1F',
    fontSize: typography.sizes.base,
    fontWeight: '600',
    fontFamily: typography.fonts.headingMedium,
    marginLeft: 12,
  },
  emailOptionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  emailOptionText: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: typography.sizes.sm,
    fontWeight: '500',
  },
  topDevRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
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
});
