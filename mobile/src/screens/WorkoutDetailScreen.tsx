import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, Clock, Flame, Dumbbell, Check, CheckCircle2, Bookmark } from 'lucide-react-native';
import { colors, typography, borderRadius, spacing } from '../theme';
import { WorkoutIllustration } from '../components/WorkoutIllustration';
import { MSW_SLUG_MAP } from '../sync/workoutMerge';
import { getSyncRepository } from '../sync/SyncRepository';
import { resolveWorkoutImage } from '../sync/categoryArt';
import { useSyncStore } from '../store/syncStore';
import type { Workout } from '../types';

const completionSchema = z.object({
  actualSets: z.string().min(1, 'Sets completed is required'),
  actualReps: z.string().min(1, 'Reps completed is required'),
  notes: z.string().optional(),
});

type CompletionFormData = z.infer<typeof completionSchema>;

interface WorkoutDetailScreenProps {
  route: any;
  navigation: any;
}

export const WorkoutDetailScreen: React.FC<WorkoutDetailScreenProps> = ({ route, navigation }) => {
  const { workoutId } = route.params;
  const isOnline = useSyncStore((state) => state.isOnline);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLogged, setIsLogged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const repo = getSyncRepository();

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CompletionFormData>({
    resolver: zodResolver(completionSchema),
    defaultValues: {
      actualSets: '',
      actualReps: '',
      notes: '',
    },
  });

  useEffect(() => {
    async function loadDetail() {
      try {
        const item = await repo.getWorkoutById(workoutId);
        if (item) {
          setWorkout(item);
          setValue('actualSets', String(item.sets || 4));
          setValue('actualReps', String(item.reps || 10));
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadDetail();
  }, [workoutId, repo, setValue]);

  const onLogWorkout = async (data: CompletionFormData) => {
    if (!workout || isLogged) return;
    setIsSubmitting(true);

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Ignore
    }

    try {
      await repo.submitProgress({
        workout_id: workout.id,
        workout_title: workout.title,
        started_at: new Date(Date.now() - (workout.duration_minutes || 30) * 60000).toISOString(),
        completed_at: new Date().toISOString(),
        duration_seconds: (workout.duration_minutes || 30) * 60,
        calories_burned: workout.calories || 300,
        heart_rate: null, // Always null per requirement R4
      });

      setIsLogged(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const img = resolveWorkoutImage(workout, !isOnline);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Navigation Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Back to workouts"
          >
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Workout Details</Text>
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={async () => {
              if (!workout) return;
              try {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {
                // Ignore
              }
              const newFav = !workout.is_favorite;
              setWorkout((prev) => (prev ? { ...prev, is_favorite: newFav } : null));
              await repo.toggleFavoriteWorkout(workout.id);
            }}
            accessibilityRole="button"
            accessibilityLabel={workout?.is_favorite ? 'Remove from saved' : 'Save workout'}
            accessibilityState={workout?.is_favorite ? { selected: true } : {}}
          >
            <Bookmark
              size={20}
              color={workout?.is_favorite ? colors.text : colors.textSecondary}
              fill={workout?.is_favorite ? colors.text : 'none'}
            />
          </TouchableOpacity>
        </View>

        {/* Hero Image or Line-Art Illustration */}
        <View style={styles.heroContainer}>
          {(() => {
            const slug = workout?.slug || (workout?.id ? MSW_SLUG_MAP[workout.id] : undefined);
            if (slug) {
              return (
                <WorkoutIllustration
                  slug={slug}
                  interactive={true}
                  autoPlay={true}
                  size={200}
                  containerStyle={styles.heroIllustrationContainer}
                />
              );
            }
            return (
              <Image
                source={img.isOfflineFallback ? require('../../assets/category/full-body.png') : { uri: img.resolvedImage }}
                style={styles.heroImage}
                resizeMode="cover"
              />
            );
          })()}
        </View>

        {/* Title and Specs */}
        <View style={styles.content}>
          <Text style={styles.category}>{workout?.category?.toUpperCase() || 'STRENGTH'}</Text>
          <Text style={styles.title}>{workout?.title || 'Workout'}</Text>
          <Text style={styles.description}>
            {workout?.description || 'Build strength, power, and endurance with this targeted training routine.'}
          </Text>

          {/* Quick Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Clock size={20} color={colors.primary} />
              <Text style={styles.statValue}>{workout?.duration_minutes || 45} min</Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>
            <View style={styles.statCard}>
              <Flame size={20} color={colors.primary} />
              <Text style={styles.statValue}>{workout?.calories || 350} kcal</Text>
              <Text style={styles.statLabel}>Burn</Text>
            </View>
            <View style={styles.statCard}>
              <Dumbbell size={20} color={colors.primary} />
              <Text style={styles.statValue}>{workout?.sets_reps || `${workout?.sets || 4}x${workout?.reps || 10}`}</Text>
              <Text style={styles.statLabel}>Target</Text>
            </View>
          </View>

          {/* Workout Completion Logger */}
          <View style={styles.loggerCard}>
            <Text style={styles.loggerTitle}>Log Completion</Text>
            <Text style={styles.loggerSubtitle}>Record your session data to update your progress</Text>

            {isLogged ? (
              <View style={styles.loggedSuccess}>
                <CheckCircle2 size={32} color={colors.primary} />
                <Text style={styles.loggedTitle}>Workout Logged!</Text>
                <Text style={styles.loggedSubtitle}>
                  Great job! Your activity has been recorded and added to your weekly goal.
                </Text>
              </View>
            ) : (
              <View>
                <View style={styles.inputRow}>
                  <View style={styles.inputHalf}>
                    <Text style={styles.inputLabel}>Sets Done</Text>
                    <Controller
                      control={control}
                      name="actualSets"
                      render={({ field: { onChange, value } }) => (
                        <TextInput
                          style={styles.input}
                          keyboardType="numeric"
                          onChangeText={onChange}
                          value={value}
                          placeholderTextColor={colors.textMuted}
                          accessibilityLabel="Actual sets completed"
                        />
                      )}
                    />
                    {errors.actualSets ? (
                      <Text style={styles.errorText}>{errors.actualSets.message}</Text>
                    ) : null}
                  </View>

                  <View style={styles.inputHalf}>
                    <Text style={styles.inputLabel}>Reps Per Set</Text>
                    <Controller
                      control={control}
                      name="actualReps"
                      render={({ field: { onChange, value } }) => (
                        <TextInput
                          style={styles.input}
                          keyboardType="numeric"
                          onChangeText={onChange}
                          value={value}
                          placeholderTextColor={colors.textMuted}
                          accessibilityLabel="Actual reps per set"
                        />
                      )}
                    />
                    {errors.actualReps ? (
                      <Text style={styles.errorText}>{errors.actualReps.message}</Text>
                    ) : null}
                  </View>
                </View>

                <View style={styles.fullField}>
                  <Text style={styles.inputLabel}>Session Notes (Optional)</Text>
                  <Controller
                    control={control}
                    name="notes"
                    render={({ field: { onChange, value } }) => (
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        multiline
                        numberOfLines={3}
                        onChangeText={onChange}
                        value={value}
                        placeholder="e.g. Increased weight on last set"
                        placeholderTextColor={colors.textMuted}
                        accessibilityLabel="Session notes"
                      />
                    )}
                  />
                </View>

                <TouchableOpacity
                  style={styles.logButton}
                  onPress={handleSubmit(onLogWorkout)}
                  disabled={isSubmitting}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Complete and Log Workout"
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={colors.textInverse} />
                  ) : (
                    <View style={styles.logButtonInner}>
                      <Check size={18} color={colors.textInverse} style={{ marginRight: 6 }} />
                      <Text style={styles.logButtonText}>Complete & Log Workout</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
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
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    height: 48,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontFamily: typography.fonts.headingBold,
    fontSize: typography.sizes.base,
    color: colors.text,
  },
  favoriteButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContainer: {
    width: '100%',
    minHeight: 220,
    backgroundColor: colors.surfaceElevated,
    marginTop: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIllustrationContainer: {
    width: '100%',
    height: 220,
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: colors.surfaceElevated,
  },
  heroImage: {
    width: '100%',
    height: 220,
  },
  content: {
    padding: spacing.md,
  },
  category: {
    fontSize: 12,
    color: colors.primary,
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  title: {
    fontFamily: typography.fonts.headingBlack,
    fontSize: typography.sizes.xxl,
    color: colors.text,
    marginVertical: 4,
  },
  description: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: typography.lineHeights.sm,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statValue: {
    fontFamily: typography.fonts.headingBlack,
    fontSize: typography.sizes.sm,
    color: colors.text,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  loggerCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loggerTitle: {
    fontFamily: typography.fonts.headingBold,
    fontSize: typography.sizes.lg,
    color: colors.text,
  },
  loggerSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  inputHalf: {
    flex: 0.48,
  },
  fullField: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: '500',
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    color: colors.text,
    minHeight: 44, // 44px tap target
    fontSize: typography.sizes.sm,
  },
  textArea: {
    minHeight: 70,
    paddingTop: spacing.xs,
  },
  errorText: {
    color: colors.error,
    fontSize: 10,
    marginTop: 2,
  },
  logButton: {
    backgroundColor: colors.primary,
    minHeight: 50,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  logButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logButtonText: {
    color: colors.textInverse,
    fontSize: typography.sizes.base,
    fontWeight: '700',
  },
  loggedSuccess: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  loggedTitle: {
    fontFamily: typography.fonts.headingBold,
    fontSize: typography.sizes.lg,
    color: colors.text,
    marginTop: spacing.sm,
  },
  loggedSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 260,
  },
});
