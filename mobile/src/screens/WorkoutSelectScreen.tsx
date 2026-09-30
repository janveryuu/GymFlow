import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import {
  ChevronLeft,
  Search,
  X,
  Check,
  Dumbbell,
  Plus,
  Flame,
} from '../components/icons';
import { WorkoutIllustration } from '../components/WorkoutIllustration';
import { hasLocalWorkoutAsset } from '../assets/workoutAssetMap';
import { WorkoutCardSkeleton } from '../components/SkeletonLoader';
import { EmptyState } from '../components/EmptyState';
import { JellyRadio } from '../components/JellyRadio';
import { getSyncRepository } from '../sync/SyncRepository';
import { mergeWorkouts, filterMergedCatalog } from '../sync/workoutMerge';
import { useCustomWorkoutsStore, CustomExerciseItem, CustomRoutineWorkout } from '../store/customWorkoutsStore';
import type { MergedWorkout } from '../types';

const APPLE_FONT_FAMILY = Platform.OS === 'web'
  ? '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif'
  : Platform.OS === 'ios'
  ? 'System'
  : 'Roboto';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'chest', label: 'Chest' },
  { id: 'back', label: 'Back' },
  { id: 'leg', label: 'Legs' },
  { id: 'arm', label: 'Arms' },
  { id: 'full-body', label: 'Full-Body' },
];

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

