import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  ChevronLeft,
  Clock,
  Flame,
  Dumbbell,
  CheckCircle2,
  Calendar,
  Sparkles,
} from '../components/icons';
import { colors, typography, borderRadius, spacing } from '../theme';
import { EmptyState } from '../components/EmptyState';
import { useWorkoutHistoryStore, WorkoutHistoryItem } from '../store/workoutHistoryStore';

export const WorkoutHistoryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { history } = useWorkoutHistoryStore();

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const remainingSecs = seconds % 60;
    if (remainingSecs === 0) return `${mins}m`;
    return `${mins}m ${remainingSecs}s`;
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const isToday =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

      const timeStr = date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });

      if (isToday) {
        return `Today at ${timeStr}`;
      }
      return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`;
    } catch {
      return isoString;
    }
  };

  const renderHistoryCard = ({ item }: { item: WorkoutHistoryItem }) => {
    return (
      <View style={styles.historyCard}>
        {/* Top Meta Row */}
        <View style={styles.cardHeaderRow}>
          <View style={styles.dateWrap}>
            <Calendar size={13} color="#8E8E8E" />
            <Text style={styles.dateText}>{formatDate(item.completed_at)}</Text>
          </View>
          <View style={styles.completedBadge}>
            <CheckCircle2 size={11} color="#16A34A" strokeWidth={2.5} />
            <Text style={styles.completedBadgeText}>COMPLETED</Text>
          </View>
        </View>

        {/* Main Info Row */}
        <View style={styles.mainInfoRow}>
          <View style={styles.iconSquircle}>
            <Dumbbell size={22} color="#FFFFFF" />
          </View>

          <View style={styles.titleInfo}>
            <Text style={styles.categoryText}>
              {item.category?.toUpperCase() || 'CUSTOM WORKOUT'}
            </Text>
            <Text style={styles.workoutTitle} numberOfLines={1}>
              {item.workout_title}
            </Text>
            {item.total_exercises > 0 && (
              <Text style={styles.exercisesCountText}>
                {item.exercises_completed}/{item.total_exercises} exercises finished
              </Text>
            )}
          </View>
        </View>

        {/* Bottom Metrics Strip */}
        <View style={styles.statsStrip}>
          <View style={styles.statItem}>
            <Clock size={13} color="#FFFFFF" />
            <Text style={styles.statText}>
              {formatDuration(item.duration_seconds)}
            </Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Flame size={13} color="#FFFFFF" />
            <Text style={styles.statText}>{item.calories_burned} kcal</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Sparkles size={13} color="#FFFFFF" />
            <Text style={styles.statText}>100% Target</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 1. TOP HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={24} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Workout History</Text>

        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={renderHistoryCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon={Dumbbell}
            title="No Workout History"
            description="Complete a workout session to see your training logs and stats recorded here."
            actionLabel="Return to Workouts"
            onAction={() => navigation.goBack()}
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: typography.fonts.headingBold,
    color: colors.text,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 38,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },

  /* History Card */
  historyCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dateWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dateText: {
    fontSize: 12,
    fontFamily: typography.fonts.body,
    color: colors.textSecondary,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  completedBadgeText: {
    fontSize: 10,
    fontFamily: typography.fonts.headingBold,
    color: colors.success,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  mainInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconSquircle: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleInfo: {
    flex: 1,
  },
  categoryText: {
    fontSize: 10,
    fontFamily: typography.fonts.headingBold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  workoutTitle: {
    fontSize: 16,
    fontFamily: typography.fonts.headingBold,
    color: colors.text,
    fontWeight: '700',
    marginBottom: 2,
  },
  exercisesCountText: {
    fontSize: 12,
    fontFamily: typography.fonts.body,
    color: colors.textSecondary,
  },

  /* Stats Strip */
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statText: {
    fontSize: 12,
    fontFamily: typography.fonts.headingMedium,
    color: colors.text,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 14,
    backgroundColor: colors.border,
  },
});
