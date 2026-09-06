import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, Alert, Modal, Pressable, TextInput, ActivityIndicator, Dimensions,
} from 'react-native';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { ArrowLeft, ScanBarcode, Camera, PenLine, Trash2 } from 'lucide-react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { colors, typography, borderRadius } from '../theme';
import { getDatabase } from '../db/connection';
import * as Crypto from 'expo-crypto';

// ---------------------------------------------------------------------------
// Architecture decision: entries are grouped by meal type (Breakfast / Lunch /
// Dinner / Snacks) rather than a flat chronological list for v1. Rationale:
// meal context is more actionable for nutrition tracking; calorie targets are
// mentally anchored to meals; and it matches how competing apps (MyFitnessPal,
// Cronometer) structure their logs. Flat list would work for pure macro
// accounting but loses meal context. Revisit if user feedback prefers timeline.
// ---------------------------------------------------------------------------

function localDateKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const MEAL_TYPES = ['Breakfast','Lunch','Dinner','Snacks'] as const;
type MealType = typeof MEAL_TYPES[number];

interface NutritionEntry {
  id: string;
  food_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  serving_size: string | null;
  meal_type: string;
  source: string;
  logged_at: string;
}

interface DayTotal { date_key: string; total_calories: number; }

const CHART_WIDTH  = Dimensions.get('window').width - 80;
const CHART_HEIGHT = 80;

const DEFAULT_TARGET = 2000;