export const WorkoutSelectScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const {
    addCustomWorkout,
    selectedRoutineExerciseIds,
    toggleRoutineExerciseId,
    clearSelectedRoutineExerciseIds,
  } = useCustomWorkoutsStore();
  const repo = getSyncRepository();

  const [workouts, setWorkouts] = useState<MergedWorkout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Selected workout IDs synced with store
  const selectedIds = selectedRoutineExerciseIds;

  // Routine Name Confirmation Modal
  const [isNameModalVisible, setIsNameModalVisible] = useState(false);
  const [routineName, setRoutineName] = useState('');

  const loadWorkouts = useCallback(async (forceRefresh = false) => {
    try {
      const data = await repo.getWorkouts({ forceRefresh });
      const merged = mergeWorkouts(data);
      setWorkouts(merged);
    } catch {
      const fallback = mergeWorkouts([]);
      setWorkouts(fallback);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [repo]);

  useEffect(() => {
    loadWorkouts();
  }, [loadWorkouts]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadWorkouts(true);
  };

  const handleToggleSelect = (workoutId: string) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    toggleRoutineExerciseId(workoutId);
  };

  const handleOpenWorkoutDetail = (workout: MergedWorkout) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    navigation.navigate('ExerciseDetailScreen', { workout });
  };

  // Filtered workouts - only keep exercises that have an animated illustration (GIF) and exclude cardio/bodyweight
  const filteredWorkouts = useMemo(() => {
    const catalog = filterMergedCatalog(workouts, {
      category: selectedCategory === 'all' ? undefined : selectedCategory,
      query: searchQuery,
    });
    return catalog.filter(
      (w) =>
        Boolean(w.slug && hasLocalWorkoutAsset(w.slug)) &&
        w.category?.toLowerCase() !== 'cardio' &&
        w.category?.toLowerCase() !== 'bodyweight'
    );
  }, [workouts, selectedCategory, searchQuery]);

  // Selected statistics (focusing on sets and exercises, avoiding arbitrary rest time)
  const selectedStats = useMemo(() => {
    const selectedList = workouts.filter((w) => selectedIds.includes(w.id));
    const totalSets = selectedList.reduce(
      (sum, w) => sum + (w.sets || 4),
      0
    );
    const totalCalories = selectedList.reduce(
      (sum, w) => sum + (w.calories || 110),
      0
    );
    return { count: selectedList.length, totalSets, totalCalories, selectedList };
  }, [workouts, selectedIds]);

  const handleOpenNamePrompt = () => {
    if (selectedIds.length === 0) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    const { selectedList } = selectedStats;
    const defaultName = selectedList.length === 1 && selectedList[0]?.title
      ? `${selectedList[0].title} Routine`
      : `Custom ${selectedCategory !== 'all' ? selectedCategory.toUpperCase() : 'Strength'} Circuit`;
    setRoutineName(defaultName);
    setIsNameModalVisible(true);
  };

  const handleConfirmCreateRoutine = () => {
    const { selectedList, totalCalories } = selectedStats;
    if (selectedList.length === 0) return;

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    const totalDuration = selectedList.reduce(
      (sum, w) => sum + (w.duration_minutes || 15),
      0
    );

    const routineExercises: CustomExerciseItem[] = selectedList.map((w, index) => {
      const sets = w.sets || 4;
      const reps = w.reps ? `${w.reps} reps` : (w.sets_reps || '10 - 12 reps');
      const restTimeSeconds = w.category?.toLowerCase() === 'legs' || w.title.toLowerCase().includes('squat') ? 90 : 60;
      const tips =
        w.description && w.description.length > 15
          ? w.description
          : 'Maintain strict posture, brace your core, and control the negative portion of each repetition.';

      return {
        id: `ex-${w.id}-${Date.now()}-${index}`,
        title: w.title,
        slug: w.slug,
        category: w.category || 'Strength',
        equipment: w.equipment || 'Gym Equipment',
        difficulty: (w.difficulty || 'Intermediate').toUpperCase(),
        preferredSets: sets,
        preferredReps: reps,
        restTimeSeconds,
        tips,
        duration_minutes: w.duration_minutes || 12,
        calories: w.calories || 80,
      };
    });

    const newRoutine: CustomRoutineWorkout = {
      id: `custom-${Date.now()}`,
      title: routineName.trim() || `Custom Workout (${selectedList.length} Exercises)`,
      slug: `custom-${Date.now()}`,
      category: selectedList[0]?.category || 'Custom',
      duration_minutes: totalDuration,
      calories: totalCalories,
      difficulty: 'intermediate',
      equipment: selectedList.map((w) => w.equipment).filter(Boolean)[0] || 'Mixed Equipment',
      sets: selectedList.length,
      reps: 12,
      sets_reps: `${selectedList.length} exercises • Last: ${new Date().toLocaleDateString('en-US')}`,
      image_url: selectedList[0]?.image_url || '',
      description: `Custom workout containing: ${selectedList.map((w) => w.title).join(', ')}.`,
      completion_percentage: 0,
      is_favorite: false,
      source: 'local',
      primaryMuscle: selectedList[0]?.primaryMuscle || 'Full Body',
      secondaryMuscles: [],
      exerciseType: 'strength',
      isCustomRoutine: true,
      routineExercises,
    };

    addCustomWorkout(newRoutine);
    setIsNameModalVisible(false);
    clearSelectedRoutineExerciseIds();
    navigation.goBack();
  };

  const renderWorkoutItem = ({ item }: { item: MergedWorkout }) => {
    const isSelected = selectedIds.includes(item.id);

    return (
      <TouchableOpacity
        style={[
          styles.workoutCard,
          isSelected && styles.workoutCardSelected,
        ]}
        onPress={() => handleToggleSelect(item.id)}
        activeOpacity={0.75}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isSelected }}
        accessibilityLabel={`${item.title}, ${isSelected ? 'selected' : 'not selected'}`}
      >
        {/* Apple HIG Checklist Circle - ONLY displayed when selected */}
        {isSelected && (
          <View style={styles.checkboxChecked}>
            <Check size={12} color="#FFFFFF" strokeWidth={3} />
          </View>
        )}

        {/* Thumbnail / Squircle */}
        <View style={styles.thumbnailSquircle}>
          {item.slug && hasLocalWorkoutAsset(item.slug) ? (
            <WorkoutIllustration
              slug={item.slug}
              size={50}
              autoPlay={true}
              backgroundColor="#FFFFFF"
              containerStyle={styles.illustrationWrap}
            />
          ) : (
            <Dumbbell size={20} color="#007AFF" />
          )}
        </View>

        {/* Details Column: Title on top, Category below in gray */}
        <View style={styles.workoutInfo}>
          <Text style={styles.workoutTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.categorySubtext}>
            {formatTitleCase(item.category || 'General')}
          </Text>
        </View>

        {/* View Details Button */}
        <TouchableOpacity
          style={styles.viewButton}
          onPress={(e) => {
            e.stopPropagation?.();
            handleOpenWorkoutDetail(item);
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`View info for ${item.title}`}
        >
          <Text style={styles.viewButtonText}>View</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 1. iOS Top Navigation Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch {}
            navigation.goBack();
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={22} color="#007AFF" strokeWidth={2.4} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Select Workouts</Text>

        <TouchableOpacity
          style={[
            styles.doneButton,
            selectedIds.length > 0 && styles.doneButtonActive,
          ]}
          onPress={handleOpenNamePrompt}
          disabled={selectedIds.length === 0}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={selectedIds.length > 0 ? `Add ${selectedIds.length} exercises` : 'Done'}
        >
          <Text
            style={[
              styles.doneButtonText,
              selectedIds.length > 0 && styles.doneButtonTextActive,
            ]}
          >
            {selectedIds.length > 0 ? `Add (${selectedIds.length})` : 'Done'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2. Apple Native Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={16} color="rgba(235, 235, 245, 0.55)" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercises, muscles, equipment..."
          placeholderTextColor="rgba(235, 235, 245, 0.4)"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
              setSearchQuery('');
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.clearButton}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <View style={styles.clearCircle}>
              <X size={12} color="rgba(0, 0, 0, 0.7)" strokeWidth={2.5} />
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* 3. Apple Frosted Category Pills with Jelly Spring Physics */}
      <View style={styles.pillsContainer}>
        <JellyRadio
          items={CATEGORIES}
          value={selectedCategory}
          onChange={(newCategory) => {
            setSelectedCategory(newCategory);
          }}
          size="md"
          gap={8}
          radius={18}
          swell={0.2}
          barge={6}
          shrink={0.05}
          jelly={1}
          bounce={0.25}
          stagger={22}
          stiffness={580}
          activeColor="#007AFF"
          activeTextColor="#FFFFFF"
          chipColor="rgba(255, 255, 255, 0.08)"
          textColor="rgba(255, 255, 255, 0.65)"
          contentContainerStyle={styles.pillsContent}
        />
      </View>

      {/* 4. Workout List */}
      {isLoading ? (
        <View style={styles.listPadding}>
          <WorkoutCardSkeleton />
          <WorkoutCardSkeleton />
          <WorkoutCardSkeleton />
        </View>
      ) : (
        <FlatList
          data={filteredWorkouts}
          keyExtractor={(item) => item.id}
          renderItem={renderWorkoutItem}
          contentContainerStyle={styles.listPadding}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#007AFF"
              colors={['#007AFF']}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={Dumbbell}
              title="No Workouts Found"
              description="Try another search term or select a different muscle group."
              actionLabel="Clear Filter"
              actionBackgroundColor="#007AFF"
              actionTextColor="#FFFFFF"
              onAction={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
            />
          }
        />
      )}

      {/* 5. Floating Glass Bottom Bar (When >= 1 selected - without arbitrary rest time) */}
      {selectedIds.length > 0 && (
        <View style={styles.floatingBottomBar}>
          <View style={styles.floatingInfo}>
            <Text style={styles.floatingCount}>
              {selectedStats.count} {selectedStats.count === 1 ? 'exercise' : 'exercises'} selected
            </Text>
            <View style={styles.floatingMetaRow}>
              <Text style={styles.floatingSubtext}>{selectedStats.totalSets} total sets</Text>
              <Text style={styles.floatingDot}>•</Text>
              <View style={styles.floatingMetaItem}>
                <Flame size={11} color="#FF9F0A" />
                <Text style={styles.floatingSubtext}>~{selectedStats.totalCalories} kcal</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={styles.floatingActionBtn}
            onPress={handleOpenNamePrompt}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Create Routine"
          >
            <Plus size={15} color="#FFFFFF" strokeWidth={2.6} />
            <Text style={styles.floatingActionBtnText}>Create Routine</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 6. Apple HIG Routine Name Confirmation Modal */}
      <Modal
        visible={isNameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsNameModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {/* Apple Sheet Drag Handle */}
            <View style={styles.modalDragHandle} />

            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleWrap}>
                <Text style={styles.modalTitle}>Name Your Routine</Text>
                <Text style={styles.modalSubtitle}>
                  {selectedStats.count} {selectedStats.count === 1 ? 'exercise' : 'exercises'} • {selectedStats.totalSets} total sets
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setIsNameModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <X size={16} color="rgba(255, 255, 255, 0.6)" strokeWidth={2.4} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalInputLabel}>Routine Title</Text>
              <TextInput
                style={styles.modalTextInput}
                value={routineName}
                onChangeText={setRoutineName}
                placeholder="e.g. Chest & Shoulder Power"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                autoFocus
                selectionColor="#007AFF"
              />
            </View>

            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={handleConfirmCreateRoutine}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Save Custom Workout"
            >
              <Text style={styles.modalSaveButtonText}>Save Custom Workout</Text>
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
    backgroundColor: '#000000',
  },

  /* 1. iOS Top Navigation Bar */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#000000',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: APPLE_FONT_FAMILY,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  doneButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  doneButtonActive: {},
  doneButtonText: {
    fontSize: 16,
    fontFamily: APPLE_FONT_FAMILY,
    color: 'rgba(255, 255, 255, 0.3)',
    fontWeight: '600',
  },
  doneButtonTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },

  /* 2. Apple Native Search Bar */
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(142, 142, 147, 0.18)',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: APPLE_FONT_FAMILY,
    color: '#FFFFFF',
    height: '100%',
    paddingVertical: 0,
  },
  clearButton: {
    padding: 2,
  },
  clearCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(235, 235, 245, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* 3. Apple Frosted Category Pills */
  pillsContainer: {
    marginBottom: 6,
  },
  pillsContent: {
    paddingHorizontal: 16,
    gap: 8,
    paddingVertical: 6,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  pillActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 2,
  },
  pillText: {
    fontSize: 13,
    fontFamily: APPLE_FONT_FAMILY,
    color: 'rgba(255, 255, 255, 0.65)',
    fontWeight: '500',
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  /* 4. Workout List */
  listPadding: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 110, // room for floating bottom bar
  },
  workoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(28, 28, 30, 0.75)',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  workoutCardSelected: {
    borderColor: '#007AFF',
    borderWidth: 1.5,
    backgroundColor: 'rgba(0, 122, 255, 0.12)',
  },
  checkboxChecked: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  thumbnailSquircle: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 12,
  },
  illustrationWrap: {
    width: '100%',
    height: '100%',
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: '#FFFFFF',
  },
  workoutInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  workoutTitle: {
    fontSize: 15,
    fontFamily: APPLE_FONT_FAMILY,
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  categorySubtext: {
    fontSize: 13,
    fontFamily: APPLE_FONT_FAMILY,
    color: 'rgba(255, 255, 255, 0.55)',
    fontWeight: '500',
  },
  viewButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  viewButtonText: {
    fontSize: 13,
    fontFamily: APPLE_FONT_FAMILY,
    color: '#007AFF',
    fontWeight: '600',
  },

  /* 5. Floating Glass Bottom Bar */
  floatingBottomBar: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(28, 28, 30, 0.92)',
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(25px) saturate(180%)',
          WebkitBackdropFilter: 'blur(25px) saturate(180%)',
        } as any)
      : {}),
  },
  floatingInfo: {
    flex: 1,
    marginRight: 12,
  },
  floatingCount: {
    fontSize: 14,
    fontFamily: APPLE_FONT_FAMILY,
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  floatingMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  floatingMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  floatingSubtext: {
    fontSize: 11,
    fontFamily: APPLE_FONT_FAMILY,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  floatingDot: {
    marginHorizontal: 6,
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 10,
  },
  floatingActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 6,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  floatingActionBtnText: {
    fontSize: 14,
    fontFamily: APPLE_FONT_FAMILY,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  /* 6. Apple HIG Routine Name Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        } as any)
      : {}),
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'rgba(28, 28, 30, 0.96)',
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    padding: 22,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 10,
  },
  modalDragHandle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalHeaderTitleWrap: {
    flex: 1,
    marginRight: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: APPLE_FONT_FAMILY,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 12,
    fontFamily: APPLE_FONT_FAMILY,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 16,
    marginTop: 3,
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalInputGroup: {
    marginBottom: 16,
  },
  modalInputLabel: {
    fontSize: 11,
    fontFamily: APPLE_FONT_FAMILY,
    color: 'rgba(255, 255, 255, 0.55)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    fontWeight: '600',
  },
  modalTextInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: APPLE_FONT_FAMILY,
  },
  modalSaveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  modalSaveButtonText: {
    fontSize: 15,
    fontFamily: APPLE_FONT_FAMILY,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
