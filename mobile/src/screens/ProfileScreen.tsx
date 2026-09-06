import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import {
  User as UserIcon,
  Mail,
  Phone,
  Award,
  LogOut,
  Check,
  Sliders,
  Shield,
  Camera,
  Edit2,
  Scale,
} from 'lucide-react-native';
import { colors, typography, borderRadius, spacing } from '../theme';
import { useAuthStore } from '../store/authStore';
import { getSyncRepository } from '../sync/SyncRepository';
import { GymFlowLogo, GymFlowWordmark } from '../components/GymFlowBrand';
import { DevSettingsSection } from '../components/dev/DevSettingsSection';
import type { Preferences, MemberProfile } from '../types';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(7, 'Please enter a valid phone number'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export const ProfileScreen: React.FC = () => {
  const { user, setAuth, token, logout } = useAuthStore();
  const repo = getSyncRepository();

  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [memberData, setMemberData] = useState<MemberProfile | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [isSavingPref, setIsSavingPref] = useState(false);
  const [prefSaved, setPrefSaved] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || 'Member',
      email: user?.email || 'member@gymflow.com',
      phone: '+1 (555) 234-5678',
    },
  });

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const [pref, prof] = await Promise.all([
            repo.getPreferences(),
            repo.getProfile(),
          ]);
          if (!active) return;
          setPreferences(pref);
          if (prof) {
            setMemberData(prof);
            reset({
              name: prof.name || user?.name || 'Member',
              email: prof.email || user?.email || 'member@gymflow.com',
              phone: prof.phone || '+1 (555) 234-5678',
            });
            if (prof.photo_url) {
              setPhotoUri(prof.photo_url);
            }
          }
        } catch {
          // Offline fallback
        }
      })();
      return () => {
        active = false;
      };
    }, [repo, reset, user])
  );

  const handlePickPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Camera roll access is required to update your profile photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        const localUri = result.assets[0].uri;
        setPhotoUri(localUri);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Persist locally / optimistic
        await repo.updateProfile({ photo_url: localUri });
      }
    } catch {
      // Ignore
    }
  };

  const onSaveAccount = async (data: ProfileFormData) => {
    setIsSavingAccount(true);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Ignore
    }

    try {
      const updated = await repo.updateProfile({
        name: data.name,
        email: data.email,
        phone: data.phone,
      });

      if (token && user) {
        await setAuth(token, {
          ...user,
          name: updated.name || data.name,
          email: updated.email || data.email,
        });
      }

      setIsEditingAccount(false);
      Alert.alert('Profile Updated', 'Your account details have been saved successfully.');
    } catch {
      Alert.alert('Error', 'Unable to save profile details. Please try again.');
    } finally {
      setIsSavingAccount(false);
    }
  };

  const handleUpdateGoal = async (newGoal: number) => {
    setIsSavingPref(true);
    setPrefSaved(false);

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Ignore
    }

    try {
      const updated = await repo.updatePreferences({ weekly_workout_goal: newGoal });
      setPreferences(updated);
      setPrefSaved(true);
      setTimeout(() => setPrefSaved(false), 2000);
    } finally {
      setIsSavingPref(false);
    }
  };

  const handleUpdateIntensity = async (intensity: 'light' | 'moderate' | 'high') => {
    setIsSavingPref(true);
    setPrefSaved(false);

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Ignore
    }

    try {
      const updated = await repo.updatePreferences({ intensity });
      setPreferences(updated);
      setPrefSaved(true);
      setTimeout(() => setPrefSaved(false), 2000);
    } finally {
      setIsSavingPref(false);
    }
  };

  const handleUpdateWorkoutType = async (workout_type: string) => {
    setIsSavingPref(true);
    setPrefSaved(false);

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Ignore
    }

    try {
      const updated = await repo.updatePreferences({ workout_type });
      setPreferences(updated);
      setPrefSaved(true);
      setTimeout(() => setPrefSaved(false), 2000);
    } finally {
      setIsSavingPref(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of your GymFlow account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const membershipTier = memberData?.membership?.tier?.replace('_', ' ').toUpperCase() || 'ALL-ACCESS';
  const membershipStatus = memberData?.membership?.status?.toUpperCase() || 'ACTIVE';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header & Avatar */}
        <View style={styles.header}>
          <View style={styles.avatarWrapper}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <UserIcon size={36} color={colors.text} />
              </View>
            )}
            <TouchableOpacity
              style={styles.cameraBadge}
              onPress={handlePickPhoto}
              accessibilityRole="button"
              accessibilityLabel="Change profile picture"
            >
              <Camera size={14} color={colors.textInverse} />
            </TouchableOpacity>
          </View>

          <Text style={styles.name}>{user?.name || 'Member'}</Text>
          <Text style={styles.email}>{user?.email || 'member@gymflow.com'}</Text>

          {/* Membership Pill */}
          <View style={styles.badge}>
            <Award size={13} color={colors.textInverse} />
            <Text style={styles.badgeText}>
              TIER: {membershipTier} • {membershipStatus}
            </Text>
          </View>
        </View>

        {/* Membership Details Card */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Shield size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Membership Status</Text>
          </View>

          <View style={styles.membershipRow}>
            <View>
              <Text style={styles.membershipLabel}>Plan Tier</Text>
              <Text style={styles.membershipValue}>{membershipTier}</Text>
            </View>
            <View style={styles.statusIndicator}>
              <View style={styles.activeDot} />
              <Text style={styles.statusText}>{membershipStatus}</Text>
            </View>
          </View>

          <View style={styles.membershipExpiryRow}>
            <Text style={styles.expiryLabel}>Renewal Date:</Text>
            <Text style={styles.expiryValue}>
              {memberData?.membership?.expires_at
                ? new Date(memberData.membership.expires_at).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Dec 31, 2026'}
            </Text>
          </View>
        </View>

        {/* Workout Preferences Section */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Sliders size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Workout Preferences</Text>
          </View>

          {/* Weekly Goal */}
          <Text style={styles.fieldLabel}>Weekly Workout Goal</Text>
          <View style={styles.goalPillsRow}>
            {[2, 3, 4, 5, 6, 7].map((goal) => {
              const isSelected = (preferences?.weekly_workout_goal ?? 5) === goal;
              return (
                <TouchableOpacity
                  key={goal}
                  style={[styles.goalPill, isSelected && styles.goalPillActive]}
                  onPress={() => handleUpdateGoal(goal)}
                  accessibilityRole="button"
                  accessibilityLabel={`${goal} workouts per week`}
                >
                  <Text style={[styles.goalPillText, isSelected && styles.goalPillTextActive]}>
                    {goal}x / wk
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Intensity */}
          <Text style={styles.fieldLabel}>Target Intensity</Text>
          <View style={styles.goalPillsRow}>
            {(['light', 'moderate', 'high'] as const).map((lvl) => {
              const isSelected = (preferences?.intensity ?? 'moderate') === lvl;
              return (
                <TouchableOpacity
                  key={lvl}
                  style={[styles.goalPill, isSelected && styles.goalPillActive]}
                  onPress={() => handleUpdateIntensity(lvl)}
                  accessibilityRole="button"
                  accessibilityLabel={`Intensity: ${lvl}`}
                >
                  <Text style={[styles.goalPillText, isSelected && styles.goalPillTextActive]}>
                    {lvl.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Preferred Muscle Focus */}
          <Text style={styles.fieldLabel}>Primary Focus</Text>
          <View style={styles.goalPillsRow}>
            {['full-body', 'chest', 'back', 'leg', 'arm'].map((cat) => {
              const isSelected = (preferences?.workout_type ?? 'full-body') === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.goalPill, isSelected && styles.goalPillActive]}
                  onPress={() => handleUpdateWorkoutType(cat)}
                  accessibilityRole="button"
                  accessibilityLabel={`Focus: ${cat}`}
                >
                  <Text style={[styles.goalPillText, isSelected && styles.goalPillTextActive]}>
                    {cat === 'full-body' ? 'ALL' : cat.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {isSavingPref ? (
            <View style={styles.savedFeedback}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.savedText}>Saving preferences...</Text>
            </View>
          ) : prefSaved ? (
            <View style={styles.savedFeedback}>
              <Check size={14} color={colors.text} />
              <Text style={styles.savedText}>Preferences saved</Text>
            </View>
          ) : null}
        </View>

        {/* Member Account Details (with Edit / Save Mode) */}
        <View style={styles.card}>
          <View style={styles.cardHeaderWithAction}>
            <View style={styles.cardTitleRow}>
              <UserIcon size={18} color={colors.primary} />
              <Text style={styles.cardTitle}>Account Details</Text>
            </View>

            {!isEditingAccount ? (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setIsEditingAccount(true)}
                accessibilityRole="button"
                accessibilityLabel="Edit account information"
              >
                <Edit2 size={14} color={colors.text} style={{ marginRight: 4 }} />
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.actionButtonGroup}>
                <TouchableOpacity
                  style={styles.cancelEditButton}
                  onPress={() => {
                    reset();
                    setIsEditingAccount(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel edit"
                >
                  <Text style={styles.cancelEditText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveEditButton}
                  onPress={handleSubmit(onSaveAccount)}
                  disabled={isSavingAccount}
                  accessibilityRole="button"
                  accessibilityLabel="Save account changes"
                >
                  {isSavingAccount ? (
                    <ActivityIndicator size="small" color={colors.textInverse} />
                  ) : (
                    <Text style={styles.saveEditText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Member Name */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            <View style={[styles.inputBox, isEditingAccount && styles.inputBoxEditing]}>
              <UserIcon size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
              <Controller
                control={control}
                name="name"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={styles.inputText}
                    value={value}
                    onChangeText={onChange}
                    editable={isEditingAccount}
                    placeholderTextColor={colors.textMuted}
                    accessibilityLabel="Full Name"
                  />
                )}
              />
            </View>
            {errors.name ? <Text style={styles.errorText}>{errors.name.message}</Text> : null}
          </View>

          {/* Email Address */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Email Address</Text>
            <View style={[styles.inputBox, isEditingAccount && styles.inputBoxEditing]}>
              <Mail size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={styles.inputText}
                    value={value}
                    onChangeText={onChange}
                    editable={isEditingAccount}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor={colors.textMuted}
                    accessibilityLabel="Email Address"
                  />
                )}
              />
            </View>
            {errors.email ? <Text style={styles.errorText}>{errors.email.message}</Text> : null}
          </View>

          {/* Phone Number */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Phone Number</Text>
            <View style={[styles.inputBox, isEditingAccount && styles.inputBoxEditing]}>
              <Phone size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
              <Controller
                control={control}
                name="phone"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={styles.inputText}
                    value={value}
                    onChangeText={onChange}
                    editable={isEditingAccount}
                    keyboardType="phone-pad"
                    placeholderTextColor={colors.textMuted}
                    accessibilityLabel="Phone Number"
                  />
                )}
              />
            </View>
            {errors.phone ? <Text style={styles.errorText}>{errors.phone.message}</Text> : null}
          </View>
        </View>

        {/* Mandatory CC BY-SA 4.0 Attribution & Credits Card */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Scale size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Credits & Licensing</Text>
          </View>

          <Text style={styles.legalBody}>
            Workout illustrations provided by Bryl Lim via workout-guide (CC BY-SA 4.0). Based on exercise animations created by Everkinetic.
          </Text>

          <View style={styles.licenseBadge}>
            <Text style={styles.licenseText}>
              Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
            </Text>
          </View>
        </View>

        {/* In-App Developer & Mock Settings */}
        {__DEV__ && <DevSettingsSection />}

        {/* Sign Out Button */}
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Sign out of your account"
        >
          <LogOut size={18} color={colors.text} style={{ marginRight: 8 }} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* GymFlow Official Brand Footer */}
        <View style={styles.brandFooter}>
          <View style={styles.brandFooterLogoRow}>
            <GymFlowLogo size={20} />
            <GymFlowWordmark height={16} style={{ marginLeft: spacing.xs }} />
          </View>
          <Text style={styles.brandFooterText}>v0.1.0 • Built for Peak Performance</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 110,
  },
  header: {
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: spacing.xs,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarImage: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  name: {
    fontFamily: typography.fonts.headingBold,
    fontSize: typography.sizes.xl,
    color: colors.text,
  },
  email: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    marginTop: spacing.sm,
  },
  badgeText: {
    color: colors.textInverse,
    fontSize: 10,
    marginLeft: 4,
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeaderWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontFamily: typography.fonts.headingBold,
    fontSize: typography.sizes.base,
    color: colors.text,
    marginLeft: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editText: {
    fontSize: typography.sizes.xs,
    color: colors.text,
    fontWeight: '500',
  },
  actionButtonGroup: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  cancelEditButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  cancelEditText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  saveEditButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    minWidth: 48,
    alignItems: 'center',
  },
  saveEditText: {
    fontSize: typography.sizes.xs,
    color: colors.textInverse,
    fontWeight: '700',
  },
  membershipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  membershipLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  membershipValue: {
    fontSize: typography.sizes.base,
    color: colors.text,
    marginTop: 2,
    fontWeight: '600',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.text,
    marginRight: 6,
  },
  statusText: {
    fontSize: 10,
    color: colors.text,
    fontWeight: '700',
  },
  membershipExpiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: spacing.xs,
    marginTop: spacing.xs,
  },
  expiryLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  expiryValue: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  field: {
    marginBottom: spacing.xs,
  },
  fieldLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginBottom: 4,
    marginTop: 6,
    fontWeight: '500',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    minHeight: 44,
  },
  inputBoxEditing: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
  },
  inputText: {
    flex: 1,
    color: colors.text,
    fontSize: typography.sizes.sm,
  },
  errorText: {
    color: colors.error,
    fontSize: 10,
    marginTop: 2,
  },
  goalPillsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
    gap: 4,
  },
  goalPill: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  goalPillText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  goalPillTextActive: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  savedFeedback: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  savedText: {
    color: colors.text,
    fontSize: 11,
    marginLeft: 4,
  },
  legalBody: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  licenseBadge: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  licenseText: {
    fontSize: 10,
    color: colors.textMuted,
    lineHeight: 14,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    minHeight: 50,
    marginTop: spacing.xs,
  },
  signOutText: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    fontWeight: '600',
  },
  brandFooter: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
  },
  brandFooterLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  brandFooterText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
});