export const NutritionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route       = useRoute<any>();

  const [entries,        setEntries]        = useState<NutritionEntry[]>([]);
  const [weekHistory,    setWeekHistory]    = useState<DayTotal[]>([]);
  const [dailyTarget,    setDailyTarget]    = useState(DEFAULT_TARGET);
  const [isLoading,      setIsLoading]      = useState(true);
  const [showManual,     setShowManual]     = useState(false);

  // Manual entry form state
  const [mFoodName, setMFoodName] = useState('');
  const [mCalories, setMCalories] = useState('');
  const [mProtein,  setMProtein]  = useState('');
  const [mCarbs,    setMCarbs]    = useState('');
  const [mFat,      setMFat]      = useState('');
  const [mMeal,     setMMeal]     = useState<MealType>('Snacks');
  const [isSaving,  setIsSaving]  = useState(false);

  const dateKey = localDateKey();

  const loadData = useCallback(async () => {
    try {
      const db = await getDatabase();

      // Load target from preferences
      const prefs = await db.getFirstAsync<{ daily_nutrition_target_calories: number | null }>(
        'SELECT daily_nutrition_target_calories FROM Preferences WHERE id = ?', ['default']
      );
      if (prefs?.daily_nutrition_target_calories) setDailyTarget(prefs.daily_nutrition_target_calories);

      // Today's entries
      const rows = await db.getAllAsync<NutritionEntry>(
        `SELECT id, food_name, calories, protein_g, carbs_g, fat_g, serving_size, meal_type, source, logged_at
         FROM NutritionEntry WHERE date_key = ? ORDER BY logged_at ASC`,
        [dateKey]
      );
      setEntries(rows);

      // Last 7-day history
      const hist = await db.getAllAsync<DayTotal>(
        `SELECT date_key, SUM(calories) as total_calories
         FROM NutritionEntry
         WHERE date_key >= date('now','-6 days')
         GROUP BY date_key ORDER BY date_key ASC`,
        []
      );
      setWeekHistory(hist);
    } catch (err) {
      console.error('[Nutrition] loadData:', err);
    } finally {
      setIsLoading(false);
    }
  }, [dateKey]);

  useFocusEffect(useCallback(() => {
    // Support deep-link from BarcodeScanner "openManualEntry" param
    if (route.params?.openManualEntry) setShowManual(true);
    loadData();
  }, [loadData, route.params]));

  const totalCalories = entries.reduce((s, e) => s + e.calories, 0);
  const totalProtein  = entries.reduce((s, e) => s + (e.protein_g  ?? 0), 0);
  const totalCarbs    = entries.reduce((s, e) => s + (e.carbs_g    ?? 0), 0);
  const totalFat      = entries.reduce((s, e) => s + (e.fat_g      ?? 0), 0);
  const caloriesPct   = Math.min((totalCalories / dailyTarget) * 100, 100);

  const deleteEntry = async (id: string) => {
    try {
      const db = await getDatabase();
      await db.runAsync('DELETE FROM NutritionEntry WHERE id = ?', [id]);
      setEntries(prev => prev.filter(e => e.id !== id));
      await loadData();
    } catch (err) { console.error('[Nutrition] delete:', err); }
  };

  const saveManualEntry = async () => {
    if (!mFoodName.trim()) { Alert.alert('Required', 'Please enter a food name.'); return; }
    const cal = parseInt(mCalories, 10) || 0;
    setIsSaving(true);
    try {
      const db  = await getDatabase();
      const id  = Crypto.randomUUID();
      const d   = new Date();
      const now = d.toISOString();
      await db.runAsync(
        `INSERT INTO NutritionEntry
         (id, food_name, calories, protein_g, carbs_g, fat_g, serving_size, meal_type, source, logged_at, date_key)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, mFoodName.trim(), cal,
         parseFloat(mProtein) || 0, parseFloat(mCarbs) || 0, parseFloat(mFat) || 0,
         null, mMeal, 'manual', now, dateKey]
      );
      setShowManual(false);
      setMFoodName(''); setMCalories(''); setMProtein(''); setMCarbs(''); setMFat('');
      await loadData();
    } catch (err) {
      console.error('[Nutrition] saveManual:', err);
      Alert.alert('Error', 'Could not save entry. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Grouped entries by meal
  const grouped = MEAL_TYPES.map(meal => ({
    meal,
    items: entries.filter(e => e.meal_type === meal),
  }));

  // 7-day bar chart
  const chartDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const label = ['Su','Mo','Tu','We','Th','Fr','Sa'][d.getDay()];
    const found = weekHistory.find(h => h.date_key === key);
    return { key, label, total_calories: found?.total_calories ?? 0 };
  });
  const maxCal  = Math.max(...chartDays.map(d => d.total_calories), dailyTarget, 1);
  const barGap  = CHART_WIDTH / 7;
  const barW    = barGap * 0.52;

  const sourceIcon = (source: string) => {
    if (source === 'barcode')  return '📷';
    if (source === 'ai_scan')  return '🤖';
    return '✏️';
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><ArrowLeft color={colors.text} size={24} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Nutrition Tracker</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Daily Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryCalories}>{totalCalories}</Text>
              <Text style={styles.summaryLabel}>of {dailyTarget} kcal</Text>
            </View>
            <View style={styles.macroMini}>
              {[
                { label: 'Protein', val: totalProtein.toFixed(1), unit: 'g' },
                { label: 'Carbs',   val: totalCarbs.toFixed(1),   unit: 'g' },
                { label: 'Fat',     val: totalFat.toFixed(1),     unit: 'g' },
              ].map(m => (
                <View key={m.label} style={styles.macroMiniItem}>
                  <Text style={styles.macroMiniVal}>{m.val}<Text style={styles.macroMiniUnit}>{m.unit}</Text></Text>
                  <Text style={styles.macroMiniLabel}>{m.label}</Text>
                </View>
              ))}
            </View>
          </View>
          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${caloriesPct}%` as any }]} />
          </View>
        </View>

        {/* Add Buttons */}
        <View style={styles.addRow}>
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('BarcodeScannerScreen')}>
            <ScanBarcode color={colors.textInverse} size={18} />
            <Text style={styles.addBtnText}>Barcode</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowManual(true)}>
            <PenLine color={colors.textInverse} size={18} />
            <Text style={styles.addBtnText}>Manual</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AiFoodScannerScreen')}>
            <Camera color={colors.textInverse} size={18} />
            <Text style={styles.addBtnText}>AI Scan</Text>
          </TouchableOpacity>
        </View>

        {/* 7-Day Trend */}
        <Text style={styles.sectionTitle}>Weekly Trend</Text>
        <View style={styles.chartCard}>
          <Svg width={CHART_WIDTH} height={CHART_HEIGHT + 20}>
            {chartDays.map((day, i) => {
              const barH    = Math.max(2, (day.total_calories / maxCal) * CHART_HEIGHT);
              const x       = i * barGap + (barGap - barW) / 2;
              const isToday = day.key === dateKey;
              return (
                <React.Fragment key={day.key}>
                  <Rect x={x} y={CHART_HEIGHT - barH} width={barW} height={barH} rx={4}
                    fill={isToday ? colors.primary : 'rgba(10,10,10,0.18)'} />
                  <SvgText x={x + barW / 2} y={CHART_HEIGHT + 14} textAnchor="middle"
                    fontSize={10}
                    fill={isToday ? colors.text : colors.textMuted}>
                    {day.label}
                  </SvgText>
                </React.Fragment>
              );
            })}
          </Svg>
          <Text style={styles.chartCaption}>Target {dailyTarget} kcal/day</Text>
        </View>

        {/* Meal Groups */}
        <Text style={styles.sectionTitle}>Today&apos;s Meals</Text>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          grouped.map(({ meal, items }) => (
            <View key={meal} style={styles.mealGroup}>
              <View style={styles.mealHeader}>
                <Text style={styles.mealTitle}>{meal}</Text>
                <Text style={styles.mealCalories}>
                  {items.reduce((s, e) => s + e.calories, 0)} kcal
                </Text>
              </View>
              {items.length === 0 ? (
                <Text style={styles.emptyMeal}>No entries yet</Text>
              ) : (
                items.map(entry => (
                  <View key={entry.id} style={styles.entryRow}>
                    <Text style={styles.entrySource}>{sourceIcon(entry.source)}</Text>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.entryName}>{entry.food_name}</Text>
                      <Text style={styles.entryMacros}>
                        {entry.calories} kcal · P {entry.protein_g?.toFixed(1) ?? 0}g · C {entry.carbs_g?.toFixed(1) ?? 0}g · F {entry.fat_g?.toFixed(1) ?? 0}g
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => deleteEntry(entry.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Trash2 color={colors.textMuted} size={16} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          ))
        )}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Manual Entry Modal */}
      <Modal visible={showManual} transparent animationType="slide" onRequestClose={() => setShowManual(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowManual(false)}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.sheetTitle}>Manual Entry</Text>

            <TextInput style={styles.input} placeholder="Food name *" placeholderTextColor={colors.textMuted}
              value={mFoodName} onChangeText={setMFoodName} />
            <TextInput style={styles.input} placeholder="Calories (kcal)" placeholderTextColor={colors.textMuted}
              keyboardType="numeric" value={mCalories} onChangeText={setMCalories} />

            <View style={styles.macroInputRow}>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Protein (g)"
                placeholderTextColor={colors.textMuted} keyboardType="decimal-pad"
                value={mProtein} onChangeText={setMProtein} />
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Carbs (g)"
                placeholderTextColor={colors.textMuted} keyboardType="decimal-pad"
                value={mCarbs} onChangeText={setMCarbs} />
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Fat (g)"
                placeholderTextColor={colors.textMuted} keyboardType="decimal-pad"
                value={mFat} onChangeText={setMFat} />
            </View>

            <Text style={styles.fieldLabel}>Meal</Text>
            <View style={styles.mealPills}>
              {MEAL_TYPES.map(m => (
                <TouchableOpacity key={m} style={[styles.mealPill, mMeal === m && styles.mealPillActive]}
                  onPress={() => setMMeal(m)}>
                  <Text style={[styles.mealPillText, mMeal === m && styles.mealPillTextActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={saveManualEntry} disabled={isSaving}>
              {isSaving ? <ActivityIndicator color={colors.textInverse} /> :
                <Text style={styles.saveBtnText}>Add Entry</Text>}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: colors.background },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle:     { fontSize: typography.sizes.lg, fontFamily: typography.fonts.headingBold, color: colors.text },
  content:         { padding: 24 },
  summaryCard:     { backgroundColor: colors.surface, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, padding: 20, marginBottom: 20 },
  summaryRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  summaryCalories: { fontSize: 40, fontFamily: typography.fonts.headingBlack, color: colors.text },
  summaryLabel:    { fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: 2 },
  macroMini:       { flexDirection: 'row', gap: 12 },
  macroMiniItem:   { alignItems: 'center' },
  macroMiniVal:    { fontSize: typography.sizes.lg, fontFamily: typography.fonts.headingBlack, color: colors.text },
  macroMiniUnit:   { fontSize: typography.sizes.xs, color: colors.textSecondary },
  macroMiniLabel:  { fontSize: typography.sizes.xs, color: colors.textMuted, marginTop: 2 },
  progressTrack:   { height: 6, backgroundColor: colors.surfaceElevated, borderRadius: 3, overflow: 'hidden' },
  progressFill:    { height: 6, backgroundColor: colors.primary, borderRadius: 3 },
  addRow:          { flexDirection: 'row', gap: 10, marginBottom: 24 },
  addBtn:          { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.text, paddingVertical: 12, borderRadius: borderRadius.lg },
  addBtnText:      { fontSize: typography.sizes.sm, fontWeight: '600', color: colors.textInverse },
  sectionTitle:    { fontSize: typography.sizes.base, fontFamily: typography.fonts.headingBold, color: colors.text, marginBottom: 12, marginTop: 8 },
  chartCard:       { backgroundColor: colors.surface, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 24, alignItems: 'center' },
  chartCaption:    { fontSize: typography.sizes.xs, color: colors.textMuted, marginTop: 8 },
  mealGroup:       { backgroundColor: colors.surface, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: 12, overflow: 'hidden' },
  mealHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
  mealTitle:       { fontSize: typography.sizes.sm, fontFamily: typography.fonts.headingBold, color: colors.text },
  mealCalories:    { fontSize: typography.sizes.sm, color: colors.textSecondary },
  emptyMeal:       { padding: 16, fontSize: typography.sizes.xs, color: colors.textMuted, fontStyle: 'italic' },
  entryRow:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
  entrySource:     { fontSize: 16 },
  entryName:       { fontSize: typography.sizes.sm, fontWeight: '500', color: colors.text },
  entryMacros:     { fontSize: typography.sizes.xs, color: colors.textMuted, marginTop: 2 },
  // Modal
  overlay:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:           { backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12 },
  sheetTitle:      { fontSize: typography.sizes.xl, fontFamily: typography.fonts.headingBold, color: colors.text, marginBottom: 4 },
  input:           { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, padding: 14, fontSize: typography.sizes.sm, color: colors.text },
  macroInputRow:   { flexDirection: 'row', gap: 10 },
  fieldLabel:      { fontSize: typography.sizes.sm, fontWeight: '500', color: colors.text },
  mealPills:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mealPill:        { paddingHorizontal: 14, paddingVertical: 8, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.border },
  mealPillActive:  { backgroundColor: colors.primary, borderColor: colors.primary },
  mealPillText:    { fontSize: typography.sizes.sm, fontWeight: '500', color: colors.textSecondary },
  mealPillTextActive: { color: colors.textInverse, fontWeight: '700' },
  saveBtn:         { backgroundColor: colors.primary, padding: 16, borderRadius: borderRadius.lg, alignItems: 'center', marginTop: 4 },
  saveBtnText:     { fontSize: typography.sizes.base, fontWeight: '700', color: colors.textInverse },
});
