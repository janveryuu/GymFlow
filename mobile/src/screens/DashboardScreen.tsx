import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Check, Calendar as CalendarIcon, Flame, Clock, Bell, MapPin, User, Sparkles, ChevronRight, Dumbbell, TrendingUp, Droplets, Salad, Bot, Lock, Watch } from '../components/icons';
import { colors, typography, borderRadius, spacing } from '../theme';
import { PercentRing } from '../components/PercentRing';
import { DashboardSkeleton } from '../components/SkeletonLoader';
import { EmptyState } from '../components/EmptyState';
import { ErrorCard } from '../components/ErrorCard';
import { WorkoutIllustration } from '../components/WorkoutIllustration';
import { getSyncRepository } from '../sync/SyncRepository';
import { mergeWorkouts, filterMergedCatalog } from '../sync/workoutMerge';
import { getDatabase } from '../db/connection';
import { useAuthStore } from '../store/authStore';
import { useCustomWorkoutsStore } from '../store/customWorkoutsStore';
import { calculateDailyCalorieTarget } from '../utils/nutritionCalculator';
import { BmiMetricSection } from '../components/BmiMetricSection';
import { DarkVeil } from '../components/DarkVeil';
import type { Session, ProgressHistoryResponse, MergedWorkout } from '../types';

