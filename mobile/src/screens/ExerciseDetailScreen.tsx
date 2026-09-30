import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Dumbbell,
  Repeat,
  Timer,
  Lightbulb,
} from '../components/icons';
import { WorkoutIllustration } from '../components/WorkoutIllustration';
import { workoutAssetMap } from '../assets/workoutAssetMap';
import type { MergedWorkout } from '../types';

const APPLE_FONT_FAMILY =
  Platform.OS === 'web'
    ? '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif'
    : Platform.OS === 'ios'
    ? 'System'
    : 'Roboto';

function formatTitleCase(str?: string): string {
  if (!str) return '';
  return str
    .split(/([ -])/)
    .map((word) =>
      word.length > 0 && word !== ' ' && word !== '-'
        ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        : word
    )
    .join('');
}

interface ExerciseDetailScreenProps {
  route: any;
  navigation: any;
}

export const ExerciseDetailScreen: React.FC<ExerciseDetailScreenProps> = ({
  route,
  navigation,
}) => {
  const { workout } = (route.params || {}) as { workout?: MergedWorkout };

  const handleBack = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    navigation.goBack();
  };

  if (!workout) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Workout Details</Text>
          <View style={styles.topBarRightSpacer} />
        </View>
        <View style={styles.emptyContainer}>
          <Dumbbell size={48} color="rgba(255, 255, 255, 0.4)" />
          <Text style={styles.emptyText}>Exercise information not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const category = (workout.category || 'ARM').toUpperCase();
  const equipment = workout.equipment
    ? formatTitleCase(workout.equipment)
    : 'Bodyweight';
  const difficulty = (workout.difficulty || 'BEGINNER').toUpperCase();
  const setsCount = workout.sets || 5;
  const rawReps = workout.reps || 14;
  const repsFormatted =
    typeof rawReps === 'number' ||
    (!isNaN(Number(rawReps)) && !String(rawReps).includes('rep'))
      ? `${rawReps} reps`
      : String(rawReps);
  const restTime = `${(workout as any).restTimeSeconds || 60}s`;
  const description =
    workout.description ||
    (workout.title?.toLowerCase().includes('chin')
      ? 'Targeted biceps training with bodyweight. Includes secondary focus on Lats.'
      : 'Targeted resistance training with bodyweight. Includes secondary focus on Lats.');

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Navigation Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
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
          {workout.slug && workoutAssetMap[workout.slug] ? (
            <WorkoutIllustration
              slug={workout.slug}
              interactive={true}
              autoPlay={true}
              loopIntervalMs={650}
              size={240}
              backgroundColor="#FFFFFF"
              containerStyle={styles.heroIllustrationContainer}
            />
          ) : (
            <View style={styles.fallbackIconWrap}>
              <Dumbbell size={64} color="#0A0A0A" />
            </View>
          )}
        </View>

        {/* Content Details */}
        <View style={styles.content}>
          {/* Category & Difficulty Row */}
          <View style={styles.categoryRow}>
            <Text style={styles.category}>{category}</Text>
            <View style={styles.difficultyBadge}>
              <Text style={styles.difficultyBadgeText}>{difficulty}</Text>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>{workout.title || 'Chin-up'}</Text>

          {/* Equipment */}
          <Text style={styles.equipmentText}>Equipment: {equipment}</Text>

          {/* Core Target Specs: Sets, Reps, Rest Time */}
          <View style={styles.specsRow}>
            <View style={styles.specCard}>
              <Dumbbell size={20} color="#FFFFFF" style={styles.specIcon} />
              <Text style={styles.specValue}>{setsCount} Sets</Text>
              <Text style={styles.specLabel}>TARGET SETS</Text>
            </View>

            <View style={styles.specCard}>
              <Repeat size={20} color="#FFFFFF" style={styles.specIcon} />
              <Text style={styles.specValue}>{repsFormatted}</Text>
              <Text style={styles.specLabel}>TARGET REPS</Text>
            </View>

            <View style={styles.specCard}>
              <Timer size={20} color="#FFFFFF" style={styles.specIcon} />
              <Text style={styles.specValue}>{restTime}</Text>
              <Text style={styles.specLabel}>REST TIME</Text>
            </View>
          </View>

          {/* Description & Technique Tips Card */}
          <View style={styles.techniqueCard}>
            <View style={styles.techniqueHeader}>
              <Lightbulb size={16} color="#FFFFFF" />
              <Text style={styles.techniqueTitle}>Description & Technique</Text>
            </View>
            <Text style={styles.techniqueText}>{description}</Text>
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
  fallbackIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: APPLE_FONT_FAMILY,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
});

export default ExerciseDetailScreen;
