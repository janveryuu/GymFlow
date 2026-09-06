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
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, ArrowLeft, CheckCircle, HelpCircle } from 'lucide-react-native';
import { colors, typography, borderRadius, spacing } from '../../theme';
import { apiClient } from '../../api/client';

const forgotSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotFormData = z.infer<typeof forgotSchema>;

interface ForgotPasswordScreenProps {
  navigation: any;
}

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ navigation }) => {
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotFormData>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotFormData) => {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await apiClient.post('/api/v1/auth/forgot-password', {
        email: data.email.trim(),
      });
      setIsSuccess(true);
    } catch (err: any) {
      if (err?.response?.data?.message) {
        setErrorMessage(err.response.data.message);
      } else {
        setErrorMessage('Failed to send reset link. Please check your email and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Back to Login"
          >
            <ArrowLeft size={20} color={colors.text} />
            <Text style={styles.backText}>Back to Sign In</Text>
          </TouchableOpacity>

          <View style={styles.iconContainer}>
            {isSuccess ? (
              <View style={styles.successIconWrapper}>
                <CheckCircle size={40} color={colors.primary} />
              </View>
            ) : (
              <HelpCircle size={40} color={colors.primary} />
            )}
          </View>

          <View style={styles.card}>
            {isSuccess ? (
              <View style={styles.successContainer}>
                <Text style={styles.title}>Check Your Inbox</Text>
                <Text style={styles.subtitle}>
                  {"We've sent a password reset link to your email address. Follow the instructions to reset your password."}
                </Text>
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={() => navigation.navigate('Login')}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Return to Sign In"
                >
                  <Text style={styles.submitButtonText}>Return to Sign In</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <Text style={styles.title}>Reset Password</Text>
                <Text style={styles.subtitle}>
                  {"Enter your member email address and we'll send you instructions to reset your password."}
                </Text>

                {errorMessage ? (
                  <View style={styles.errorBanner} accessibilityRole="alert">
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                ) : null}

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
                          placeholder="member@gymflow.com"
                          placeholderTextColor={colors.textMuted}
                          autoCapitalize="none"
                          keyboardType="email-address"
                          autoCorrect={false}
                          onBlur={onBlur}
                          onChangeText={onChange}
                          value={value}
                          accessibilityLabel="Email address for reset link"
                        />
                      </View>
                    )}
                  />
                  {errors.email ? (
                    <Text style={styles.fieldError}>{errors.email.message}</Text>
                  ) : null}
                </View>

                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleSubmit(onSubmit)}
                  disabled={isSubmitting}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Send Reset Link"
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={colors.textInverse} />
                  ) : (
                    <Text style={styles.submitButtonText}>Send Reset Link</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
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
    padding: spacing.lg,
    justifyContent: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44, // 44px tap target
    marginBottom: spacing.lg,
    alignSelf: 'flex-start',
  },
  backText: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    marginLeft: spacing.xs,
    fontWeight: '500',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  successIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  successContainer: {
    alignItems: 'center',
  },
  title: {
    fontFamily: typography.fonts.headingBold,
    fontSize: typography.sizes.xxl,
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: spacing.lg,
    lineHeight: typography.lineHeights.sm,
  },
  errorBanner: {
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
  submitButton: {
    backgroundColor: colors.primary,
    minHeight: 52,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    width: '100%',
  },
  submitButtonText: {
    color: colors.textInverse,
    fontSize: typography.sizes.base,
    fontWeight: '700',
  },
});
