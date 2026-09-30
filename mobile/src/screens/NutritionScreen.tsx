import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, Alert, Modal, Pressable, TextInput, ActivityIndicator,
  Platform, KeyboardAvoidingView,
} from 'react-native';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import * as Crypto from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';

import {
  ChevronLeft, ChevronRight, RotateCcw, ScanBarcode, Camera, SquarePen,
  Trash2, X, Lock, Image, HeartPulse, Leaf, Droplet, Flame, Salad, Plus, Sparkles,
} from '../components/icons';
import { typography } from '../theme';
import { getDatabase } from '../db/connection';
import { PercentRing } from '../components/PercentRing';
import { useAuthStore } from '../store/authStore';
import { calculateDailyCalorieTarget } from '../utils/nutritionCalculator';

// ---------------------------------------------------------------------------
// Architecture decision: entries are grouped by meal type (Breakfast / Lunch /
// Dinner / Snacks) matching Apple Health & Apple Fitness design language.
// ---------------------------------------------------------------------------

function localDateKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'] as const;
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

const DEFAULT_TARGET = 2000;

export const NutritionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route       = useRoute<any>();
  const user        = useAuthStore((state) => state.user);
  const isProfileComplete = Boolean(user?.is_profile_completed);

  const [entries,        setEntries]        = useState<NutritionEntry[]>([]);
  const [dailyTarget,    setDailyTarget]    = useState(DEFAULT_TARGET);
  const [isLoading,      setIsLoading]      = useState(true);
  const [showManual,     setShowManual]     = useState(false);
  const [showBarcodeChoiceModal, setShowBarcodeChoiceModal] = useState(false);

  // Manual entry form state
  const [mFoodName, setMFoodName] = useState('');
  const [mCalories, setMCalories] = useState('');
  const [mProtein,  setMProtein]  = useState('');
  const [mCarbs,    setMCarbs]    = useState('');
  const [mFat,      setMFat]      = useState('');
  const [mMeal,     setMMeal]     = useState<MealType>('Snacks');
  const [isSaving,  setIsSaving]  = useState(false);

  const triggerHaptic = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
    try {
      Haptics.impactAsync(style);
    } catch {}
  };

  const formattedDate = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }, []);

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
  }, [isProfileComplete, user]);

  useFocusEffect(useCallback(() => {
    if (!isProfileComplete) return;
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

  // Recommended daily macronutrient targets
  const macroGoals = useMemo(() => {
    if (user?.weight_kg && user?.height_cm) {
      const calculated = calculateDailyCalorieTarget({
        weightKg: user.weight_kg,
        heightCm: user.height_cm,
        gender: user.gender || 'male',
        birthdate: user.birthdate,
        fitnessGoal: user.fitness_goal || 'build_muscle',
      });
      return calculated.macros;
    }
    const pGrams = Math.round((dailyTarget * 0.30) / 4);
    const fGrams = Math.round((dailyTarget * 0.25) / 9);
    const cGrams = Math.max(0, Math.round((dailyTarget - (pGrams * 4) - (fGrams * 9)) / 4));
    return {
      proteinGrams: pGrams || 150,
      carbsGrams: cGrams || 295,
      fatGrams: fGrams || 66,
    };
  }, [user?.weight_kg, user?.height_cm, user?.gender, user?.birthdate, user?.fitness_goal, dailyTarget]);

  const proteinPct = Math.round((totalProtein / (macroGoals.proteinGrams || 1)) * 100);
  const carbsPct   = Math.round((totalCarbs / (macroGoals.carbsGrams || 1)) * 100);
  const fatPct     = Math.round((totalFat / (macroGoals.fatGrams || 1)) * 100);

  const mealBreakdown = useMemo(() => {
    const result: Record<MealType, { count: number; calories: number; entries: NutritionEntry[] }> = {
      Breakfast: { count: 0, calories: 0, entries: [] },
      Lunch: { count: 0, calories: 0, entries: [] },
      Dinner: { count: 0, calories: 0, entries: [] },
      Snacks: { count: 0, calories: 0, entries: [] },
    };
    for (const entry of entries) {
      const meal = entry.meal_type as MealType;
      if (result[meal]) {
        result[meal].count += 1;
        result[meal].calories += entry.calories;
        result[meal].entries.push(entry);
      } else {
        result.Snacks.count += 1;
        result.Snacks.calories += entry.calories;
        result.Snacks.entries.push(entry);
      }
    }
    return result;
  }, [entries]);

  const formatMacroValue = (val: number): string => {
    if (val === 0) return '0g';
    return Number.isInteger(val) ? `${val}g` : `${val.toFixed(1)}g`;
  };

  const deleteEntry = async (id: string) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const db = await getDatabase();
      await db.runAsync('DELETE FROM NutritionEntry WHERE id = ?', [id]);
      setEntries(prev => prev.filter(e => e.id !== id));
      await loadData();
    } catch (err) {
      console.error('[Nutrition] delete:', err);
    }
  };

  const clearTodayEntries = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
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
              try {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } catch {}
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
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
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
    if (source === 'ai_scan')  return '✨';
    return '✏️';
  };

  if (!isProfileComplete) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.navBar}>
          <TouchableOpacity
            onPress={() => {
              triggerHaptic();
              navigation.goBack();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.navBackBtn}
          >
            <ChevronLeft color="#0A84FF" size={26} strokeWidth={2.4} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Nutrition</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.gateContainer}>
          <View style={styles.gateCard}>
            <View style={styles.gateIconWrapper}>
              <Lock size={32} color="#FF9F0A" />
            </View>
            <Text style={styles.gateTitle}>Profile Setup Required</Text>
            <Text style={styles.gateMessage}>
              Complete your profile to unlock Apple-caliber nutrition tracking, personalized caloric goals, and daily macro targets.
            </Text>

            <TouchableOpacity
              style={styles.gatePrimaryBtn}
              onPress={() => {
                triggerHaptic();
                navigation.navigate('ProfileSetup');
              }}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Complete Profile Setup"
            >
              <Text style={styles.gatePrimaryBtnText}>Complete Profile Setup</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gateSecondaryBtn}
              onPress={() => {
                triggerHaptic();
                navigation.goBack();
              }}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Go Back"
            >
              <Text style={styles.gateSecondaryBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* iOS Navigation Header */}
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => {
            triggerHaptic();
            navigation.goBack();
          }}
          style={styles.navBackBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft color="#0A84FF" size={26} strokeWidth={2.4} />
        </TouchableOpacity>

        <View style={styles.navCenter}>
          <Text style={styles.navTitle}>Nutrition</Text>
          <Text style={styles.navSubtitle}>{formattedDate}</Text>
        </View>

        {entries.length > 0 ? (
          <TouchableOpacity
            onPress={clearTodayEntries}
            accessibilityRole="button"
            accessibilityLabel="Reset today's logged nutrition to 0"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.navActionBtn}
          >
            <RotateCcw color="rgba(255, 255, 255, 0.7)" size={18} strokeWidth={2.2} />
          </TouchableOpacity>
        ) : (
          <View style={styles.navActionPlaceholder} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Apple Fitness Activity Ring Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.ringContainer}>
            <PercentRing
              percentage={caloriesPct}
              size={196}
              strokeWidth={17}
              color="#30D158"
              trackColor="rgba(48, 209, 88, 0.12)"
              showPercentageText={false}
            >
              <View style={styles.circleInnerContent}>
                <Text style={styles.circleCaloriesNumber}>{totalCalories.toLocaleString()}</Text>
                <Text style={styles.circleCaloriesUnit}>KCAL</Text>
                <Text style={styles.circleCaloriesTarget}>of {dailyTarget.toLocaleString()} kcal</Text>
              </View>
            </PercentRing>
          </View>

          <View style={styles.heroDivider} />

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatLabel}>REMAINING</Text>
              <Text style={styles.heroStatValue}>
                {Math.max(0, dailyTarget - totalCalories).toLocaleString()} <Text style={styles.heroStatUnit}>kcal</Text>
              </Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatLabel}>DAILY GOAL</Text>
              <Text style={styles.heroStatValue}>
                {dailyTarget.toLocaleString()} <Text style={styles.heroStatUnit}>kcal</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* 3 Apple Health Macronutrient Cards */}
        <View style={styles.macroCardsRow}>
          {/* Protein Card */}
          <View style={styles.macroCard}>
            <View style={styles.macroTopRow}>
              <HeartPulse size={18} color="#8E8E93" strokeWidth={2} />
              <Text style={styles.macroPercentageText}>{proteinPct}%</Text>
            </View>
            <Text style={styles.macroValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {formatMacroValue(totalProtein)}
            </Text>
            <Text style={styles.macroLabel}>Protein</Text>
            <Text style={styles.macroGoalText}>of {macroGoals.proteinGrams}g</Text>
            <View style={styles.macroTrack}>
              <View
                style={[
                  styles.macroFill,
                  { backgroundColor: '#FF375F', width: `${Math.min(100, Math.max(2, proteinPct))}%` },
                ]}
              />
            </View>
          </View>

          {/* Carbs Card */}
          <View style={styles.macroCard}>
            <View style={styles.macroTopRow}>
              <Leaf size={18} color="#8E8E93" strokeWidth={2} />
              <Text style={styles.macroPercentageText}>{carbsPct}%</Text>
            </View>
            <Text style={styles.macroValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {formatMacroValue(totalCarbs)}
            </Text>
            <Text style={styles.macroLabel}>Carbs</Text>
            <Text style={styles.macroGoalText}>of {macroGoals.carbsGrams}g</Text>
            <View style={styles.macroTrack}>
              <View
                style={[
                  styles.macroFill,
                  { backgroundColor: '#0A84FF', width: `${Math.min(100, Math.max(2, carbsPct))}%` },
                ]}
              />
            </View>
          </View>

          {/* Fats Card */}
          <View style={styles.macroCard}>
            <View style={styles.macroTopRow}>
              <Droplet size={18} color="#8E8E93" strokeWidth={2} />
              <Text style={styles.macroPercentageText}>{fatPct}%</Text>
            </View>
            <Text style={styles.macroValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {formatMacroValue(totalFat)}
            </Text>
            <Text style={styles.macroLabel}>Fats</Text>
            <Text style={styles.macroGoalText}>of {macroGoals.fatGrams}g</Text>
            <View style={styles.macroTrack}>
              <View
                style={[
                  styles.macroFill,
                  { backgroundColor: '#FF9F0A', width: `${Math.min(100, Math.max(2, fatPct))}%` },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Apple Quick Action Controls */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>QUICK ACTIONS</Text>
        </View>
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => {
              triggerHaptic();
              setShowManual(true);
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Manual Entry"
          >
            <SquarePen color="#8E8E93" size={22} strokeWidth={2} style={{ marginBottom: 6 }} />
            <Text style={styles.quickActionTitle}>Manual</Text>
            <Text style={styles.quickActionSubtitle}>Type item</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => {
              triggerHaptic();
              setShowBarcodeChoiceModal(true);
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Barcode Scanner"
          >
            <ScanBarcode color="#8E8E93" size={22} strokeWidth={2} style={{ marginBottom: 6 }} />
            <Text style={styles.quickActionTitle}>Barcode</Text>
            <Text style={styles.quickActionSubtitle}>Scan pack</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => {
              triggerHaptic();
              navigation.navigate('AiFoodScannerScreen');
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="AI Scanner"
          >
            <Sparkles color="#8E8E93" size={22} strokeWidth={2} style={{ marginBottom: 6 }} />
            <Text style={styles.quickActionTitle}>AI Scanner</Text>
            <Text style={styles.quickActionSubtitle}>Snap meal</Text>
          </TouchableOpacity>
        </View>

        {/* Apple Inset Grouped Meals Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>MEALS TODAY</Text>
        </View>
        <View style={styles.insetGroupedCard}>
          {MEAL_TYPES.map((meal, index) => {
            const data = mealBreakdown[meal];
            const isLast = index === MEAL_TYPES.length - 1;
            const renderMealIcon = () => {
              switch (meal) {
                case 'Breakfast': return <Flame size={18} color="#8E8E93" strokeWidth={2} />;
                case 'Lunch': return <Salad size={18} color="#8E8E93" strokeWidth={2} />;
                case 'Dinner': return <HeartPulse size={18} color="#8E8E93" strokeWidth={2} />;
                case 'Snacks': return <Leaf size={18} color="#8E8E93" strokeWidth={2} />;
              }
            };

            return (
              <View key={meal}>
                <View style={styles.mealRow}>
                  <View style={styles.mealLeft}>
                    {renderMealIcon()}
                    <View>
                      <Text style={styles.mealName}>{meal}</Text>
                      <Text style={styles.mealMeta}>
                        {data.count > 0 ? `${data.count} ${data.count === 1 ? 'item' : 'items'}` : 'Not logged'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.mealRight}>
                    <Text style={[styles.mealCaloriesText, data.calories > 0 && styles.mealCaloriesActive]}>
                      {data.calories > 0 ? `${data.calories} kcal` : '—'}
                    </Text>
                    <TouchableOpacity
                      style={styles.mealAddBtn}
                      onPress={() => {
                        triggerHaptic();
                        setMMeal(meal);
                        setShowManual(true);
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityRole="button"
                      accessibilityLabel={`Add food to ${meal}`}
                    >
                      <Plus size={16} color="#FFFFFF" strokeWidth={2.4} />
                    </TouchableOpacity>
                  </View>
                </View>
                {!isLast && <View style={styles.rowDivider} />}
              </View>
            );
          })}
        </View>

        {/* Logged Foods List */}
        {entries.length > 0 && (
          <View style={styles.loggedSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderTitle}>TODAY'S LOG ({entries.length})</Text>
              <TouchableOpacity
                onPress={clearTodayEntries}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.clearAllBtnText}>Clear All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.insetGroupedCard}>
              {entries.map((entry, index) => {
                const isLast = index === entries.length - 1;
                return (
                  <View key={entry.id}>
                    <View style={styles.entryRow}>
                      <View style={styles.entryLeading}>
                        <View style={styles.entrySourceBadge}>
                          <Text style={styles.entrySourceEmoji}>{sourceIcon(entry.source)}</Text>
                        </View>
                        <View style={styles.entryTextContainer}>
                          <View style={styles.entryTitleRow}>
                            <Text style={styles.entryFoodName} numberOfLines={1}>{entry.food_name}</Text>
                            <View style={styles.entryMealTag}>
                              <Text style={styles.entryMealTagText}>{entry.meal_type}</Text>
                            </View>
                          </View>
                          <Text style={styles.entryMacroLine}>
                            {entry.calories} kcal · P {entry.protein_g?.toFixed(0) ?? 0}g · C {entry.carbs_g?.toFixed(0) ?? 0}g · F {entry.fat_g?.toFixed(0) ?? 0}g
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        onPress={() => deleteEntry(entry.id)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={styles.entryDeleteBtn}
                        accessibilityRole="button"
                        accessibilityLabel={`Delete ${entry.food_name}`}
                      >
                        <Trash2 size={16} color="rgba(255, 255, 255, 0.35)" />
                      </TouchableOpacity>
                    </View>
                    {!isLast && <View style={styles.rowDivider} />}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Manual Entry iOS Bottom Sheet */}
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
          <Pressable
            style={styles.backdropDismiss}
            onPress={() => {
              triggerHaptic();
              setShowManual(false);
            }}
          />

          <View style={styles.sheet}>
            <View style={styles.sheetDragHandle} />

            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Log Food</Text>
                <Text style={styles.sheetSubtitle}>Enter meal and macronutrient details</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  triggerHaptic();
                  setShowManual(false);
                }}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.sheetCloseBtn}
                accessibilityRole="button"
                accessibilityLabel="Close manual entry"
              >
                <X color="rgba(255, 255, 255, 0.7)" size={16} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              <Text style={styles.inputLabel}>FOOD NAME</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Grilled Chicken & Rice"
                placeholderTextColor="rgba(255, 255, 255, 0.3)"
                value={mFoodName}
                onChangeText={setMFoodName}
              />

              <Text style={styles.inputLabel}>CALORIES (KCAL)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 450"
                placeholderTextColor="rgba(255, 255, 255, 0.3)"
                keyboardType="numeric"
                value={mCalories}
                onChangeText={setMCalories}
              />

              <Text style={styles.inputLabel}>MACRONUTRIENTS (OPTIONAL)</Text>
              <View style={styles.macroInputRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.miniLabel}>Protein (g)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor="rgba(255, 255, 255, 0.3)"
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
                    placeholderTextColor="rgba(255, 255, 255, 0.3)"
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
                    placeholderTextColor="rgba(255, 255, 255, 0.3)"
                    keyboardType="decimal-pad"
                    value={mFat}
                    onChangeText={setMFat}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>MEAL CATEGORY</Text>
              <View style={styles.mealSegmentControl}>
                {MEAL_TYPES.map((m) => {
                  const isActive = mMeal === m;
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[styles.mealSegmentPill, isActive && styles.mealSegmentPillActive]}
                      onPress={() => {
                        triggerHaptic();
                        setMMeal(m);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.mealSegmentText, isActive && styles.mealSegmentTextActive]}>
                        {m}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
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
                  <Text style={styles.saveBtnText}>Add to Log</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Barcode Choice Apple Sheet */}
      <Modal
        visible={showBarcodeChoiceModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBarcodeChoiceModal(false)}
      >
        <TouchableOpacity
          style={styles.choiceModalBackdrop}
          activeOpacity={1}
          onPress={() => {
            triggerHaptic();
            setShowBarcodeChoiceModal(false);
          }}
        >
          <TouchableOpacity
            style={styles.choiceModalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.sheetDragHandle} />
            <View style={styles.choiceModalHeader}>
              <View>
                <Text style={styles.choiceModalTitle}>Barcode Scanner</Text>
                <Text style={styles.choiceModalSubtitle}>
                  Choose how you want to scan your item
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  triggerHaptic();
                  setShowBarcodeChoiceModal(false);
                }}
                style={styles.sheetCloseBtn}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <X color="rgba(255, 255, 255, 0.7)" size={16} />
              </TouchableOpacity>
            </View>

            <View style={styles.choiceCardsContainer}>
              {/* Option 1: Live Camera */}
              <TouchableOpacity
                style={styles.choiceCard}
                onPress={() => {
                  triggerHaptic();
                  setShowBarcodeChoiceModal(false);
                  navigation.navigate('BarcodeScannerScreen', { mode: 'camera' });
                }}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Camera"
              >
                <View style={[styles.choiceIconBox, { backgroundColor: 'rgba(48, 209, 88, 0.12)' }]}>
                  <Camera color="#30D158" size={22} strokeWidth={2.2} />
                </View>
                <View style={styles.choiceTextContainer}>
                  <Text style={styles.choiceCardTitle}>Camera Scanner</Text>
                  <Text style={styles.choiceCardDesc}>
                    Scan food barcode in real-time with device camera
                  </Text>
                </View>
                <ChevronRight color="rgba(255, 255, 255, 0.3)" size={18} strokeWidth={2} />
              </TouchableOpacity>

              {/* Option 2: Upload Image */}
              <TouchableOpacity
                style={styles.choiceCard}
                onPress={async () => {
                  triggerHaptic();
                  setShowBarcodeChoiceModal(false);
                  try {
                    const result = await ImagePicker.launchImageLibraryAsync({
                      mediaTypes: ['images'],
                      allowsEditing: false,
                      quality: 1,
                    });
                    if (result.canceled || !result.assets[0]?.uri) {
                      return;
                    }
                    navigation.navigate('BarcodeScannerScreen', {
                      mode: 'upload',
                      initialImageUri: result.assets[0].uri,
                    });
                  } catch (err) {
                    console.warn('[NutritionScreen] Image picker error:', err);
                  }
                }}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Upload Images"
              >
                <View style={[styles.choiceIconBox, { backgroundColor: 'rgba(10, 132, 255, 0.12)' }]}>
                  <Image color="#0A84FF" size={22} strokeWidth={2.2} />
                </View>
                <View style={styles.choiceTextContainer}>
                  <Text style={styles.choiceCardTitle}>Choose from Photos</Text>
                  <Text style={styles.choiceCardDesc}>
                    Select a photo or package screenshot from library
                  </Text>
                </View>
                <ChevronRight color="rgba(255, 255, 255, 0.3)" size={18} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.choiceCancelBtn}
              onPress={() => {
                triggerHaptic();
                setShowBarcodeChoiceModal(false);
              }}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.choiceCancelText}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  navBackBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  navCenter: {
    alignItems: 'center',
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  navSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 1,
  },
  navActionBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  navActionPlaceholder: {
    width: 44,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // Apple Hero Calorie Card
  heroCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    paddingVertical: 20,
    paddingHorizontal: 18,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 3,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    } as any : {}),
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  heroHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  heroBadge: {
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(48, 209, 88, 0.25)',
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#30D158',
  },
  ringContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  circleInnerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleCaloriesNumber: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 46,
    letterSpacing: -1,
  },
  circleCaloriesUnit: {
    fontSize: 12,
    fontWeight: '700',
    color: '#30D158',
    letterSpacing: 1.2,
    marginTop: 2,
  },
  circleCaloriesTarget: {
    fontSize: 12.5,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 4,
  },
  heroDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 14,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  heroStatLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 0.6,
    color: 'rgba(255, 255, 255, 0.45)',
    marginBottom: 3,
  },
  heroStatValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  heroStatUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.45)',
  },

  // 3 Macronutrient Cards
  macroCardsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 22,
  },
  macroCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  macroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  macroIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroPercentageText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.65)',
  },
  macroValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  macroLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 2,
  },
  macroGoalText: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.45)',
    marginBottom: 10,
  },
  macroTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    width: '100%',
  },
  macroFill: {
    height: '100%',
    borderRadius: 2,
  },

  // Section Headers
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  sectionHeaderTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  clearAllBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#FF453A',
  },

  // Quick Action Buttons
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 22,
  },
  quickActionBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  quickActionSubtitle: {
    fontSize: 10.5,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.45)',
    marginTop: 2,
  },

  // Inset Grouped Card
  insetGroupedCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
    marginBottom: 22,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  mealLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mealIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  mealMeta: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.45)',
    marginTop: 1,
  },
  mealRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mealCaloriesText: {
    fontSize: 13.5,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.4)',
  },
  mealCaloriesActive: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mealAddBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginLeft: 46,
  },

  // Logged Food Rows
  loggedSection: {
    marginBottom: 10,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  entryLeading: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  entrySourceBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  entrySourceEmoji: {
    fontSize: 15,
  },
  entryTextContainer: {
    flex: 1,
    paddingRight: 8,
  },
  entryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  entryFoodName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  entryMealTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  entryMealTagText: {
    fontSize: 10.5,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.55)',
  },
  entryMacroLine: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  entryDeleteBtn: {
    padding: 6,
  },

  // Empty State Card
  emptyStateCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 26,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 10,
    marginBottom: 4,
  },
  emptyStateDesc: {
    fontSize: 12.5,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.45)',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Modal / Bottom Sheet
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '85%',
  },
  sheetDragHandle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  sheetSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },
  sheetCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 6,
    marginTop: 12,
  },
  miniLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.45)',
    marginBottom: 4,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#FFFFFF',
  },
  macroInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  mealSegmentControl: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    padding: 3,
    marginTop: 4,
    marginBottom: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  mealSegmentPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealSegmentPillActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  mealSegmentText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.55)',
  },
  mealSegmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: '#30D158',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.2,
  },

  // Profile Setup Required Gate
  gateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  gateCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: 28,
    alignItems: 'center',
  },
  gateIconWrapper: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255, 159, 10, 0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 159, 10, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  gateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 8,
    textAlign: 'center',
  },
  gateMessage: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255, 255, 255, 0.55)',
    textAlign: 'center',
    marginBottom: 24,
  },
  gatePrimaryBtn: {
    backgroundColor: '#FF9F0A',
    paddingVertical: 14,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  gatePrimaryBtnText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '700',
  },
  gateSecondaryBtn: {
    paddingVertical: 12,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  gateSecondaryBtnText: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 14,
    fontWeight: '600',
  },

  // Barcode Choice Modal
  choiceModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  choiceModalContent: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  choiceModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  choiceModalTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  choiceModalSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },
  choiceCardsContainer: {
    gap: 10,
    marginBottom: 16,
  },
  choiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 18,
    padding: 14,
  },
  choiceIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  choiceTextContainer: {
    flex: 1,
  },
  choiceCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  choiceCardDesc: {
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.45)',
    lineHeight: 16,
  },
  choiceCancelBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
});
