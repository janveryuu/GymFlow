import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Dumbbell, Repeat, Timer, Lightbulb } from '../components/icons';
import { colors, typography, borderRadius, spacing } from '../theme';
import { WorkoutIllustration } from '../components/WorkoutIllustration';
import { MSW_SLUG_MAP } from '../sync/workoutMerge';
import { workoutAssetMap } from '../assets/workoutAssetMap';
import { getSyncRepository } from '../sync/SyncRepository';
import { resolveWorkoutImage } from '../sync/categoryArt';
import { useSyncStore } from '../store/syncStore';
import type { Workout } from '../types';

const APPLE_FONT_FAMILY =
  Platform.OS === 'web'
    ? '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif'
    : Platform.OS === 'ios'
    ? 'System'
    : 'Roboto';

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
  if (t.includes('pull up') || t.includes('pullup') || t.includes('chin')) return 'chin-up';
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

  const repo = getSyncRepository();

  useEffect(() => {
    async function loadDetail() {
      if (exercise) {
        const resolvedSlug = resolveExerciseSlug(exercise.slug, exercise.title, exercise.category);
        const setsNum = exercise.preferredSets || 5;
        const repsStr = typeof exercise.preferredReps === 'number'
          ? `${exercise.preferredReps} reps`
          : String(exercise.preferredReps || '14 reps');
        const restSec = exercise.restTimeSeconds || 60;
        const eq = exercise.equipment || 'Bodyweight';
        const diff = (exercise.difficulty || 'Beginner').toUpperCase();
        const tipDesc = exercise.tips || exercise.description || (
          exercise.title?.toLowerCase().includes('chin')
            ? 'Targeted biceps training with bodyweight. Includes secondary focus on Lats.'
            : 'Targeted resistance training with bodyweight. Maintain strict form, brace your core, and control the eccentric movement.'
        );

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
          category: (exercise.category?.toLowerCase() || 'arm') as any,
          difficulty: diff.toLowerCase() as any,
          duration_minutes: exercise.duration_minutes || 45,
          calories: exercise.calories || 320,
          sets: setsNum,
          reps: parseInt(repsStr, 10) || 14,
          sets_reps: `${setsNum} sets × ${repsStr}`,
          description: tipDesc,
          image_url: '',
          source: 'local',
          completion_percentage: 0,
          is_favorite: false,
        };
        setWorkout(item);
        setIsLoading(false);
        return;
      }

      if (workoutId) {
        try {
          const item = await repo.getWorkoutById(workoutId);
          if (item) {
            setWorkout(item);

            const setsNum = item.sets || 5;
            const repsNum = item.reps || 14;
            const restSec = (item as any).restTimeSeconds || 60;
            const eq = (item as any).equipment || 'Bodyweight';
            const diff = (item.difficulty || 'Beginner').toUpperCase();
            const tipDesc = item.description || (
              item.title?.toLowerCase().includes('chin')
                ? 'Targeted biceps training with bodyweight. Includes secondary focus on Lats.'
                : 'Targeted resistance training with bodyweight. Maintain strict form, brace your core, and control the eccentric movement.'
            );

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
  }, [workoutId, exercise, repo]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#FFFFFF" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const img = resolveWorkoutImage(workout, !isOnline);
  const targetSets = exerciseMeta?.sets ?? workout?.sets ?? 5;
  const rawReps = exerciseMeta?.reps ?? workout?.reps ?? 14;
  const repsFormatted = typeof rawReps === 'number' || (!isNaN(Number(rawReps)) && !String(rawReps).includes('rep'))
    ? `${rawReps} reps`
    : String(rawReps);
  const targetRest = `${exerciseMeta?.restSeconds ?? (workout as any)?.restTimeSeconds ?? 60}s`;
  const equipmentText = exerciseMeta?.equipment || (workout as any)?.equipment || 'Bodyweight';
  const difficultyText = exerciseMeta?.difficulty || workout?.difficulty?.toUpperCase() || 'BEGINNER';
  const descriptionText = exerciseMeta?.tips || workout?.description || (
    workout?.title?.toLowerCase().includes('chin')
      ? 'Targeted biceps training with bodyweight. Includes secondary focus on Lats.'
      : 'Targeted resistance training with bodyweight. Includes secondary focus on Lats.'
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Navigation Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Back to workouts"
          >
            <ArrowLeft size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Workout Details</Text>
          <View style={styles.topBarRightSpacer} />
        </View>

        {/* Hero Line-Art Illustration */}
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
                  size={240}
                  backgroundColor="#FFFFFF"
                  containerStyle={styles.heroIllustrationContainer}
                />
              );
            }
            return (
              <Image
                source={img.isOfflineFallback ? require('../../assets/category/full-body.png') : { uri: img.resolvedImage }}
                style={styles.heroImage}
                resizeMode="contain"
              />
            );
          })()}
        </View>

        {/* Title and Specs */}
        <View style={styles.content}>
          <View style={styles.categoryRow}>
            <Text style={styles.category}>
              {(workout?.category || 'ARM').toUpperCase()}
            </Text>
            {difficultyText ? (
              <View style={styles.difficultyBadge}>
                <Text style={styles.difficultyBadgeText}>{difficultyText}</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.title}>{workout?.title || 'Chin-up'}</Text>

          <Text style={styles.equipmentText}>
            Equipment: {equipmentText}
          </Text>

          {/* Core Target Specs: Sets, Reps, Rest Time */}
          <View style={styles.specsRow}>
            <View style={styles.specCard}>
              <Dumbbell size={20} color="#FFFFFF" style={styles.specIcon} />
              <Text style={styles.specValue}>{targetSets} Sets</Text>
              <Text style={styles.specLabel}>TARGET SETS</Text>
            </View>

            <View style={styles.specCard}>
              <Repeat size={20} color="#FFFFFF" style={styles.specIcon} />
              <Text style={styles.specValue}>{repsFormatted}</Text>
              <Text style={styles.specLabel}>TARGET REPS</Text>
            </View>

            <View style={styles.specCard}>
              <Timer size={20} color="#FFFFFF" style={styles.specIcon} />
              <Text style={styles.specValue}>{targetRest}</Text>
              <Text style={styles.specLabel}>REST TIME</Text>
            </View>
          </View>

          {/* Description & Technique Tips Card */}
          <View style={styles.techniqueCard}>
            <View style={styles.techniqueHeader}>
              <Lightbulb size={16} color="#FFFFFF" />
              <Text style={styles.techniqueTitle}>Description & Technique</Text>
            </View>
            <Text style={styles.techniqueText}>{descriptionText}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    paddingBottom: 40,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 48,
    backgroundColor: '#000000',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  topBarTitle: {
    fontFamily: APPLE_FONT_FAMILY,
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  topBarRightSpacer: {
    width: 44,
    height: 44,
  },
  heroContainer: {
    width: '100%',
    height: 310,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroIllustrationContainer: {
    width: '100%',
    height: 310,
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    width: '100%',
    height: 310,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 18,
    backgroundColor: '#000000',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  category: {
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 0.5,
    fontWeight: '800',
    fontFamily: APPLE_FONT_FAMILY,
  },
  difficultyBadge: {
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 6,
  },
  difficultyBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 0.5,
    fontFamily: APPLE_FONT_FAMILY,
  },
  title: {
    fontFamily: APPLE_FONT_FAMILY,
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    marginTop: 4,
    marginBottom: 4,
  },
  equipmentText: {
    fontSize: 13.5,
    color: '#8E8E93',
    fontFamily: APPLE_FONT_FAMILY,
    marginBottom: 18,
  },
  specsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  specCard: {
    flex: 1,
    backgroundColor: '#161618',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 18,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  specIcon: {
    marginBottom: 8,
  },
  specValue: {
    fontFamily: APPLE_FONT_FAMILY,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  specLabel: {
    fontSize: 10,
    color: '#636366',
    marginTop: 3,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
    fontFamily: APPLE_FONT_FAMILY,
  },
  techniqueCard: {
    backgroundColor: '#161618',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    marginBottom: 20,
  },
  techniqueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  techniqueTitle: {
    fontSize: 15,
    fontFamily: APPLE_FONT_FAMILY,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  techniqueText: {
    fontSize: 13.5,
    color: '#8E8E93',
    lineHeight: 20,
    fontFamily: APPLE_FONT_FAMILY,
  },
});
