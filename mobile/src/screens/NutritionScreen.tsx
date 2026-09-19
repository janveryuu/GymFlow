import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, Alert, Modal, Pressable, TextInput, ActivityIndicator,
  Platform, KeyboardAvoidingView,
} from 'react-native';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { ArrowLeft, ScanBarcode, Camera, PenLine, Trash2, X, Lock, RotateCcw } from 'lucide-react-native';
import { colors, typography, borderRadius } from '../theme';
import { getDatabase } from '../db/connection';
import { PercentRing } from '../components/PercentRing';
import { useAuthStore } from '../store/authStore';
import { calculateDailyCalorieTarget } from '../utils/nutritionCalculator';
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

const DEFAULT_TARGET = 2000;

export const NutritionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route       = useRoute<any>();
  const user        = useAuthStore((state) => state.user);
  const isProfileComplete = Boolean(user?.is_profile_completed);

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
    if (!isProfileComplete) {
      setIsLoading(false);
      return;
    }
    try {
      const db = await getDatabase();

      // Ensure NutritionEntry table exists defensively
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS NutritionEntry (
          id TEXT PRIMARY KEY NOT NULL,
          food_name TEXT NOT NULL,
          calories INTEGER NOT NULL,
          protein_g REAL NOT NULL,
          carbs_g REAL NOT NULL,
          fat_g REAL NOT NULL,
          serving_size TEXT,
          meal_type TEXT NOT NULL,
          source TEXT NOT NULL,
          logged_at TEXT NOT NULL,
          date_key TEXT NOT NULL,
          barcode TEXT
        );
      `);

      // Load target from preferences or calculate from profile
      const prefs = await db.getFirstAsync<{ daily_nutrition_target_calories: number | null; fitness_goal?: string | null }>(
        'SELECT daily_nutrition_target_calories, fitness_goal FROM Preferences WHERE id = ?', ['default']
      );
      if (prefs?.daily_nutrition_target_calories) {
        setDailyTarget(prefs.daily_nutrition_target_calories);
      } else if (user?.weight_kg && user?.height_cm) {
        const calculated = calculateDailyCalorieTarget({
          weightKg: user.weight_kg,
          heightCm: user.height_cm,
          gender: user.gender || 'male',
          birthdate: user.birthdate,
          fitnessGoal: user.fitness_goal || prefs?.fitness_goal || 'build_muscle',
        });
        setDailyTarget(calculated.targetCalories);
        try {
          await db.runAsync(
            `UPDATE Preferences SET daily_nutrition_target_calories = ? WHERE id = 'default'`,
            [calculated.targetCalories]
          );
        } catch {}
      }

      const currentKey = localDateKey();
      // Today's entries
      const rows = await db.getAllAsync<NutritionEntry>(
        `SELECT id, food_name, calories, protein_g, carbs_g, fat_g, serving_size, meal_type, source, logged_at
         FROM NutritionEntry WHERE date_key = ? ORDER BY logged_at DESC`,
        [currentKey]
      );
      setEntries(rows);
    } catch (err) {
      console.error('[Nutrition] loadData:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isProfileComplete]);

  useFocusEffect(useCallback(() => {
    if (!isProfileComplete) return;
    // Support deep-link from BarcodeScanner "openManualEntry" param
    if (route.params?.openManualEntry) {
      setShowManual(true);
      navigation.setParams({ openManualEntry: undefined });
    }
    loadData();
  }, [isProfileComplete, loadData, route.params, navigation]));

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

  const clearTodayEntries = async () => {
    Alert.alert(
      "Reset Today's Nutrition",
      'Are you sure you want to clear all logged food entries for today? This will reset consumed calories to 0.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset to 0',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = await getDatabase();
              const currentKey = localDateKey();
              await db.runAsync('DELETE FROM NutritionEntry WHERE date_key = ?', [currentKey]);
              setEntries([]);
              await loadData();
            } catch (err) {
              console.error('[Nutrition] clearTodayEntries:', err);
            }
          },
        },
      ]
    );
  };

  const saveManualEntry = async () => {
    if (!mFoodName.trim()) {
      Alert.alert('Required', 'Please enter a food name.');
      return;
    }
    const cal = parseInt(mCalories, 10) || 0;
    setIsSaving(true);
    try {
      const db = await getDatabase();

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS NutritionEntry (
          id TEXT PRIMARY KEY NOT NULL,
          food_name TEXT NOT NULL,
          calories INTEGER NOT NULL,
          protein_g REAL NOT NULL,
          carbs_g REAL NOT NULL,
          fat_g REAL NOT NULL,
          serving_size TEXT,
          meal_type TEXT NOT NULL,
          source TEXT NOT NULL,
          logged_at TEXT NOT NULL,
          date_key TEXT NOT NULL,
          barcode TEXT
        );
      `);

      const id = Crypto.randomUUID();
      const now = new Date().toISOString();
      const currentKey = localDateKey();

      await db.runAsync(
        `INSERT INTO NutritionEntry
         (id, food_name, calories, protein_g, carbs_g, fat_g, serving_size, meal_type, source, logged_at, date_key)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          mFoodName.trim(),
          cal,
          parseFloat(mProtein) || 0,
          parseFloat(mCarbs) || 0,
          parseFloat(mFat) || 0,
          null,
          mMeal || 'Snacks',
          'manual',
          now,
          currentKey,
        ]
      );
      setShowManual(false);
      setMFoodName('');
      setMCalories('');
      setMProtein('');
      setMCarbs('');
      setMFat('');
      await loadData();
    } catch (err) {
      console.error('[Nutrition] saveManual:', err);
      Alert.alert('Error', 'Could not save entry. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const sourceIcon = (source: string) => {
    if (source === 'barcode')  return '📷';
    if (source === 'ai_scan')  return '🤖';
    return '✏️';
  };

  if (!isProfileComplete) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft color={colors.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nutrition Tracker</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.gateContainer}>
          <View style={styles.gateIconWrapper}>
            <Lock size={38} color="#FFD600" />
          </View>
          <Text style={styles.gateTitle}>Profile Setup Required</Text>
          <Text style={styles.gateMessage}>
            Complete your profile setup to unlock nutrition tracking, personalized caloric goals, and macronutrient targets.
          </Text>

          <TouchableOpacity
            style={styles.gatePrimaryBtn}
            onPress={() => navigation.navigate('ProfileSetup')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Complete Profile Setup"
          >
            <Text style={styles.gatePrimaryBtnText}>Complete Profile Setup</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gateSecondaryBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Go Back"
          >
            <Text style={styles.gateSecondaryBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nutrition Tracker</Text>
        {entries.length > 0 ? (
          <TouchableOpacity
            onPress={clearTodayEntries}
            accessibilityRole="button"
            accessibilityLabel="Reset today's logged nutrition to 0"
            style={{ padding: 4 }}
          >
            <RotateCcw color="#8E8E93" size={20} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Circular Progress (Laid flat on main background, 200px matching Water screen) */}
        <View style={styles.ringContainer}>
          <PercentRing
            percentage={caloriesPct}
            size={200}
            strokeWidth={16}
            color="#22C55E"
            trackColor="rgba(34, 197, 94, 0.15)"
            showPercentageText={false}
          >
            <View style={styles.circleInnerContent}>
              <Text style={styles.circleCaloriesNumber}>{totalCalories}</Text>
              <Text style={styles.circleCaloriesUnit}>kcal</Text>
              <Text style={styles.circleCaloriesTarget}>of {dailyTarget} kcal</Text>
            </View>
          </PercentRing>
        </View>

        {/* 3 Macro Cards: Protein, Carbs, Fat */}
        <View style={styles.macroCardsRow}>
          <View style={styles.macroCard}>
            <Text style={styles.macroLabel}>Protein</Text>
            <Text style={styles.macroValue}>
              {totalProtein.toFixed(1)}
              <Text style={styles.macroUnit}>g</Text>
            </Text>
          </View>

          <View style={styles.macroCard}>
            <Text style={styles.macroLabel}>Carbs</Text>
            <Text style={styles.macroValue}>
              {totalCarbs.toFixed(1)}
              <Text style={styles.macroUnit}>g</Text>
            </Text>
          </View>

          <View style={styles.macroCard}>
            <Text style={styles.macroLabel}>Fat</Text>
            <Text style={styles.macroValue}>
              {totalFat.toFixed(1)}
              <Text style={styles.macroUnit}>g</Text>
            </Text>
          </View>
        </View>

        {/* Action Header & 3 Choices */}
        <Text style={styles.sectionTitle}>Action</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setShowManual(true)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Manual"
          >
            <PenLine color={colors.textInverse} size={18} strokeWidth={2.2} />
            <Text style={styles.actionBtnText}>Manual</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('BarcodeScannerScreen')}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Barcode"
          >
            <ScanBarcode color={colors.textInverse} size={18} strokeWidth={2.2} />
            <Text style={styles.actionBtnText}>Barcode</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('AiFoodScannerScreen')}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="AI Scanner"
          >
            <Camera color={colors.textInverse} size={18} strokeWidth={2.2} />
            <Text style={styles.actionBtnText}>AI Scanner</Text>
          </TouchableOpacity>
        </View>

        {/* Logged Food Entries List */}
        {entries.length > 0 ? (
          <View style={styles.loggedSection}>
            <Text style={styles.sectionTitle}>Logged Food</Text>
            <View style={styles.entriesList}>
              {entries.map((entry) => (
                <View key={entry.id} style={styles.entryCard}>
                  <View style={styles.entrySourceIconWrap}>
                    <Text style={styles.entrySource}>{sourceIcon(entry.source)}</Text>
                  </View>
                  <View style={styles.entryInfo}>
                    <Text style={styles.entryName}>{entry.food_name}</Text>
                    <Text style={styles.entryMacros}>
                      {entry.calories} kcal · P {entry.protein_g?.toFixed(1) ?? 0}g · C {entry.carbs_g?.toFixed(1) ?? 0}g · F {entry.fat_g?.toFixed(1) ?? 0}g
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => deleteEntry(entry.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.deleteBtn}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${entry.food_name}`}
                  >
                    <Trash2 color={colors.textMuted} size={18} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Manual Entry Modal */}
      <Modal
        visible={showManual}
        transparent
        animationType="slide"
        onRequestClose={() => setShowManual(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.overlay}
        >
          <Pressable style={styles.backdropDismiss} onPress={() => setShowManual(false)} />

          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Manual Entry</Text>
              <TouchableOpacity
                onPress={() => setShowManual(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Close manual entry"
              >
                <X color={colors.textSecondary} size={22} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              <Text style={styles.inputLabel}>Food Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Oatmeal, Chicken, Rice"
                placeholderTextColor={colors.textMuted}
                value={mFoodName}
                onChangeText={setMFoodName}
              />

              <Text style={styles.inputLabel}>Calories (kcal) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 350"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={mCalories}
                onChangeText={setMCalories}
              />

              <Text style={styles.inputLabel}>Macros (Optional)</Text>
              <View style={styles.macroInputRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.miniLabel}>Protein (g)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                    value={mProtein}
                    onChangeText={setMProtein}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.miniLabel}>Carbs (g)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                    value={mCarbs}
                    onChangeText={setMCarbs}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.miniLabel}>Fat (g)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                    value={mFat}
                    onChangeText={setMFat}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Meal</Text>
              <View style={styles.mealPills}>
                {MEAL_TYPES.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.mealPill, mMeal === m && styles.mealPillActive]}
                    onPress={() => setMMeal(m)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.mealPillText, mMeal === m && styles.mealPillTextActive]}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={saveManualEntry}
                disabled={isSaving}
                activeOpacity={0.85}
              >
                {isSaving ? (
                  <ActivityIndicator color="#000000" />
                ) : (
                  <Text style={styles.saveBtnText}>Add Entry</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: colors.background },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle:     { fontSize: typography.sizes.lg, fontFamily: typography.fonts.headingBold, color: colors.text },
  content:         { padding: 24 },
  ringContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 26,
  },
  circleInnerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleCaloriesNumber: {
    fontSize: 42,
    fontFamily: typography.fonts.headingBlack,
    color: colors.text,
    lineHeight: 46,
  },
  circleCaloriesUnit: {
    fontSize: 13,
    fontFamily: typography.fonts.headingBold,
    color: '#22C55E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  circleCaloriesTarget: {
    fontSize: 12,
    fontFamily: typography.fonts.body,
    color: colors.textMuted,
    marginTop: 4,
  },
  macroCardsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  macroCard: {
    flex: 1,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.28)',
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroLabel: {
    fontSize: 12,
    fontFamily: typography.fonts.headingMedium,
    color: '#4ADE80',
    marginBottom: 6,
  },
  macroValue: {
    fontSize: 18,
    fontFamily: typography.fonts.headingBlack,
    color: '#22C55E',
  },
  macroUnit: {
    fontSize: 12,
    fontFamily: typography.fonts.body,
    color: '#86EFAC',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.text,
    paddingVertical: 13,
    borderRadius: borderRadius.lg,
  },
  actionBtnText: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: colors.textInverse,
  },
  sectionTitle: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fonts.headingBold,
    color: colors.text,
    marginBottom: 12,
    marginTop: 4,
  },
  loggedSection: {
    marginTop: 4,
    marginBottom: 20,
  },
  entriesList: {
    gap: 10,
  },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  entrySourceIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  entrySource: {
    fontSize: 16,
  },
  entryInfo: {
    flex: 1,
  },
  entryName: {
    fontSize: 15,
    fontFamily: typography.fonts.headingBold,
    color: colors.text,
    marginBottom: 3,
  },
  entryMacros: {
    fontSize: 12,
    fontFamily: typography.fonts.body,
    color: colors.textSecondary,
  },
  deleteBtn: {
    padding: 6,
  },

  // Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  backdropDismiss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: typography.fonts.headingBold,
    color: colors.text,
  },
  inputLabel: {
    fontSize: 12.5,
    fontFamily: typography.fonts.headingMedium,
    color: colors.textSecondary,
    marginBottom: 6,
    marginTop: 10,
  },
  miniLabel: {
    fontSize: 11,
    fontFamily: typography.fonts.body,
    color: colors.textMuted,
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  macroInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  mealPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    marginBottom: 20,
  },
  mealPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  mealPillActive: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  mealPillText: {
    fontSize: typography.sizes.sm,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  mealPillTextActive: {
    color: '#000000',
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: '#22C55E',
    paddingVertical: 15,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  saveBtnText: {
    fontSize: typography.sizes.base,
    fontWeight: '800',
    fontFamily: typography.fonts.headingBold,
    color: '#000000',
  },
  gateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  gateIconWrapper: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255, 214, 0, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 214, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  gateTitle: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: typography.fonts.headingBold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  gateMessage: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: typography.fonts.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  gatePrimaryBtn: {
    backgroundColor: '#FFD600',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: borderRadius.lg,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#FFD600',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  gatePrimaryBtnText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '800',
    fontFamily: typography.fonts.headingBold,
  },
  gateSecondaryBtn: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: borderRadius.lg,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    backgroundColor: '#1C1C1E',
  },
  gateSecondaryBtnText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
    fontFamily: typography.fonts.body,
  },
});
