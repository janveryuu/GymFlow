import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import {
  Dumbbell,
  Sparkles,
  SquarePen,
  Trash2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  History,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, borderRadius, spacing } from '../theme';
import { WorkoutCardSkeleton } from '../components/SkeletonLoader';
import { EmptyState } from '../components/EmptyState';
import { ErrorCard } from '../components/ErrorCard';
import { getSyncRepository } from '../sync/SyncRepository';
import { mergeWorkouts } from '../sync/workoutMerge';
import { useRecentWorkoutsStore } from '../store/recentWorkoutsStore';
import { useCustomWorkoutsStore, CustomRoutineWorkout } from '../store/customWorkoutsStore';
import type { MergedWorkout, Workout } from '../types';

interface CatalogScreenProps {
  navigation: any;
}

export const CatalogScreen: React.FC<CatalogScreenProps> = ({ navigation }) => {
  // Height, Weight & BMI State
  const [height, setHeight] = useState<number>(157);
  const [weight, setWeight] = useState<number>(62);
  const [isEditBmiModalVisible, setIsEditBmiModalVisible] = useState(false);
  const [inputHeight, setInputHeight] = useState('157');
  const [inputWeight, setInputWeight] = useState('62');

  // Workouts data
  const [, setRawWorkouts] = useState<Workout[]>([]);
  const [mergedList, setMergedList] = useState<MergedWorkout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tab filter: 'custom' or 'personalized'
  const [activeTab, setActiveTab] = useState<'custom' | 'personalized'>('custom');

  // Multi-select / edit mode state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedWorkoutIds, setSelectedWorkoutIds] = useState<string[]>([]);

  // AI Generation indicator
  const [isGenerating, setIsGenerating] = useState(false);

  // Choice & Custom Workout Creation Modals
  const [isChoiceModalVisible, setIsChoiceModalVisible] = useState(false);
  const [isCustomWorkoutModalVisible, setIsCustomWorkoutModalVisible] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customCategory, setCustomCategory] = useState('Chest');
  const [customDuration, setCustomDuration] = useState('45');
  const [customExercises, setCustomExercises] = useState('5');

  const { addRecentId } = useRecentWorkoutsStore();
  const { customWorkouts, addCustomWorkout, removeCustomWorkout } = useCustomWorkoutsStore();
  const repo = getSyncRepository();

  // Load profile metrics & workouts
  const loadData = useCallback(async (forceRefresh = false) => {
    setError(null);
    try {
      const [workoutsData, profileData] = await Promise.all([
        repo.getWorkouts({ forceRefresh }),
        repo.getProfile().catch(() => null),
      ]);
      setRawWorkouts(workoutsData);
      const merged = mergeWorkouts(workoutsData);
      setMergedList(merged);

      if (profileData) {
        // If profile has height/weight stored
        if ((profileData as any).height) {
          const h = Number((profileData as any).height);
          if (h > 0) {
            setHeight(h);
            setInputHeight(String(h));
          }
        }
        if ((profileData as any).weight) {
          const w = Number((profileData as any).weight);
          if (w > 0) {
            setWeight(w);
            setInputWeight(String(w));
          }
        }
      }
    } catch {
      setError('Unable to load full catalog from server. Displaying offline library.');
      const fallback = mergeWorkouts([]);
      setMergedList(fallback);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [repo]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const [workoutsData, profileData] = await Promise.all([
            repo.getWorkouts({ forceRefresh: false }),
            repo.getProfile().catch(() => null),
          ]);
          if (active) {
            setRawWorkouts(workoutsData);
            const merged = mergeWorkouts(workoutsData);
            setMergedList(merged);
            if (profileData) {
              if ((profileData as any).height) {
                const h = Number((profileData as any).height);
                if (h > 0) {
                  setHeight(h);
                  setInputHeight(String(h));
                }
              }
              if ((profileData as any).weight) {
                const w = Number((profileData as any).weight);
                if (w > 0) {
                  setWeight(w);
                  setInputWeight(String(w));
                }
              }
            }
          }
        } catch {
          if (active) {
            setError('Unable to load full catalog from server. Displaying offline library.');
            setMergedList(mergeWorkouts([]));
          }
        } finally {
          if (active) {
            setIsLoading(false);
          }
        }
      })();
      return () => {
        active = false;
      };
    }, [repo])
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData(true);
  };

  // BMI Calculation
  const bmiValue = useMemo(() => {
    if (!height || !weight || height <= 0) return 25.2;
    const heightInMeters = height / 100;
    return parseFloat((weight / (heightInMeters * heightInMeters)).toFixed(1));
  }, [height, weight]);

  // BMI Category & Slider Position
  const bmiCategory = useMemo(() => {
    if (bmiValue < 18.5) return 'underweight';
    if (bmiValue < 25.0) return 'normal';
    if (bmiValue < 30.0) return 'overweight';
    return 'obese';
  }, [bmiValue]);

  // Track position percentage (0% to 100%)
  const bmiSliderPercent = useMemo(() => {
    if (bmiValue < 18.5) {
      // 14 to 18.5 maps to 4% - 25%
      const val = Math.max(14, Math.min(18.5, bmiValue));
      return ((val - 14) / (18.5 - 14)) * 23 + 2;
    }
    if (bmiValue < 25.0) {
      // 18.5 to 25 maps to 25% - 50%
      return 25 + ((bmiValue - 18.5) / (25 - 18.5)) * 25;
    }
    if (bmiValue < 30.0) {
      // 25 to 30 maps to 50% - 75%
      return 50 + ((bmiValue - 25) / (30 - 25)) * 25;
    }
    // 30 to 40 maps to 75% - 98%
    const val = Math.min(40, bmiValue);
    return 75 + ((val - 30) / (40 - 30)) * 23;
  }, [bmiValue]);

  // Save updated Height / Weight
  const handleSaveMeasurements = () => {
    const h = parseFloat(inputHeight);
    const w = parseFloat(inputWeight);
    if (!isNaN(h) && h > 50 && h < 260) {
      setHeight(h);
    }
    if (!isNaN(w) && w > 20 && w < 300) {
      setWeight(w);
    }
    setIsEditBmiModalVisible(false);
  };

  // Toggle single workout selection
  const handleToggleSelectWorkout = (workoutId: string) => {
    try {
      Haptics.selectionAsync();
    } catch {
      // Haptics optional
    }
    setSelectedWorkoutIds((prev) =>
      prev.includes(workoutId)
        ? prev.filter((id) => id !== workoutId)
        : [...prev, workoutId]
    );
  };

  // Delete selected workouts
  const handleDeleteSelected = () => {
    if (selectedWorkoutIds.length === 0) return;

    Alert.alert(
      'Delete Workouts',
      `Are you sure you want to remove ${selectedWorkoutIds.length} selected workout${selectedWorkoutIds.length > 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {
              // Haptics optional
            }
            setMergedList((prev) =>
              prev.filter((item) => !selectedWorkoutIds.includes(item.id))
            );
            selectedWorkoutIds.forEach((id) => removeCustomWorkout(id));
            setSelectedWorkoutIds([]);
            setIsSelectMode(false);
          },
        },
      ]
    );
  };

  // Custom Workout Creation Handler
  const handleSaveCustomWorkout = () => {
    if (!customTitle.trim()) {
      Alert.alert('Required', 'Please enter a workout title.');
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Haptics optional
    }

    const durationNum = parseInt(customDuration, 10) || 45;
    const exercisesNum = parseInt(customExercises, 10) || 4;

    const newWorkout: CustomRoutineWorkout = {
      id: `custom-${Date.now()}`,
      title: customTitle.trim(),
      slug: `custom-${Date.now()}`,
      category: customCategory,
      duration_minutes: durationNum,
      calories: durationNum * 8,
      difficulty: 'intermediate',
      equipment: 'Free Weights',
      sets: exercisesNum,
      reps: 12,
      sets_reps: `${exercisesNum} exercises • Last: ${new Date().toLocaleDateString('en-US')}`,
      image_url: '',
      description: `Custom ${customCategory} workout routine created by you.`,
      completion_percentage: 0,
      is_favorite: false,
      source: 'local',
      primaryMuscle: customCategory,
      secondaryMuscles: [],
      exerciseType: 'strength',
      isCustomRoutine: true,
      routineExercises: [
        {
          id: `ex-${Date.now()}-1`,
          title: `${customCategory} Compound Press`,
          slug: 'bench-press',
          category: customCategory,
          equipment: 'Barbell',
          difficulty: 'INTERMEDIATE',
          preferredSets: 4,
          preferredReps: '8 - 10 reps',
          restTimeSeconds: 90,
          tips: 'Keep elbows tucked at 45 degrees, maintain back arch, and control the bar descent.',
          duration_minutes: 15,
          calories: 100,
        },
        {
          id: `ex-${Date.now()}-2`,
          title: `${customCategory} Isolation Extension`,
          slug: 'dumbbell-curl',
          category: customCategory,
          equipment: 'Dumbbells',
          difficulty: 'BEGINNER',
          preferredSets: 3,
          preferredReps: '12 - 15 reps',
          restTimeSeconds: 45,
          tips: 'Squeeze at the peak contraction for 1 second. Avoid swinging your body.',
          duration_minutes: 10,
          calories: 65,
        },
      ],
    };

    addCustomWorkout(newWorkout);
    setIsCustomWorkoutModalVisible(false);
    setCustomTitle('');
    setActiveTab('custom');
    addRecentId(newWorkout.id);

    Alert.alert(
      'Workout Created! 🏋️',
      `"${newWorkout.title}" has been added to your custom workouts.`,
      [
        {
          text: 'Open Routine',
          onPress: () => navigation.navigate('CustomWorkoutDetailScreen', { routineId: newWorkout.id }),
        },
        { text: 'Done' },
      ]
    );
  };

  // AI Workout Generation Trigger
  const handleGenerateAiWorkout = () => {
    navigation.navigate('AiWorkoutGenerateScreen');
  };

  const handleSelectWorkout = (workout: MergedWorkout) => {
    if (isSelectMode) {
      handleToggleSelectWorkout(workout.id);
    } else {
      addRecentId(workout.id);
      if (
        (workout as any).isCustomRoutine ||
        (workout as any).routineExercises?.length ||
        workout.id.startsWith('custom-')
      ) {
        navigation.navigate('CustomWorkoutDetailScreen', { routineId: workout.id });
      } else {
        navigation.navigate('WorkoutDetail', { workoutId: workout.id });
      }
    }
  };

  // Filtered workouts based on Active Tab: strictly user-created routines
  const displayWorkouts = useMemo(() => {
    if (activeTab === 'personalized') {
      return customWorkouts.filter(
        (w) =>
          w.category?.toLowerCase() === 'personalized' ||
          w.id.startsWith('custom-ai-') ||
          w.id.startsWith('ai-') ||
          w.slug.startsWith('ai-routine')
      );
    }
    // 'custom' tab: display user's custom routines (non-AI)
    return customWorkouts.filter(
      (w) =>
        !w.id.startsWith('custom-ai-') &&
        !w.id.startsWith('ai-') &&
        !w.slug.startsWith('ai-routine') &&
        w.category?.toLowerCase() !== 'personalized'
    );
  }, [customWorkouts, activeTab]);

  // Render Workout Card matching reference layout
  const renderWorkoutCard = ({ item }: { item: MergedWorkout }) => {
    const isSelected = isSelectMode && selectedWorkoutIds.includes(item.id);
    const exerciseCount = item.sets || 4;

    return (
      <TouchableOpacity
        style={[
          styles.workoutCard,
          isSelected && styles.workoutCardSelected,
        ]}
        onPress={() => handleSelectWorkout(item)}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel={`Workout: ${item.title}`}
      >
        {/* Dumbbell Icon Squircle */}
        <View style={styles.iconSquircle}>
          <Dumbbell size={22} color="#FFFFFF" />
        </View>

        {/* Info Column */}
        <View style={styles.workoutInfo}>
          <Text style={styles.workoutTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.workoutMeta} numberOfLines={1}>
            {item.sets_reps || `${exerciseCount} exercises • Last: 11/24/2025`}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('DashboardTab');
            }
          }}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={24} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>

        <Text style={styles.topHeaderTitle}>Workout</Text>

        <TouchableOpacity
          style={styles.historyHeaderButton}
          onPress={() => navigation.navigate('WorkoutHistoryScreen')}
          activeOpacity={0.75}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Workout History"
        >
          <History size={20} color="#FFFFFF" strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={displayWorkouts}
        keyExtractor={(item) => item.id}
        renderItem={renderWorkoutCard}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerComponent}>
            {/* 1. TOP METRIC CARDS ROW (Height, Weight, BMI) */}
            <View style={styles.metricRow}>
              {/* Height Card */}
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>HEIGHT</Text>
                <Text style={styles.metricValue}>{Math.round(height)}</Text>
                <Text style={styles.metricUnit}>cm</Text>
              </View>

              {/* Weight Card */}
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>WEIGHT</Text>
                <Text style={styles.metricValue}>{Math.round(weight)}</Text>
                <Text style={styles.metricUnit}>kg</Text>
              </View>

              {/* BMI Card */}
              <TouchableOpacity
                style={styles.metricCard}
                onPress={() => setIsEditBmiModalVisible(true)}
                activeOpacity={0.85}
              >
                <View style={styles.bmiHeaderRow}>
                  <Text style={styles.metricLabel}>BMI</Text>
                  <SquarePen size={14} color={colors.textSecondary} />
                </View>
                <Text style={styles.bmiValue}>{bmiValue.toFixed(1)}</Text>
              </TouchableOpacity>
            </View>

            {/* 2. BMI SLIDER & CATEGORIES */}
            <View style={styles.bmiSliderSection}>
              {/* Continuous Track */}
              <View style={styles.sliderTrack}>
                <View
                  style={[
                    styles.sliderFilledTrack,
                    { width: `${Math.min(100, Math.max(4, bmiSliderPercent))}%` },
                  ]}
                />
                {/* Indicator Thumb */}
                <View
                  style={[
                    styles.sliderThumb,
                    { left: `${Math.min(96, Math.max(2, bmiSliderPercent))}%` },
                  ]}
                />
              </View>

              {/* Category Labels */}
              <View style={styles.sliderLabelsRow}>
                <Text
                  style={[
                    styles.categoryLabel,
                    bmiCategory === 'underweight' && styles.categoryLabelActive,
                  ]}
                >
                  Underweight
                </Text>
                <Text
                  style={[
                    styles.categoryLabel,
                    bmiCategory === 'normal' && styles.categoryLabelActive,
                  ]}
                >
                  Normal
                </Text>
                <Text
                  style={[
                    styles.categoryLabel,
                    bmiCategory === 'overweight' && styles.categoryLabelActive,
                  ]}
                >
                  Overweight
                </Text>
                <Text
                  style={[
                    styles.categoryLabel,
                    bmiCategory === 'obese' && styles.categoryLabelActive,
                  ]}
                >
                  Obese
                </Text>
              </View>
            </View>

            {/* 3. AI PERSONALIZED WORKOUT PROMPT CARD */}
            <View style={styles.aiBannerCard}>
              <View style={styles.aiBannerLeft}>
                <Sparkles size={24} color="#0A0A0A" style={styles.aiBannerIcon} />
                <View style={styles.aiBannerTextWrap}>
                  <Text style={styles.aiBannerTitle}>AI Personalized Workout</Text>
                  <Text style={styles.aiBannerSubtitle}>
                    Get a custom workout plan designed just for you
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.generateButton}
                onPress={() => setIsChoiceModalVisible(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.generateButtonText}>
                  Create a Workout
                </Text>
              </TouchableOpacity>
            </View>

            {/* 4. "MY WORKOUTS" SECTION HEADER */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>My Workouts</Text>

              <View style={styles.sectionActionsRow}>
                <TouchableOpacity
                  style={styles.modeToggleButton}
                  onPress={() => setIsSelectMode((prev) => !prev)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modeToggleText}>
                    {isSelectMode ? 'Cancel' : 'Edit'}
                  </Text>
                </TouchableOpacity>

                {isSelectMode && selectedWorkoutIds.length > 0 && (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={handleDeleteSelected}
                    activeOpacity={0.8}
                    accessibilityLabel="Delete selected workouts"
                  >
                    <Trash2 size={18} color="#FF453A" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* 5. SEGMENTED TABS: [ Custom ] | [ Personalized ] */}
            <View style={styles.tabsRow}>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activeTab === 'custom' && styles.tabButtonActive,
                ]}
                onPress={() => setActiveTab('custom')}
                activeOpacity={0.85}
              >
                <SquarePen
                  size={18}
                  color={activeTab === 'custom' ? '#000000' : '#6B6B6B'}
                  style={styles.tabIcon}
                />
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === 'custom' && styles.tabButtonTextActive,
                  ]}
                >
                  Custom
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activeTab === 'personalized' && styles.tabButtonActive,
                ]}
                onPress={() => setActiveTab('personalized')}
                activeOpacity={0.85}
              >
                <Sparkles
                  size={18}
                  color={activeTab === 'personalized' ? '#000000' : '#6B6B6B'}
                  style={styles.tabIcon}
                />
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === 'personalized' && styles.tabButtonTextActive,
                  ]}
                >
                  Personalized
                </Text>
              </TouchableOpacity>
            </View>

            {error ? (
              <ErrorCard message={error} onRetry={() => loadData(true)} />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.skeletonWrap}>
              <WorkoutCardSkeleton />
              <WorkoutCardSkeleton />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <EmptyState
                icon={Dumbbell}
                title={
                  activeTab === 'personalized'
                    ? 'No Personalized Workouts Yet'
                    : 'No Custom Workouts'
                }
                description={
                  activeTab === 'personalized'
                    ? 'Tap "Generate AI Routine" to let AI craft an optimal plan tailored to your body metrics.'
                    : 'You have no custom workout routines created yet.'
                }
                actionLabel={
                  activeTab === 'personalized'
                    ? 'Generate AI Routine'
                    : 'Create Custom Workout'
                }
                actionBackgroundColor={colors.yellow}
                actionTextColor="#000000"
                onAction={
                  activeTab === 'personalized'
                    ? handleGenerateAiWorkout
                    : () => navigation.navigate('WorkoutSelectScreen')
                }
              />
            </View>
          )
        }
      />

      {/* Edit Height & Weight Modal */}
      <Modal
        visible={isEditBmiModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEditBmiModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Measurements</Text>
              <TouchableOpacity
                onPress={() => setIsEditBmiModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color="#8E8E8E" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalInputLabel}>Height (cm)</Text>
              <TextInput
                style={styles.modalTextInput}
                value={inputHeight}
                onChangeText={setInputHeight}
                keyboardType="numeric"
                placeholder="157"
                placeholderTextColor="#71717A"
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalInputLabel}>Weight (kg)</Text>
              <TextInput
                style={styles.modalTextInput}
                value={inputWeight}
                onChangeText={setInputWeight}
                keyboardType="numeric"
                placeholder="62"
                placeholderTextColor="#71717A"
              />
            </View>

            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={handleSaveMeasurements}
              activeOpacity={0.85}
            >
              <Text style={styles.modalSaveButtonText}>Save & Recalculate</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 1. Choice Modal: Custom Workout vs Generate with AI */}
      <Modal
        visible={isChoiceModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsChoiceModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Create a Workout</Text>
                <Text style={styles.modalSubtitle}>
                  Choose how you want to build your routine
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsChoiceModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color="#8E8E8E" />
              </TouchableOpacity>
            </View>

            {/* Option 1: Create Custom Workout */}
            <TouchableOpacity
              style={styles.choiceOptionCard}
              onPress={() => {
                setIsChoiceModalVisible(false);
                navigation.navigate('WorkoutSelectScreen');
              }}
              activeOpacity={0.8}
            >
              <View style={styles.choiceIconSquircle}>
                <SquarePen size={20} color="#FFFFFF" />
              </View>
              <View style={styles.choiceTextWrap}>
                <Text style={styles.choiceTitle}>Create Custom Workout</Text>
                <Text style={styles.choiceDesc}>
                  Select exercises from the workout library via checkboxes
                </Text>
              </View>
              <ChevronRight size={18} color="#8E8E8E" />
            </TouchableOpacity>

            {/* Option 2: Generate with AI */}
            <TouchableOpacity
              style={styles.choiceOptionCard}
              onPress={() => {
                setIsChoiceModalVisible(false);
                navigation.navigate('AiWorkoutGenerateScreen');
              }}
              activeOpacity={0.8}
            >
              <View style={styles.choiceIconSquircle}>
                <Sparkles size={20} color="#FFFFFF" />
              </View>
              <View style={styles.choiceTextWrap}>
                <Text style={styles.choiceTitle}>Generate Workout with AI</Text>
                <Text style={styles.choiceDesc}>
                  Let AI craft a personalized plan tailored to your body metrics
                </Text>
              </View>
              <ChevronRight size={18} color="#8E8E8E" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 2. Custom Workout Creation Form Modal */}
      <Modal
        visible={isCustomWorkoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCustomWorkoutModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Custom Workout</Text>
              <TouchableOpacity
                onPress={() => setIsCustomWorkoutModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color="#8E8E8E" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalInputLabel}>Workout Title</Text>
              <TextInput
                style={styles.modalTextInput}
                value={customTitle}
                onChangeText={setCustomTitle}
                placeholder="e.g. Chest & Triceps Blitz"
                placeholderTextColor="#8E8E8E"
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalInputLabel}>Muscle Focus</Text>
              <View style={styles.categorySelectRow}>
                {['Chest', 'Back', 'Legs', 'Arms', 'Full-Body'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categorySelectPill,
                      customCategory === cat && styles.categorySelectPillActive,
                    ]}
                    onPress={() => setCustomCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.categorySelectPillText,
                        customCategory === cat && styles.categorySelectPillTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalRowInputs}>
              <View style={[styles.modalInputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.modalInputLabel}>Duration (mins)</Text>
                <TextInput
                  style={styles.modalTextInput}
                  value={customDuration}
                  onChangeText={setCustomDuration}
                  keyboardType="numeric"
                  placeholder="45"
                  placeholderTextColor="#8E8E8E"
                />
              </View>

              <View style={[styles.modalInputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.modalInputLabel}>Exercises</Text>
                <TextInput
                  style={styles.modalTextInput}
                  value={customExercises}
                  onChangeText={setCustomExercises}
                  keyboardType="numeric"
                  placeholder="5"
                  placeholderTextColor="#8E8E8E"
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={handleSaveCustomWorkout}
              activeOpacity={0.85}
            >
              <Text style={styles.modalSaveButtonText}>Save Workout</Text>
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
  topHeader: {
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
  topHeaderTitle: {
    fontSize: 18,
    fontFamily: typography.fonts.headingBold,
    color: colors.text,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 38,
  },
  historyHeaderButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 110, // clear floating tab bar
  },
  headerComponent: {
    marginBottom: 8,
  },

  /* 1. TOP METRIC CARDS */
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  bmiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    width: '100%',
  },
  metricLabel: {
    fontSize: 11,
    fontFamily: typography.fonts.headingBold,
    color: colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 28,
    fontFamily: typography.fonts.headingBold,
    color: colors.text,
    marginTop: 4,
    marginBottom: 2,
    fontWeight: '800',
  },
  bmiValue: {
    fontSize: 28,
    fontFamily: typography.fonts.headingBold,
    color: colors.text,
    marginTop: 4,
    fontWeight: '800',
  },
  metricUnit: {
    fontSize: 12,
    fontFamily: typography.fonts.headingMedium,
    color: colors.textMuted,
  },

  /* 2. BMI SLIDER */
  bmiSliderSection: {
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  sliderTrack: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    position: 'relative',
    justifyContent: 'center',
    marginBottom: 10,
  },
  sliderFilledTrack: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.yellow,
    borderRadius: 2,
  },
  sliderThumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.yellow,
    top: -5,
    marginLeft: -7,
    shadowColor: colors.yellow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 4,
  },
  sliderLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryLabel: {
    fontSize: 11,
    fontFamily: typography.fonts.headingMedium,
    color: colors.textMuted,
  },
  categoryLabelActive: {
    color: colors.yellow,
    fontFamily: typography.fonts.headingBold,
    fontWeight: '700',
  },

  /* 3. AI PERSONALIZED WORKOUT PROMPT */
  aiBannerCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  aiBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 12,
  },
  aiBannerIcon: {
    marginRight: 12,
  },
  aiBannerTextWrap: {
    flex: 1,
  },
  aiBannerTitle: {
    fontSize: 15,
    fontFamily: typography.fonts.headingBold,
    color: colors.text,
    fontWeight: '700',
    marginBottom: 4,
  },
  aiBannerSubtitle: {
    fontSize: 12,
    fontFamily: typography.fonts.body,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  generateButton: {
    backgroundColor: colors.yellow,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.yellow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  generateButtonText: {
    fontSize: 13,
    fontFamily: typography.fonts.headingBold,
    color: '#000000',
    fontWeight: '700',
  },

  /* 4. MY WORKOUTS SECTION HEADER */
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: typography.fonts.headingBold,
    color: colors.text,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sectionActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modeToggleButton: {
    backgroundColor: colors.surfaceElevated,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeToggleText: {
    fontSize: 13,
    fontFamily: typography.fonts.headingMedium,
    color: colors.text,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: 'rgba(255, 69, 58, 0.15)',
    padding: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* 5. SEGMENTED TABS */
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 12,
    marginBottom: 18,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  tabButtonActive: {
    backgroundColor: colors.yellow,
    borderColor: colors.yellow,
    shadowColor: colors.yellow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  tabIcon: {
    marginRight: 8,
  },
  tabButtonText: {
    fontSize: 15,
    fontFamily: typography.fonts.headingSemiBold,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  tabButtonTextActive: {
    fontSize: 15,
    fontFamily: typography.fonts.headingBold,
    color: '#000000',
    fontWeight: '700',
  },

  /* 6. WORKOUT CARDS */
  workoutCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  workoutCardSelected: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  iconSquircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  workoutInfo: {
    flex: 1,
  },
  workoutTitle: {
    fontSize: 15,
    fontFamily: typography.fonts.headingBold,
    color: colors.text,
    fontWeight: '700',
    marginBottom: 3,
  },
  workoutMeta: {
    fontSize: 12,
    fontFamily: typography.fonts.body,
    color: colors.textSecondary,
  },

  skeletonWrap: {
    paddingTop: 8,
  },
  emptyContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },

  /* MODAL STYLES */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: typography.fonts.headingBold,
    color: colors.text,
    fontWeight: '700',
  },
  modalInputGroup: {
    marginBottom: 14,
  },
  modalInputLabel: {
    fontSize: 12,
    fontFamily: typography.fonts.headingMedium,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  modalTextInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 15,
    fontFamily: typography.fonts.headingBold,
  },
  modalSaveButton: {
    backgroundColor: colors.yellow,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: colors.yellow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  modalSaveButtonText: {
    fontSize: 14,
    fontFamily: typography.fonts.headingBold,
    color: '#000000',
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 12,
    fontFamily: typography.fonts.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
  choiceOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 12,
  },
  choiceIconSquircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  choiceTextWrap: {
    flex: 1,
    marginRight: 8,
  },
  choiceTitle: {
    fontSize: 15,
    fontFamily: typography.fonts.headingBold,
    color: colors.text,
    fontWeight: '700',
    marginBottom: 2,
  },
  choiceDesc: {
    fontSize: 12,
    fontFamily: typography.fonts.body,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  categorySelectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  categorySelectPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categorySelectPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categorySelectPillText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  categorySelectPillTextActive: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  modalRowInputs: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
