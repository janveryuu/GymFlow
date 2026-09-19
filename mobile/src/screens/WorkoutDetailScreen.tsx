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
import { ArrowLeft, Clock, Flame, Dumbbell, Check, CheckCircle2, Bookmark, Repeat, Timer, Lightbulb } from 'lucide-react-native';
import { colors, typography, borderRadius, spacing } from '../theme';
import { WorkoutIllustration } from '../components/WorkoutIllustration';
import { MSW_SLUG_MAP } from '../sync/workoutMerge';
import { workoutAssetMap } from '../assets/workoutAssetMap';
import { getSyncRepository } from '../sync/SyncRepository';
import { resolveWorkoutImage } from '../sync/categoryArt';
import { useSyncStore } from '../store/syncStore';
import type { Workout } from '../types';

function resolveExerciseSlug(slug?: string, title?: string, category?: string): string {
  if (slug && workoutAssetMap[slug]) return slug;

  const t = (title || '').toLowerCase();
  if (t.includes('incline bench')) return 'incline-bench-press';
  if (t.includes('bench press') || t.includes('bench')) return 'bench-press';
  if (t.includes('squat')) return 'barbell-squat';
  if (t.includes('deadlift')) return 'deadlift';
  if (t.includes('bicep') || t.includes('curl')) return 'dumbbell-curl';
  if (t.includes('tricep') || t.includes('pushdown')) return 'cable-lat-pulldown';
  if (t.includes('pulldown') || t.includes('lat pull')) return 'lat-pulldown';
  if (t.includes('lateral raise')) return 'lateral-raise';
  if (t.includes('front raise')) return 'dumbbell-front-raise';
  if (t.includes('calf raise')) return 'standing-calf-raise';
  if (t.includes('leg raise')) return 'hanging-leg-raise';
  if (t.includes('leg press')) return 'leg-press';
  if (t.includes('push up') || t.includes('pushup')) return 'push-up';
  if (t.includes('pull up') || t.includes('pullup') || t.includes('chin')) return 'pull-up';
  if (t.includes('dip')) return 'dip';
  if (t.includes('plank')) return 'plank';
  if (t.includes('row')) return 'barbell-row';
  if (t.includes('overhead') || t.includes('military') || t.includes('shoulder press')) return 'overhead-press';
  if (t.includes('lunge')) return 'lunge';

  const c = (category || '').toLowerCase();
  if (c.includes('chest')) return 'bench-press';
  if (c.includes('back')) return 'lat-pulldown';
  if (c.includes('leg')) return 'barbell-squat';
  if (c.includes('arm')) return 'dumbbell-curl';
  if (c.includes('core')) return 'plank';
  if (c.includes('shoulder')) return 'lateral-raise';

  return slug || 'bench-press';
}

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
  const { workoutId, exercise, routineId } = route.params || {};
  const isOnline = useSyncStore((state) => state.isOnline);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [exerciseMeta, setExerciseMeta] = useState<{
    sets: number;
    reps: string;
    restSeconds: number;
    equipment?: string;
    difficulty?: string;
    tips?: string;
  } | null>(null);
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
      if (exercise) {
        const resolvedSlug = resolveExerciseSlug(exercise.slug, exercise.title, exercise.category);
        const setsNum = exercise.preferredSets || 4;
        const repsStr = typeof exercise.preferredReps === 'number'
          ? `${exercise.preferredReps} reps`
          : String(exercise.preferredReps || '10 reps');
        const restSec = exercise.restTimeSeconds || 60;
        const eq = exercise.equipment || 'Barbell & Dumbbells';
        const diff = (exercise.difficulty || 'Intermediate').toUpperCase();
        const tipDesc = exercise.tips || `Maintain core tightness, control the eccentric phase for 2-3 seconds, and execute a full range of motion.`;

        setExerciseMeta({
          sets: setsNum,
          reps: repsStr,
          restSeconds: restSec,
          equipment: eq,
          difficulty: diff,
          tips: tipDesc,
        });

        const item: Workout = {
          id: exercise.id,
          title: exercise.title,
          slug: resolvedSlug,
          category: (exercise.category?.toLowerCase() || 'chest') as any,
          difficulty: diff.toLowerCase() as any,
          duration_minutes: exercise.duration_minutes || 45,
          calories: exercise.calories || 320,
          sets: setsNum,
          reps: parseInt(repsStr, 10) || 10,
          sets_reps: `${setsNum} sets × ${repsStr}`,
          description: tipDesc,
          image_url: '',
          source: 'local',
          completion_percentage: 0,
          is_favorite: false,
        };
        setWorkout(item);
        setValue('actualSets', String(setsNum));
        setValue('actualReps', String(parseInt(repsStr, 10) || 10));
        setIsLoading(false);
        return;
      }

      if (workoutId) {
        try {
          const item = await repo.getWorkoutById(workoutId);
          if (item) {
            setWorkout(item);
            setValue('actualSets', String(item.sets || 4));
            setValue('actualReps', String(item.reps || 10));

            const setsNum = item.sets || 4;
            const repsNum = item.reps || 10;
            const restSec = (item as any).restTimeSeconds || 60;
            const eq = (item as any).equipment || 'Gym Equipment';
            const diff = (item.difficulty || 'Intermediate').toUpperCase();
            const tipDesc = item.description || `Targeted high-intensity resistance training. Maintain strict form, brace your core, and control the eccentric movement.`;

            setExerciseMeta({
              sets: setsNum,
              reps: `${repsNum} reps`,
              restSeconds: restSec,
              equipment: eq,
              difficulty: diff,
              tips: tipDesc,
            });
          }
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    }
    loadDetail();
  }, [workoutId, exercise, repo, setValue]);

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
  const targetSets = exerciseMeta?.sets ?? workout?.sets ?? 4;
  const targetReps = exerciseMeta?.reps ?? (workout?.reps ? `${workout.reps} reps` : '10 reps');
  const targetRest = `${exerciseMeta?.restSeconds ?? 60}s`;
  const equipmentText = exerciseMeta?.equipment || (workout as any)?.equipment || 'Barbell & Dumbbells';
  const difficultyText = exerciseMeta?.difficulty || workout?.difficulty?.toUpperCase() || 'INTERMEDIATE';
  const descriptionText = exerciseMeta?.tips || workout?.description || 'Build strength, power, and muscle hypertrophy with controlled cadence and strict technique.';

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
            const rawSlug = workout?.slug || (workout?.id ? MSW_SLUG_MAP[workout.id] : undefined);
            const slug = resolveExerciseSlug(rawSlug, workout?.title, workout?.category);
            if (slug && workoutAssetMap[slug]) {
              return (
                <WorkoutIllustration
                  slug={slug}
                  interactive={true}
                  autoPlay={true}
                  loopIntervalMs={650}
                  size={200}
                  backgroundColor="#FFFFFF"
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
          <View style={styles.categoryRow}>
            <Text style={styles.category}>{workout?.category?.toUpperCase() || 'STRENGTH'}</Text>
            {difficultyText ? (
              <View style={styles.difficultyBadge}>
                <Text style={styles.difficultyBadgeText}>{difficultyText}</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.title}>{workout?.title || 'Workout'}</Text>

          {equipmentText ? (
            <Text style={styles.equipmentText}>
              Equipment: {equipmentText}
            </Text>
          ) : null}

          {/* Core Target Specs: Sets, Reps, Rest Time */}
          <View style={styles.specsRow}>
            <View style={styles.specCard}>
              <View style={styles.specIconWrap}>
                <Dumbbell size={18} color="#0A0A0A" />
              </View>
              <Text style={styles.specValue}>{targetSets} Sets</Text>
              <Text style={styles.specLabel}>TARGET SETS</Text>
            </View>

            <View style={styles.specCard}>
              <View style={styles.specIconWrap}>
                <Repeat size={18} color="#0A0A0A" />
              </View>
              <Text style={styles.specValue}>{targetReps}</Text>
              <Text style={styles.specLabel}>TARGET REPS</Text>
            </View>

            <View style={styles.specCard}>
              <View style={styles.specIconWrap}>
                <Timer size={18} color="#0A0A0A" />
              </View>
              <Text style={styles.specValue}>{targetRest}</Text>
              <Text style={styles.specLabel}>REST TIME</Text>
            </View>
          </View>

          {/* Description & Technique Tips Card */}
          <View style={styles.techniqueCard}>
            <View style={styles.techniqueHeader}>
              <Lightbulb size={16} color="#0A0A0A" />
              <Text style={styles.techniqueTitle}>Description & Technique</Text>
            </View>
            <Text style={styles.techniqueText}>{descriptionText}</Text>
          </View>

          {/* Secondary Stats Strip (Duration & Calories Burn) */}
          <View style={styles.metaStrip}>
            <View style={styles.metaItem}>
              <Clock size={14} color="#6B6B6B" />
              <Text style={styles.metaText}>{workout?.duration_minutes || 45} mins est.</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaItem}>
              <Flame size={14} color="#6B6B6B" />
              <Text style={styles.metaText}>{workout?.calories || 320} kcal burn</Text>
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
                <TouchableOpacity
                  style={[styles.logButton, { marginTop: 16, paddingHorizontal: 24 }]}
                  onPress={() => navigation.goBack()}
                >
                  <Text style={styles.logButtonText}>Return to Workout</Text>
                </TouchableOpacity>
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
    backgroundColor: '#FFFFFF',
    marginTop: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIllustrationContainer: {
    width: '100%',
    height: 220,
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: '#FFFFFF',
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
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  difficultyBadge: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  difficultyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  equipmentText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  specsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.md,
  },
  specCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  specIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  specValue: {
    fontFamily: typography.fonts.headingBold,
    fontSize: 13,
    color: colors.text,
    textAlign: 'center',
  },
  specLabel: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 2,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  techniqueCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: spacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  techniqueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  techniqueTitle: {
    fontSize: 13,
    fontFamily: typography.fonts.headingBold,
    color: colors.text,
  },
  techniqueText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  metaStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 8,
    marginBottom: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaDivider: {
    width: 1,
    height: 14,
    backgroundColor: colors.border,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
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
