import React, { useState, useCallback, useMemo, useRef } from 'react';
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
  Animated,
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
  ChevronRight,
  History,
  Plus,
  Archive,
  RotateCcw,
} from '../components/icons';
import { colors, typography, borderRadius } from '../theme';
import { WorkoutCardSkeleton } from '../components/SkeletonLoader';
import { EmptyState } from '../components/EmptyState';
import { ErrorCard } from '../components/ErrorCard';
import { SwipeRow } from '../components/SwipeRow';
import { SwipeToast } from '../components/SwipeToast';
import { getSyncRepository } from '../sync/SyncRepository';
import { mergeWorkouts } from '../sync/workoutMerge';
import { useRecentWorkoutsStore } from '../store/recentWorkoutsStore';
import { useCustomWorkoutsStore, CustomRoutineWorkout } from '../store/customWorkoutsStore';
import type { MergedWorkout, Workout } from '../types';

const APPLE_FONT_FAMILY = Platform.OS === 'web'
  ? '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif'
  : Platform.OS === 'ios'
  ? 'System'
  : 'Roboto';

const SEGMENTS: Array<{ key: 'custom' | 'personalized'; label: string }> = [
  { key: 'custom', label: 'Custom' },
  { key: 'personalized', label: 'Personalized' },
];

interface CatalogScreenProps {
  navigation: any;
}

