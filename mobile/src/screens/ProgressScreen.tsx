import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import {
  Flame,
  Clock,
  Dumbbell,
  Droplets,
  Salad,
  ChevronRight,
  Plus,
  Calendar,
  CheckCircle2,
  TrendingUp,
  Sparkles,
} from '../components/icons';
import Svg, {
  Rect,
  Line,
  Text as SvgText,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import { colors, typography, borderRadius, spacing } from '../theme';
import { WorkoutCardSkeleton } from '../components/SkeletonLoader';
import { ErrorCard } from '../components/ErrorCard';
import { getSyncRepository } from '../sync/SyncRepository';
import { getDatabase } from '../db/connection';
import { DarkVeil } from '../components/DarkVeil';
import { GlideSelect } from '../components/GlideSelect';
import type { ProgressHistoryResponse } from '../types';

type MetricType = 'workout' | 'nutrition' | 'water';
type PeriodType = '7d' | '30d' | '90d';

const METRIC_TABS: { id: MetricType; label: string; icon: any; color: string; tint: string }[] = [
  { id: 'workout', label: 'Workouts', icon: Flame, color: '#FF453A', tint: 'rgba(255, 69, 58, 0.15)' },
  { id: 'nutrition', label: 'Nutrition', icon: Salad, color: '#30D158', tint: 'rgba(48, 209, 88, 0.15)' },
  { id: 'water', label: 'Water', icon: Droplets, color: '#0A84FF', tint: 'rgba(10, 132, 255, 0.15)' },
];

const PERIOD_TABS: { id: PeriodType; label: string }[] = [
  { id: '7d', label: '7D' },
  { id: '30d', label: '30D' },
  { id: '90d', label: '90D' },
];

interface DailyBucket {
  dateKey: string;
  label: string;
  value: number;
  durationMin?: number;
  goal: number;
}

interface WorkoutSummary {
  totalCount: number;
  totalDurationMin: number;
  totalCalories: number;
  dailyAvgCalories: number;
  goalMetDays: number;
  dailySeries: DailyBucket[];
  recentLogs: { id: string; title: string; date: string; calories: number; durationMin: number; workoutId?: string }[];
}

interface NutritionSummary {
  totalCalories: number;
  dailyAvgCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  targetCalories: number;
  goalMetDays: number;
  dailySeries: DailyBucket[];
  recentLogs: { id: string; name: string; mealType: string; date: string; calories: number; protein: number; carbs: number; fat: number }[];
}

interface WaterSummary {
  totalMl: number;
  dailyAvgMl: number;
  dailyGoalMl: number;
  goalMetDays: number;
  dailySeries: DailyBucket[];
  recentLogs: { id: string; amountMl: number; date: string }[];
}

export const ProgressScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [activeMetric, setActiveMetric] = useState<MetricType>('workout');
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('7d');
  const [workoutSubMetric, setWorkoutSubMetric] = useState<'calories' | 'duration'>('calories');
  const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [workoutData, setWorkoutData] = useState<WorkoutSummary>({
    totalCount: 0,
    totalDurationMin: 0,
    totalCalories: 0,
    dailyAvgCalories: 0,
    goalMetDays: 0,
    dailySeries: [],
    recentLogs: [],
  });

  const [nutritionData, setNutritionData] = useState<NutritionSummary>({
    totalCalories: 0,
    dailyAvgCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
    targetCalories: 2200,
    goalMetDays: 0,
    dailySeries: [],
    recentLogs: [],
  });

  const [waterData, setWaterData] = useState<WaterSummary>({
    totalMl: 0,
    dailyAvgMl: 0,
    dailyGoalMl: 2500,
    goalMetDays: 0,
    dailySeries: [],
    recentLogs: [],
  });

  const repo = getSyncRepository();

  const loadData = useCallback(async (forceRefresh = false) => {
    setError(null);
    try {
      const db = await getDatabase();

      // Ensure tables exist defensively
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS WaterIntakeEntry (
          id TEXT PRIMARY KEY,
          amount_ml INTEGER NOT NULL,
          logged_at TEXT NOT NULL,
          date_key TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS NutritionEntry (
          id TEXT PRIMARY KEY,
          meal_type TEXT,
          name TEXT,
          calories INTEGER NOT NULL,
          protein_g REAL DEFAULT 0,
          carbs_g REAL DEFAULT 0,
          fat_g REAL DEFAULT 0,
          logged_at TEXT NOT NULL,
          date_key TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS ProgressEntry (
          id TEXT PRIMARY KEY,
          workout_id TEXT,
          workout_title TEXT,
          completed_at TEXT NOT NULL,
          duration_seconds INTEGER NOT NULL,
          calories_burned INTEGER NOT NULL,
          points_earned INTEGER DEFAULT 0,
          created_at TEXT,
          updated_at TEXT
        );
      `);

      const daysCount = selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90;
      const now = new Date();
      const cutoffDate = new Date(now);
      cutoffDate.setDate(cutoffDate.getDate() - (daysCount - 1));
      cutoffDate.setHours(0, 0, 0, 0);
      const cutoffDateKey = cutoffDate.toISOString().split('T')[0]!;

      // 1. Fetch & Compute Workout Data
      const workoutRows = await db.getAllAsync<any>(
        'SELECT id, workout_id, workout_title, completed_at, duration_seconds, calories_burned FROM ProgressEntry WHERE completed_at >= ? ORDER BY completed_at DESC',
        [cutoffDate.toISOString()]
      );

      // Create calendar day map
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const calendarBuckets: { [key: string]: { label: string; dateKey: string } } = {};
      const dateKeysList: string[] = [];

      for (let i = daysCount - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const k = d.toISOString().split('T')[0]!;
        dateKeysList.push(k);
        let lbl = dayNames[d.getDay()]!;
        if (daysCount > 7) {
          lbl = `${d.getDate()}`;
        }
        calendarBuckets[k] = { label: lbl, dateKey: k };
      }

      // Map workout entries
      const workoutMap: { [key: string]: { calories: number; durationMin: number } } = {};
      dateKeysList.forEach((k) => {
        workoutMap[k] = { calories: 0, durationMin: 0 };
      });

      workoutRows.forEach((r) => {
        const dateKey = r.completed_at ? r.completed_at.split('T')[0] : '';
        if (workoutMap[dateKey]) {
          workoutMap[dateKey]!.calories += r.calories_burned || 0;
          workoutMap[dateKey]!.durationMin += Math.round((r.duration_seconds || 0) / 60);
        }
      });

      const workoutDailySeries: DailyBucket[] = dateKeysList.map((k) => ({
        dateKey: k,
        label: calendarBuckets[k]?.label || '',
        value: workoutMap[k]?.calories || 0,
        durationMin: workoutMap[k]?.durationMin || 0,
        goal: 400,
      }));

      const totalWorkouts = workoutRows.length;
      const totalCaloriesBurned = workoutRows.reduce((sum, r) => sum + (r.calories_burned || 0), 0);
      const totalDurationMin = Math.round(workoutRows.reduce((sum, r) => sum + (r.duration_seconds || 0), 0) / 60);
      const workoutDaysMet = workoutDailySeries.filter((d) => d.value > 0).length;

      setWorkoutData({
        totalCount: totalWorkouts,
        totalDurationMin,
        totalCalories: totalCaloriesBurned,
        dailyAvgCalories: Math.round(totalCaloriesBurned / daysCount),
        goalMetDays: workoutDaysMet,
        dailySeries: workoutDailySeries,
        recentLogs: workoutRows.slice(0, 8).map((r) => ({
          id: r.id,
          title: r.workout_title || 'Training Session',
          date: r.completed_at,
          calories: r.calories_burned || 0,
          durationMin: Math.round((r.duration_seconds || 0) / 60),
          workoutId: r.workout_id,
        })),
      });

      // 2. Fetch & Compute Nutrition Data
      const nutritionRows = await db.getAllAsync<any>(
        'SELECT id, meal_type, name, calories, protein_g, carbs_g, fat_g, logged_at, date_key FROM NutritionEntry WHERE date_key >= ? ORDER BY logged_at DESC',
        [cutoffDateKey]
      );

      const nutritionMap: { [key: string]: number } = {};
      dateKeysList.forEach((k) => {
        nutritionMap[k] = 0;
      });

      let sumProtein = 0;
      let sumCarbs = 0;
      let sumFat = 0;
      let totalNutCalories = 0;

      nutritionRows.forEach((r) => {
        const k = r.date_key;
        if (nutritionMap[k] !== undefined) {
          nutritionMap[k] += r.calories || 0;
        }
        totalNutCalories += r.calories || 0;
        sumProtein += r.protein_g || 0;
        sumCarbs += r.carbs_g || 0;
        sumFat += r.fat_g || 0;
      });

      const nutritionDailySeries: DailyBucket[] = dateKeysList.map((k) => ({
        dateKey: k,
        label: calendarBuckets[k]?.label || '',
        value: nutritionMap[k] || 0,
        goal: 2200,
      }));

      const nutritionDaysMet = nutritionDailySeries.filter((d) => d.value >= 1600 && d.value <= 2600).length;

      setNutritionData({
        totalCalories: totalNutCalories,
        dailyAvgCalories: Math.round(totalNutCalories / daysCount),
        totalProtein: Math.round(sumProtein),
        totalCarbs: Math.round(sumCarbs),
        totalFat: Math.round(sumFat),
        targetCalories: 2200,
        goalMetDays: nutritionDaysMet,
        dailySeries: nutritionDailySeries,
        recentLogs: nutritionRows.slice(0, 8).map((r) => ({
          id: r.id,
          name: r.name || 'Meal',
          mealType: r.meal_type || 'meal',
          date: r.logged_at,
          calories: r.calories || 0,
          protein: Math.round(r.protein_g || 0),
          carbs: Math.round(r.carbs_g || 0),
          fat: Math.round(r.fat_g || 0),
        })),
      });

      // 3. Fetch & Compute Water Data
      const waterRows = await db.getAllAsync<any>(
        'SELECT id, amount_ml, logged_at, date_key FROM WaterIntakeEntry WHERE date_key >= ? ORDER BY logged_at DESC',
        [cutoffDateKey]
      );

      const waterMap: { [key: string]: number } = {};
      dateKeysList.forEach((k) => {
        waterMap[k] = 0;
      });

      let totalWaterMl = 0;
      waterRows.forEach((r) => {
        const k = r.date_key;
        if (waterMap[k] !== undefined) {
          waterMap[k] += r.amount_ml || 0;
        }
        totalWaterMl += r.amount_ml || 0;
      });

      const waterDailySeries: DailyBucket[] = dateKeysList.map((k) => ({
        dateKey: k,
        label: calendarBuckets[k]?.label || '',
        value: waterMap[k] || 0,
        goal: 2500,
      }));

      const waterDaysMet = waterDailySeries.filter((d) => d.value >= 2500).length;

      setWaterData({
        totalMl: totalWaterMl,
        dailyAvgMl: Math.round(totalWaterMl / daysCount),
        dailyGoalMl: 2500,
        goalMetDays: waterDaysMet,
        dailySeries: waterDailySeries,
        recentLogs: waterRows.slice(0, 8).map((r) => ({
          id: r.id,
          amountMl: r.amount_ml || 0,
          date: r.logged_at,
        })),
      });

      // Also trigger repo sync in background
      if (forceRefresh) {
        try {
          await repo.getProgressHistory(selectedPeriod, { forceRefresh: true });
        } catch {}
      }
    } catch (err) {
      setError('Unable to load progress. Showing cached records.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedPeriod, repo]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData(true);
  };

  const handleMetricSelect = (metric: MetricType) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setActiveMetric(metric);
    setSelectedBarIndex(null);
  };

  const handlePeriodSelect = (period: PeriodType) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setSelectedPeriod(period);
    setSelectedBarIndex(null);
  };

  // Active theme configuration based on activeMetric
  const activeConfig = useMemo(() => {
    switch (activeMetric) {
      case 'workout':
        return {
          title: 'Workouts & Burn',
          unit: workoutSubMetric === 'calories' ? 'kcal' : 'min',
          goalLabel: '400 kcal/day',
          colorStart: '#FF453A',
          colorEnd: '#FF9F0A',
          series: workoutData.dailySeries.map((d) => ({
            ...d,
            value: workoutSubMetric === 'calories' ? d.value : d.durationMin || 0,
            goal: workoutSubMetric === 'calories' ? 400 : 45,
          })),
        };
      case 'nutrition':
        return {
          title: 'Nutrition Intake',
          unit: 'kcal',
          goalLabel: '2,200 kcal/day',
          colorStart: '#30D158',
          colorEnd: '#34C759',
          series: nutritionData.dailySeries,
        };
      case 'water':
        return {
          title: 'Water Hydration',
          unit: 'ml',
          goalLabel: '2,500 ml/day',
          colorStart: '#0A84FF',
          colorEnd: '#64D2FF',
          series: waterData.dailySeries,
        };
    }
  }, [activeMetric, workoutSubMetric, workoutData, nutritionData, waterData]);

  // Chart Dimensions & Geometry
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = Math.max(screenWidth - 32 - 32, 280);
  const chartHeight = 175;
  const paddingBottom = 26;
  const paddingTop = 22;
  const usableHeight = chartHeight - paddingBottom - paddingTop;

  const series = activeConfig.series;
  const rawValues = series.map((s) => s.value);
  const maxGoal = series[0]?.goal || 1;
  const maxVal = Math.max(...rawValues, maxGoal * 1.15, 1);

  const count = series.length;
  const stepX = chartWidth / count;
  const barWidth = Math.max(selectedPeriod === '7d' ? 22 : selectedPeriod === '30d' ? 5.5 : 2, stepX * 0.55);

  const selectedPoint = selectedBarIndex !== null && series[selectedBarIndex] ? series[selectedBarIndex] : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <DarkVeil speed={0.3} warpAmount={0.2} noiseIntensity={0.01} whiteMode={true} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#FFFFFF"
            colors={['#FFFFFF']}
          />
        }
      >
        {/* Apple iOS Large Title Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Progress</Text>
          <Text style={styles.headerSubtitle}>Activity history, hydration & nutrition trends</Text>
        </View>

        {/* Primary Metric Filter Segmented Control */}
        <View style={styles.metricSegmentedRow}>
          {METRIC_TABS.map((tab) => {
            const isSelected = activeMetric === tab.id;
            const Icon = tab.icon;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.metricSegmentPill, isSelected && styles.metricSegmentPillActive]}
                onPress={() => handleMetricSelect(tab.id)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={`${tab.label} metric tab`}
                accessibilityState={isSelected ? { selected: true } : {}}
              >
                <Icon
                  size={16}
                  color={isSelected ? '#000000' : 'rgba(255, 255, 255, 0.50)'}
                  strokeWidth={2.2}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.metricSegmentText, isSelected && styles.metricSegmentTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Period & Sub-metric Filter Controls with GlideSelect */}
        <View style={styles.periodRow}>
          <View style={styles.glideSelectFilterRow}>
            <GlideSelect
              options={[
                { value: '7d', label: '7 Days', tag: 'Weekly' },
                { value: '30d', label: '30 Days', tag: 'Monthly' },
                { value: '90d', label: '90 Days', tag: 'Quarter' },
              ]}
              value={selectedPeriod}
              onChange={(val) => handlePeriodSelect(val as PeriodType)}
              size="sm"
              menuWidth={170}
              ariaLabel="Time range filter"
            />

            {activeMetric === 'workout' && (
              <GlideSelect
                options={[
                  { value: 'calories', label: 'Calories', tag: 'Burn' },
                  { value: 'duration', label: 'Duration', tag: 'Time' },
                ]}
                value={workoutSubMetric}
                onChange={(val) => {
                  try {
                    Haptics.selectionAsync();
                  } catch {}
                  setWorkoutSubMetric(val as 'calories' | 'duration');
                  setSelectedBarIndex(null);
                }}
                size="sm"
                menuWidth={170}
                ariaLabel="Workout metric toggle"
              />
            )}
          </View>

          <View style={styles.filterHintBadge}>
            <Text style={styles.filterHintText}>
              {selectedPeriod.toUpperCase()}
            </Text>
          </View>
        </View>

        {error ? <ErrorCard message={error} onRetry={() => loadData(true)} /> : null}

        {isLoading ? (
          <View style={{ marginTop: spacing.md }}>
            <WorkoutCardSkeleton />
            <WorkoutCardSkeleton />
          </View>
        ) : (
          <>
            {/* Apple Health Dynamic Interactive Graph Card */}
            <View style={styles.chartCard}>
              <View style={styles.chartCardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.chartCardOverline}>
                    {selectedPoint
                      ? new Date(selectedPoint.dateKey).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })
                      : `${activeConfig.title.toUpperCase()} • DAILY TREND`}
                  </Text>
                  <Text style={styles.chartCardBigVal}>
                    {selectedPoint
                      ? `${selectedPoint.value.toLocaleString()} ${activeConfig.unit}`
                      : activeMetric === 'workout'
                      ? `${workoutData.dailyAvgCalories.toLocaleString()} ${activeConfig.unit}/day`
                      : activeMetric === 'nutrition'
                      ? `${nutritionData.dailyAvgCalories.toLocaleString()} ${activeConfig.unit}/day`
                      : `${(waterData.dailyAvgMl / 1000).toFixed(1)} L/day`}
                  </Text>
                  <Text style={styles.chartCardSubtext}>
                    {selectedPoint
                      ? `${Math.round((selectedPoint.value / selectedPoint.goal) * 100)}% of daily target (${selectedPoint.goal.toLocaleString()} ${activeConfig.unit})`
                      : `Target: ${activeConfig.goalLabel} • Tap any bar to inspect`}
                  </Text>
                </View>

                {/* Status Indicator */}
                <View style={[styles.statusBadge, { backgroundColor: 'rgba(255, 255, 255, 0.10)' }]}>
                  <TrendingUp size={14} color="#FFFFFF" strokeWidth={2.2} style={{ marginRight: 4 }} />
                  <Text style={styles.statusBadgeText}>
                    {selectedPeriod.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Svg Interactive Graph */}
              <View style={styles.svgContainer}>
                <Svg width={chartWidth} height={chartHeight}>
                  <Defs>
                    <SvgLinearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <Stop offset="0%" stopColor={activeConfig.colorStart} stopOpacity={1} />
                      <Stop offset="100%" stopColor={activeConfig.colorEnd} stopOpacity={0.8} />
                    </SvgLinearGradient>
                  </Defs>

                  {/* Target Goal Dotted Line */}
                  {maxGoal > 0 && (
                    <>
                      <Line
                        x1={0}
                        y1={paddingTop + usableHeight - (maxGoal / maxVal) * usableHeight}
                        x2={chartWidth}
                        y2={paddingTop + usableHeight - (maxGoal / maxVal) * usableHeight}
                        stroke="rgba(255, 255, 255, 0.20)"
                        strokeWidth={1}
                        strokeDasharray="4, 4"
                      />
                      <SvgText
                        x={chartWidth - 4}
                        y={paddingTop + usableHeight - (maxGoal / maxVal) * usableHeight - 4}
                        fill="rgba(255, 255, 255, 0.35)"
                        fontSize="9"
                        fontWeight="600"
                        textAnchor="end"
                      >
                        TARGET
                      </SvgText>
                    </>
                  )}

                  {/* Chart Bars */}
                  {series.map((item, index) => {
                    const x = index * stepX + (stepX - barWidth) / 2;
                    const barHeight = Math.max((item.value / maxVal) * usableHeight, 2);
                    const y = paddingTop + usableHeight - barHeight;
                    const isSelected = selectedBarIndex === index;

                    // Label render decision for 30d/90d
                    const shouldRenderLabel =
                      selectedPeriod === '7d' ||
                      (selectedPeriod === '30d' && (index === 0 || index === 7 || index === 14 || index === 21 || index === 29)) ||
                      (selectedPeriod === '90d' && index % 14 === 0);

                    return (
                      <React.Fragment key={item.dateKey}>
                        {/* Background subtle column */}
                        <Rect
                          x={x}
                          y={paddingTop}
                          width={barWidth}
                          height={usableHeight}
                          rx={Math.min(barWidth / 2, 4)}
                          ry={Math.min(barWidth / 2, 4)}
                          fill="rgba(255, 255, 255, 0.05)"
                        />

                        {/* Active Bar */}
                        <Rect
                          x={x}
                          y={y}
                          width={barWidth}
                          height={barHeight}
                          rx={Math.min(barWidth / 2, 4)}
                          ry={Math.min(barWidth / 2, 4)}
                          fill={item.value > 0 ? 'url(#barGradient)' : 'rgba(255, 255, 255, 0.12)'}
                          opacity={isSelected || selectedBarIndex === null ? 1 : 0.4}
                        />

                        {/* Selected Indicator Outline */}
                        {isSelected && (
                          <Rect
                            x={x - 1}
                            y={y - 1}
                            width={barWidth + 2}
                            height={barHeight + 2}
                            rx={Math.min(barWidth / 2, 4)}
                            ry={Math.min(barWidth / 2, 4)}
                            fill="none"
                            stroke="#FFFFFF"
                            strokeWidth={1.5}
                          />
                        )}

                        {/* X-Axis Day Label */}
                        {shouldRenderLabel && (
                          <SvgText
                            x={x + barWidth / 2}
                            y={chartHeight - 6}
                            fill={isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.45)'}
                            fontSize={selectedPeriod === '7d' ? '11' : '9'}
                            fontWeight={isSelected ? '700' : '500'}
                            textAnchor="middle"
                          >
                            {item.label}
                          </SvgText>
                        )}
                      </React.Fragment>
                    );
                  })}
                </Svg>

                {/* Transparent Full-Height Touch Overlays for Native Haptic Taps */}
                <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                  <View style={{ flexDirection: 'row', width: chartWidth, height: chartHeight }}>
                    {series.map((item, index) => (
                      <TouchableOpacity
                        key={`touch-${item.dateKey}`}
                        style={{ flex: 1, height: chartHeight }}
                        onPress={() => {
                          try {
                            Haptics.selectionAsync();
                          } catch {}
                          setSelectedBarIndex(index);
                        }}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 2, right: 2 }}
                        accessibilityRole="button"
                        accessibilityLabel={`${item.label}: ${item.value} ${activeConfig.unit}`}
                      />
                    ))}
                  </View>
                </View>
              </View>
            </View>

            {/* Apple Inset Summary Cards (3-Tile Row) */}
            <View style={styles.summaryRow}>
              {/* Tile 1: Total */}
              <View style={styles.summaryTile}>
                <Text style={styles.summaryTileLabel}>TOTAL</Text>
                <Text style={styles.summaryTileVal}>
                  {activeMetric === 'workout'
                    ? `${workoutData.totalCalories.toLocaleString()} kcal`
                    : activeMetric === 'nutrition'
                    ? `${workoutData.totalCount > 0 ? (nutritionData.totalCalories / 1000).toFixed(1) + 'k' : nutritionData.totalCalories} kcal`
                    : `${(waterData.totalMl / 1000).toFixed(1)} L`}
                </Text>
                <Text style={styles.summaryTileSub}>
                  {activeMetric === 'workout'
                    ? `${workoutData.totalCount} sessions`
                    : activeMetric === 'nutrition'
                    ? `${nutritionData.recentLogs.length} logged meals`
                    : `${waterData.recentLogs.length} water logs`}
                </Text>
              </View>

              {/* Tile 2: Daily Average */}
              <View style={styles.summaryTile}>
                <Text style={styles.summaryTileLabel}>DAILY AVG</Text>
                <Text style={styles.summaryTileVal}>
                  {activeMetric === 'workout'
                    ? `${workoutData.dailyAvgCalories} kcal`
                    : activeMetric === 'nutrition'
                    ? `${nutritionData.dailyAvgCalories} kcal`
                    : `${waterData.dailyAvgMl} ml`}
                </Text>
                <Text style={styles.summaryTileSub}>Per day in {selectedPeriod.toUpperCase()}</Text>
              </View>

              {/* Tile 3: Goal Adherence */}
              <View style={styles.summaryTile}>
                <Text style={styles.summaryTileLabel}>GOAL MET</Text>
                <Text style={styles.summaryTileVal}>
                  {activeMetric === 'workout'
                    ? `${workoutData.goalMetDays} days`
                    : activeMetric === 'nutrition'
                    ? `${nutritionData.goalMetDays} days`
                    : `${waterData.goalMetDays} days`}
                </Text>
                <Text style={styles.summaryTileSub}>
                  {Math.round(
                    ((activeMetric === 'workout'
                      ? workoutData.goalMetDays
                      : activeMetric === 'nutrition'
                      ? nutritionData.goalMetDays
                      : waterData.goalMetDays) /
                      (selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90)) *
                      100
                  )}
                  % of period
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#09090C',
    position: 'relative',
    overflow: 'hidden',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 110,
  },
  header: {
    paddingTop: 8,
    paddingBottom: 14,
  },
  headerTitle: {
    fontFamily: typography.fonts.headingBold,
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.36,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.55)',
    marginTop: 2,
    letterSpacing: -0.1,
  },

  // Primary Metric Segmented Control
  metricSegmentedRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    marginBottom: 12,
  },
  metricSegmentPill: {
    flex: 1,
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
  metricSegmentPillActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 2,
  },
  metricSegmentText: {
    fontSize: 13,
    fontFamily: typography.fonts.headingBold,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.60)',
  },
  metricSegmentTextActive: {
    color: '#000000',
    fontWeight: '700',
  },

  // Period Row with GlideSelect
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    zIndex: 10,
  },
  glideSelectFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterHintBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  filterHintText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.45)',
    letterSpacing: 0.5,
  },

  // Apple Health Interactive Graph Card
  chartCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.20,
    shadowRadius: 12,
    elevation: 3,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(25px) saturate(180%)',
      WebkitBackdropFilter: 'blur(25px) saturate(180%)',
    } as any : {}),
  },
  chartCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  chartCardOverline: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.45)',
    letterSpacing: 0.6,
  },
  chartCardBigVal: {
    fontFamily: typography.fonts.headingBold,
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
    letterSpacing: -0.3,
  },
  chartCardSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.55)',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  svgContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: 4,
  },

  // Summary Row (3 Tiles)
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  summaryTile: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    padding: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryTileLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.45)',
    letterSpacing: 0.5,
  },
  summaryTileVal: {
    fontFamily: typography.fonts.headingBold,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 4,
  },
  summaryTileSub: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.45)',
    marginTop: 2,
  },
});
