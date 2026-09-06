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
import { Lock, Mail, AlertCircle } from 'lucide-react-native';
import { colors, typography, borderRadius, spacing } from '../../theme';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { GymFlowLogo, GymFlowWordmark } from '../../components/GymFlowBrand';

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

  if (!showEmailForm) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000000' }}>
        <Image 
          source={require('../../../assets/login-bg.png')} 
          style={{ position: 'absolute', width: '100%', height: '100%' }}
          resizeMode="cover"
        />
        <SafeAreaView style={{ flex: 1, padding: spacing.xl, paddingBottom: spacing.xxl }}>
          {/* Spacer to showcase the central GymFlow graphic embedded in the artwork */}
          <View style={{ flex: 1 }} />

          <View style={{ width: '100%' }}>
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: '#000000', borderWidth: 1, borderColor: '#333333', marginBottom: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
              onPress={() => setShowEmailForm(true)}
              activeOpacity={0.8}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 20, marginRight: 8, fontWeight: 'bold' }}></Text>
              <Text style={[styles.submitButtonText, { color: '#FFFFFF' }]}>Sign In with Apple</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E5E5', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl }]}
              onPress={() => setShowEmailForm(true)}
              activeOpacity={0.8}
            >
              <Mail size={20} color="#000000" style={{ marginRight: 8 }} />
              <Text style={[styles.submitButtonText, { color: '#000000' }]}>Sign In with Email</Text>
            </TouchableOpacity>

            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: 'rgba(0, 0, 0, 0.7)', fontSize: 14 }}>
                Don&apos;t have an account?{' '}
                <Text 
                  style={{ color: '#000000', fontWeight: 'bold' }} 
                  onPress={() => setShowEmailForm(true)}
                >
                  Sign up
                </Text>
              </Text>
            </View>
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
          <TouchableOpacity onPress={() => setShowEmailForm(false)} style={{ marginBottom: spacing.xl }}>
            <Text style={{ color: colors.textSecondary, fontWeight: '500' }}>← Back</Text>
          </TouchableOpacity>
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
    marginBottom: spacing.md,
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
});
