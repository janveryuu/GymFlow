import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Check, Calendar as CalendarIcon, Flame, Clock, Bell, MapPin, User, Sparkles, ChevronRight, Dumbbell, TrendingUp, Droplets, Salad, Bot, Lock } from 'lucide-react-native';
import { colors, typography, borderRadius, spacing } from '../theme';
import { PercentRing } from '../components/PercentRing';
import { WorkoutCardSkeleton, SessionCardSkeleton } from '../components/SkeletonLoader';
import { EmptyState } from '../components/EmptyState';
import { ErrorCard } from '../components/ErrorCard';
import { WorkoutIllustration } from '../components/WorkoutIllustration';
import { getSyncRepository } from '../sync/SyncRepository';
import { mergeWorkouts, filterMergedCatalog } from '../sync/workoutMerge';
import { getDatabase } from '../db/connection';
import { useAuthStore } from '../store/authStore';
import { calculateDailyCalorieTarget } from '../utils/nutritionCalculator';
import type { Session, ProgressHistoryResponse, MergedWorkout } from '../types';

interface DashboardScreenProps {
  navigation: any;
  route?: any;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation, route }) => {
  const user = useAuthStore((state) => state.user);
  const isProfileComplete = Boolean(user?.is_profile_completed);

  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showProfileRequiredModal, setShowProfileRequiredModal] = useState(false);
  const [blockedFeatureName, setBlockedFeatureName] = useState<string>('Nutrition Tracker');

  useEffect(() => {
    if (route?.params?.profileSetupJustCompleted) {
      setShowCompletionModal(true);
      if (navigation.setParams) {
        navigation.setParams({ profileSetupJustCompleted: undefined });
      }
    }
  }, [route?.params?.profileSetupJustCompleted, navigation]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [todaySession, setTodaySession] = useState<Session | null>(null);
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [selectedDayOffset, setSelectedDayOffset] = useState<number>(() => {
    const today = new Date().getDay(); // 0 is Sun, 1 is Mon
    return today === 0 ? 6 : today - 1; // 0 for Mon ... 6 for Sun
  });
  const [featuredWorkouts, setFeaturedWorkouts] = useState<MergedWorkout[]>([]);
  const [progressData, setProgressData] = useState<ProgressHistoryResponse | null>(null);
  const [preferences, setPreferences] = useState<any | null>(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [nutritionConsumed, setNutritionConsumed] = useState<number>(0);
  const [nutritionTarget, setNutritionTarget] = useState<number>(2000);

  const repo = getSyncRepository();

  const weekDays = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay();
    const distToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(now);
    monday.setDate(now.getDate() + distToMonday);

    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const isoDate = d.toISOString().split('T')[0] ?? '';
      const isToday = d.toDateString() === now.toDateString();
      days.push({
        dayName: dayNames[i] as string,
        dayNumber: d.getDate(),
        isoDate,
        isToday,
        fullDate: d,
      });
    }
    return days;
  }, []);

  const daysWithSessions = useMemo(() => {
    const dates = new Set<string>();
    for (const s of allSessions) {
      if (!s.is_cancelled && !s.status?.includes('cancelled') && s.starts_at) {
        dates.add(s.starts_at.split('T')[0] ?? '');
      }
    }
    return dates;
  }, [allSessions]);

  const selectedDayIso = weekDays[selectedDayOffset]?.isoDate ?? '';
  const daySessions = useMemo(() => {
    return allSessions.filter(
      (s) => !s.is_cancelled && !s.status?.includes('cancelled') && s.starts_at?.startsWith(selectedDayIso)
    );
  }, [allSessions, selectedDayIso]);

  const loadDashboardData = useCallback(async (forceRefresh = false) => {
    setError(null);
    try {
      const [sessions, rawWorkouts, progress, prefs] = await Promise.all([
        repo.getSessions({ forceRefresh }),
        repo.getWorkouts({ forceRefresh }),
        repo.getProgressHistory('week', { forceRefresh }),
        repo.getPreferences({ forceRefresh }),
      ]);

      setPreferences(prefs);

      const now = new Date();
      const isToday = (dateStr: string) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return (
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth() &&
          d.getDate() === now.getDate()
        );
      };

      // Find session for today or next upcoming session
      const validSessions = sessions.filter((s) => !s.is_cancelled && !s.status?.includes('cancelled'));
      setAllSessions(validSessions);
      const todaySessions = validSessions.filter((s) => isToday(s.starts_at));
      let activeSession = todaySessions[0] ?? null;
      if (!activeSession) {
        const upcoming = validSessions.filter(
          (s) => s.starts_at && new Date(s.starts_at) >= now
        );
        activeSession = upcoming[0] ?? null;
      }

      setTodaySession(activeSession);
      if (activeSession) {
        setIsCheckedIn(Boolean(activeSession.checked_in));
      }

      // Merge workouts and recommend based on member preferences
      const merged = mergeWorkouts(rawWorkouts);
      const targetCategory = prefs?.workout_type && prefs.workout_type !== 'full-body'
        ? prefs.workout_type
        : undefined;
      const targetDifficulty = prefs?.intensity === 'light'
        ? 'beginner'
        : prefs?.intensity === 'high'
        ? 'advanced'
        : 'intermediate';

      let recommended = filterMergedCatalog(merged, {
        category: targetCategory,
        difficulty: targetDifficulty,
      });

      if (recommended.length < 5) {
        recommended = merged.slice(0, 5);
      } else {
        recommended = recommended.slice(0, 5);
      }

      setFeaturedWorkouts(recommended);
      setProgressData(progress);

        // Load today's nutrition entries and target
        try {
          const db = await getDatabase();
          const d = new Date();
          const todayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          const res = await db.getFirstAsync<{ total: number | null }>(
            `SELECT SUM(calories) as total FROM NutritionEntry WHERE date_key = ?`,
            [todayKey]
          );
          const prefRow = await db.getFirstAsync<{ daily_nutrition_target_calories: number | null; fitness_goal?: string | null }>(
            `SELECT daily_nutrition_target_calories, fitness_goal FROM Preferences WHERE id = ?`,
            ['default']
          );

          let activeTarget = prefRow?.daily_nutrition_target_calories || prefs?.daily_nutrition_target_calories;

          // Auto-calculate intake target if user profile exists but target hasn't been cached yet
          if (!activeTarget && user?.weight_kg && user?.height_cm) {
            const calculated = calculateDailyCalorieTarget({
              weightKg: user.weight_kg,
              heightCm: user.height_cm,
              gender: user.gender || 'male',
              birthdate: user.birthdate,
              fitnessGoal: user.fitness_goal || prefRow?.fitness_goal || 'build_muscle',
            });
            activeTarget = calculated.targetCalories;
            try {
              await db.runAsync(
                `UPDATE Preferences SET daily_nutrition_target_calories = ? WHERE id = 'default'`,
                [activeTarget]
              );
            } catch {}
          }

          if (activeTarget) {
            setNutritionTarget(activeTarget);
          }

          // Consume 0 calories by default if no entries logged today
          setNutritionConsumed(res?.total ?? 0);
        } catch {
          // Fallback for mock/test environments
        }
    } catch {
      setError('Unable to refresh dashboard data. Showing cached information.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [repo]);

  // Re-fetch/re-validate automatically whenever Home tab is tapped / focused
  useFocusEffect(
    useCallback(() => {
      loadDashboardData(false);
    }, [loadDashboardData])
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadDashboardData(true);
  };

  const handleCheckIn = async () => {
    if (!todaySession || isCheckedIn) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Haptics unavailable in test/browser
    }

    setIsCheckedIn(true);
    await repo.recordAttendance(todaySession.id);
  };

  const handleCheckInSession = async (session: Session) => {
    if (session.checked_in) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Haptics unavailable in test/browser
    }
    setIsCheckedIn(true);
    await repo.recordAttendance(session.id);
    setAllSessions((prev) =>
      prev.map((s) => (s.id === session.id ? { ...s, checked_in: true } : s))
    );
    if (todaySession && todaySession.id === session.id) {
      setTodaySession((prev) => (prev ? { ...prev, checked_in: true } : prev));
    }
  };

  const weeklyGoalDenominator = preferences?.weekly_workout_goal ?? 10;
  const completedCount = progressData?.total_workouts ?? 0;
  const weeklyGoalPercentage = weeklyGoalDenominator > 0
    ? Math.min(100, Math.round((completedCount / weeklyGoalDenominator) * 100))
    : 0;
  const nutritionPercentage = nutritionTarget > 0
    ? Math.min(100, Math.round((nutritionConsumed / nutritionTarget) * 100))
    : 0;

  const isTodaySession = todaySession
    ? Boolean(todaySession.starts_at && new Date(todaySession.starts_at).toDateString() === new Date().toDateString())
    : false;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header greeting & notifications */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              source={require('../../assets/gymflow-nobg.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <View>
              <Text style={styles.greeting}>Welcome back,</Text>
              <Text style={styles.userName}>{user?.name || 'Member'}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={styles.streakButton}
              onPress={() => navigation.navigate('StreakScreen')}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Daily Streak"
            >
              <Image
                source={require('../../assets/gif/Fire Streak Orange.gif')}
                style={styles.streakGif}
                resizeMode="contain"
              />
              <Text style={styles.streakText}>14</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={() => {
                Alert.alert('Notifications', 'You have no unread notifications. All caught up!');
              }}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
            >
              <Bell size={18} color="#FFFFFF" /> 
            </TouchableOpacity>
          </View>
        </View>

        {error ? <ErrorCard message={error} onRetry={() => loadDashboardData(true)} /> : null}

        {isLoading ? (
          <View>
            <SessionCardSkeleton />
            <WorkoutCardSkeleton />
          </View>
        ) : (
          <>
            {/* Finish Profile Setup Card (for New / Incomplete Profile) */}
            {!isProfileComplete && (
              <View style={styles.profileSetupCard}>
                <View style={styles.profileSetupTop}>
                  <Text style={styles.profileSetupStepsCount}>4 quick steps</Text>
                </View>

                <Text style={styles.profileSetupTitle}>Finish Your Profile Setup</Text>
                <Text style={styles.profileSetupSubtitle}>
                  Set your gender, birthdate, weight, and height to calibrate your workouts & caloric burn targets.
                </Text>

                <TouchableOpacity
                  style={styles.profileSetupButton}
                  onPress={() => navigation.navigate('ProfileSetup')}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Finish Your Profile Setup"
                >
                  <Text style={styles.profileSetupButtonText}>Set Up Profile</Text>
                  <ChevronRight size={16} color="#000000" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            )}

            {/* Daily Nutrition Card */}
            <View style={styles.nutritionCard}>
              {/* Left Side: Ring showing calories remaining */}
              <View style={styles.nutritionRingWrapper}>
                <PercentRing
                  percentage={nutritionPercentage}
                  size={130}
                  strokeWidth={10}
                  showPercentageText={false}
                  color="#FFD600"
                  trackColor="#2C2C2E"
                  textColor="#FFFFFF"
                />
                {/* Overlay: remaining calories + LEFT label */}
                <View style={styles.nutritionRingOverlay}>
                  <Text style={styles.nutritionRingCalories}>
                    {Math.max(0, nutritionTarget - nutritionConsumed).toLocaleString()}
                  </Text>
                  <Text style={styles.nutritionRingLabel}>LEFT</Text>
                </View>
              </View>

              {/* Right Side: Title, stats, white View Details button */}
              <View style={styles.nutritionRightContent}>
                <Text style={styles.nutritionTitle}>Daily Nutrition</Text>

                <View style={styles.nutritionStatsList}>
                  <View style={styles.nutritionStatRow}>
                    <Text style={styles.nutritionStatLabel}>Consumed:</Text>
                    <Text style={styles.nutritionStatValue}>
                      {nutritionConsumed === 0 ? '0 cal' : `${nutritionConsumed.toLocaleString()} cal`}
                    </Text>
                  </View>
                  <View style={styles.nutritionStatRow}>
                    <Text style={styles.nutritionStatLabel}>Intake:</Text>
                    <Text style={styles.nutritionStatValue}>{nutritionTarget.toLocaleString()} cal</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.nutritionDetailsBtn}
                  onPress={() => {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch {}
                    if (!isProfileComplete) {
                      setBlockedFeatureName('Nutrition Tracker');
                      setShowProfileRequiredModal(true);
                      return;
                    }
                    navigation.navigate('NutritionScreen');
                  }}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="View Daily Nutrition Details"
                >
                  <Text style={styles.nutritionDetailsBtnText}>View Details</Text>
                  <ChevronRight size={14} color="#000000" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Actions Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
            </View>

            <View style={styles.quickActionsRow}>
              {/* Card 1: Workout */}
              <TouchableOpacity
                style={styles.quickActionCard}
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                  navigation.navigate('CatalogTab');
                }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Workout quick action"
              >
                <Dumbbell size={26} color="#FF453A" style={styles.quickActionIcon} />
                <Text style={styles.quickActionTitle}>Workout</Text>
                <Text style={styles.quickActionSubtitle}>Routines</Text>
              </TouchableOpacity>

              {/* Card 2: My Plan */}
              <TouchableOpacity
                style={styles.quickActionCard}
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                  navigation.navigate('ScheduleScreen');
                }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="My Plan quick action"
              >
                <CalendarIcon size={26} color="#FF2D55" style={styles.quickActionIcon} />
                <Text style={styles.quickActionTitle}>My Plan</Text>
                <Text style={styles.quickActionSubtitle}>Schedule</Text>
              </TouchableOpacity>

              {/* Card 3: Progress */}
              <TouchableOpacity
                style={styles.quickActionCard}
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                  navigation.navigate('ProgressTab');
                }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Progress quick action"
              >
                <TrendingUp size={26} color="#FF9500" style={styles.quickActionIcon} />
                <Text style={styles.quickActionTitle}>Progress</Text>
                <Text style={styles.quickActionSubtitle}>Analytics</Text>
              </TouchableOpacity>

              {/* Card 4: Water */}
              <TouchableOpacity
                style={styles.quickActionCard}
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                  if (!isProfileComplete) {
                    setBlockedFeatureName('Water Tracker');
                    setShowProfileRequiredModal(true);
                    return;
                  }
                  navigation.navigate('WaterIntakeScreen');
                }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Water Tracker quick action"
              >
                <Droplets size={26} color="#00E5FF" style={styles.quickActionIcon} />
                <Text style={styles.quickActionTitle}>Water</Text>
                <Text style={styles.quickActionSubtitle}>Tracker</Text>
              </TouchableOpacity>

              {/* Card 5: Nutrition */}
              <TouchableOpacity
                style={styles.quickActionCard}
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                  if (!isProfileComplete) {
                    setBlockedFeatureName('Nutrition Tracker');
                    setShowProfileRequiredModal(true);
                    return;
                  }
                  navigation.navigate('NutritionScreen');
                }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Nutrition quick action"
              >
                <Salad size={26} color="#30D158" style={styles.quickActionIcon} />
                <Text style={styles.quickActionTitle}>Nutrition</Text>
                <Text style={styles.quickActionSubtitle}>Log Food</Text>
              </TouchableOpacity>

              {/* Card 6: AI Coach */}
              <TouchableOpacity
                style={styles.quickActionCard}
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                  navigation.navigate('AiCoachScreen');
                }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="AI Coach quick action"
              >
                <Bot size={26} color="#FFFFFF" style={styles.quickActionIcon} />
                <Text style={styles.quickActionTitle}>AI Coach</Text>
                <Text style={styles.quickActionSubtitle}>Assistant</Text>
              </TouchableOpacity>
            </View>

          </>
        )}
      </ScrollView>

      {/* Profile Setup Complete Celebration Modal */}
      <Modal
        visible={showCompletionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCompletionModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrapper}>
              <Check size={32} color="#000000" strokeWidth={3} />
            </View>

            <Text style={styles.modalTitle}>Your Profile Setup is Now Complete!</Text>
            <Text style={styles.modalSubtitle}>
              Your biometrics have been saved. Your personalized workout plan and caloric targets are now active.
            </Text>

            <View style={styles.modalBiometricsGrid}>
              <View style={styles.modalBiometricItem}>
                <Text style={styles.modalBiometricLabel}>GENDER</Text>
                <Text style={styles.modalBiometricValue}>
                  {user?.gender ? (user.gender === 'male' ? 'Male' : user.gender === 'female' ? 'Female' : 'Standard') : 'Saved'}
                </Text>
              </View>
              <View style={styles.modalBiometricItem}>
                <Text style={styles.modalBiometricLabel}>BIRTHDATE</Text>
                <Text style={styles.modalBiometricValue}>
                  {user?.birthdate ? user.birthdate : 'Saved'}
                </Text>
              </View>
              <View style={styles.modalBiometricItem}>
                <Text style={styles.modalBiometricLabel}>WEIGHT</Text>
                <Text style={styles.modalBiometricValue}>
                  {user?.weight_kg ? `${user.weight_kg} kg` : 'Saved'}
                </Text>
              </View>
              <View style={styles.modalBiometricItem}>
                <Text style={styles.modalBiometricLabel}>HEIGHT</Text>
                <Text style={styles.modalBiometricValue}>
                  {user?.height_cm ? `${user.height_cm} cm` : 'Saved'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.modalDismissBtn}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                } catch {}
                setShowCompletionModal(false);
              }}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Dismiss modal and continue"
            >
              <Text style={styles.modalDismissBtnText}>Let's Get Started</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Profile Setup Required Modal for Locked Features */}
      <Modal
        visible={showProfileRequiredModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowProfileRequiredModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Profile Setup Required</Text>
            <Text style={styles.modalSubtitle}>
              You must complete your profile setup in order to use this feature.
            </Text>

            <Text style={styles.modalFeatureDesc}>
              Personalize your biometrics (gender, birthdate, weight, and height) to calculate accurate targets and tracking data.
            </Text>

            <TouchableOpacity
              style={[styles.modalDismissBtn, { backgroundColor: '#FFD600', marginBottom: 12 }]}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                } catch {}
                setShowProfileRequiredModal(false);
                navigation.navigate('ProfileSetup');
              }}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Complete Profile Setup"
            >
              <Text style={[styles.modalDismissBtnText, { color: '#000000', fontWeight: '800' }]}>
                Complete Profile Setup
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
                setShowProfileRequiredModal(false);
              }}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Maybe Later"
            >
              <Text style={styles.modalCancelBtnText}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 100, // accommodate floating tab bar
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerLogo: {
    width: 44,
    height: 44,
  },
  greeting: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  userName: {
    fontFamily: typography.fonts.headingBold,
    fontSize: typography.sizes.xl,
    color: colors.text,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 3,
  },
  streakGif: {
    width: 36,
    height: 36,
  },
  streakText: {
    fontFamily: typography.fonts.headingBold,
    fontSize: 16,
    fontWeight: '800',
    color: '#FF7A00',
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nutritionCard: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: 20,
    minHeight: 160,
  },
  nutritionRingWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  nutritionRingOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nutritionRingCalories: {
    fontFamily: typography.fonts.headingBold,
    fontSize: 30,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -1,
    lineHeight: 34,
    textAlign: 'center',
  },
  nutritionRingLabel: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: 1.5,
    marginTop: 3,
    textAlign: 'center',
  },
  nutritionRightContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 10,
  },
  nutritionTitle: {
    fontFamily: typography.fonts.headingBold,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  nutritionStatsList: {
    marginBottom: 14,
    gap: 6,
  },
  nutritionStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nutritionStatLabel: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '400',
  },
  nutritionStatValue: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  nutritionDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFD600',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 4,
  },
  nutritionDetailsBtnText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontFamily: typography.fonts.headingBold,
    fontSize: typography.sizes.lg,
    color: colors.text,
  },
  viewAllText: {
    color: colors.primary,
    fontSize: typography.sizes.sm,
    fontWeight: '600',
  },
  quickActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  quickActionCard: {
    flexBasis: '30%',
    flexGrow: 1,
    flexShrink: 0,
    backgroundColor: '#121214',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionIcon: {
    marginBottom: 8,
  },
  quickActionTitle: {
    fontFamily: typography.fonts.headingBold,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  quickActionSubtitle: {
    fontFamily: typography.fonts.body,
    fontSize: 11,
    color: '#71717A',
    textAlign: 'center',
    marginTop: 2,
  },
  weekStripContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  dayChip: {
    flex: 1,
    marginHorizontal: 2,
    height: 58,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  dayChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayChipToday: {
    borderColor: colors.textSecondary,
  },
  dayChipName: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  dayChipNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  dayChipTextSelected: {
    color: colors.textInverse,
  },
  dayChipTodayText: {
    color: colors.primary,
    fontWeight: '800',
  },
  dayChipDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.primary,
    marginTop: 3,
  },
  dayChipDotSelected: {
    backgroundColor: colors.textInverse,
  },
  sessionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  sessionMeta: {
    marginBottom: spacing.sm,
  },
  sessionBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  timeBadgeText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: '600',
    marginLeft: 4,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  locationBadgeText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginLeft: 4,
  },
  sessionTitle: {
    fontFamily: typography.fonts.headingBlack,
    fontSize: typography.sizes.base,
    color: colors.text,
    marginVertical: 2,
  },
  trainerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  trainerText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginLeft: 4,
  },
  emptyScheduleCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  emptyScheduleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  emptyScheduleIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyScheduleTitle: {
    fontFamily: typography.fonts.headingBold,
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  emptyScheduleSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  browseClassesBtn: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  browseClassesBtnText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.text,
  },
  checkInButton: {
    backgroundColor: colors.primary,
    minHeight: 46, // Minimum tap target
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedInButton: {
    backgroundColor: colors.borderHighlight,
  },
  checkInInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkInText: {
    color: colors.textInverse,
    fontWeight: '700',
    fontSize: typography.sizes.sm,
  },
  checkedInText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: typography.sizes.sm,
    marginLeft: 6,
  },
  horizontalScroll: {
    marginHorizontal: -spacing.md,
    paddingHorizontal: spacing.md,
  },
  workoutThumbnailCard: {
    width: 170,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.md,
    overflow: 'hidden',
  },
  workoutThumbIllustration: {
    width: '100%',
    height: 120,
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  thumbContent: {
    padding: spacing.sm,
  },
  thumbCategory: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  thumbTitle: {
    fontFamily: typography.fonts.headingBlack,
    fontSize: typography.sizes.sm,
    color: colors.text,
    marginTop: 2,
  },
  thumbMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  thumbDuration: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginLeft: 3,
  },
  // Profile Setup Card (New Account)
  profileSetupCard: {
    backgroundColor: '#111111',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    marginBottom: spacing.lg,
  },
  profileSetupTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  profileSetupStepsCount: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 12,
    color: '#888888',
  },
  profileSetupTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  profileSetupSubtitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 13,
    color: '#A0A0A0',
    lineHeight: 18,
    marginBottom: 16,
  },
  profileSetupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD600',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 6,
  },
  profileSetupButtonText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },
  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  modalIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  modalTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.4,
  },
  modalSubtitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 14,
    color: '#9E9E9E',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  modalBiometricsGrid: {
    flexDirection: 'row',
    backgroundColor: '#101010',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 24,
    width: '100%',
    justifyContent: 'space-around',
  },
  modalBiometricItem: {
    alignItems: 'center',
  },
  modalBiometricLabel: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 10,
    fontWeight: '700',
    color: '#777777',
    marginBottom: 4,
  },
  modalBiometricValue: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalDismissBtn: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDismissBtnText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
  },
  modalFeatureDesc: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  modalCancelBtn: {
    width: '100%',
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 14,
    fontWeight: '600',
    color: '#9E9E9E',
  },
});
