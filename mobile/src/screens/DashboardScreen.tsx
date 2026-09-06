import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Check, Calendar as CalendarIcon, Flame, Clock, Bell, MapPin, User } from 'lucide-react-native';
import { colors, typography, borderRadius, spacing } from '../theme';
import { PercentRing } from '../components/PercentRing';
import { WorkoutCardSkeleton, SessionCardSkeleton } from '../components/SkeletonLoader';
import { EmptyState } from '../components/EmptyState';
import { ErrorCard } from '../components/ErrorCard';
import { WorkoutIllustration } from '../components/WorkoutIllustration';
import { getSyncRepository } from '../sync/SyncRepository';
import { mergeWorkouts, filterMergedCatalog } from '../sync/workoutMerge';
import { useAuthStore } from '../store/authStore';
import { GymFlowBrandHeader } from '../components/GymFlowBrand';
import type { Session, ProgressHistoryResponse, MergedWorkout } from '../types';

interface DashboardScreenProps {
  navigation: any;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const user = useAuthStore((state) => state.user);

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
        {/* Top Brand Bar */}
        <View style={styles.topBrandBar}>
          <GymFlowBrandHeader logoSize={42} textSize={30} />
          <TouchableOpacity 
            style={styles.notificationButton}
            onPress={() => {
              Alert.alert('Notifications', 'You have no unread notifications. All caught up!');
            }}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Bell size={18} color={colors.text} /> 
          </TouchableOpacity>
        </View>

        {/* Header greeting */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.name || 'Member'}</Text>
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
            {/* Weekly Goal Progress Ring Card */}
            <TouchableOpacity
              style={styles.activityCard}
              onPress={() => navigation.navigate('ProgressTab')}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel={`Weekly Goal: ${completedCount} of ${weeklyGoalDenominator} workouts completed. Tap to view analytics.`}
            >
              <View style={styles.activityLeft}>
                <Text style={[styles.cardTitle, { color: '#FFFFFF' }]}>Weekly Goal</Text>
                <Text style={[styles.goalSubtitle, { color: '#E5E5E5' }]}>
                  {completedCount} of {weeklyGoalDenominator} workouts completed
                </Text>
                <View style={styles.metricRow}>
                  <Flame size={16} color="#FFFFFF" />
                  <Text style={[styles.metricText, { color: '#D4D4D4' }]}>
                    {progressData?.total_calories ?? 0} kcal burned
                  </Text>
                </View>
              </View>
              <View style={styles.ringWrapper}>
                <PercentRing
                  percentage={weeklyGoalPercentage}
                  size={100}
                  strokeWidth={8}
                  label="GOAL"
                  color="#FFFFFF"
                  trackColor="#333333"
                  textColor="#FFFFFF"
                />
              </View>
            </TouchableOpacity>

