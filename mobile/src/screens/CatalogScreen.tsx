import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import {
  Search,
  X,
  Clock,
  Flame,
  Dumbbell,
  Bookmark,
} from 'lucide-react-native';
import { colors, typography, borderRadius, spacing } from '../theme';
import { WorkoutCardSkeleton } from '../components/SkeletonLoader';
import { EmptyState } from '../components/EmptyState';
import { ErrorCard } from '../components/ErrorCard';
import { PercentRing } from '../components/PercentRing';
import { WorkoutIllustration } from '../components/WorkoutIllustration';
import { getSyncRepository } from '../sync/SyncRepository';
import { mergeWorkouts, filterMergedCatalog } from '../sync/workoutMerge';
import { useRecentWorkoutsStore } from '../store/recentWorkoutsStore';
import type { MergedWorkout, Workout } from '../types';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'favorites', label: 'Saved' },
  { id: 'chest', label: 'Chest' },
  { id: 'back', label: 'Back' },
  { id: 'leg', label: 'Legs' },
  { id: 'arm', label: 'Arms' },
  { id: 'full-body', label: 'Full-Body' },
];

interface CatalogScreenProps {
  navigation: any;
}

export const CatalogScreen: React.FC<CatalogScreenProps> = ({ navigation }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [, setRawWorkouts] = useState<Workout[]>([]);
  const [mergedList, setMergedList] = useState<MergedWorkout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { recentIds, addRecentId } = useRecentWorkoutsStore();
  const repo = getSyncRepository();

  const loadData = useCallback(async (forceRefresh = false) => {
    setError(null);
    try {
      const data = await repo.getWorkouts({ forceRefresh });
      setRawWorkouts(data);
      const merged = mergeWorkouts(data);
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
          const data = await repo.getWorkouts({ forceRefresh: false });
          if (active) {
            setRawWorkouts(data);
            setMergedList(mergeWorkouts(data));
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

  const handleToggleFavorite = async (workoutId: string) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics unavailable in test/browser
    }

    // Optimistic UI update
    setMergedList((prev) =>
      prev.map((w) =>
        w.id === workoutId ? { ...w, is_favorite: !w.is_favorite } : w
      )
    );

    await repo.toggleFavoriteWorkout(workoutId);
  };

  const handleSelectWorkout = (workout: MergedWorkout) => {
    addRecentId(workout.id);
    navigation.navigate('WorkoutDetail', { workoutId: workout.id });
  };

  // Filtered workouts based on category and search query
  const filteredWorkouts = useMemo(() => {
    const isFavoritesTab = selectedCategory === 'favorites';
    return filterMergedCatalog(mergedList, {
      category: isFavoritesTab ? undefined : selectedCategory,
      favoritesOnly: isFavoritesTab,
      query: searchQuery,
    });
  }, [mergedList, selectedCategory, searchQuery]);

  // Recently viewed workouts
  const recentWorkouts = useMemo(() => {
    if (recentIds.length === 0 || searchQuery.trim().length > 0) return [];
    const map = new Map(mergedList.map((w) => [w.id, w]));
    return recentIds
      .map((id) => map.get(id))
      .filter((w): w is MergedWorkout => Boolean(w))
      .slice(0, 6);
  }, [recentIds, mergedList, searchQuery]);

  const renderWorkoutCard = ({ item }: { item: MergedWorkout }) => {
    const completionPct = item.completion_percentage ?? 0;
    const isFav = Boolean(item.is_favorite);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleSelectWorkout(item)}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel={`Workout: ${item.title}, ${item.duration_minutes} minutes, ${item.difficulty}`}
      >
        {/* Contained Illustration Frame */}
        <View style={styles.illustrationContainer}>
          <WorkoutIllustration
            slug={item.slug}
            size={160}
            containerStyle={styles.cardIllustration}
          />

          {/* Difficulty Badge */}
          <View style={styles.difficultyBadge}>
            <Text style={styles.difficultyText}>
              {item.difficulty ? item.difficulty.toUpperCase() : 'INTERMEDIATE'}
            </Text>
          </View>

          {/* Bookmark / Favorite Action */}
          <TouchableOpacity
            style={[styles.favoriteButton, isFav && styles.favoriteButtonActive]}
            onPress={() => handleToggleFavorite(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={isFav ? 'Remove from saved' : 'Save workout'}
          >
            <Bookmark
              size={18}
              color={isFav ? colors.textInverse : colors.text}
              fill={isFav ? colors.textInverse : 'none'}
            />
          </TouchableOpacity>

          {/* Completion Ring if logged */}
          {completionPct > 0 && (
            <View style={styles.badgeWrapper}>
              <PercentRing
                percentage={completionPct}
                size={36}
                strokeWidth={3}
                color={colors.primary}
                trackColor={colors.border}
                textColor={colors.text}
              />
            </View>
          )}
        </View>

        {/* Content & Metadata */}
        <View style={styles.cardContent}>
          <View style={styles.categoryRow}>
            <Text style={styles.cardCategory}>
              {item.category ? item.category.toUpperCase() : 'GENERAL'}
            </Text>
            {item.equipment ? (
              <Text style={styles.equipmentText} numberOfLines={1}>
                • {item.equipment}
              </Text>
            ) : null}
          </View>

          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>

          <View style={styles.cardMetaRow}>
            <View style={styles.metaItem}>
              <Clock size={13} color={colors.textSecondary} />
              <Text style={styles.metaText}>{item.duration_minutes}m</Text>
            </View>
            <View style={styles.metaItem}>
              <Flame size={13} color={colors.textSecondary} />
              <Text style={styles.metaText}>{item.calories} kcal</Text>
            </View>
            {item.sets_reps ? (
              <View style={styles.metaItem}>
                <Dumbbell size={13} color={colors.textSecondary} />
                <Text style={styles.metaText} numberOfLines={1}>
                  {item.sets_reps}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Screen Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Workout Catalog</Text>
            <Text style={styles.subtitle}>
              {mergedList.length > 0 ? `${mergedList.length} Exercises Available` : 'Offline Library'}
            </Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search 300+ exercises, muscles, equipment..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            accessibilityLabel="Search exercises"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <X size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Horizontal Category Filter Pills */}
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
                accessibilityRole="button"
                accessibilityLabel={`Filter by ${item.label}`}
                accessibilityState={isActive ? { selected: true } : {}}
              >
                <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {error ? <ErrorCard message={error} onRetry={() => loadData(true)} /> : null}

      {/* Main List */}
      {isLoading ? (
        <View style={styles.listPadding}>
          <WorkoutCardSkeleton />
          <WorkoutCardSkeleton />
        </View>
      ) : (
        <FlatList
          data={filteredWorkouts}
          keyExtractor={(item) => item.id}
          renderItem={renderWorkoutCard}
          contentContainerStyle={styles.listPadding}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListHeaderComponent={
            recentWorkouts.length > 0 ? (
              <View style={styles.recentSection}>
                <Text style={styles.recentTitle}>Recently Viewed</Text>
                <FlatList
                  data={recentWorkouts}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item) => `recent-${item.id}`}
                  contentContainerStyle={styles.recentContent}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.recentCard}
                      onPress={() => handleSelectWorkout(item)}
                      activeOpacity={0.85}
                    >
                      <WorkoutIllustration
                        slug={item.slug}
                        size={80}
                        containerStyle={styles.recentIllustration}
                      />
                      <Text style={styles.recentCardTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.recentCardCategory}>
                        {item.category?.toUpperCase() || 'GENERAL'}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon={Dumbbell}
              title={searchQuery ? 'No Exercises Found' : 'No Workouts in Category'}
              description={
                searchQuery
                  ? `No workouts match "${searchQuery}". Try searching for another muscle group or equipment.`
                  : selectedCategory === 'favorites'
                  ? 'You have not saved any workouts yet. Tap the bookmark icon on any workout to save it here.'
                  : 'No exercises match the selected category. Try selecting another filter.'
              }
              actionLabel={searchQuery ? 'Clear Search' : 'View All Exercises'}
              onAction={() => {
                if (searchQuery) {
                  setSearchQuery('');
                } else {
                  setSelectedCategory('all');
                }
              }}
            />
          }
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
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: typography.fonts.headingBold,
    fontSize: typography.sizes.xxl,
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.sm,
    height: 44,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.text,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 6,
  },
  pillsContainer: {
    marginVertical: spacing.xs,
  },
  pillsContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  pill: {
    paddingHorizontal: spacing.md,
    height: 38,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: '500',
  },
  pillTextActive: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  recentSection: {
    marginBottom: spacing.md,
  },
  recentTitle: {
    fontFamily: typography.fonts.headingBold,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recentContent: {
    paddingRight: spacing.md,
    gap: spacing.sm,
  },
  recentCard: {
    width: 100,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xs,
    alignItems: 'center',
  },
  recentIllustration: {
    width: 80,
    height: 70,
    borderWidth: 0,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceElevated,
  },
  recentCardTitle: {
    fontFamily: typography.fonts.headingBlack,
    fontSize: 11,
    color: colors.text,
    marginTop: 4,
    textAlign: 'center',
    width: '100%',
  },
  recentCardCategory: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 1,
  },
  listPadding: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: 110, // accommodate bottom tab bar
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  illustrationContainer: {
    width: '100%',
    height: 180,
    backgroundColor: colors.surfaceElevated,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  cardIllustration: {
    width: '100%',
    height: '100%',
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  badgeWrapper: {
    position: 'absolute',
    bottom: 10,
    right: 12,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  difficultyBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  difficultyText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  favoriteButton: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  cardContent: {
    padding: spacing.md,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardCategory: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  equipmentText: {
    fontSize: 11,
    color: colors.textMuted,
    marginLeft: 4,
    flex: 1,
  },
  cardTitle: {
    fontFamily: typography.fonts.headingBlack,
    fontSize: typography.sizes.base,
    color: colors.text,
    marginTop: 2,
    marginBottom: spacing.xs,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  metaText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginLeft: 4,
  },
});

