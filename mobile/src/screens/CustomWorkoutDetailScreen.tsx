import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import {
  ChevronLeft,
  Dumbbell,
  Timer,
  ChevronRight,
  X,
  Play,
  Lightbulb,
  CheckCircle2,
  Trash2,
  Repeat,
  Check,
  Clock,
  Flame,
} from 'lucide-react-native';
import { colors, typography, borderRadius, spacing } from '../theme';
import { WorkoutIllustration } from '../components/WorkoutIllustration';
import { useCustomWorkoutsStore, CustomExerciseItem } from '../store/customWorkoutsStore';
import { useWorkoutHistoryStore } from '../store/workoutHistoryStore';
import { getSyncRepository } from '../sync/SyncRepository';

export const CustomWorkoutDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { routineId } = route.params || {};

  const { getCustomWorkoutById, removeCustomWorkout } = useCustomWorkoutsStore();
  const routine = getCustomWorkoutById(routineId);

  // Selected exercise for information modal
  const [selectedExercise, setSelectedExercise] = useState<CustomExerciseItem | null>(null);
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
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <ChevronLeft size={24} color="#0A0A0A" strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Routine</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Dumbbell size={48} color="#A1A1AA" style={{ marginBottom: 12 }} />
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#0A0A0A', marginBottom: 6 }}>
            Routine Not Found
          </Text>
          <Text style={{ fontSize: 13, color: '#71717A', textAlign: 'center', marginBottom: 20 }}>
            This custom routine might have been removed or does not exist.
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: '#0A0A0A', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 }}
            onPress={() => navigation.goBack()}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>Return to Workouts</Text>
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
    setSelectedExercise(ex);
  };

  const handleToggleFinish = (exerciseId: string) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Haptics optional
    }
    setFinishedExerciseIds((prev) =>
      prev.includes(exerciseId)
        ? prev.filter((id) => id !== exerciseId)
        : [...prev, exerciseId]
    );
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

    // 2. Also optimistically save to local SQLite progress
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
      {/* 1. TOP HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={24} color="#0A0A0A" strokeWidth={2.5} />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {routine?.title || 'Custom Routine'}
        </Text>

        <TouchableOpacity
          style={styles.deleteHeaderButton}
          onPress={handleDeleteRoutine}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Delete routine"
        >
          <Trash2 size={18} color="#FF453A" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* EXERCISES LIST SECTION */}
        <View style={styles.sectionHeaderWrap}>
          <Text style={styles.sectionTitle}>Exercises in this Workout</Text>
          <Text style={styles.sectionSubtitle}>
            Tap any exercise to inspect target sets, reps, rest periods & technique tips.
          </Text>
        </View>

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
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`${exercise.title}, ${isFinished ? 'completed' : 'pending'}`}
            >
              {/* Step Index Badge */}
              <View
                style={[
                  styles.stepBadge,
                  isFinished && styles.stepBadgeFinished,
                ]}
              >
                {isFinished ? (
                  <Check size={12} color="#FFFFFF" strokeWidth={3} />
                ) : (
                  <Text style={styles.stepBadgeText}>{index + 1}</Text>
                )}
              </View>

              {/* Illustration / Icon Squircle */}
              <View style={styles.exerciseSquircle}>
                {exercise.slug ? (
                  <WorkoutIllustration
                    slug={exercise.slug}
                    size={52}
                    containerStyle={styles.exerciseIllustration}
                  />
                ) : (
                  <Dumbbell size={20} color="#0A0A0A" />
                )}
              </View>

              {/* Content Column */}
              <View style={styles.exerciseInfo}>
                <View style={styles.categoryRow}>
                  <Text style={styles.exerciseCategory}>
                    {exercise.category?.toUpperCase() || 'STRENGTH'}
                  </Text>
                  {isFinished && (
                    <View style={styles.finishedTag}>
                      <Check size={9} color="#16A34A" strokeWidth={3} />
                      <Text style={styles.finishedTagText}>FINISHED</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.exerciseTitle} numberOfLines={1}>
                  {exercise.title}
                </Text>

                {/* Targets Summary Chips */}
                <View style={styles.targetsRow}>
                  <View style={styles.targetBadge}>
                    <Text style={styles.targetBadgeText}>
                      {exercise.preferredSets} Sets • {exercise.preferredReps}
                    </Text>
                  </View>

                  <View style={styles.targetBadgeSecondary}>
                    <Timer size={11} color="#6B6B6B" />
                    <Text style={styles.targetBadgeSecondaryText}>
                      {exercise.restTimeSeconds}s rest
                    </Text>
                  </View>
                </View>
              </View>

              <ChevronRight
                size={18}
                color={isFinished ? '#16A34A' : '#8E8E8E'}
                style={styles.chevron}
              />
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* 4. FLOATING BOTTOM START / FINISH WORKOUT CTA */}
      <View style={styles.bottomBarWrap}>
        <TouchableOpacity
          style={[styles.startButton, isStarted && styles.startButtonActive]}
          onPress={handleStartOrFinishPress}
          activeOpacity={0.88}
        >
          {isStarted ? (
            <View style={styles.activeTimerRow}>
              <View style={styles.timerPill}>
                <Timer size={16} color="#22C55E" />
                <Text style={styles.timerText}>{formatTime(elapsedSeconds)}</Text>
              </View>
              <Text style={styles.startButtonText}>Finish Workout</Text>
            </View>
          ) : (
            <View style={styles.startRow}>
              <Play size={16} color="#FFFFFF" fill="#FFFFFF" />
              <Text style={styles.startButtonText}>Start Workout</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* 5. EXERCISE INFORMATION MODAL */}
      <Modal
        visible={Boolean(selectedExercise)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedExercise(null)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              selectedExercise &&
                finishedExerciseIds.includes(selectedExercise.id) &&
                styles.modalCardFinished,
            ]}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.categoryRow}>
                <Text style={styles.modalCategoryText}>
                  {selectedExercise?.category?.toUpperCase() || 'EXERCISE SPECIFICATIONS'}
                </Text>
                {selectedExercise &&
                  finishedExerciseIds.includes(selectedExercise.id) && (
                    <View style={styles.finishedTag}>
                      <Check size={9} color="#16A34A" strokeWidth={3} />
                      <Text style={styles.finishedTagText}>COMPLETED</Text>
                    </View>
                  )}
              </View>
              <TouchableOpacity
                onPress={() => setSelectedExercise(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color="#8E8E8E" />
              </TouchableOpacity>
            </View>

            {/* Large Illustration / Header */}
            {selectedExercise?.slug && (
              <View style={styles.modalIllustrationWrap}>
                <WorkoutIllustration
                  slug={selectedExercise.slug}
                  size={120}
                  containerStyle={styles.modalIllustration}
                />
              </View>
            )}

            <Text style={styles.modalExerciseTitle}>
              {selectedExercise?.title}
            </Text>

            <Text style={styles.modalEquipmentText}>
              Equipment: {selectedExercise?.equipment || 'Free Weights'} • Difficulty: {selectedExercise?.difficulty || 'Intermediate'}
            </Text>

            {/* 3 TARGET SPEC BOXES: Sets, Reps, Rest */}
            <View style={styles.specsRow}>
              {/* Sets */}
              <View style={styles.specBox}>
                <Dumbbell size={16} color="#0A0A0A" />
                <Text style={styles.specBoxValue}>
                  {selectedExercise?.preferredSets || 4}
                </Text>
                <Text style={styles.specBoxLabel}>Sets</Text>
              </View>

              {/* Reps */}
              <View style={styles.specBox}>
                <Repeat size={16} color="#0A0A0A" />
                <Text style={styles.specBoxValue}>
                  {selectedExercise?.preferredReps || '10-12'}
                </Text>
                <Text style={styles.specBoxLabel}>Reps</Text>
              </View>

              {/* Rest Time */}
              <View style={styles.specBox}>
                <Timer size={16} color="#0A0A0A" />
                <Text style={styles.specBoxValue}>
                  {selectedExercise?.restTimeSeconds || 60}s
                </Text>
                <Text style={styles.specBoxLabel}>Rest Interval</Text>
              </View>
            </View>

            {/* Pro Form & Technique Tip */}
            <View style={styles.tipCard}>
              <View style={styles.tipHeader}>
                <Lightbulb size={16} color="#0A0A0A" />
                <Text style={styles.tipTitle}>Recommended Technique</Text>
              </View>
              <Text style={styles.tipDesc}>
                {selectedExercise?.tips ||
                  'Control the eccentric phase for 2-3 seconds, maintain core tightness, and perform full range of motion.'}
              </Text>
            </View>

            {/* Finish Action Button */}
            {selectedExercise && (
              <TouchableOpacity
                style={[
                  styles.finishExerciseBtn,
                  finishedExerciseIds.includes(selectedExercise.id) &&
                    styles.finishExerciseBtnCompleted,
                ]}
                onPress={() => handleToggleFinish(selectedExercise.id)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={
                  finishedExerciseIds.includes(selectedExercise.id)
                    ? 'Mark exercise as incomplete'
                    : 'Finish exercise'
                }
              >
                {finishedExerciseIds.includes(selectedExercise.id) ? (
                  <>
                    <CheckCircle2 size={18} color="#FFFFFF" strokeWidth={2.5} />
                    <Text style={styles.finishExerciseBtnText}>
                      Finished • Completed
                    </Text>
                  </>
                ) : (
                  <>
                    <Check size={18} color="#FFFFFF" strokeWidth={3} />
                    <Text style={styles.finishExerciseBtnText}>
                      Finish Exercise
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* 6. "ARE YOUR WORKOUT DONE?" CONFIRMATION MODAL */}
      <Modal
        visible={isConfirmDoneModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsConfirmDoneModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmModalCard}>
            <View style={styles.confirmIconSquircle}>
              <CheckCircle2 size={32} color="#16A34A" />
            </View>

            <Text style={styles.confirmModalTitle}>Are your workout done?</Text>
            <Text style={styles.confirmModalSubtitle}>
              Great work! Review your session stats below and save your workout to history.
            </Text>

            {/* Stats Preview Box */}
            <View style={styles.confirmStatsBox}>
              <View style={styles.confirmStatItem}>
                <Clock size={16} color="#0A0A0A" />
                <Text style={styles.confirmStatValue}>{formatTime(elapsedSeconds)}</Text>
                <Text style={styles.confirmStatLabel}>Elapsed</Text>
              </View>
              <View style={styles.confirmStatDivider} />
              <View style={styles.confirmStatItem}>
                <Dumbbell size={16} color="#0A0A0A" />
                <Text style={styles.confirmStatValue}>
                  {finishedExerciseIds.length}/{exercises.length}
                </Text>
                <Text style={styles.confirmStatLabel}>Exercises</Text>
              </View>
              <View style={styles.confirmStatDivider} />
              <View style={styles.confirmStatItem}>
                <Flame size={16} color="#0A0A0A" />
                <Text style={styles.confirmStatValue}>
                  {Math.max(25, Math.round((elapsedSeconds / 60) * 8.5))}
                </Text>
                <Text style={styles.confirmStatLabel}>Calories</Text>
              </View>
            </View>

            {/* Modal Buttons */}
            <TouchableOpacity
              style={styles.confirmDoneBtn}
              onPress={handleConfirmFinishWorkout}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmDoneBtnText}>Yes, I'm Done</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmResumeBtn}
              onPress={() => setIsConfirmDoneModalVisible(false)}
              activeOpacity={0.8}
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
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F2',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F7',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: typography.fonts.headingBold,
    color: '#0A0A0A',
    fontWeight: '700',
    textAlign: 'center',
    flex: 1,
    marginHorizontal: 12,
  },
  deleteHeaderButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF1F0',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  /* Section Header */
  sectionHeaderWrap: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: typography.fonts.headingBold,
    color: '#0A0A0A',
    fontWeight: '700',
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: typography.fonts.body,
    color: '#8E8E8E',
  },

  /* Exercise Card */
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EAEAED',
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  exerciseCardFinished: {
    borderColor: '#22C55E', // Green border when exercise is finished
    borderWidth: 2,
    backgroundColor: '#F7FCF9',
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F0F0F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  stepBadgeText: {
    fontSize: 11,
    fontFamily: typography.fonts.headingBold,
    color: '#0A0A0A',
    fontWeight: '700',
  },
  stepBadgeFinished: {
    backgroundColor: '#22C55E',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  finishedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  finishedTagText: {
    fontSize: 9,
    fontFamily: typography.fonts.headingBold,
    color: '#16A34A',
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  exerciseSquircle: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#F5F5F7',
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
    backgroundColor: 'transparent',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseCategory: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B6B6B',
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  exerciseTitle: {
    fontSize: 15,
    fontFamily: typography.fonts.headingBold,
    color: '#0A0A0A',
    fontWeight: '700',
    marginBottom: 4,
  },
  targetsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  targetBadge: {
    backgroundColor: '#0A0A0A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  targetBadgeText: {
    fontSize: 10.5,
    fontFamily: typography.fonts.headingBold,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  targetBadgeSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EAEAED',
    gap: 4,
  },
  targetBadgeSecondaryText: {
    fontSize: 10.5,
    fontFamily: typography.fonts.body,
    color: '#6B6B6B',
    fontWeight: '600',
  },
  chevron: {
    marginLeft: 8,
  },

  /* Floating Bottom Bar */
  bottomBarWrap: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
  },
  startButton: {
    backgroundColor: '#0A0A0A',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  startButtonActive: {
    backgroundColor: '#0A0A0A',
    borderColor: '#22C55E',
    borderWidth: 1.5,
  },
  startButtonText: {
    fontSize: 15,
    fontFamily: typography.fonts.headingBold,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  activeTimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  startRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timerText: {
    fontSize: 14,
    fontFamily: typography.fonts.headingBold,
    color: '#22C55E',
    fontWeight: '800',
  },

  /* Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#EAEAED',
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalCardFinished: {
    borderColor: '#22C55E', // Green border when completed
    borderWidth: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalCategoryText: {
    fontSize: 10.5,
    fontFamily: typography.fonts.headingBold,
    color: '#6B6B6B',
    letterSpacing: 0.8,
  },
  modalIllustrationWrap: {
    width: '100%',
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  modalIllustration: {
    width: 120,
    height: 110,
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  modalExerciseTitle: {
    fontSize: 18,
    fontFamily: typography.fonts.headingBold,
    color: '#0A0A0A',
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalEquipmentText: {
    fontSize: 11.5,
    fontFamily: typography.fonts.body,
    color: '#8E8E8E',
    textAlign: 'center',
    marginBottom: 16,
  },

  /* 3 Target Spec Boxes */
  specsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 14,
  },
  specBox: {
    flex: 1,
    backgroundColor: '#F7F7F8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAEAED',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  specBoxValue: {
    fontSize: 16,
    fontFamily: typography.fonts.headingBold,
    color: '#0A0A0A',
    fontWeight: '800',
    marginTop: 4,
    marginBottom: 1,
  },
  specBoxLabel: {
    fontSize: 10,
    fontFamily: typography.fonts.body,
    color: '#6B6B6B',
    fontWeight: '600',
  },

  /* Tip Card */
  tipCard: {
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAEAED',
    padding: 12,
    marginBottom: 16,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  tipTitle: {
    fontSize: 12,
    fontFamily: typography.fonts.headingBold,
    color: '#0A0A0A',
    fontWeight: '700',
  },
  tipDesc: {
    fontSize: 11.5,
    fontFamily: typography.fonts.body,
    color: '#6B6B6B',
    lineHeight: 16,
  },
  finishExerciseBtn: {
    backgroundColor: '#16A34A', // Vibrant fitness green
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 4,
  },
  finishExerciseBtnCompleted: {
    backgroundColor: '#15803D', // Darker forest green when completed
  },
  finishExerciseBtnText: {
    fontSize: 14,
    fontFamily: typography.fonts.headingBold,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  /* Confirmation Modal */
  confirmModalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#EAEAED',
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  confirmIconSquircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  confirmModalTitle: {
    fontSize: 20,
    fontFamily: typography.fonts.headingBold,
    color: '#0A0A0A',
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  confirmModalSubtitle: {
    fontSize: 13,
    fontFamily: typography.fonts.body,
    color: '#6B6B6B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  confirmStatsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: '#F7F7F8',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EAEAED',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  confirmStatItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  confirmStatValue: {
    fontSize: 15,
    fontFamily: typography.fonts.headingBold,
    color: '#0A0A0A',
    fontWeight: '800',
    marginTop: 2,
  },
  confirmStatLabel: {
    fontSize: 10,
    fontFamily: typography.fonts.body,
    color: '#8E8E8E',
  },
  confirmStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#EAEAED',
  },
  confirmDoneBtn: {
    width: '100%',
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 8,
  },
  confirmDoneBtnText: {
    fontSize: 15,
    fontFamily: typography.fonts.headingBold,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  confirmResumeBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  confirmResumeBtnText: {
    fontSize: 13,
    fontFamily: typography.fonts.headingMedium,
    color: '#8E8E8E',
    fontWeight: '600',
  },
});
