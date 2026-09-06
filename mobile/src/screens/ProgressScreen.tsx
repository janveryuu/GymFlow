import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Flame, Clock, Dumbbell, Heart, TrendingUp } from 'lucide-react-native';
import { colors, typography, borderRadius, spacing } from '../theme';
import { WorkoutCardSkeleton } from '../components/SkeletonLoader';
import { PercentRing } from '../components/PercentRing';
import { EmptyState } from '../components/EmptyState';
import { ErrorCard } from '../components/ErrorCard';
import { MonochromeChart } from '../components/MonochromeChart';
import { getSyncRepository } from '../sync/SyncRepository';
import type { ProgressHistoryResponse } from '../types';

const PERIODS = [
  { id: '7d', label: '7 Days' },
  { id: '30d', label: '30 Days' },
  { id: '90d', label: '90 Days' },
];

interface ProgressScreenProps {
  navigation?: any;
}

export const ProgressScreen: React.FC<ProgressScreenProps> = ({ navigation }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [progress, setProgress] = useState<ProgressHistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const repo = getSyncRepository();

  const loadProgress = useCallback(async (forceRefresh = false) => {
    setError(null);
    try {
      const data = await repo.getProgressHistory(selectedPeriod, { forceRefresh });
      setProgress(data);
    } catch {
      setError('Unable to load progress trends. Showing cached stats.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedPeriod, repo]);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      (async () => {
        try {
          const data = await repo.getProgressHistory(selectedPeriod);
          if (isMounted) setProgress(data);
        } catch {
          if (isMounted) setError('Unable to load progress trends. Showing cached stats.');
        } finally {
          if (isMounted) setIsLoading(false);
        }
      })();
      return () => {
        isMounted = false;
      };
    }, [selectedPeriod, repo])
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadProgress(true);
  };

  const totalMinutes = Math.round((progress?.total_duration_seconds ?? 0) / 60);

  // Heart rate rendering constraint: Render "—" when null or 0, NEVER a fabricated number
  const renderHeartRate = () => {
    if (!progress?.average_heart_rate) {
      return '—';
    }
    return `${progress.average_heart_rate} bpm`;
  };

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
        <View style={styles.header}>
          <Text style={styles.title}>Progress & Analytics</Text>
          <Text style={styles.subtitle}>Activity history and performance metrics</Text>
        </View>

        {/* Period Selector */}
        <View style={styles.periodRow}>
          {PERIODS.map((p) => {
            const isActive = selectedPeriod === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.periodPill, isActive && styles.periodPillActive]}
                onPress={() => setSelectedPeriod(p.id)}
                accessibilityRole="button"
                accessibilityLabel={`View stats for ${p.label}`}
                accessibilityState={isActive ? { selected: true } : {}}
              >
                <Text style={[styles.periodText, isActive && styles.periodTextActive]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {error ? <ErrorCard message={error} onRetry={() => loadProgress(true)} /> : null}

        {isLoading ? (
          <View style={{ marginTop: spacing.md }}>
            <WorkoutCardSkeleton />
            <WorkoutCardSkeleton />
          </View>
        ) : (
          <>
            {/* Summary Goal Ring */}
            <View style={styles.goalCard}>
              <View style={styles.goalInfo}>
                <Text style={styles.goalTitle}>Goal Completion</Text>
                <Text style={[styles.goalSubtitle, { color: '#E5E5E5' }]}>
                  {progress?.total_workouts ?? 0} workouts logged in this period
                </Text>
              </View>
              <PercentRing
                percentage={progress?.goal_progress_percentage ?? 0}
                size={90}
                strokeWidth={8}
                label="GOAL"
                color="#FFFFFF"
                trackColor="#333333"
                textColor="#FFFFFF"
              />
            </View>

            {/* Metric Cards 2x2 Grid */}
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <View style={styles.metricIconRow}>
                  <Dumbbell size={18} color={colors.primary} />
                  <Text style={styles.metricCardLabel}>WORKOUTS</Text>
                </View>
                <Text style={styles.metricCardValue}>{progress?.total_workouts ?? 0}</Text>
              </View>

              <View style={styles.metricCard}>
                <View style={styles.metricIconRow}>
                  <Clock size={18} color={colors.primary} />
                  <Text style={styles.metricCardLabel}>TOTAL TIME</Text>
                </View>
                <Text style={styles.metricCardValue}>{totalMinutes}m</Text>
              </View>

              <View style={styles.metricCard}>
                <View style={styles.metricIconRow}>
                  <Flame size={18} color={colors.primary} />
                  <Text style={styles.metricCardLabel}>CALORIES</Text>
                </View>
                <Text style={styles.metricCardValue}>{progress?.total_calories ?? 0}</Text>
              </View>

              {/* Heart Rate Metric Card: Strictly renders "—" when null */}
              <View style={styles.metricCard}>
                <View style={styles.metricIconRow}>
                  <Heart size={18} color={colors.primary} />
                  <Text style={styles.metricCardLabel}>AVG HEART RATE</Text>
                </View>
                <Text style={styles.metricCardValue}>{renderHeartRate()}</Text>
              </View>
            </View>

            {/* Monochrome Activity & Volume Chart */}
            <MonochromeChart data={progress?.chart_data ?? []} />

            {/* Workout Activity Log */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Sessions</Text>
            </View>

            {progress?.history && progress.history.length > 0 ? (
              progress.history.map((entry) => (
                <TouchableOpacity
                  key={entry.id}
                  style={styles.historyCard}
                  onPress={() => {
                    if (entry.workout_id && navigation) {
                      navigation.navigate('WorkoutDetail', { workoutId: entry.workout_id });
                    }
                  }}
                  activeOpacity={entry.workout_id ? 0.8 : 1}
                  accessibilityRole={entry.workout_id ? 'button' : 'none'}
                  accessibilityLabel={`Session: ${entry.workout_title || 'Workout'}, ${Math.round(entry.duration_seconds / 60)} minutes, ${entry.calories_burned} kcal`}
                >
                  <View style={styles.historyLeft}>
                    <Text style={styles.historyTitle}>{entry.workout_title || 'Custom Session'}</Text>
                    <Text style={styles.historyDate}>
                      {new Date(entry.completed_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <View style={styles.historyRight}>
                    <Text style={styles.historyDuration}>
                      {Math.round(entry.duration_seconds / 60)} min
                    </Text>
                    <Text style={styles.historyCalories}>{entry.calories_burned} kcal</Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <EmptyState
                icon={TrendingUp}
                title="No Activity Logged"
                description="Complete and log your workouts to start tracking your performance and calories."
              />
            )}
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
    paddingBottom: 100,
  },
  header: {
    paddingTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: typography.fonts.headingBold,
    fontSize: typography.sizes.xxl,
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  periodRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 4,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  periodPill: {
    flex: 1,
    minHeight: 44, // 44px tap target
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
  },
  periodPillActive: {
    backgroundColor: colors.primary,
  },
  periodText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  periodTextActive: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0A0A0A',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: '#0A0A0A',
  },
  goalInfo: {
    flex: 1,
  },
  goalTitle: {
    fontFamily: typography.fonts.headingBlack,
    fontSize: typography.sizes.lg,
    color: '#FFFFFF',
  },
  goalSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 4,
    maxWidth: 180,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: spacing.sm,
  },
  metricCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  metricIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  metricCardLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginLeft: 6,
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  metricCardValue: {
    fontFamily: typography.fonts.headingBlack,
    fontSize: typography.sizes.xl,
    color: colors.text,
  },
  sectionHeader: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontFamily: typography.fonts.headingBold,
    fontSize: typography.sizes.lg,
    color: colors.text,
  },
  historyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyLeft: {
    flex: 1,
  },
  historyTitle: {
    fontFamily: typography.fonts.headingBlack,
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  historyDate: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  historyDuration: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: '600',
  },
  historyCalories: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