interface DashboardScreenProps {
  navigation: any;
  route?: any;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation, route }) => {
  const user = useAuthStore((state) => state.user);
  const isProfileComplete = Boolean(user?.is_profile_completed);
  const { pendingGeneratedWorkout, setPendingGeneratedWorkout } = useCustomWorkoutsStore();

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

  // Smooth entrance animation for fully loaded dashboard sections
  const hasLoadedOnce = useRef(false);
  const contentFadeAnim = useRef(new Animated.Value(0)).current;
  const contentSlideAnim = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    if (!isLoading) {
      contentFadeAnim.setValue(0);
      contentSlideAnim.setValue(18);
      Animated.parallel([
        Animated.timing(contentFadeAnim, {
          toValue: 1,
          duration: 480,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(contentSlideAnim, {
          toValue: 0,
          duration: 480,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    }
  }, [isLoading, contentFadeAnim, contentSlideAnim]);

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

      if (!hasLoadedOnce.current) {
        // Ensure graceful skeleton display on initial landing before fluid transition
        await new Promise((resolve) => setTimeout(resolve, 450));
        hasLoadedOnce.current = true;
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
      {/* Luminous Animated Dark Veil Background (Silk Folds in Pure White) */}
      <DarkVeil
        speed={0.35}
        warpAmount={0.25}
        noiseIntensity={0.01}
        whiteMode={true}
      />

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
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {
                  // Fallback if haptics unavailable
                }
                Alert.alert('Notifications', 'You have no unread notifications. All caught up!');
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
            >
              <Bell size={19} color="#FFFFFF" strokeWidth={2.2} /> 
            </TouchableOpacity>
          </View>
        </View>

        {error ? <ErrorCard message={error} onRetry={() => loadDashboardData(true)} /> : null}

        {isLoading ? (
          <DashboardSkeleton />
        ) : (
          <Animated.View
            style={[
              styles.loadedContentContainer,
              {
                opacity: contentFadeAnim,
                transform: [{ translateY: contentSlideAnim }],
              },
            ]}
          >
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
                  color="#30D158"
                  trackColor="rgba(48, 209, 88, 0.15)"
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

            {/* BMI & Height/Weight Metrics */}
            <BmiMetricSection />

            {/* Features Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Features</Text>
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
                <Sparkles size={26} color="#BF5AF2" style={styles.quickActionIcon} />
                <Text style={styles.quickActionTitle}>AI Coach</Text>
                <Text style={styles.quickActionSubtitle}>Assistant</Text>
              </TouchableOpacity>
            </View>

          </Animated.View>
        )}
      </ScrollView>

      {/* Profile Setup Complete Celebration Modal - Apple HIG 'What's New' Design */}
      <Modal
        visible={showCompletionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCompletionModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.appleModalCard}>
            {/* Apple "What's New" Header */}
            <Text style={styles.appleModalTitle}>What’s New in GymFlow</Text>

            {/* Apple Feature Rows with Signature Gold Icons */}
            <View style={styles.appleFeatureList}>
              {/* Feature 1: Workouts */}
              <View style={styles.appleFeatureItem}>
                <View style={styles.appleFeatureIconCol}>
                  <Dumbbell size={28} color="#FFCC00" strokeWidth={2.0} />
                </View>
                <View style={styles.appleFeatureTextCol}>
                  <Text style={styles.appleFeatureItemTitle}>Personalized Workout Plan</Text>
                  <Text style={styles.appleFeatureItemDesc}>
                    Custom routines, progressive splits, and exercise guide tailored to your biometrics.
                  </Text>
                </View>
              </View>

              {/* Feature 2: Nutrition */}
              <View style={styles.appleFeatureItem}>
                <View style={styles.appleFeatureIconCol}>
                  <Flame size={28} color="#FFCC00" strokeWidth={2.0} />
                </View>
                <View style={styles.appleFeatureTextCol}>
                  <Text style={styles.appleFeatureItemTitle}>Caloric & Nutrition Targets</Text>
                  <Text style={styles.appleFeatureItemDesc}>
                    Daily caloric allowance, macro distributions, and water goals calculated and ready.
                  </Text>
                </View>
              </View>

              {/* Feature 3: Biometrics / Watch */}
              <View style={styles.appleFeatureItem}>
                <View style={styles.appleFeatureIconCol}>
                  <Watch size={28} color="#FFCC00" strokeWidth={2.0} />
                </View>
                <View style={styles.appleFeatureTextCol}>
                  <Text style={styles.appleFeatureItemTitle}>Biometrics Configured</Text>
                  <Text style={styles.appleFeatureItemDesc}>
                    Biometrics saved to monitor recovery, training strain, and metabolic output.
                  </Text>
                </View>
              </View>
            </View>

            {/* Apple Signature Yellow Pill Button */}
            <View style={styles.appleModalBtnRow}>
              <TouchableOpacity
                style={styles.appleContinueBtn}
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  } catch {}
                  setShowCompletionModal(false);
                }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Continue"
              >
                <Text style={styles.appleContinueBtnText}>Continue</Text>
              </TouchableOpacity>
            </View>
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
              style={[styles.modalDismissBtn, { backgroundColor: '#007AFF', marginBottom: 12 }]}
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
              <Text style={[styles.modalDismissBtnText, { color: '#FFFFFF', fontWeight: '700' }]}>
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

      {/* Generated Personalized Workout Modal */}
      <Modal
        visible={Boolean(pendingGeneratedWorkout)}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPendingGeneratedWorkout(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.generatedWorkoutModalCard}>
            {/* Header Badge */}
            <View style={styles.generatedModalHeaderBadge}>
              <Sparkles size={13} color="#007AFF" strokeWidth={2.2} />
              <Text style={styles.generatedModalHeaderBadgeText}>PERSONALIZED WORKOUT GENERATED</Text>
            </View>

            {/* Icon */}
            <View style={styles.generatedWorkoutIconWrapper}>
              <Dumbbell size={26} color="#007AFF" strokeWidth={2.2} />
            </View>

            <Text style={styles.generatedModalTitle}>
              {pendingGeneratedWorkout?.title || 'Your Personalized Routine'}
            </Text>
            <Text style={styles.generatedModalSubtitle}>
              {pendingGeneratedWorkout?.description || 'Your custom routine has been synthesized and saved to your workouts library.'}
            </Text>

            {/* Quick Metrics Row */}
            <View style={styles.generatedMetricsRow}>
              <View style={styles.generatedMetricBadge}>
                <Clock size={12} color="#007AFF" style={{ marginRight: 5 }} />
                <Text style={styles.generatedMetricBadgeText}>{pendingGeneratedWorkout?.duration_minutes || 50} min</Text>
              </View>
              <View style={styles.generatedMetricBadge}>
                <Flame size={12} color="#FF9F0A" style={{ marginRight: 5 }} />
                <Text style={styles.generatedMetricBadgeText}>~{pendingGeneratedWorkout?.calories || 440} kcal</Text>
              </View>
              <View style={styles.generatedMetricBadge}>
                <Dumbbell size={12} color="#30D158" style={{ marginRight: 5 }} />
                <Text style={styles.generatedMetricBadgeText}>
                  {pendingGeneratedWorkout?.routineExercises?.length || 5} Exercises
                </Text>
              </View>
            </View>

            {/* Preview of Exercises */}
            <View style={styles.generatedExercisesList}>
              <Text style={styles.generatedExercisesHeading}>ROUTINE PREVIEW</Text>
              {pendingGeneratedWorkout?.routineExercises?.slice(0, 3).map((ex, index) => (
                <View key={ex.id || index} style={styles.generatedExerciseRow}>
                  <View style={styles.generatedExerciseNumberBadge}>
                    <Text style={styles.generatedExerciseNumberText}>{index + 1}</Text>
                  </View>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.generatedExerciseName} numberOfLines={1}>{ex.title}</Text>
                    <Text style={styles.generatedExerciseMeta}>{ex.preferredSets} sets • {ex.preferredReps}</Text>
                  </View>
                  <View style={styles.generatedMusclePill}>
                    <Text style={styles.generatedMusclePillText}>{ex.category}</Text>
                  </View>
                </View>
              ))}
              {(pendingGeneratedWorkout?.routineExercises?.length || 0) > 3 && (
                <Text style={styles.generatedMoreExercisesText}>
                  +{(pendingGeneratedWorkout?.routineExercises?.length || 0) - 3} more exercises in full routine
                </Text>
              )}
            </View>

            {/* View My Workouts Button */}
            <TouchableOpacity
              style={styles.generatedProceedBtn}
              onPress={() => {
                try {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                } catch {
                  // Ignore
                }
                setPendingGeneratedWorkout(null);
                navigation.navigate('CatalogTab');
              }}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="View my workouts"
            >
              <Text style={styles.generatedProceedBtnText}>View My Workouts</Text>
              <ChevronRight size={18} color="#FFFFFF" strokeWidth={2.4} style={{ marginLeft: 4 }} />
            </TouchableOpacity>

            {/* Direct Start Routine Option */}
            {pendingGeneratedWorkout?.id && (
              <TouchableOpacity
                style={styles.generatedStartDirectBtn}
                onPress={() => {
                  const routineId = pendingGeneratedWorkout.id;
                  try {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  } catch {
                    // Ignore
                  }
                  setPendingGeneratedWorkout(null);
                  navigation.navigate('CustomWorkoutDetailScreen', { routineId });
                }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Start workout routine directly"
              >
                <Text style={styles.generatedStartDirectBtnText}>Start This Workout Now</Text>
              </TouchableOpacity>
            )}

            {/* Dismiss Button */}
            <TouchableOpacity
              style={styles.generatedDismissBtn}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {
                  // Ignore
                }
                setPendingGeneratedWorkout(null);
              }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Explore dashboard first"
            >
              <Text style={styles.generatedDismissBtnText}>Explore Dashboard First</Text>
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
    overflow: 'hidden',
  },
  loadedContentContainer: {
    width: '100%',
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
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
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
  nutritionCard: {
    flexDirection: 'row',
    backgroundColor: Platform.OS === 'web' ? 'rgba(14, 14, 18, 0.65)' : 'rgba(16, 16, 22, 0.78)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: 20,
    minHeight: 160,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 8,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(20px) saturate(190%)',
      WebkitBackdropFilter: 'blur(20px) saturate(190%)',
    } as any : {}),
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 4,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  nutritionDetailsBtnText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 13,
    fontWeight: '700',
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
    backgroundColor: Platform.OS === 'web' ? 'rgba(14, 14, 18, 0.65)' : 'rgba(16, 16, 22, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 6,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(20px) saturate(190%)',
      WebkitBackdropFilter: 'blur(20px) saturate(190%)',
    } as any : {}),
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
    textShadowColor: 'rgba(0, 0, 0, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  quickActionSubtitle: {
    fontFamily: typography.fonts.body,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.65)',
    textAlign: 'center',
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
    backgroundColor: Platform.OS === 'web' ? 'rgba(14, 14, 18, 0.65)' : 'rgba(16, 16, 22, 0.78)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    marginBottom: spacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 8,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(20px) saturate(190%)',
      WebkitBackdropFilter: 'blur(20px) saturate(190%)',
    } as any : {}),
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 6,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  profileSetupButtonText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },
  // Modal Styles
  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    } as any : {}),
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#2C2C2E',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 28,
    paddingTop: 30,
    paddingBottom: 24,
    paddingHorizontal: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.55,
    shadowRadius: 36,
    elevation: 20,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(30px) saturate(180%)',
      WebkitBackdropFilter: 'blur(30px) saturate(180%)',
    } as any : {}),
  },
  // Apple "What's New in Notes" Style Modal
  appleModalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#2C2C2E', // Apple Dark Secondary System Background
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 28,
    paddingTop: 30,
    paddingBottom: 24,
    paddingHorizontal: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.55,
    shadowRadius: 36,
    elevation: 20,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(30px) saturate(180%)',
      WebkitBackdropFilter: 'blur(30px) saturate(180%)',
    } as any : {}),
  },
  appleModalTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'left',
    letterSpacing: -0.4,
    marginBottom: 26,
  },
  appleFeatureList: {
    width: '100%',
    gap: 22,
    marginBottom: 32,
  },
  appleFeatureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  appleFeatureIconCol: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 2,
    marginRight: 10,
  },
  appleFeatureTextCol: {
    flex: 1,
  },
  appleFeatureItemTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  appleFeatureItemDesc: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 13,
    color: 'rgba(235, 235, 245, 0.60)',
    lineHeight: 18,
    letterSpacing: -0.1,
  },
  appleBiometricsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.32)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 24,
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  appleBiometricItem: {
    alignItems: 'center',
    flex: 1,
  },
  appleBiometricDivider: {
    width: StyleSheet.hairlineWidth,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  appleBiometricLabel: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 9.5,
    fontWeight: '600',
    color: 'rgba(235, 235, 245, 0.45)',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  appleBiometricValue: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 12.5,
    fontWeight: '600',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  appleModalBtnRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  appleContinueBtn: {
    backgroundColor: '#FFCC00', // Apple Notes Signature Amber Yellow
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  appleContinueBtnText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.2,
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
  // Generated Workout Modal Styles (Apple HIG Design)
  generatedWorkoutModalCard: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: 'rgba(28, 28, 30, 0.96)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 28,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 10,
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(25px)',
          WebkitBackdropFilter: 'blur(25px)',
        } as any)
      : {}),
  },
  generatedModalHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 122, 255, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
    marginBottom: 16,
  },
  generatedModalHeaderBadgeText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 10.5,
    fontWeight: '700',
    color: '#007AFF',
    letterSpacing: 0.6,
  },
  generatedWorkoutIconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 122, 255, 0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 122, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  generatedModalTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.4,
  },
  generatedModalSubtitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 13.5,
    color: 'rgba(255, 255, 255, 0.55)',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  generatedMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
    width: '100%',
  },
  generatedMetricBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  generatedMetricBadgeText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  generatedExercisesList: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
    gap: 10,
  },
  generatedExercisesHeading: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.45)',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  generatedExerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  generatedExerciseNumberBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  generatedExerciseNumberText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  generatedExerciseName: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  generatedExerciseMeta: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 1,
  },
  generatedMusclePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  generatedMusclePillText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  generatedMoreExercisesText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    marginTop: 2,
  },
  generatedProceedBtn: {
    width: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 14,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  generatedProceedBtnText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  generatedStartDirectBtn: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 14,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  generatedStartDirectBtnText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  generatedDismissBtn: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generatedDismissBtnText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.5)',
  },
});
