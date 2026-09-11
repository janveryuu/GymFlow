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
  Clock,
  Plus,
} from 'lucide-react-native';
import { colors, typography, borderRadius, spacing } from '../theme';
import { WorkoutIllustration } from '../components/WorkoutIllustration';
import { WorkoutCardSkeleton } from '../components/SkeletonLoader';
import { EmptyState } from '../components/EmptyState';
import { getSyncRepository } from '../sync/SyncRepository';
import { mergeWorkouts, filterMergedCatalog } from '../sync/workoutMerge';
import { useCustomWorkoutsStore, CustomExerciseItem, CustomRoutineWorkout } from '../store/customWorkoutsStore';
import type { MergedWorkout } from '../types';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'chest', label: 'Chest' },
  { id: 'back', label: 'Back' },
  { id: 'leg', label: 'Legs' },
  { id: 'arm', label: 'Arms' },
  { id: 'full-body', label: 'Full-Body' },
];

export const WorkoutSelectScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { addCustomWorkout } = useCustomWorkoutsStore();
  const repo = getSyncRepository();

  const [workouts, setWorkouts] = useState<MergedWorkout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Selected workout IDs
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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
    } catch {
      // Haptics optional
    }
    setSelectedIds((prev) =>
      prev.includes(workoutId)
        ? prev.filter((id) => id !== workoutId)
        : [...prev, workoutId]
    );
  };

  // Filtered workouts
  const filteredWorkouts = useMemo(() => {
    return filterMergedCatalog(workouts, {
      category: selectedCategory === 'all' ? undefined : selectedCategory,
      query: searchQuery,
    });
  }, [workouts, selectedCategory, searchQuery]);

  const handleOpenNamePrompt = () => {
    if (selectedIds.length === 0) return;
    const selectedList = workouts.filter((w) => selectedIds.includes(w.id));
    const defaultName = selectedList.length === 1 && selectedList[0]?.title
      ? `${selectedList[0].title} Routine`
      : `Custom ${selectedCategory !== 'all' ? selectedCategory.toUpperCase() : 'Strength'} Circuit`;
    setRoutineName(defaultName);
    setIsNameModalVisible(true);
  };

  const handleConfirmCreateRoutine = () => {
    const selectedList = workouts.filter((w) => selectedIds.includes(w.id));
    if (selectedList.length === 0) return;

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Haptics optional
    }

    const totalDuration = selectedList.reduce(
      (sum, w) => sum + (w.duration_minutes || 15),
      0
    );
    const totalCalories = selectedList.reduce(
      (sum, w) => sum + (w.calories || 110),
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
    setSelectedIds([]);
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
        activeOpacity={0.88}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isSelected }}
        accessibilityLabel={`${item.title}, ${isSelected ? 'selected' : 'not selected'}`}
      >
        {/* Checkbox */}
        <View
          style={[
            styles.checkbox,
            isSelected && styles.checkboxChecked,
          ]}
        >
          {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
        </View>

        {/* Thumbnail / Squircle */}
        <View style={styles.thumbnailSquircle}>
          {item.slug ? (
            <WorkoutIllustration
              slug={item.slug}
              size={56}
              containerStyle={styles.illustrationWrap}
            />
          ) : (
            <Dumbbell size={22} color="#0A0A0A" />
          )}
        </View>

        {/* Details Column */}
        <View style={styles.workoutInfo}>
          <View style={styles.badgeRow}>
            <Text style={styles.categoryBadge}>
              {item.category?.toUpperCase() || 'GENERAL'}
            </Text>
            {item.equipment ? (
              <Text style={styles.equipmentText} numberOfLines={1}>
                • {item.equipment}
              </Text>
            ) : null}
          </View>

          <Text style={styles.workoutTitle} numberOfLines={1}>
            {item.title}
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Clock size={12} color="#8E8E8E" />
              <Text style={styles.metaText}>{item.duration_minutes || 15}m</Text>
            </View>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.metaText}>
              {item.difficulty ? item.difficulty.toUpperCase() : 'INTERMEDIATE'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
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

        <Text style={styles.headerTitle}>Select Workouts</Text>

        <TouchableOpacity
          style={[
            styles.doneButton,
            selectedIds.length > 0 && styles.doneButtonActive,
          ]}
          onPress={handleOpenNamePrompt}
          disabled={selectedIds.length === 0}
          activeOpacity={0.8}
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

      {/* 2. SEARCH BAR */}
      <View style={styles.searchContainer}>
        <Search size={18} color="#8E8E8E" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercises, muscles, equipment..."
          placeholderTextColor="#8E8E8E"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            style={styles.clearButton}
          >
            <X size={16} color="#6B6B6B" />
          </TouchableOpacity>
        )}
      </View>

      {/* 3. CATEGORY PILLS */}
      <View style={styles.pillsContainer}>
        <FlatList
          data={CATEGORIES}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(cat) => cat.id}
          contentContainerStyle={styles.pillsContent}
          renderItem={({ item }) => {
            const isActive = selectedCategory === item.id;
            return (
              <TouchableOpacity
                style={[styles.pill, isActive && styles.pillActive]}
                onPress={() => setSelectedCategory(item.id)}
                activeOpacity={0.8}
              >
                <Text
                  style={[styles.pillText, isActive && styles.pillTextActive]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* 4. WORKOUT LIST */}
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
              tintColor="#0A0A0A"
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={Dumbbell}
              title="No Workouts Found"
              description="Try another search term or select a different muscle group."
              actionLabel="Clear Filter"
              onAction={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
            />
          }
        />
      )}

      {/* 5. FLOATING BOTTOM BAR (When >= 1 selected) */}
      {selectedIds.length > 0 && (
        <View style={styles.floatingBottomBar}>
          <View style={styles.floatingInfo}>
            <Text style={styles.floatingCount}>
              {selectedIds.length} {selectedIds.length === 1 ? 'exercise' : 'exercises'} selected
            </Text>
            <Text style={styles.floatingSubtext}>Ready to add to custom routine</Text>
          </View>
          <TouchableOpacity
            style={styles.floatingActionBtn}
            onPress={handleOpenNamePrompt}
            activeOpacity={0.85}
          >
            <Plus size={16} color="#FFFFFF" strokeWidth={3} />
            <Text style={styles.floatingActionBtnText}>Create Routine</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 6. ROUTINE NAME CONFIRMATION MODAL */}
      <Modal
        visible={isNameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsNameModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Name Your Routine</Text>
              <TouchableOpacity
                onPress={() => setIsNameModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color="#8E8E8E" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              You selected {selectedIds.length} {selectedIds.length === 1 ? 'exercise' : 'exercises'} to include in this custom workout.
            </Text>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalInputLabel}>Routine Title</Text>
              <TextInput
                style={styles.modalTextInput}
                value={routineName}
                onChangeText={setRoutineName}
                placeholder="e.g. Chest & Shoulder Power"
                placeholderTextColor="#8E8E8E"
                autoFocus
              />
            </View>

            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={handleConfirmCreateRoutine}
              activeOpacity={0.85}
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
  },
  doneButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F5F5F7',
  },
  doneButtonActive: {
    backgroundColor: '#0A0A0A',
  },
  doneButtonText: {
    fontSize: 13,
    fontFamily: typography.fonts.headingBold,
    color: '#8E8E8E',
    fontWeight: '700',
  },
  doneButtonTextActive: {
    color: '#FFFFFF',
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#EAEAED',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: typography.fonts.body,
    color: '#0A0A0A',
    height: '100%',
  },
  clearButton: {
    padding: 4,
  },

  pillsContainer: {
    marginBottom: 8,
  },
  pillsContent: {
    paddingHorizontal: 16,
    gap: 8,
    paddingVertical: 6,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F7F7F8',
    borderWidth: 1,
    borderColor: '#EAEAED',
  },
  pillActive: {
    backgroundColor: '#0A0A0A',
    borderColor: '#0A0A0A',
  },
  pillText: {
    fontSize: 13,
    fontFamily: typography.fonts.headingMedium,
    color: '#6B6B6B',
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  listPadding: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100, // room for floating bottom bar
  },
  workoutCard: {
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
  workoutCardSelected: {
    borderColor: '#0A0A0A',
    borderWidth: 1.5,
    backgroundColor: '#FAFAFB',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#D4D4D4',
    backgroundColor: '#F7F7F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#0A0A0A',
    borderColor: '#0A0A0A',
  },
  thumbnailSquircle: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#F5F5F7',
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
    backgroundColor: 'transparent',
  },
  workoutInfo: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  categoryBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B6B6B',
    letterSpacing: 0.4,
  },
  equipmentText: {
    fontSize: 10,
    color: '#8E8E8E',
    marginLeft: 4,
    flex: 1,
  },
  workoutTitle: {
    fontSize: 15,
    fontFamily: typography.fonts.headingBold,
    color: '#0A0A0A',
    fontWeight: '700',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    fontFamily: typography.fonts.body,
    color: '#8E8E8E',
  },
  metaDot: {
    marginHorizontal: 6,
    color: '#D4D4D4',
    fontSize: 11,
  },

  /* Floating Bottom Bar */
  floatingBottomBar: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: '#0A0A0A',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  floatingInfo: {
    flex: 1,
    marginRight: 12,
  },
  floatingCount: {
    fontSize: 14,
    fontFamily: typography.fonts.headingBold,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  floatingSubtext: {
    fontSize: 11,
    fontFamily: typography.fonts.body,
    color: '#8E8E8E',
    marginTop: 1,
  },
  floatingActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#262626',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 6,
  },
  floatingActionBtnText: {
    fontSize: 13,
    fontFamily: typography.fonts.headingBold,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  /* Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EAEAED',
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: typography.fonts.headingBold,
    color: '#0A0A0A',
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 12,
    fontFamily: typography.fonts.body,
    color: '#6B6B6B',
    lineHeight: 16,
    marginBottom: 16,
  },
  modalInputGroup: {
    marginBottom: 16,
  },
  modalInputLabel: {
    fontSize: 12,
    fontFamily: typography.fonts.headingMedium,
    color: '#6B6B6B',
    marginBottom: 6,
  },
  modalTextInput: {
    backgroundColor: '#F7F7F8',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EAEAED',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0A0A0A',
    fontSize: 15,
    fontFamily: typography.fonts.headingBold,
  },
  modalSaveButton: {
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalSaveButtonText: {
    fontSize: 14,
    fontFamily: typography.fonts.headingBold,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