export const CatalogScreen: React.FC<CatalogScreenProps> = ({ navigation }) => {
  // Workouts data
  const [, setRawWorkouts] = useState<Workout[]>([]);
  const [mergedList, setMergedList] = useState<MergedWorkout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tab filter: 'custom' or 'personalized'
  const [activeTab, setActiveTab] = useState<'custom' | 'personalized'>('custom');

  // Segmented control sliding animation & track measurement
  const segmentAnim = useRef(new Animated.Value(activeTab === 'custom' ? 0 : 1)).current;
  const [segmentedTrackWidth, setSegmentedTrackWidth] = useState(0);

  // Choice, Custom Workout, & Archive Modals
  const [isChoiceModalVisible, setIsChoiceModalVisible] = useState(false);
  const [isCustomWorkoutModalVisible, setIsCustomWorkoutModalVisible] = useState(false);
  const [isArchiveModalVisible, setIsArchiveModalVisible] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customCategory, setCustomCategory] = useState('Chest');
  const [customDuration, setCustomDuration] = useState('45');
  const [customExercises, setCustomExercises] = useState('5');

  // Swipe undo toast notification state
  const [toastConfig, setToastConfig] = useState<{
    open: boolean;
    title: string;
    description: string;
    icon: React.ReactNode;
    fuseColor: string;
    onUndo: () => void;
  } | null>(null);

  const { addRecentId } = useRecentWorkoutsStore();
  const {
    customWorkouts,
    archivedWorkouts,
    addCustomWorkout,
    removeCustomWorkout,
    archiveCustomWorkout,
    unarchiveCustomWorkout,
    removeArchivedWorkout,
    restoreCustomWorkout,
  } = useCustomWorkoutsStore();
  const repo = getSyncRepository();

  const handleTabChange = (tab: 'custom' | 'personalized') => {
    if (tab === activeTab) return;
    try {
      Haptics.selectionAsync();
    } catch {
      // Haptics optional
    }
    setActiveTab(tab);
    Animated.spring(segmentAnim, {
      toValue: tab === 'custom' ? 0 : 1,
      damping: 24,
      stiffness: 280,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  };

  // Load profile metrics & workouts
  const loadData = useCallback(async (forceRefresh = false) => {
    setError(null);
    try {
      const [workoutsData] = await Promise.all([
        repo.getWorkouts({ forceRefresh }),
        repo.getProfile().catch(() => null),
      ]);
      setRawWorkouts(workoutsData);
      const merged = mergeWorkouts(workoutsData);
      setMergedList(merged);
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
          const [workoutsData] = await Promise.all([
            repo.getWorkouts({ forceRefresh: false }),
            repo.getProfile().catch(() => null),
          ]);
          if (active) {
            setRawWorkouts(workoutsData);
            const merged = mergeWorkouts(workoutsData);
            setMergedList(merged);
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

  // Archive workout routine with undo toast
  const handleArchiveWorkout = (workout: CustomRoutineWorkout) => {
    archiveCustomWorkout(workout.id);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Haptics optional
    }
    setToastConfig({
      open: true,
      title: 'Workout archived',
      description: `"${workout.title}" moved to archive`,
      icon: <Archive size={16} color="#A1A1AA" />,
      fuseColor: '#A1A1AA',
      onUndo: () => {
        unarchiveCustomWorkout(workout.id);
      },
    });
  };

  // Delete workout routine with undo toast
  const handleDeleteWorkout = (workout: CustomRoutineWorkout) => {
    removeCustomWorkout(workout.id);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {
      // Haptics optional
    }
    setToastConfig({
      open: true,
      title: 'Workout deleted',
      description: `"${workout.title}" removed`,
      icon: <Trash2 size={16} color="#e5484d" />,
      fuseColor: '#e5484d',
      onUndo: () => {
        restoreCustomWorkout(workout);
      },
    });
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
    handleTabChange('custom');
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

  const formatCardSubtitle = useCallback((item: MergedWorkout) => {
    let date: Date | null = null;
    if (item.id.startsWith('custom-')) {
      const ts = parseInt(item.id.replace(/^(custom-ai-|custom-)/, ''), 10);
      if (!isNaN(ts) && ts > 1600000000000) {
        date = new Date(ts);
      }
    }
    if (!date && (item as any).created_at) {
      const parsed = new Date((item as any).created_at);
      if (!isNaN(parsed.getTime())) date = parsed;
    }

    if (date) {
      const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
      if (diffSec < 60) return 'Edited just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `Edited ${diffMin} min ago`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `Edited ${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `Edited ${diffDays}d ago`;
    }

    return 'Edited recently';
  }, []);

  // Inset Grouped Workout Card with Swipe-to-Reveal Actions
  const renderWorkoutCard = ({ item }: { item: MergedWorkout }) => {
    return (
      <SwipeRow
        key={item.id}
        onArchive={() => handleArchiveWorkout(item as CustomRoutineWorkout)}
        onDelete={() => handleDeleteWorkout(item as CustomRoutineWorkout)}
        archiveColor="#3f3f46"
        deleteColor="#e5484d"
      >
        <TouchableOpacity
          style={styles.workoutCard}
          onPress={() => handleSelectWorkout(item)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Workout: ${item.title}`}
        >
          {/* Outline Dumbbell Icon - Direct on card, no circle */}
          <View style={styles.cardIconWrap}>
            <Dumbbell size={20} color="rgba(255, 255, 255, 0.65)" strokeWidth={1.8} />
          </View>

          {/* Info Column */}
          <View style={styles.workoutInfo}>
            <Text style={styles.workoutTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.workoutMeta} numberOfLines={1}>
              {formatCardSubtitle(item)}
            </Text>
          </View>
        </TouchableOpacity>
      </SwipeRow>
    );
  };

  const segmentWidth = segmentedTrackWidth > 0 ? (segmentedTrackWidth - 4) / 2 : 0;
  const indicatorTranslateX = segmentAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 2 + segmentWidth],
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 1. iOS Large Title Navigation Bar */}
      <View style={styles.navBar}>
        {/* Top-Right Toolbar Actions */}
        <View style={styles.navToolbar}>
          <View style={styles.navToolbarLeft}>
            {/* Top-level tab: No back chevron icon */}
          </View>

          <View style={styles.navToolbarRight}>
            <TouchableOpacity
              style={styles.toolbarIconButton}
              onPress={() => navigation.navigate('WorkoutHistoryScreen')}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Workout History"
            >
              <History size={20} color="#007AFF" strokeWidth={2.2} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolbarIconButton}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {
                  // Haptics optional
                }
                setIsArchiveModalVisible(true);
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Archived Workouts"
            >
              <View style={styles.archiveIconWrap}>
                <Archive size={20} color="#007AFF" />
                {archivedWorkouts.length > 0 && (
                  <View style={styles.archiveBadge}>
                    <Text style={styles.archiveBadgeText}>
                      {archivedWorkouts.length}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolbarIconButton}
              onPress={() => setIsChoiceModalVisible(true)}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Create New Workout"
            >
              <Plus size={22} color="#007AFF" strokeWidth={2.4} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Large Title: Left-aligned 34px bold headline */}
        <View style={styles.largeTitleContainer}>
          <Text style={styles.largeTitle}>Workouts</Text>
        </View>
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
            tintColor="#007AFF"
            colors={['#007AFF']}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerComponent}>
            {/* 2. Native iOS Segmented Control */}
            <View
              style={styles.segmentedControlTrack}
              onLayout={(e) => setSegmentedTrackWidth(e.nativeEvent.layout.width)}
            >
              {segmentWidth > 0 && (
                <Animated.View
                  style={[
                    styles.segmentedIndicator,
                    {
                      width: segmentWidth,
                      transform: [{ translateX: indicatorTranslateX }],
                    },
                  ]}
                />
              )}

              {SEGMENTS.map((segment) => {
                const isSelected = activeTab === segment.key;
                return (
                  <TouchableOpacity
                    key={segment.key}
                    style={styles.segmentedTab}
                    onPress={() => handleTabChange(segment.key)}
                    activeOpacity={0.8}
                    accessibilityRole="tab"
                    accessibilityState={isSelected ? { selected: true } : {}}
                    accessibilityLabel={`${segment.label} workouts`}
                  >
                    <Text
                      style={[
                        styles.segmentedTabText,
                        isSelected && styles.segmentedTabTextActive,
                      ]}
                    >
                      {segment.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
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
                actionBackgroundColor="#007AFF"
                actionTextColor="#FFFFFF"
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

      {/* Choice Modal: Custom Workout vs Generate with AI */}
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
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <X size={20} color="rgba(255, 255, 255, 0.45)" />
              </TouchableOpacity>
            </View>

            {/* Option 1: Create Custom Workout */}
            <TouchableOpacity
              style={styles.choiceOptionCard}
              onPress={() => {
                setIsChoiceModalVisible(false);
                navigation.navigate('WorkoutSelectScreen');
              }}
              activeOpacity={0.7}
            >
              <View style={styles.choiceIconWrap}>
                <SquarePen size={20} color="rgba(255, 255, 255, 0.55)" strokeWidth={2} />
              </View>
              <View style={styles.choiceTextWrap}>
                <Text style={styles.choiceTitle}>Create Custom Workout</Text>
                <Text style={styles.choiceDesc}>
                  Select exercises from the workout library via checkboxes
                </Text>
              </View>
              <ChevronRight size={14} color="rgba(255, 255, 255, 0.3)" strokeWidth={2.5} />
            </TouchableOpacity>

            {/* Option 2: Generate with AI */}
            <TouchableOpacity
              style={styles.choiceOptionCard}
              onPress={() => {
                setIsChoiceModalVisible(false);
                navigation.navigate('AiWorkoutGenerateScreen');
              }}
              activeOpacity={0.7}
            >
              <View style={styles.choiceIconWrap}>
                <Sparkles size={20} color="rgba(255, 255, 255, 0.55)" strokeWidth={2} />
              </View>
              <View style={styles.choiceTextWrap}>
                <Text style={styles.choiceTitle}>Generate Workout with AI</Text>
                <Text style={styles.choiceDesc}>
                  Let AI craft a personalized plan tailored to your body metrics
                </Text>
              </View>
              <ChevronRight size={14} color="rgba(255, 255, 255, 0.3)" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Custom Workout Creation Form Modal */}
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
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <X size={20} color="rgba(255, 255, 255, 0.45)" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalInputLabel}>Workout Title</Text>
              <TextInput
                style={styles.modalTextInput}
                value={customTitle}
                onChangeText={setCustomTitle}
                placeholder="e.g. Chest & Triceps Blitz"
                placeholderTextColor="rgba(255, 255, 255, 0.35)"
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
                  placeholderTextColor="rgba(255, 255, 255, 0.35)"
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
                  placeholderTextColor="rgba(255, 255, 255, 0.35)"
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={handleSaveCustomWorkout}
              activeOpacity={0.8}
            >
              <Text style={styles.modalSaveButtonText}>Save Workout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Archived Workouts Modal */}
      <Modal
        visible={isArchiveModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsArchiveModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, styles.archiveModalCard]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Archived Routines</Text>
                <Text style={styles.modalSubtitle}>
                  {archivedWorkouts.length} {archivedWorkouts.length === 1 ? 'routine' : 'routines'} archived
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsArchiveModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Close archived routines"
              >
                <Text style={styles.modalDoneText}>Done</Text>
              </TouchableOpacity>
            </View>

            {archivedWorkouts.length === 0 ? (
              <View style={styles.archiveEmptyWrap}>
                <View style={styles.archiveEmptyIconCircle}>
                  <Archive size={28} color="rgba(255, 255, 255, 0.4)" />
                </View>
                <Text style={styles.archiveEmptyTitle}>No Archived Workouts</Text>
                <Text style={styles.archiveEmptyDesc}>
                  Swipe left on any workout in your catalog to archive it.
                </Text>
              </View>
            ) : (
              <FlatList
                data={archivedWorkouts}
                keyExtractor={(item) => item.id}
                style={styles.archiveList}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <View style={styles.archiveItemCard}>
                    <View style={styles.archiveItemIconCircle}>
                      <Archive size={16} color="#FF9F0A" />
                    </View>
                    <View style={styles.archiveItemInfo}>
                      <Text style={styles.archiveItemTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.archiveItemMeta} numberOfLines={1}>
                        {item.category} • {item.duration_minutes || 45} mins
                      </Text>
                    </View>
                    <View style={styles.archiveItemActions}>
                      <TouchableOpacity
                        style={styles.archiveRestoreBtn}
                        onPress={() => {
                          try {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          } catch {}
                          unarchiveCustomWorkout(item.id);
                        }}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={`Restore ${item.title}`}
                      >
                        <RotateCcw size={14} color="#007AFF" />
                        <Text style={styles.archiveRestoreText}>Restore</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.archiveDeleteBtn}
                        onPress={() => {
                          try {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          } catch {}
                          removeArchivedWorkout(item.id);
                        }}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={`Delete ${item.title}`}
                      >
                        <Trash2 size={15} color="#FF453A" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Swipe Undo Toast */}
      {toastConfig && (
        <SwipeToast
          open={toastConfig.open}
          title={toastConfig.title}
          description={toastConfig.description}
          icon={toastConfig.icon}
          fuseColor={toastConfig.fuseColor}
          actionLabel="Undo"
          onAction={toastConfig.onUndo}
          onClose={() => setToastConfig(null)}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  /* 1. iOS Large Title Navigation Bar */
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
  navToolbarLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  navToolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  toolbarIconButton: {
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  archiveIconWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  archiveBadge: {
    position: 'absolute',
    top: -4,
    right: -7,
    backgroundColor: '#FF9F0A',
    borderRadius: 7,
    minWidth: 15,
    height: 15,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  archiveBadgeText: {
    fontSize: 9,
    fontFamily: APPLE_FONT_FAMILY,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  largeTitleContainer: {
    paddingTop: 4,
    paddingBottom: 8,
  },
  largeTitle: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.37,
    lineHeight: 41,
    color: '#FFFFFF',
    fontFamily: APPLE_FONT_FAMILY,
  },

  /* Scroll Content & Header */
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 90,
  },
  headerComponent: {
    marginBottom: 12,
  },

  /* 2. Native iOS Segmented Control */
  segmentedControlTrack: {
    flexDirection: 'row',
    backgroundColor: 'rgba(118, 118, 128, 0.24)',
    borderRadius: 9,
    padding: 2,
    height: 36,
    position: 'relative',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 2,
  },
  segmentedIndicator: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    borderRadius: 7,
    backgroundColor: '#636366',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentedTab: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  segmentedTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.65)',
    fontFamily: APPLE_FONT_FAMILY,
  },
  segmentedTabTextActive: {
    fontWeight: '600',
    color: '#FFFFFF',
  },

  /* 3. Inset Grouped Workout Cards */
  workoutCard: {
    backgroundColor: 'transparent',
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
  },
  cardIconWrap: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  workoutInfo: {
    flex: 1,
  },
  workoutTitle: {
    fontSize: 16,
    fontFamily: APPLE_FONT_FAMILY,
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  workoutMeta: {
    fontSize: 13,
    fontFamily: APPLE_FONT_FAMILY,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '400',
  },

  /* Empty & Loading */
  skeletonWrap: {
    paddingTop: 8,
  },
  emptyContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },

  /* Apple HIG Modals */
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
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'rgba(28, 28, 30, 0.95)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: 22,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: APPLE_FONT_FAMILY,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 13,
    fontFamily: APPLE_FONT_FAMILY,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 3,
  },
  choiceOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
    marginBottom: 12,
  },
  choiceIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    width: 24,
  },
  choiceTextWrap: {
    flex: 1,
    marginRight: 8,
  },
  choiceTitle: {
    fontSize: 15,
    fontFamily: APPLE_FONT_FAMILY,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 2,
  },
  choiceDesc: {
    fontSize: 12,
    fontFamily: APPLE_FONT_FAMILY,
    color: 'rgba(255, 255, 255, 0.55)',
    lineHeight: 16,
  },
  modalInputGroup: {
    marginBottom: 14,
  },
  modalInputLabel: {
    fontSize: 12,
    fontFamily: APPLE_FONT_FAMILY,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalTextInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: APPLE_FONT_FAMILY,
  },
  modalRowInputs: {
    flexDirection: 'row',
    alignItems: 'center',
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
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  categorySelectPillActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categorySelectPillText: {
    fontSize: 12,
    fontFamily: APPLE_FONT_FAMILY,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600',
  },
  categorySelectPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalSaveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  modalSaveButtonText: {
    fontSize: 15,
    fontFamily: APPLE_FONT_FAMILY,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  /* Archived Routines Modal */
  archiveModalCard: {
    maxHeight: '75%',
    paddingBottom: 16,
  },
  modalDoneText: {
    fontSize: 16,
    fontFamily: APPLE_FONT_FAMILY,
    color: '#007AFF',
    fontWeight: '600',
  },
  archiveList: {
    maxHeight: 380,
    marginTop: 8,
  },
  archiveItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  archiveItemIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 159, 10, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  archiveItemInfo: {
    flex: 1,
    marginRight: 8,
  },
  archiveItemTitle: {
    fontSize: 15,
    fontFamily: APPLE_FONT_FAMILY,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  archiveItemMeta: {
    fontSize: 12,
    fontFamily: APPLE_FONT_FAMILY,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },
  archiveItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  archiveRestoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  archiveRestoreText: {
    fontSize: 12,
    fontFamily: APPLE_FONT_FAMILY,
    color: '#007AFF',
    fontWeight: '600',
  },
  archiveDeleteBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 69, 58, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  archiveEmptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  archiveEmptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  archiveEmptyTitle: {
    fontSize: 16,
    fontFamily: APPLE_FONT_FAMILY,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 4,
  },
  archiveEmptyDesc: {
    fontSize: 13,
    fontFamily: APPLE_FONT_FAMILY,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    lineHeight: 18,
  },
});

