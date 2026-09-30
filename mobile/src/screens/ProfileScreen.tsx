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
  Switch,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft,
  User as UserIcon,
  Mail,
  Phone,
  Award,
  LogOut,
  Check,
  Sliders,
  Camera,
  Edit2,
  Scale,
  ChevronRight,
  Bell,
  FileText,
  HelpCircle,
  X,
  Code,
} from '../components/icons';
import { colors, typography, borderRadius, spacing } from '../theme';
import { useAuthStore } from '../store/authStore';
import { getSyncRepository } from '../sync/SyncRepository';
import { GymFlowLogo, GymFlowWordmark } from '../components/GymFlowBrand';
import { DevSettingsSection } from '../components/dev/DevSettingsSection';
import { DarkVeil } from '../components/DarkVeil';
import { SquishSwitch } from '../components/SquishSwitch';
import type { Preferences, MemberProfile } from '../types';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(7, 'Please enter a valid phone number'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, setAuth, token, logout } = useAuthStore();
  const repo = getSyncRepository();

  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [memberData, setMemberData] = useState<MemberProfile | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // Settings Toggles
  const [remindersEnabled, setRemindersEnabled] = useState(true);

  // Modals for sub-sections
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [isWorkoutPrefOpen, setIsWorkoutPrefOpen] = useState(false);
  const [isSavingPref, setIsSavingPref] = useState(false);
  const [prefSaved, setPrefSaved] = useState(false);
  const [isMembershipOpen, setIsMembershipOpen] = useState(false);
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isDevOpen, setIsDevOpen] = useState(false);

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
      {/* Luminous Animated Dark Veil Background (Identical to Homescreen, Silk Folds in Pure White) */}
      <DarkVeil
        speed={0.35}
        warpAmount={0.25}
        noiseIntensity={0.01}
        whiteMode={true}
      />

      {/* Top Header matching Apple iOS Navigation Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerCircleBtn}
          onPress={() => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch {}
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('DashboardTab');
            }
          }}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={18} color="#FFFFFF" strokeWidth={2.2} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Settings</Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Upper Profile Section - Centered Apple ID layout */}
        <View style={styles.profileHeaderSection}>
          <TouchableOpacity
            style={styles.profileAvatarWrapper}
            onPress={async () => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
              await handlePickPhoto();
            }}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Change profile picture"
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.profileAvatarImage} />
            ) : (
              <Image
                source={{
                  uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
                }}
                style={styles.profileAvatarImage}
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.profileNameRow}
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
              setIsEditingAccount(true);
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="View and edit account profile"
          >
            <Text style={styles.profileNameText} numberOfLines={1}>
              {user?.name || 'Budiarti R'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
              setIsEditingAccount(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.profileEmailText}>
              {user?.email || 'member@gymflow.com'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Section 1: Preferences */}
        <Text style={styles.sectionHeader}>Preferences</Text>
        <View style={styles.groupedCard}>
          {/* Workout Reminders */}
          <View style={styles.groupedItem}>
            <Bell size={19} color="rgba(255, 255, 255, 0.48)" strokeWidth={2} style={styles.groupedItemIcon} />
            <View style={styles.groupedItemTextCol}>
              <Text style={styles.groupedItemTitle}>Workout reminders</Text>
              <Text style={styles.groupedItemSubtitle}>Daily streak & session notifications</Text>
            </View>
            <SquishSwitch
              checked={remindersEnabled}
              onChange={setRemindersEnabled}
              trackColor="#27272a"
              trackOnColor="#FFFFFF"
              thumbColor="#52525b"
              thumbOnColor="#000000"
              width={44}
              height={26}
              radius={13}
              stretch={36}
              ariaLabel="Workout reminders toggle"
            />
          </View>

          <View style={styles.groupedDivider} />

          {/* Workout Preferences */}
          <TouchableOpacity
            style={styles.groupedItem}
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
              setIsWorkoutPrefOpen(true);
            }}
            activeOpacity={0.7}
          >
            <Sliders size={19} color="rgba(255, 255, 255, 0.48)" strokeWidth={2} style={styles.groupedItemIcon} />
            <View style={styles.groupedItemTextCol}>
              <Text style={styles.groupedItemTitle}>Workout preferences</Text>
              <Text style={styles.groupedItemSubtitle}>
                {preferences?.weekly_workout_goal ?? 5}x/wk • {(preferences?.intensity ?? 'moderate').toUpperCase()} • {preferences?.workout_type ? preferences.workout_type.toUpperCase() : 'ALL'}
              </Text>
            </View>
            <ChevronRight size={17} color="rgba(255, 255, 255, 0.35)" />
          </TouchableOpacity>
        </View>

        {/* Section 2: Account & Biometrics */}
        <Text style={styles.sectionHeader}>Account & Calibration</Text>
        <View style={styles.groupedCard}>
          {/* Physical Calibration */}
          <TouchableOpacity
            style={styles.groupedItem}
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
              navigation.navigate('ProfileSetup');
            }}
            activeOpacity={0.7}
          >
            <Scale size={19} color="rgba(255, 255, 255, 0.48)" strokeWidth={2} style={styles.groupedItemIcon} />
            <View style={styles.groupedItemTextCol}>
              <Text style={styles.groupedItemTitle}>Biometrics & calibration</Text>
              <Text style={styles.groupedItemSubtitle}>
                {user?.is_profile_completed
                  ? 'Gender, weight & height calibrated'
                  : 'Calibration required'}
              </Text>
            </View>
            <ChevronRight size={17} color="rgba(255, 255, 255, 0.35)" />
          </TouchableOpacity>

          <View style={styles.groupedDivider} />

          {/* Account Details */}
          <TouchableOpacity
            style={styles.groupedItem}
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
              setIsEditingAccount(true);
            }}
            activeOpacity={0.7}
          >
            <UserIcon size={19} color="rgba(255, 255, 255, 0.48)" strokeWidth={2} style={styles.groupedItemIcon} />
            <View style={styles.groupedItemTextCol}>
              <Text style={styles.groupedItemTitle}>Account details</Text>
              <Text style={styles.groupedItemSubtitle}>Name, email & phone number</Text>
            </View>
            <ChevronRight size={17} color="rgba(255, 255, 255, 0.35)" />
          </TouchableOpacity>
        </View>

        {/* Section 3: App, Legal & Support */}
        <Text style={styles.sectionHeader}>About & Legal</Text>
        <View style={styles.groupedCard}>
          {/* Credits & Licensing */}
          <TouchableOpacity
            style={styles.groupedItem}
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
              setIsLegalOpen(true);
            }}
            activeOpacity={0.7}
          >
            <Award size={19} color="rgba(255, 255, 255, 0.48)" strokeWidth={2} style={styles.groupedItemIcon} />
            <View style={styles.groupedItemTextCol}>
              <Text style={styles.groupedItemTitle}>Credits & licensing</Text>
              <Text style={styles.groupedItemSubtitle}>CC BY-SA 4.0 Attribution</Text>
            </View>
            <ChevronRight size={17} color="rgba(255, 255, 255, 0.35)" />
          </TouchableOpacity>

          <View style={styles.groupedDivider} />

          {/* Terms & Privacy */}
          <TouchableOpacity
            style={styles.groupedItem}
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
              setIsHelpOpen(true);
            }}
            activeOpacity={0.7}
          >
            <HelpCircle size={19} color="rgba(255, 255, 255, 0.48)" strokeWidth={2} style={styles.groupedItemIcon} />
            <View style={styles.groupedItemTextCol}>
              <Text style={styles.groupedItemTitle}>Terms & privacy policy</Text>
              <Text style={styles.groupedItemSubtitle}>User guidelines & safety</Text>
            </View>
            <ChevronRight size={17} color="rgba(255, 255, 255, 0.35)" />
          </TouchableOpacity>

          {/* Developer Settings (if in __DEV__) */}
          {__DEV__ && (
            <>
              <View style={styles.groupedDivider} />
              <TouchableOpacity
                style={styles.groupedItem}
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                  setIsDevOpen(true);
                }}
                activeOpacity={0.7}
              >
                <Code size={19} color="rgba(255, 255, 255, 0.48)" strokeWidth={2} style={styles.groupedItemIcon} />
                <View style={styles.groupedItemTextCol}>
                  <Text style={styles.groupedItemTitle}>Developer settings</Text>
                  <Text style={styles.groupedItemSubtitle}>Mock, sync & cache diagnostics</Text>
                </View>
                <ChevronRight size={17} color="rgba(255, 255, 255, 0.35)" />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Bottom Action: Log Out Solid Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch {}
            handleSignOut();
          }}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Log out of GymFlow"
        >
          <LogOut size={18} color="#FFFFFF" strokeWidth={2.2} style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        {/* Official GymFlow Brand Footer */}
        <View style={styles.brandFooter}>
          <View style={styles.brandFooterLogoRow}>
            <GymFlowLogo size={18} />
            <GymFlowWordmark height={14} style={{ marginLeft: spacing.xs }} />
          </View>
          <Text style={styles.brandFooterText}>v0.1.0 • Built for Peak Performance</Text>
        </View>
      </ScrollView>

      {/* ===================== MODALS ===================== */}

      {/* Account Details Modal */}
      <Modal
        visible={isEditingAccount}
        transparent
        animationType="slide"
        onRequestClose={() => setIsEditingAccount(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setIsEditingAccount(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalDragHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Account Details</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setIsEditingAccount(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <X size={16} color="rgba(255, 255, 255, 0.7)" />
              </TouchableOpacity>
            </View>

            {/* Photo Avatar Preview */}
            <View style={styles.modalAvatarRow}>
              <View style={styles.heroAvatarWrapper}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.heroAvatarImage} />
                ) : (
                  <View style={styles.heroAvatar}>
                    <UserIcon size={24} color={colors.text} />
                  </View>
                )}
              </View>
              <TouchableOpacity style={styles.changePhotoBtn} onPress={handlePickPhoto}>
                <Camera size={14} color={colors.text} style={{ marginRight: 6 }} />
                <Text style={styles.changePhotoText}>Change Photo</Text>
              </TouchableOpacity>
            </View>

            {/* Name Input */}
            <View style={styles.modalField}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              <View style={styles.inputBox}>
                <UserIcon size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
                <Controller
                  control={control}
                  name="name"
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      style={styles.inputText}
                      value={value}
                      onChangeText={onChange}
                      placeholderTextColor={colors.textMuted}
                    />
                  )}
                />
              </View>
              {errors.name ? <Text style={styles.errorText}>{errors.name.message}</Text> : null}
            </View>

            {/* Email Input */}
            <View style={styles.modalField}>
              <Text style={styles.fieldLabel}>Email Address</Text>
              <View style={styles.inputBox}>
                <Mail size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      style={styles.inputText}
                      value={value}
                      onChangeText={onChange}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      placeholderTextColor={colors.textMuted}
                    />
                  )}
                />
              </View>
              {errors.email ? <Text style={styles.errorText}>{errors.email.message}</Text> : null}
            </View>

            {/* Phone Input */}
            <View style={styles.modalField}>
              <Text style={styles.fieldLabel}>Phone Number</Text>
              <View style={styles.inputBox}>
                <Phone size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
                <Controller
                  control={control}
                  name="phone"
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      style={styles.inputText}
                      value={value}
                      onChangeText={onChange}
                      keyboardType="phone-pad"
                      placeholderTextColor={colors.textMuted}
                    />
                  )}
                />
              </View>
              {errors.phone ? <Text style={styles.errorText}>{errors.phone.message}</Text> : null}
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={styles.modalPrimaryBtn}
              onPress={handleSubmit(onSaveAccount)}
              disabled={isSavingAccount}
            >
              {isSavingAccount ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <Text style={styles.modalPrimaryBtnText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Workout Preferences Modal */}
      <Modal
        visible={isWorkoutPrefOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsWorkoutPrefOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setIsWorkoutPrefOpen(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalDragHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Workout Preferences</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setIsWorkoutPrefOpen(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <X size={16} color="rgba(255, 255, 255, 0.7)" />
              </TouchableOpacity>
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
                  >
                    <Text style={[styles.goalPillText, isSelected && styles.goalPillTextActive]}>
                      {goal}x
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
                  >
                    <Text style={[styles.goalPillText, isSelected && styles.goalPillTextActive]}>
                      {cat === 'full-body' ? 'ALL' : cat.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Live save feedback */}
            {isSavingPref ? (
              <View style={styles.savedFeedback}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.savedText}>Saving preferences…</Text>
              </View>
            ) : prefSaved ? (
              <View style={styles.savedFeedback}>
                <Check size={14} color={colors.success} />
                <Text style={styles.savedText}>Preferences saved</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.modalPrimaryBtn, { marginTop: 20 }]}
              onPress={() => setIsWorkoutPrefOpen(false)}
            >
              <Text style={styles.modalPrimaryBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Membership Details Modal */}
      <Modal
        visible={isMembershipOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsMembershipOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setIsMembershipOpen(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalDragHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Membership Status</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setIsMembershipOpen(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <X size={16} color="rgba(255, 255, 255, 0.7)" />
              </TouchableOpacity>
            </View>

            <View style={styles.membershipDetailsCard}>
              <View style={styles.membershipRow}>
                <Text style={styles.membershipLabel}>PLAN TIER</Text>
                <Text style={styles.membershipValue}>{membershipTier}</Text>
              </View>
              <View style={styles.membershipRow}>
                <Text style={styles.membershipLabel}>STATUS</Text>
                <View style={styles.statusIndicator}>
                  <View style={styles.activeDot} />
                  <Text style={styles.statusText}>{membershipStatus}</Text>
                </View>
              </View>
              <View style={styles.membershipRow}>
                <Text style={styles.membershipLabel}>RENEWAL DATE</Text>
                <Text style={styles.membershipValue}>
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

            <TouchableOpacity
              style={[styles.modalPrimaryBtn, { marginTop: 20 }]}
              onPress={() => setIsMembershipOpen(false)}
            >
              <Text style={styles.modalPrimaryBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Credits & Licensing Modal */}
      <Modal
        visible={isLegalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsLegalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setIsLegalOpen(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalDragHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Credits & Licensing</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setIsLegalOpen(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <X size={16} color="rgba(255, 255, 255, 0.7)" />
              </TouchableOpacity>
            </View>

            <Text style={styles.legalBody}>
              Workout illustrations provided by Bryl Lim via workout-guide (CC BY-SA 4.0). Based on exercise animations created by Everkinetic.
            </Text>

            <View style={styles.licenseBadge}>
              <Text style={styles.licenseText}>
                Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.modalPrimaryBtn, { marginTop: 24 }]}
              onPress={() => setIsLegalOpen(false)}
            >
              <Text style={styles.modalPrimaryBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Help & Terms Modal */}
      <Modal
        visible={isHelpOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsHelpOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setIsHelpOpen(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalDragHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Terms & Privacy Policy</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setIsHelpOpen(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <X size={16} color="rgba(255, 255, 255, 0.7)" />
              </TouchableOpacity>
            </View>

            <Text style={styles.legalBody}>
              GymFlow is committed to protecting your biometric and workout telemetry. All training data is secured with local cryptographic integrity and end-to-end synchronization.
            </Text>
            <Text style={[styles.legalBody, { marginTop: 8 }]}>
              By using GymFlow, you agree to our standard training liability waiver and gym etiquette policies.
            </Text>

            <TouchableOpacity
              style={[styles.modalPrimaryBtn, { marginTop: 24 }]}
              onPress={() => setIsHelpOpen(false)}
            >
              <Text style={styles.modalPrimaryBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Dev Settings Modal */}
      {__DEV__ && (
        <Modal
          visible={isDevOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setIsDevOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setIsDevOpen(false)}
            />
            <View style={[styles.modalContent, { maxHeight: '90%' }]}>
              <View style={styles.modalDragHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Developer Panel</Text>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setIsDevOpen(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.7}
                >
                  <X size={16} color="rgba(255, 255, 255, 0.7)" />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <DevSettingsSection />
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    position: 'relative',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 2,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(25px) saturate(180%)',
      WebkitBackdropFilter: 'blur(25px) saturate(180%)',
      transition: 'all 0.2s cubic-bezier(0.25, 1, 0.5, 1)',
    } as any : {}),
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: typography.fonts.headingBold,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.41,
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 110,
  },

  // Upper Profile Section (Centered Apple ID Layout)
  profileHeaderSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 18,
  },
  profileAvatarWrapper: {
    position: 'relative',
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 4,
  },
  profileAvatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  profileNameText: {
    fontFamily: typography.fonts.headingBold,
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.35,
  },
  profileEmailText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.55)',
    marginTop: 3,
    fontWeight: '400',
    letterSpacing: -0.15,
  },

  // Section Headers
  sectionHeader: {
    fontSize: 12,
    fontFamily: typography.fonts.headingBold,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.45)',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginLeft: 16,
    marginBottom: 8,
    marginTop: 20,
  },

  // Grouped Inset Cards (Apple HIG Material)
  groupedCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 2,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(25px) saturate(180%)',
      WebkitBackdropFilter: 'blur(25px) saturate(180%)',
    } as any : {}),
  },
  groupedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 52,
  },
  groupedItemIcon: {
    marginRight: 14,
  },
  groupedItemTextCol: {
    flex: 1,
  },
  groupedItemTitle: {
    fontSize: 16,
    fontFamily: typography.fonts.headingMedium,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  groupedItemSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.48)',
    marginTop: 2,
    letterSpacing: -0.1,
  },
  groupedDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    marginLeft: 50,
  },

  // Bottom Log Out Button
  logoutButton: {
    height: 50,
    borderRadius: 14,
    backgroundColor: '#FF453A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 10,
    shadowColor: '#FF453A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: typography.fonts.headingBold,
    fontWeight: '700',
  },

  // Brand Footer
  brandFooter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  brandFooterLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  brandFooterText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.40)',
    letterSpacing: 0.3,
  },

  // Apple Sheet Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Platform.OS === 'web' ? 'rgba(22, 22, 28, 0.88)' : 'rgba(24, 24, 30, 0.96)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.20)',
    padding: 20,
    maxHeight: '85%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 12,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(30px) saturate(190%)',
      WebkitBackdropFilter: 'blur(30px) saturate(190%)',
    } as any : {}),
  },
  modalDragHandle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.30)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: typography.fonts.headingBold,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  heroAvatarWrapper: {
    position: 'relative',
    marginRight: 4,
  },
  heroAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  heroAvatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  changePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  changePhotoText: {
    fontSize: typography.sizes.xs,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalField: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.60)',
    marginBottom: 6,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  inputText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
  },
  errorText: {
    color: '#FF453A',
    fontSize: 11,
    marginTop: 3,
  },
  modalPrimaryBtn: {
    backgroundColor: '#FFFFFF',
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  modalPrimaryBtnText: {
    color: '#000000',
    fontSize: 15,
    fontFamily: typography.fonts.headingBold,
    fontWeight: '700',
  },

  // Goal & Intensity Pills
  goalPillsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 6,
  },
  goalPill: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 10,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalPillActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  goalPillText: {
    fontSize: typography.sizes.xs,
    color: 'rgba(255, 255, 255, 0.65)',
    fontWeight: '500',
  },
  goalPillTextActive: {
    color: '#000000',
    fontWeight: '700',
  },
  savedFeedback: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    gap: 6,
  },
  savedText: {
    color: '#FFFFFF',
    fontSize: 12,
  },

  // Membership modal card
  membershipDetailsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    gap: 12,
  },
  membershipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  membershipLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.45)',
    fontWeight: '600',
  },
  membershipValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(48, 209, 88, 0.3)',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#30D158',
    marginRight: 5,
  },
  statusText: {
    fontSize: 10,
    color: '#30D158',
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Legal
  legalBody: {
    fontSize: typography.sizes.xs,
    color: 'rgba(255, 255, 255, 0.70)',
    lineHeight: 18,
    marginBottom: 10,
  },
  licenseBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  licenseText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.50)',
    lineHeight: 16,
  },
});