            {/* Schedule & Upcoming Classes Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Schedule & Classes</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('ScheduleScreen')}
                accessibilityRole="button"
                accessibilityLabel="View Full Calendar"
                style={{ minHeight: 44, justifyContent: 'center' }}
              >
                <Text style={styles.viewAllText}>Full Calendar →</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Weekday Selector Strip */}
            <View style={styles.weekStripContainer}>
              {weekDays.map((day, idx) => {
                const isSelected = idx === selectedDayOffset;
                const hasSession = daysWithSessions.has(day.isoDate);
                return (
                  <TouchableOpacity
                    key={day.isoDate}
                    style={[
                      styles.dayChip,
                      isSelected && styles.dayChipSelected,
                      day.isToday && !isSelected && styles.dayChipToday,
                    ]}
                    onPress={() => setSelectedDayOffset(idx)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`${day.dayName} ${day.dayNumber}${day.isToday ? ' (Today)' : ''}${hasSession ? ', has scheduled session' : ''}`}
                  >
                    <Text
                      style={[
                        styles.dayChipName,
                        isSelected ? styles.dayChipTextSelected : (day.isToday ? styles.dayChipTodayText : null),
                      ]}
                    >
                      {day.dayName}
                    </Text>
                    <Text
                      style={[
                        styles.dayChipNumber,
                        isSelected ? styles.dayChipTextSelected : (day.isToday ? styles.dayChipTodayText : null),
                      ]}
                    >
                      {day.dayNumber}
                    </Text>
                    {hasSession && (
                      <View
                        style={[
                          styles.dayChipDot,
                          isSelected && styles.dayChipDotSelected,
                        ]}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Sessions for the Selected Day */}
            {daySessions.length > 0 ? (
              daySessions.map((session) => {
                const isSessionToday = Boolean(session.starts_at && new Date(session.starts_at).toDateString() === new Date().toDateString());
                const isSessionCheckedIn = Boolean(session.checked_in || (isSessionToday && isCheckedIn));

                return (
                  <View key={session.id} style={styles.sessionCard}>
                    <TouchableOpacity
                      style={styles.sessionMeta}
                      onPress={() => navigation.navigate('ScheduleScreen')}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel={`Session: ${session.title}. Tap to view in Schedule.`}
                    >
                      <View style={styles.sessionBadgeRow}>
                        <View style={styles.timeBadge}>
                          <Clock size={12} color={colors.textSecondary} />
                          <Text style={styles.timeBadgeText}>
                            {session.starts_at
                              ? new Date(session.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : '09:00 AM'}
                          </Text>
                        </View>
                        {session.location ? (
                          <View style={styles.locationBadge}>
                            <MapPin size={12} color={colors.textMuted} />
                            <Text style={styles.locationBadgeText}>{session.location}</Text>
                          </View>
                        ) : null}
                      </View>

                      <Text style={styles.sessionTitle}>{session.title}</Text>

                      <View style={styles.trainerRow}>
                        <User size={13} color={colors.textMuted} />
                        <Text style={styles.trainerText}>
                          Trainer: {session.trainer?.name || session.trainer_name || 'Personal Trainer'}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {isSessionToday && (
                      <TouchableOpacity
                        style={[
                          styles.checkInButton,
                          isSessionCheckedIn && styles.checkedInButton,
                        ]}
                        onPress={() => handleCheckInSession(session)}
                        disabled={isSessionCheckedIn}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel={isSessionCheckedIn ? 'Checked in to session' : 'Check In to session'}
                      >
                        {isSessionCheckedIn ? (
                          <View style={styles.checkInInner}>
                            <Check size={18} color={colors.text} />
                            <Text style={styles.checkedInText}>Checked In</Text>
                          </View>
                        ) : (
                          <Text style={styles.checkInText}>One-Tap Check-In</Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyScheduleCard}>
                <View style={styles.emptyScheduleLeft}>
                  <View style={styles.emptyScheduleIconWrapper}>
                    <CalendarIcon size={20} color={colors.text} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.emptyScheduleTitle}>
                      {selectedDayOffset === (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1)
                        ? 'No Sessions Today'
                        : `No Sessions on ${weekDays[selectedDayOffset]?.dayName}`}
                    </Text>
                    <Text style={styles.emptyScheduleSubtitle}>
                      Explore gym classes & reserve your spot
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.browseClassesBtn}
                  onPress={() => navigation.navigate('ScheduleScreen')}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Browse & Book Classes"
                >
                  <Text style={styles.browseClassesBtnText}>Browse Classes & Book</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Featured Workouts */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Featured Workouts</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('CatalogTab')}
                accessibilityRole="button"
                accessibilityLabel="View All Workouts"
                style={{ minHeight: 44, justifyContent: 'center' }}
              >
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {featuredWorkouts.map((workout) => (
                <TouchableOpacity
                  key={workout.id}
                  style={styles.workoutThumbnailCard}
                  onPress={() => navigation.navigate('WorkoutDetail', { workoutId: workout.id })}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={`View workout ${workout.title}`}
                >
                  <WorkoutIllustration
                    slug={workout.slug}
                    size={170}
                    containerStyle={styles.workoutThumbIllustration}
                  />
                  <View style={styles.thumbContent}>
                    <Text style={styles.thumbCategory}>{workout.category?.toUpperCase() || 'GENERAL'}</Text>
                    <Text style={styles.thumbTitle} numberOfLines={1}>{workout.title}</Text>
                    <View style={styles.thumbMetaRow}>
                      <Clock size={12} color={colors.textSecondary} />
                      <Text style={styles.thumbDuration}>{workout.duration_minutes}m</Text>
                      <Flame size={12} color={colors.textSecondary} style={{ marginLeft: 8 }} />
                      <Text style={styles.thumbDuration}>{workout.calories} kcal</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}
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
    paddingBottom: 100, // accommodate floating tab bar
  },
  topBrandBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
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
  activityCard: {
    flexDirection: 'row',
    backgroundColor: '#0A0A0A',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  activityLeft: {
    flex: 1,
    paddingRight: spacing.md,
  },
  cardTitle: {
    fontFamily: typography.fonts.headingBlack,
    fontSize: typography.sizes.lg,
    color: colors.text,
  },
  goalSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginVertical: 4,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  metricText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginLeft: 6,
  },
  ringWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: colors.surfaceElevated,
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
});
