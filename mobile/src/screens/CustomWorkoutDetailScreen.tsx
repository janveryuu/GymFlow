import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import {
  ChevronLeft,
  Dumbbell,
  Timer,
  ChevronRight,
  Play,
  CheckCircle2,
  Trash2,
  Check,
  Clock,
} from '../components/icons';
import { colors } from '../theme';
import { WorkoutIllustration } from '../components/WorkoutIllustration';
import { SlideCommit } from '../components/SlideCommit';
import { useCustomWorkoutsStore, CustomExerciseItem } from '../store/customWorkoutsStore';
import { useWorkoutHistoryStore } from '../store/workoutHistoryStore';
import { getSyncRepository } from '../sync/SyncRepository';

const APPLE_FONT_FAMILY = Platform.OS === 'web'
  ? '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif'
  : Platform.OS === 'ios'
  ? 'System'
  : 'Roboto';

export const CustomWorkoutDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { routineId } = route.params || {};

  const { getCustomWorkoutById, removeCustomWorkout } = useCustomWorkoutsStore();
  const routine = getCustomWorkoutById(routineId);

  const [isStarted, setIsStarted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isConfirmDoneModalVisible, setIsConfirmDoneModalVisible] = useState(false);
  const [finishedExerciseIds, setFinishedExerciseIds] = useState<string[]>([]);

  const { addHistoryEntry } = useWorkoutHistoryStore();

  // Active workout timer
  useEffect(() => {
    let interval: any = null;
    if (isStarted) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isStarted]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!routine) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.navBar}>
          <View style={styles.navToolbar}>
            <TouchableOpacity
              style={styles.toolbarIconButton}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <ChevronLeft size={22} color="#FFFFFF" strokeWidth={2.4} />
            </TouchableOpacity>
            <Text style={styles.navBarTitle}>Routine</Text>
            <View style={styles.toolbarIconButton} />
          </View>
        </View>

        <View style={styles.emptyContainer}>
          <Dumbbell size={48} color="rgba(255, 255, 255, 0.3)" style={{ marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>Routine Not Found</Text>
          <Text style={styles.emptySubtitle}>
            This custom routine might have been removed or does not exist.
          </Text>
          <TouchableOpacity
            style={styles.emptyActionButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.emptyActionText}>Return to Workouts</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const exercises = routine.routineExercises || [];

  const handleOpenExerciseInfo = (ex: CustomExerciseItem) => {
    try {
      Haptics.selectionAsync();
    } catch {
      // Haptics optional
    }
    navigation.navigate('WorkoutDetail', {
      workoutId: ex.id,
      exercise: ex,
      routineId: routine.id,
    });
  };

  const handleStartOrFinishPress = () => {
    if (!isStarted) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // Haptics optional
      }
      setIsStarted(true);
    } else {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {
        // Haptics optional
      }
      setIsConfirmDoneModalVisible(true);
    }
  };

  const handleConfirmFinishWorkout = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Haptics optional
    }

    const calculatedCalories = Math.max(25, Math.round((elapsedSeconds / 60) * 8.5));

    // 1. Save to workoutHistoryStore
    addHistoryEntry({
      id: `hist-${Date.now()}`,
      workout_id: routine?.id || `custom-${Date.now()}`,
      workout_title: routine?.title || 'Custom Routine',
      completed_at: new Date().toISOString(),
      duration_seconds: Math.max(elapsedSeconds, 1),
      calories_burned: calculatedCalories,
      exercises_completed: finishedExerciseIds.length,
      total_exercises: exercises.length,
      category: routine?.category || 'Custom',
    });

    // 2. Optimistically save to local SQLite progress
    try {
      const repo = getSyncRepository();
      repo.submitProgress({
        workout_id: routine?.id || `custom-${Date.now()}`,
        workout_title: routine?.title || 'Custom Routine',
        completed_at: new Date().toISOString(),
        duration_seconds: Math.max(elapsedSeconds, 1),
        calories_burned: calculatedCalories,
      });
    } catch {
      // Skip if sync repo offline
    }

    setIsConfirmDoneModalVisible(false);
    setIsStarted(false);

    // 3. Proceed to workout history screen
    navigation.replace('WorkoutHistoryScreen');
  };

  const handleDeleteRoutine = () => {
    Alert.alert(
      'Delete Routine',
      `Are you sure you want to delete "${routine?.title || 'this routine'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (routine?.id) {
              removeCustomWorkout(routine.id);
            }
            navigation.goBack();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 1. iOS Navigation Toolbar */}
      <View style={styles.navBar}>
        <View style={styles.navToolbar}>
          <TouchableOpacity
            style={styles.toolbarIconButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ChevronLeft size={22} color="#FFFFFF" strokeWidth={2.4} />
          </TouchableOpacity>

          <Text style={styles.navBarTitle} numberOfLines={1}>
            {routine.title}
          </Text>

          <TouchableOpacity
            style={styles.toolbarIconButton}
            onPress={handleDeleteRoutine}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Delete routine"
          >
            <Trash2 size={20} color="#FF453A" strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Routine Header */}
        <View style={styles.routineHeader}>
          <Text style={styles.largeTitle}>{routine.title}</Text>
        </View>

        {/* Exercises Section Heading */}
        <View style={styles.sectionHeaderWrap}>
          <Text style={styles.sectionTitle}>Exercises in this Workout</Text>
          <Text style={styles.sectionSubtitle}>
            Tap any exercise to inspect target sets, reps, rest periods & technique tips.
          </Text>
        </View>

        {/* Exercise Grouped Cards */}
        {exercises.map((exercise, index) => {
          const isFinished = finishedExerciseIds.includes(exercise.id);

          return (
            <TouchableOpacity
              key={exercise.id || `ex-${index}`}
              style={[
                styles.exerciseCard,
                isFinished && styles.exerciseCardFinished,
              ]}
              onPress={() => handleOpenExerciseInfo(exercise)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${exercise.title}, ${isFinished ? 'completed' : 'pending'}`}
            >
              {/* Step Index Rounded Badge */}
              <View
                style={[
                  styles.stepBadge,
                  isFinished && styles.stepBadgeFinished,
                ]}
              >
                {isFinished ? (
                  <Check size={11} color="#FFFFFF" strokeWidth={3} />
                ) : (
                  <Text style={styles.stepBadgeText}>{index + 1}</Text>
                )}
              </View>

              {/* Illustration Thumbnail (Static Line-Art Image) */}
              <View style={styles.exerciseSquircle}>
                {exercise.slug ? (
                  <WorkoutIllustration
                    slug={exercise.slug}
                    size={52}
                    autoPlay={false}
                    interactive={false}
                    backgroundColor="#FFFFFF"
                    containerStyle={styles.exerciseIllustration}
                  />
                ) : (
                  <Dumbbell size={22} color="#1C1C1E" strokeWidth={2} />
                )}
              </View>

              {/* Exercise Details Column: Title on top, Category below in gray */}
              <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseTitle} numberOfLines={1}>
                  {exercise.title}
                </Text>

                <View style={styles.categoryRow}>
                  <Text style={styles.exerciseCategory}>
                    {exercise.category?.toUpperCase() || 'STRENGTH'}
                  </Text>
                  {isFinished && (
                    <View style={styles.finishedTag}>
                      <Check size={9} color="#30D158" strokeWidth={3} />
                      <Text style={styles.finishedTagText}>COMPLETED</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* iOS Disclosure Chevron */}
              <ChevronRight
                size={14}
                color={isFinished ? '#30D158' : 'rgba(255, 255, 255, 0.3)'}
                strokeWidth={2.5}
                style={styles.chevron}
              />
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* Floating Apple-Style Bottom Action Dock */}
      <View style={styles.bottomBarWrap}>
        {isStarted ? (
          <TouchableOpacity
            style={styles.activeWorkoutBar}
            onPress={handleStartOrFinishPress}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Finish workout"
          >
            <View style={styles.activeTimerPill}>
              <Timer size={15} color="#30D158" strokeWidth={2.4} />
              <Text style={styles.activeTimerText}>{formatTime(elapsedSeconds)}</Text>
            </View>
            <Text style={styles.finishWorkoutText}>Finish Workout</Text>
            <ChevronRight size={16} color="rgba(255, 255, 255, 0.5)" strokeWidth={2.5} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.startWorkoutButton}
            onPress={handleStartOrFinishPress}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel="Start workout"
          >
            <Play size={17} color="#FFFFFF" fill="#FFFFFF" />
            <Text style={styles.startWorkoutText}>Start Workout</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Apple HIG Confirmation Modal */}
      <Modal
        visible={isConfirmDoneModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsConfirmDoneModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmModalCard}>
            <View style={styles.confirmIconSquircle}>
              <CheckCircle2 size={30} color="#30D158" />
            </View>

            <Text style={styles.confirmModalTitle}>Workout Complete?</Text>
            <Text style={styles.confirmModalSubtitle}>
              Great work! Review your session stats below and save your workout to history.
            </Text>

            {/* Prominent Elapsed Time (Without Card Background) */}
            <View style={styles.confirmElapsedSection}>
              <View style={styles.confirmElapsedRow}>
                <Clock size={20} color="#30D158" strokeWidth={2.2} />
                <Text style={styles.confirmElapsedValue}>{formatTime(elapsedSeconds)}</Text>
              </View>
              <Text style={styles.confirmElapsedLabel}>Elapsed Time</Text>
            </View>

            {/* Slide to Commit Button */}
            <SlideCommit
              label="Slide to Save & Finish"
              doneLabel="Workout Saved!"
              onConfirm={handleConfirmFinishWorkout}
              trackColor="#262626"
              handleColor="#FFFFFF"
              successColor="#30D158"
              height={56}
              radius={28}
              style={styles.confirmSlideBtn}
            />

            <TouchableOpacity
              style={styles.confirmResumeBtn}
              onPress={() => setIsConfirmDoneModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmResumeBtnText}>Resume Workout</Text>
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

  /* 1. iOS Navigation Toolbar */
  navBar: {
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
  },
  navToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
  },
  toolbarIconButton: {
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBarTitle: {
    fontSize: 17,
    fontFamily: APPLE_FONT_FAMILY,
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: -0.4,
    textAlign: 'center',
    flex: 1,
    marginHorizontal: 8,
  },

  /* Scroll Content */
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  /* Routine Header */
  routineHeader: {
    marginBottom: 20,
    marginTop: 4,
  },
  largeTitle: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0.35,
    lineHeight: 38,
    color: '#FFFFFF',
    fontFamily: APPLE_FONT_FAMILY,
  },

  /* Section Header */
  sectionHeaderWrap: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: APPLE_FONT_FAMILY,
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontFamily: APPLE_FONT_FAMILY,
    color: 'rgba(255, 255, 255, 0.5)',
    lineHeight: 18,
  },

  /* Inset Grouped Exercise Cards (matching CatalogScreen) */
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  exerciseCardFinished: {
    borderColor: 'rgba(48, 209, 88, 0.35)',
    backgroundColor: 'rgba(48, 209, 88, 0.08)',
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  stepBadgeFinished: {
    backgroundColor: '#30D158',
  },
  stepBadgeText: {
    fontSize: 11,
    fontFamily: APPLE_FONT_FAMILY,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
  },
  exerciseSquircle: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  exerciseIllustration: {
    width: '100%',
    height: '100%',
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: '#FFFFFF',
  },
  exerciseInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  exerciseTitle: {
    fontSize: 16,
    fontFamily: APPLE_FONT_FAMILY,
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  exerciseCategory: {
    fontSize: 11.5,
    fontFamily: APPLE_FONT_FAMILY,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.45)',
    letterSpacing: 0.4,
  },
  finishedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(48, 209, 88, 0.16)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  finishedTagText: {
    fontSize: 9.5,
    fontFamily: APPLE_FONT_FAMILY,
    color: '#30D158',
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  chevron: {
    marginLeft: 8,
  },

  /* Floating Apple-Style Bottom Action Dock */
  bottomBarWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 20,
    backgroundColor: Platform.OS === 'web' ? 'rgba(10, 10, 10, 0.88)' : 'rgba(10, 10, 10, 0.95)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    } as any : {}),
  },
  startWorkoutButton: {
    backgroundColor: '#007AFF',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  startWorkoutText: {
    fontSize: 16,
    fontFamily: APPLE_FONT_FAMILY,
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  activeWorkoutBar: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(48, 209, 88, 0.35)',
    paddingVertical: 11,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeTimerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  activeTimerText: {
    fontSize: 14,
    fontFamily: APPLE_FONT_FAMILY,
    color: '#30D158',
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  finishWorkoutText: {
    fontSize: 15,
    fontFamily: APPLE_FONT_FAMILY,
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: -0.2,
  },

  /* Apple HIG Confirmation Modal (matching CatalogScreen modals) */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
    } as any : {}),
  },
  confirmModalCard: {
    width: '100%',
    maxWidth: 350,
    backgroundColor: 'rgba(28, 28, 30, 0.96)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 8,
  },
  confirmIconSquircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  confirmModalTitle: {
    fontSize: 19,
    fontFamily: APPLE_FONT_FAMILY,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
    marginBottom: 6,
  },
  confirmModalSubtitle: {
    fontSize: 13,
    fontFamily: APPLE_FONT_FAMILY,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  confirmElapsedSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginBottom: 20,
  },
  confirmElapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confirmElapsedValue: {
    fontSize: 34,
    fontFamily: APPLE_FONT_FAMILY,
    color: '#FFFFFF',
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
  confirmElapsedLabel: {
    fontSize: 11,
    fontFamily: APPLE_FONT_FAMILY,
    color: 'rgba(255, 255, 255, 0.45)',
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  confirmSlideBtn: {
    width: '100%',
    marginBottom: 12,
  },
  confirmResumeBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  confirmResumeBtnText: {
    fontSize: 13,
    fontFamily: APPLE_FONT_FAMILY,
    color: 'rgba(255, 255, 255, 0.55)',
    fontWeight: '500',
  },

  /* Empty State */
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: APPLE_FONT_FAMILY,
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: APPLE_FONT_FAMILY,
    color: 'rgba(255, 255, 255, 0.55)',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  emptyActionButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    fontFamily: APPLE_FONT_FAMILY,
  },
});
