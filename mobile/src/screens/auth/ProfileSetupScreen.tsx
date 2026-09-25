import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Line, Polygon, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Check,
  User,
  ChevronRight,
  Shield,
  TrendingUp,
  TrendingDown,
  Activity,
  Flame,
  Zap,
} from 'lucide-react-native';
import { colors, typography, borderRadius, spacing } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { getSyncRepository } from '../../sync/SyncRepository';
import { getDatabase } from '../../db/connection';
import { calculateDailyCalorieTarget } from '../../utils/nutritionCalculator';

interface ProfileSetupScreenProps {
  navigation: any;
  route?: any;
}

type GenderOption = 'male' | 'female' | 'prefer_not_to_say';

const ITEM_HEIGHT = 46;
const VISIBLE_ROWS = 5;
const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS; // 230px
const PADDING_VERTICAL = (CONTAINER_HEIGHT - ITEM_HEIGHT) / 2; // 92px

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MIN_YEAR = 1940;
const MAX_YEAR = new Date().getFullYear() - 12;

export const ProfileSetupScreen: React.FC<ProfileSetupScreenProps> = ({ navigation, route }) => {
  const { user, updateUser } = useAuthStore();
  const repo = getSyncRepository();

  // Step indicator: 1 = Gender, 2 = Birthdate, 3 = Weight, 4 = Height, 5 = Goal, 6 = Calorie Adjustment
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSaving, setIsSaving] = useState(false);

  // Step 5: Primary Goal (bulk, cut, maintain)
  const [goal, setGoal] = useState<'bulk' | 'cut' | 'maintain'>('bulk');

  // Step 6: Calorie Adjustment (+300/+500 for bulk, -300/-500 for cut, 0 for maintain)
  const [calorieAdjustment, setCalorieAdjustment] = useState<number>(300);

  // Total steps: Maintain skips Step 6 (5 steps), while Bulk & Cut include Step 6 (6 steps)
  const totalSteps = goal === 'maintain' ? 5 : 6;

  // Step 1: Gender
  const [gender, setGender] = useState<GenderOption>('male');

  // Step 2: Birthdate (Defaults to July 15, 2000)
  const [birthYear, setBirthYear] = useState<number>(() => {
    if (user?.birthdate) {
      const parsed = parseInt(user.birthdate.split('-')[0] ?? '', 10);
      if (!isNaN(parsed)) return parsed;
    }
    return 2000;
  });
  const [birthMonth, setBirthMonth] = useState<number>(() => {
    if (user?.birthdate) {
      const parsed = parseInt(user.birthdate.split('-')[1] ?? '', 10);
      if (!isNaN(parsed)) return parsed;
    }
    return 7; // July
  });
  const [birthDay, setBirthDay] = useState<number>(() => {
    if (user?.birthdate) {
      const parsed = parseInt(user.birthdate.split('-')[2] ?? '', 10);
      if (!isNaN(parsed)) return parsed;
    }
    return 15;
  });

  // Step 3: Weight
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [weightKg, setWeightKg] = useState<number>(70);
  const [dialWeight, setDialWeight] = useState<number>(70);
  const dialWeightRef = useRef<number>(70);
  dialWeightRef.current = dialWeight;
  const weightUnitRef = useRef<'kg' | 'lbs'>('kg');
  weightUnitRef.current = weightUnit;
  const dragStartWeight = useRef<number>(70);
  const lastHapticWeight = useRef<number>(70);

  // Step 3 Rainbow Arch Geometry (Gentle Curve & Crisp White)
  const { width: windowWidth } = useWindowDimensions();
  const dialCardWidth = windowWidth;
  const DIAL_HEIGHT = 195;
  const DIAL_RADIUS = Math.max(330, Math.round(windowWidth * 0.95));
  const ARC_TOP = 48;
  const centerX = dialCardWidth / 2;
  const centerY = ARC_TOP + DIAL_RADIUS;
  const ANGLE_PER_UNIT = 0.024; // ~1.38 degrees per unit for gentle curve

  const deltaXEdge = dialCardWidth / 2;
  const underSqrt = Math.max(0, DIAL_RADIUS * DIAL_RADIUS - deltaXEdge * deltaXEdge);
  const yEdge = centerY - Math.sqrt(underSqrt);
  const rainbowArcPath = `M 0,${yEdge.toFixed(1)} A ${DIAL_RADIUS},${DIAL_RADIUS} 0 0,1 ${dialCardWidth},${yEdge.toFixed(1)}`;

  const innerArcRadius = DIAL_RADIUS - 52;
  const underSqrtInner = Math.max(0, innerArcRadius * innerArcRadius - deltaXEdge * deltaXEdge);
  const yInnerEdge = centerY - Math.sqrt(underSqrtInner);
  const innerRainbowPath = `M 0,${yInnerEdge.toFixed(1)} A ${innerArcRadius},${innerArcRadius} 0 0,1 ${dialCardWidth},${yInnerEdge.toFixed(1)}`;

  const handleToggleWeightUnit = (unit: 'kg' | 'lbs') => {
    if (unit === weightUnit) return;
    triggerHaptic();
    setWeightUnit(unit);
    if (unit === 'lbs') {
      const lbs = Math.round(weightKg * 2.20462);
      setDialWeight(lbs);
    } else {
      setDialWeight(weightKg);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 3;
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        dragStartWeight.current = dialWeightRef.current;
        lastHapticWeight.current = Math.round(dialWeightRef.current);
      },
      onPanResponderMove: (_, gestureState) => {
        const currentUnit = weightUnitRef.current;
        const minVal = currentUnit === 'kg' ? 30 : 66;
        const maxVal = currentUnit === 'kg' ? 250 : 550;
        const delta = -gestureState.dx / 6.8;
        const raw = dragStartWeight.current + delta;
        const clamped = Math.max(minVal, Math.min(maxVal, raw));
        setDialWeight(clamped);

        const rounded = Math.round(clamped);
        if (rounded !== lastHapticWeight.current) {
          lastHapticWeight.current = rounded;
          try {
            Haptics.selectionAsync();
          } catch {}
        }
      },
      onPanResponderRelease: () => {
        const currentUnit = weightUnitRef.current;
        const rounded = Math.round(dialWeightRef.current);
        setDialWeight(rounded);
        if (currentUnit === 'kg') {
          setWeightKg(rounded);
        } else {
          setWeightKg(Math.round(rounded / 2.20462));
        }
      },
    })
  ).current;

  const { dialTicks, dialLabels } = useMemo(() => {
    const ticks: Array<{
      val: number;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      stroke: string;
      strokeWidth: number;
    }> = [];

    const labels: Array<{
      val: number;
      x: number;
      y: number;
      deg: number;
    }> = [];

    const minVal = weightUnit === 'kg' ? 30 : 66;
    const maxVal = weightUnit === 'kg' ? 250 : 550;

    const startW = Math.max(minVal, Math.floor(dialWeight - 25));
    const endW = Math.min(maxVal, Math.ceil(dialWeight + 25));

    for (let w = startW; w <= endW; w++) {
      const angle = (w - dialWeight) * ANGLE_PER_UNIT;
      if (Math.abs(angle) > 0.56) continue;

      const isMajor = w % 10 === 0;
      const isMedium = w % 5 === 0;

      const tickLen = isMajor ? 22 : isMedium ? 15 : 9;
      const stroke = '#FFFFFF';
      const strokeWidth = isMajor ? 2.2 : isMedium ? 1.6 : 1.2;

      const sin = Math.sin(angle);
      const cos = Math.cos(angle);

      const x1 = centerX + DIAL_RADIUS * sin;
      const y1 = centerY - DIAL_RADIUS * cos;
      const x2 = centerX + (DIAL_RADIUS - tickLen) * sin;
      const y2 = centerY - (DIAL_RADIUS - tickLen) * cos;

      ticks.push({
        val: w,
        x1,
        y1,
        x2,
        y2,
        stroke,
        strokeWidth,
      });

      if (isMajor) {
        const textRadius = DIAL_RADIUS - 38;
        const xText = centerX + textRadius * sin;
        const yText = centerY - textRadius * cos;
        const deg = (angle * 180) / Math.PI;

        labels.push({
          val: w,
          x: xText,
          y: yText,
          deg,
        });
      }
    }

    return { dialTicks: ticks, dialLabels: labels };
  }, [dialWeight, weightUnit, centerX, centerY, DIAL_RADIUS, ANGLE_PER_UNIT]);

  // Step 4: Height
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
  const [heightCm, setHeightCm] = useState<number>(175);
  const [dialHeight, setDialHeight] = useState<number>(175);
  const dialHeightRef = useRef<number>(175);
  dialHeightRef.current = dialHeight;
  const heightUnitRef = useRef<'cm' | 'ft'>('cm');
  heightUnitRef.current = heightUnit;
  const dragStartHeight = useRef<number>(175);
  const lastHapticHeight = useRef<number>(175);

  const HEIGHT_SETTER_HEIGHT = 240;
  const HEIGHT_CENTER_Y = HEIGHT_SETTER_HEIGHT / 2; // 120
  const RULER_BASELINE_X = 36;

  const handleToggleHeightUnit = (unit: 'cm' | 'ft') => {
    if (unit === heightUnit) return;
    triggerHaptic();
    setHeightUnit(unit);
    if (unit === 'ft') {
      const totalInches = Math.round(heightCm / 2.54);
      setDialHeight(totalInches);
    } else {
      setDialHeight(heightCm);
    }
  };

  const heightPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && Math.abs(gestureState.dy) > 3;
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        dragStartHeight.current = dialHeightRef.current;
        lastHapticHeight.current = Math.round(dialHeightRef.current);
      },
      onPanResponderMove: (_, gestureState) => {
        const currentUnit = heightUnitRef.current;
        const pixelsPerUnit = currentUnit === 'cm' ? 7.5 : 15;
        const delta = -gestureState.dy / pixelsPerUnit;
        const raw = dragStartHeight.current + delta;
        const minVal = currentUnit === 'cm' ? 100 : 39;
        const maxVal = currentUnit === 'cm' ? 240 : 95;
        const clamped = Math.max(minVal, Math.min(maxVal, raw));
        setDialHeight(clamped);

        const rounded = Math.round(clamped);
        if (rounded !== lastHapticHeight.current) {
          lastHapticHeight.current = rounded;
          try {
            Haptics.selectionAsync();
          } catch {}
        }
      },
      onPanResponderRelease: () => {
        const currentUnit = heightUnitRef.current;
        const rounded = Math.round(dialHeightRef.current);
        setDialHeight(rounded);
        if (currentUnit === 'cm') {
          setHeightCm(rounded);
        } else {
          setHeightCm(Math.round(rounded * 2.54));
        }
      },
    })
  ).current;

  const { heightTicks, heightLabels } = useMemo(() => {
    const ticks: Array<{
      val: number;
      x1: number;
      x2: number;
      y: number;
      stroke: string;
      strokeWidth: number;
    }> = [];

    const labels: Array<{
      val: number;
      x: number;
      y: number;
      label: string;
    }> = [];

    const isCm = heightUnit === 'cm';
    const pixelsPerUnit = isCm ? 7.5 : 15;
    const minVal = isCm ? 100 : 39;
    const maxVal = isCm ? 240 : 95;

    const range = isCm ? 18 : 9;
    const startH = Math.max(minVal, Math.floor(dialHeight - range));
    const endH = Math.min(maxVal, Math.ceil(dialHeight + range));

    for (let h = startH; h <= endH; h++) {
      const y = HEIGHT_CENTER_Y - (h - dialHeight) * pixelsPerUnit;
      if (y < -12 || y > HEIGHT_SETTER_HEIGHT + 12) continue;

      let tickLen = 9;
      let stroke = 'rgba(255, 255, 255, 0.35)';
      let strokeWidth = 1.2;
      let labelText: string | null = null;

      if (isCm) {
        if (h % 10 === 0) {
          tickLen = 24;
          stroke = '#FFFFFF';
          strokeWidth = 2.2;
          labelText = `${h}`;
        } else if (h % 5 === 0) {
          tickLen = 15;
          stroke = 'rgba(255, 255, 255, 0.75)';
          strokeWidth = 1.6;
        }
      } else {
        if (h % 12 === 0) {
          tickLen = 24;
          stroke = '#FFFFFF';
          strokeWidth = 2.2;
          labelText = `${h / 12}′`;
        } else if (h % 6 === 0) {
          tickLen = 16;
          stroke = 'rgba(255, 255, 255, 0.8)';
          strokeWidth = 1.6;
          labelText = `${Math.floor(h / 12)}′${h % 12}″`;
        }
      }

      ticks.push({
        val: h,
        x1: RULER_BASELINE_X - tickLen,
        x2: RULER_BASELINE_X,
        y,
        stroke,
        strokeWidth,
      });

      if (labelText) {
        labels.push({
          val: h,
          x: RULER_BASELINE_X + 10,
          y,
          label: labelText,
        });
      }
    }

    return { heightTicks: ticks, heightLabels: labels };
  }, [dialHeight, heightUnit]);

  // Drum wheel scroll references
  const monthScrollRef = useRef<ScrollView>(null);
  const dayScrollRef = useRef<ScrollView>(null);
  const yearScrollRef = useRef<ScrollView>(null);

  const YEARS = useMemo(() => {
    const list: number[] = [];
    for (let y = MIN_YEAR; y <= MAX_YEAR; y++) {
      list.push(y);
    }
    return list;
  }, []);

  const daysCount = new Date(birthYear, birthMonth, 0).getDate();
  const DAYS = useMemo(() => {
    return Array.from({ length: daysCount }, (_, i) => i + 1);
  }, [daysCount]);

  // Adjust day if month switch makes selected day out of bounds
  useEffect(() => {
    if (birthDay > daysCount) {
      setBirthDay(daysCount);
      dayScrollRef.current?.scrollTo({ y: (daysCount - 1) * ITEM_HEIGHT, animated: true });
    }
  }, [daysCount, birthDay]);

  // Scroll to selected positions when entering Step 2
  useEffect(() => {
    if (currentStep === 2) {
      const timer = setTimeout(() => {
        monthScrollRef.current?.scrollTo({ y: (birthMonth - 1) * ITEM_HEIGHT, animated: false });
        dayScrollRef.current?.scrollTo({ y: (birthDay - 1) * ITEM_HEIGHT, animated: false });
        const yIndex = YEARS.indexOf(birthYear);
        if (yIndex >= 0) {
          yearScrollRef.current?.scrollTo({ y: yIndex * ITEM_HEIGHT, animated: false });
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [currentStep, YEARS]);

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const handleNext = async () => {
    triggerHaptic();
    if (currentStep < 4) {
      setCurrentStep((prev) => prev + 1);
    } else if (currentStep === 4) {
      setCurrentStep(5);
    } else if (currentStep === 5) {
      if (goal === 'maintain') {
        await handleCompleteSetup();
      } else {
        setCurrentStep(6);
      }
    } else {
      await handleCompleteSetup();
    }
  };

  const handleBack = () => {
    triggerHaptic();
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    } else {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('MainTabs', { screen: 'DashboardTab' });
      }
    }
  };

  const handleDrumWheelScroll = (
    e: NativeSyntheticEvent<NativeScrollEvent>,
    type: 'month' | 'day' | 'year'
  ) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    const index = Math.max(0, Math.round(offsetY / ITEM_HEIGHT));

    if (type === 'month') {
      const mIdx = Math.min(MONTHS.length - 1, index);
      if (mIdx + 1 !== birthMonth) {
        setBirthMonth(mIdx + 1);
        try {
          Haptics.selectionAsync();
        } catch {}
      }
    } else if (type === 'day') {
      const dIdx = Math.min(daysCount - 1, index);
      if (dIdx + 1 !== birthDay) {
        setBirthDay(dIdx + 1);
        try {
          Haptics.selectionAsync();
        } catch {}
      }
    } else if (type === 'year') {
      const yIdx = Math.min(YEARS.length - 1, index);
      if (YEARS[yIdx] && YEARS[yIdx] !== birthYear) {
        setBirthYear(YEARS[yIdx]!);
        try {
          Haptics.selectionAsync();
        } catch {}
      }
    }
  };

  const handleSelectDirect = (index: number, type: 'month' | 'day' | 'year') => {
    try {
      Haptics.selectionAsync();
    } catch {}

    if (type === 'month') {
      setBirthMonth(index + 1);
      monthScrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: true });
    } else if (type === 'day') {
      setBirthDay(index + 1);
      dayScrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: true });
    } else if (type === 'year') {
      setBirthYear(YEARS[index]!);
      yearScrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: true });
    }
  };

  const handleCompleteSetup = async () => {
    setIsSaving(true);
    const birthdateFormatted = `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`;

    try {
      const activeGoal = goal;
      const effectiveAdjustment = goal === 'maintain' ? 0 : calorieAdjustment;

      // Calculate calorie target via Mifflin-St Jeor formula with custom surplus/deficit
      const calorieResult = calculateDailyCalorieTarget({
        weightKg,
        heightCm,
        gender,
        birthYear,
        birthdate: birthdateFormatted,
        fitnessGoal: activeGoal,
        calorieAdjustment: effectiveAdjustment,
      });
      const targetCalories = calorieResult.targetCalories;

      // Update local Preferences in SQLite
      try {
        const db = await getDatabase();
        await db.runAsync(
          `INSERT OR IGNORE INTO Preferences (id, workout_type, intensity, weekly_workout_goal)
           VALUES ('default', 'full-body', 'moderate', 5)`
        );
        await db.runAsync(
          `UPDATE Preferences 
           SET daily_nutrition_target_calories = ?, weight_kg = ?, fitness_goal = ?
           WHERE id = 'default'`,
          [targetCalories, weightKg, activeGoal]
        );
      } catch {}

      // Enqueue sync & update remote preferences
      try {
        await repo.updatePreferences({
          daily_nutrition_target_calories: targetCalories,
          weight_kg: weightKg,
          fitness_goal: activeGoal,
        });
      } catch {}

      await updateUser({
        gender,
        birthdate: birthdateFormatted,
        weight_kg: weightKg,
        height_cm: heightCm,
        is_profile_completed: true,
        fitness_goal: activeGoal,
      });

      try {
        await repo.updateProfile({
          gender,
          birthdate: birthdateFormatted,
          weight_kg: weightKg,
          height_cm: heightCm,
          is_profile_completed: true,
        });
      } catch {}

      navigation.navigate('MainTabs', {
        screen: 'DashboardTab',
        params: {
          profileSetupJustCompleted: true,
          calculatedTargetCalories: targetCalories,
        },
      });
    } catch {
      navigation.navigate('MainTabs', {
        screen: 'DashboardTab',
        params: { profileSetupJustCompleted: true },
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header with Back button, Step Progress Bars, and Counter */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.progressTrackContainer}>
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
            <View
              key={step}
              style={[
                styles.progressBarSegment,
                step <= currentStep && styles.progressBarSegmentActive,
              ]}
            />
          ))}
        </View>

        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>STEP {Math.min(currentStep, totalSteps)} OF {totalSteps}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* STEP 1: GENDER */}
        {currentStep === 1 && (
          <View style={styles.stepSection}>
            <View style={styles.centeredTitleGroup}>
              <Text style={styles.centeredStepTitle}>What is your gender?</Text>
            </View>

            <View style={styles.optionsList}>
              {[
                {
                  id: 'male' as const,
                  title: 'Male',
                  subtitle: 'Calculates male basal metabolic benchmark',
                  icon: User,
                },
                {
                  id: 'female' as const,
                  title: 'Female',
                  subtitle: 'Calculates female basal metabolic benchmark',
                  icon: User,
                },
                {
                  id: 'prefer_not_to_say' as const,
                  title: 'Prefer Not to Say',
                  subtitle: 'Uses standardized athletic baseline metrics',
                  icon: Shield,
                },
              ].map((opt) => {
                const isSelected = gender === opt.id;
                const IconComponent = opt.icon;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                    onPress={() => {
                      triggerHaptic();
                      setGender(opt.id);
                    }}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={opt.title}
                  >
                    <View style={[styles.optionIconBox, isSelected && styles.optionIconBoxSelected]}>
                      <IconComponent size={22} color={isSelected ? '#000000' : '#FFFFFF'} />
                    </View>
                    <View style={styles.optionContent}>
                      <Text style={[styles.optionTitle, isSelected && styles.optionTitleSelected]}>
                        {opt.title}
                      </Text>
                      <Text style={styles.optionSubtitle}>{opt.subtitle}</Text>
                    </View>
                    <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
                      {isSelected && <Check size={14} color="#000000" strokeWidth={3} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* STEP 2: BIRTHDATE - APPLE 3-COLUMN SCROLL WHEEL */}
        {currentStep === 2 && (
          <View style={styles.stepSection}>
            <View style={styles.centeredTitleGroup}>
              <Text style={styles.centeredStepTitle}>
                Select your{'\n'}date of birth
              </Text>
            </View>

            {/* Apple 3-Column Drum Wheel Container */}
            <View style={[styles.drumWheelContainer, { height: CONTAINER_HEIGHT }]}>
              {/* Center Active Row Selection Highlight Bar */}
              <View
                style={[
                  styles.drumWheelHighlightBar,
                  { top: PADDING_VERTICAL, height: ITEM_HEIGHT },
                ]}
                pointerEvents="none"
              />

              {/* Column 1: Month */}
              <ScrollView
                ref={monthScrollRef}
                style={styles.wheelColumnMonth}
                contentContainerStyle={{ paddingVertical: PADDING_VERTICAL }}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                snapToAlignment="center"
                decelerationRate="fast"
                nestedScrollEnabled={true}
                scrollEventThrottle={16}
                onScroll={(e) => handleDrumWheelScroll(e, 'month')}
                onMomentumScrollEnd={(e) => handleDrumWheelScroll(e, 'month')}
                onScrollEndDrag={(e) => handleDrumWheelScroll(e, 'month')}
              >
                {MONTHS.map((m, idx) => {
                  const dist = Math.abs(idx - (birthMonth - 1));
                  const isSelected = dist === 0;
                  const isLongMonth = m.length >= 8; // September, November, December, February
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[styles.wheelItem, { height: ITEM_HEIGHT }]}
                      onPress={() => handleSelectDirect(idx, 'month')}
                      activeOpacity={0.7}
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.wheelItemText,
                          styles.wheelItemTextMonth,
                          isLongMonth && styles.wheelItemTextMonthLong,
                          isSelected && styles.wheelItemTextSelected,
                          isSelected && isLongMonth && styles.wheelItemTextSelectedLongMonth,
                          dist === 1 && styles.wheelItemTextDist1,
                          dist === 2 && styles.wheelItemTextDist2,
                          dist >= 3 && styles.wheelItemTextDist3,
                        ]}
                      >
                        {m}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Column 2: Day */}
              <ScrollView
                ref={dayScrollRef}
                style={styles.wheelColumnDay}
                contentContainerStyle={{ paddingVertical: PADDING_VERTICAL }}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                snapToAlignment="center"
                decelerationRate="fast"
                nestedScrollEnabled={true}
                scrollEventThrottle={16}
                onScroll={(e) => handleDrumWheelScroll(e, 'day')}
                onMomentumScrollEnd={(e) => handleDrumWheelScroll(e, 'day')}
                onScrollEndDrag={(e) => handleDrumWheelScroll(e, 'day')}
              >
                {DAYS.map((d, idx) => {
                  const dist = Math.abs(idx - (birthDay - 1));
                  const isSelected = dist === 0;
                  return (
                    <TouchableOpacity
                      key={d}
                      style={[styles.wheelItem, { height: ITEM_HEIGHT }]}
                      onPress={() => handleSelectDirect(idx, 'day')}
                      activeOpacity={0.7}
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.wheelItemText,
                          styles.wheelItemTextDay,
                          isSelected && styles.wheelItemTextSelected,
                          dist === 1 && styles.wheelItemTextDist1,
                          dist === 2 && styles.wheelItemTextDist2,
                          dist >= 3 && styles.wheelItemTextDist3,
                        ]}
                      >
                        {d}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Column 3: Year */}
              <ScrollView
                ref={yearScrollRef}
                style={styles.wheelColumnYear}
                contentContainerStyle={{ paddingVertical: PADDING_VERTICAL }}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                snapToAlignment="center"
                decelerationRate="fast"
                nestedScrollEnabled={true}
                scrollEventThrottle={16}
                onScroll={(e) => handleDrumWheelScroll(e, 'year')}
                onMomentumScrollEnd={(e) => handleDrumWheelScroll(e, 'year')}
                onScrollEndDrag={(e) => handleDrumWheelScroll(e, 'year')}
              >
                {YEARS.map((y, idx) => {
                  const selectedYearIdx = YEARS.indexOf(birthYear);
                  const dist = Math.abs(idx - selectedYearIdx);
                  const isSelected = dist === 0;
                  return (
                    <TouchableOpacity
                      key={y}
                      style={[styles.wheelItem, { height: ITEM_HEIGHT }]}
                      onPress={() => handleSelectDirect(idx, 'year')}
                      activeOpacity={0.7}
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.wheelItemText,
                          styles.wheelItemTextYear,
                          isSelected && styles.wheelItemTextSelected,
                          dist === 1 && styles.wheelItemTextDist1,
                          dist === 2 && styles.wheelItemTextDist2,
                          dist >= 3 && styles.wheelItemTextDist3,
                        ]}
                      >
                        {y}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Gradient fade masks at top and bottom */}
              <LinearGradient
                colors={['#0A0A0A', 'rgba(10, 10, 10, 0)']}
                style={styles.wheelGradientTop}
                pointerEvents="none"
              />
              <LinearGradient
                colors={['rgba(10, 10, 10, 0)', '#0A0A0A']}
                style={styles.wheelGradientBottom}
                pointerEvents="none"
              />
            </View>
          </View>
        )}

        {/* STEP 3: WEIGHT */}
        {currentStep === 3 && (
          <View style={styles.stepSection}>
            <View style={styles.centeredTitleGroup}>
              <Text style={styles.centeredStepTitle}>What is your weight?</Text>
            </View>

            {/* Unit Toggle: kg vs lbs */}
            <View style={styles.unitToggleContainer}>
              <TouchableOpacity
                style={[styles.unitToggleTab, weightUnit === 'kg' && styles.unitToggleTabActive]}
                onPress={() => handleToggleWeightUnit('kg')}
                activeOpacity={0.8}
              >
                <Text style={[styles.unitToggleText, weightUnit === 'kg' && styles.unitToggleTextActive]}>
                  Kilograms (kg)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.unitToggleTab, weightUnit === 'lbs' && styles.unitToggleTabActive]}
                onPress={() => handleToggleWeightUnit('lbs')}
                activeOpacity={0.8}
              >
                <Text style={[styles.unitToggleText, weightUnit === 'lbs' && styles.unitToggleTextActive]}>
                  Pounds (lbs)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Rainbow Shape Analog Weight Dial - No Background */}
            <View style={[styles.dialCardContainer, { width: windowWidth }]} {...panResponder.panHandlers}>
              <Svg width={dialCardWidth} height={DIAL_HEIGHT} style={StyleSheet.absoluteFill}>
                {/* Rainbow Arch Track - White */}
                <Path
                  d={rainbowArcPath}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth={2}
                  strokeLinecap="round"
                  opacity={0.65}
                />

                {/* Inner Rainbow Guide Line - White */}
                <Path
                  d={innerRainbowPath}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth={1}
                  strokeDasharray="4,4"
                  opacity={0.3}
                />

                {/* Tick marks radiating along the rainbow arch */}
                {dialTicks.map((t) => (
                  <Line
                    key={`tick-${t.val}`}
                    x1={t.x1}
                    y1={t.y1}
                    x2={t.x2}
                    y2={t.y2}
                    stroke={t.stroke}
                    strokeWidth={t.strokeWidth}
                    strokeLinecap="round"
                  />
                ))}

                {/* Major numbers rotated along the rainbow curve */}
                {dialLabels.map((lbl) => (
                  <SvgText
                    key={`lbl-${lbl.val}`}
                    x={lbl.x}
                    y={lbl.y}
                    transform={`rotate(${lbl.deg.toFixed(1)}, ${lbl.x.toFixed(1)}, ${lbl.y.toFixed(1)})`}
                    textAnchor="middle"
                    alignmentBaseline="middle"
                    fontSize={14}
                    fontWeight="700"
                    fill="#FFFFFF"
                  >
                    {lbl.val}
                  </SvgText>
                ))}

                {/* Fixed center green indicator line at the crest of the rainbow arch */}
                <Line
                  x1={centerX}
                  y1={ARC_TOP}
                  x2={centerX}
                  y2={ARC_TOP + 28}
                  stroke="#10B981"
                  strokeWidth={3}
                  strokeLinecap="round"
                />

                {/* Fixed green indicator pointer (▲) pointing up at the readout bubble */}
                <Polygon
                  points={`${centerX},${ARC_TOP - 9} ${centerX - 6},${ARC_TOP - 1} ${centerX + 6},${ARC_TOP - 1}`}
                  fill="#10B981"
                />
              </Svg>

              {/* Floating Readout Bubble at top center */}
              <View style={styles.readoutBubble} pointerEvents="none">
                <Text style={styles.readoutBubbleNumber}>{Math.round(dialWeight)}</Text>
                <Text style={styles.readoutBubbleUnit}>{weightUnit}</Text>
              </View>
            </View>
          </View>
        )}

        {/* STEP 4: HEIGHT */}
        {currentStep === 4 && (
          <View style={styles.stepSection}>
            <View style={styles.centeredTitleGroup}>
              <Text style={styles.centeredStepTitle}>What is your height?</Text>
            </View>

            {/* Unit Toggle: cm vs ft */}
            <View style={styles.unitToggleContainer}>
              <TouchableOpacity
                style={[styles.unitToggleTab, heightUnit === 'cm' && styles.unitToggleTabActive]}
                onPress={() => handleToggleHeightUnit('cm')}
                activeOpacity={0.8}
              >
                <Text style={[styles.unitToggleText, heightUnit === 'cm' && styles.unitToggleTextActive]}>
                  Centimeters (cm)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.unitToggleTab, heightUnit === 'ft' && styles.unitToggleTabActive]}
                onPress={() => handleToggleHeightUnit('ft')}
                activeOpacity={0.8}
              >
                <Text style={[styles.unitToggleText, heightUnit === 'ft' && styles.unitToggleTextActive]}>
                  Feet & Inches (ft/in)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Vertical Height Setter */}
            <View style={styles.verticalHeightSetterContainer} {...heightPanResponder.panHandlers}>
              {/* Left Side: Hero Readout */}
              <View style={styles.heightHeroContainer}>
                <View style={styles.heightHeroRow}>
                  {heightUnit === 'cm' ? (
                    <>
                      <Text style={styles.heightHeroNumber}>{Math.round(dialHeight)}</Text>
                      <Text style={styles.heightHeroUnit}>cm</Text>
                    </>
                  ) : (
                    <Text style={styles.heightHeroNumber}>
                      {Math.floor(dialHeight / 12)}′ {Math.round(dialHeight % 12)}″
                    </Text>
                  )}
                </View>
              </View>

              {/* Right Side: Vertical Stadiometer Ruler */}
              <View style={styles.verticalRulerArea}>
                <Svg width={130} height={HEIGHT_SETTER_HEIGHT} style={StyleSheet.absoluteFill}>
                  {/* Vertical Baseline */}
                  <Line
                    x1={RULER_BASELINE_X}
                    y1={0}
                    x2={RULER_BASELINE_X}
                    y2={HEIGHT_SETTER_HEIGHT}
                    stroke="rgba(255, 255, 255, 0.2)"
                    strokeWidth={1.5}
                  />

                  {/* Ticks */}
                  {heightTicks.map((t) => (
                    <Line
                      key={`htick-${t.val}`}
                      x1={t.x1}
                      y1={t.y}
                      x2={t.x2}
                      y2={t.y}
                      stroke={t.stroke}
                      strokeWidth={t.strokeWidth}
                      strokeLinecap="round"
                    />
                  ))}

                  {/* Labels */}
                  {heightLabels.map((lbl) => (
                    <SvgText
                      key={`hlbl-${lbl.val}`}
                      x={lbl.x}
                      y={lbl.y}
                      textAnchor="start"
                      alignmentBaseline="middle"
                      fontSize={13}
                      fontWeight="700"
                      fill="#FFFFFF"
                    >
                      {lbl.label}
                    </SvgText>
                  ))}

                  {/* Horizontal Emerald Green Indicator Needle */}
                  <Line
                    x1={RULER_BASELINE_X - 32}
                    y1={HEIGHT_CENTER_Y}
                    x2={RULER_BASELINE_X}
                    y2={HEIGHT_CENTER_Y}
                    stroke="#10B981"
                    strokeWidth={2.8}
                    strokeLinecap="round"
                  />

                  {/* Green Pointer Arrow (▶) pointing at the ruler tick */}
                  <Polygon
                    points={`${RULER_BASELINE_X - 8},${HEIGHT_CENTER_Y - 5} ${RULER_BASELINE_X + 2},${HEIGHT_CENTER_Y} ${RULER_BASELINE_X - 8},${HEIGHT_CENTER_Y + 5}`}
                    fill="#10B981"
                  />
                </Svg>

                {/* Top and Bottom Gradient Fades */}
                <LinearGradient
                  colors={['#0A0A0A', 'rgba(10, 10, 10, 0)']}
                  style={styles.rulerFadeTop}
                  pointerEvents="none"
                />
                <LinearGradient
                  colors={['rgba(10, 10, 10, 0)', '#0A0A0A']}
                  style={styles.rulerFadeBottom}
                  pointerEvents="none"
                />
              </View>
            </View>
          </View>
        )}

        {/* STEP 5: PRIMARY FITNESS GOAL */}
        {currentStep === 5 && (
          <View style={styles.stepSection}>
            <View style={styles.centeredTitleGroup}>
              <Text style={styles.centeredStepTitle}>What is your primary goal?</Text>
              <Text style={styles.stepSubtitleText}>
                We will personalize your daily nutrition and training volume to match your physique objective.
              </Text>
            </View>

            <View style={styles.optionsList}>
              {[
                {
                  id: 'bulk' as const,
                  title: 'Bulk',
                  tag: 'Hypertrophy',
                  subtitle: 'Caloric surplus for muscle growth & strength gains',
                  icon: TrendingUp,
                },
                {
                  id: 'cut' as const,
                  title: 'Cut',
                  tag: 'Fat Loss',
                  subtitle: 'Caloric deficit to burn body fat while preserving lean muscle',
                  icon: TrendingDown,
                },
                {
                  id: 'maintain' as const,
                  title: 'Maintain',
                  tag: 'Balance',
                  subtitle: 'Equal caloric balance to preserve current physique & energy',
                  icon: Activity,
                },
              ].map((opt) => {
                const isSelected = goal === opt.id;
                const IconComponent = opt.icon;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                    onPress={() => {
                      triggerHaptic();
                      setGoal(opt.id);
                      if (opt.id === 'bulk') {
                        setCalorieAdjustment((prev) => (prev === 500 ? 500 : 300));
                      } else if (opt.id === 'cut') {
                        setCalorieAdjustment((prev) => (prev === -500 ? -500 : -300));
                      } else {
                        setCalorieAdjustment(0);
                      }
                    }}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={opt.title}
                  >
                    <View style={[styles.optionIconBox, isSelected && styles.optionIconBoxSelected]}>
                      <IconComponent size={22} color={isSelected ? '#000000' : '#FFFFFF'} strokeWidth={2.5} />
                    </View>
                    <View style={styles.optionContent}>
                      <View style={styles.optionHeaderRow}>
                        <Text style={[styles.optionTitle, isSelected && styles.optionTitleSelected]}>
                          {opt.title}
                        </Text>
                        <View style={[styles.tagBadge, isSelected && styles.tagBadgeSelected]}>
                          <Text style={[styles.tagBadgeText, isSelected && styles.tagBadgeTextSelected]}>
                            {opt.tag}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.optionSubtitle}>{opt.subtitle}</Text>
                    </View>
                    <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
                      {isSelected && <Check size={14} color="#000000" strokeWidth={3} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* STEP 6: CONDITIONAL CALORIE ADJUSTMENT */}
        {currentStep === 6 && (goal === 'bulk' || goal === 'cut') && (
          <View style={styles.stepSection}>
            <View style={styles.centeredTitleGroup}>
              <Text style={styles.centeredStepTitle}>
                {goal === 'bulk' ? 'Select your calorie surplus' : 'Select your calorie deficit'}
              </Text>
              <Text style={styles.stepSubtitleText}>
                {goal === 'bulk'
                  ? 'Choose how many extra calories to add above your daily maintenance level.'
                  : 'Choose how many calories to subtract below your daily maintenance level.'}
              </Text>
            </View>

            <View style={styles.optionsList}>
              {(goal === 'bulk'
                ? [
                    {
                      value: 300,
                      title: '+300 Calories',
                      badge: 'Lean Bulk',
                      subtitle: 'Gradual, steady lean muscle gain with minimal fat retention.',
                      icon: Flame,
                    },
                    {
                      value: 500,
                      title: '+500 Calories',
                      badge: 'Aggressive Bulk',
                      subtitle: 'Accelerated mass building and higher lifting strength progression.',
                      icon: Zap,
                    },
                  ]
                : [
                    {
                      value: -300,
                      title: '-300 Calories',
                      badge: 'Moderate Cut',
                      subtitle: 'Sustainable, steady fat loss while preserving maximum lean muscle mass.',
                      icon: Flame,
                    },
                    {
                      value: -500,
                      title: '-500 Calories',
                      badge: 'Aggressive Cut',
                      subtitle: 'Faster fat shredding and definition for accelerated transformation.',
                      icon: Zap,
                    },
                  ]
              ).map((opt) => {
                const isSelected = calorieAdjustment === opt.value;
                const IconComponent = opt.icon;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                    onPress={() => {
                      triggerHaptic();
                      setCalorieAdjustment(opt.value);
                    }}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={opt.title}
                  >
                    <View style={[styles.optionIconBox, isSelected && styles.optionIconBoxSelected]}>
                      <IconComponent size={22} color={isSelected ? '#000000' : '#FFFFFF'} strokeWidth={2.5} />
                    </View>
                    <View style={styles.optionContent}>
                      <View style={styles.optionHeaderRow}>
                        <Text style={[styles.optionTitle, isSelected && styles.optionTitleSelected]}>
                          {opt.title}
                        </Text>
                        <View style={[styles.tagBadge, isSelected && styles.tagBadgeSelected]}>
                          <Text style={[styles.tagBadgeText, isSelected && styles.tagBadgeTextSelected]}>
                            {opt.badge}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.optionSubtitle}>{opt.subtitle}</Text>
                    </View>
                    <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
                      {isSelected && <Check size={14} color="#000000" strokeWidth={3} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom CTA Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryButton, isSaving && styles.primaryButtonDisabled]}
          onPress={handleNext}
          disabled={isSaving}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={
            (currentStep === 5 && goal === 'maintain') || currentStep === 6
              ? 'Complete Profile Setup'
              : 'Continue to next step'
          }
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#000000" />
          ) : (
            <View style={styles.buttonContent}>
              <Text style={styles.primaryButtonText}>
                {(currentStep === 5 && goal === 'maintain') || currentStep === 6
                  ? 'Complete Profile Setup'
                  : 'Continue'}
              </Text>
              <ChevronRight size={18} color="#000000" strokeWidth={2.5} />
            </View>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default ProfileSetupScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrackContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 16,
  },
  progressBarSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  progressBarSegmentActive: {
    backgroundColor: '#FFD600',
  },
  stepBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  stepBadgeText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 11,
    fontWeight: '700',
    color: '#E5E5E5',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
  },
  stepSection: {
    flex: 1,
  },
  titleGroup: {
    marginBottom: 28,
  },
  stepTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 15,
    fontWeight: '400',
    color: '#A0A0A0',
    lineHeight: 22,
  },
  optionsList: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 18,
  },
  optionCardSelected: {
    borderColor: '#FFFFFF',
    backgroundColor: '#1C1C1C',
  },
  optionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#222222',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionIconBoxSelected: {
    backgroundColor: '#FFFFFF',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  optionTitleSelected: {
    color: '#FFFFFF',
  },
  optionSubtitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 13,
    color: '#8A8A8A',
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  checkCircleSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },

  // Centered Title for Step 2 (Matching reference image)
  centeredTitleGroup: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  centeredStepTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 30,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.6,
    lineHeight: 38,
  },
  stepSubtitleText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  optionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  tagBadge: {
    backgroundColor: '#242426',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagBadgeSelected: {
    backgroundColor: '#FFFFFF',
  },
  tagBadgeText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 11,
    fontWeight: '700',
    color: '#A0A0A5',
    textTransform: 'uppercase',
  },
  tagBadgeTextSelected: {
    color: '#000000',
  },

  // 3-Column Drum Wheel Picker
  drumWheelContainer: {
    flexDirection: 'row',
    position: 'relative',
    marginHorizontal: 4,
    borderRadius: 16,
    overflow: 'hidden',
  },
  drumWheelHighlightBar: {
    position: 'absolute',
    left: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    zIndex: 0,
  },
  wheelColumnMonth: {
    flex: 1.5,
    zIndex: 1,
  },
  wheelColumnDay: {
    flex: 0.68,
    zIndex: 1,
  },
  wheelColumnYear: {
    flex: 1.05,
    zIndex: 1,
  },
  wheelItem: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelItemText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 18,
    color: '#CCCCCC',
    fontWeight: '400',
  },
  wheelItemTextMonth: {
    textAlign: 'right',
    width: '100%',
    paddingRight: 10,
    letterSpacing: -0.2,
  },
  wheelItemTextMonthLong: {
    fontSize: 16,
  },
  wheelItemTextDay: {
    textAlign: 'center',
    width: '100%',
  },
  wheelItemTextYear: {
    textAlign: 'left',
    width: '100%',
    paddingLeft: 12,
  },
  wheelItemTextSelected: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    opacity: 1,
  },
  wheelItemTextSelectedLongMonth: {
    fontSize: 17,
  },
  wheelItemTextDist1: {
    color: '#E0E0E4',
    fontSize: 19,
    fontWeight: '500',
    opacity: 0.88,
  },
  wheelItemTextDist2: {
    color: '#AAAAAE',
    fontSize: 17,
    fontWeight: '400',
    opacity: 0.7,
  },
  wheelItemTextDist3: {
    color: '#77777B',
    fontSize: 16,
    fontWeight: '400',
    opacity: 0.55,
  },
  wheelGradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 40,
    zIndex: 10,
  },
  wheelGradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    zIndex: 10,
  },

  // Steps 3 & 4
  unitToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#161616',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  unitToggleTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 9,
  },
  unitToggleTabActive: {
    backgroundColor: '#282828',
  },
  unitToggleText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 13,
    fontWeight: '600',
    color: '#8A8A8A',
  },
  unitToggleTextActive: {
    color: '#FFFFFF',
  },
  dialCardContainer: {
    width: '100%',
    marginHorizontal: -24,
    height: 195,
    backgroundColor: 'transparent',
    borderWidth: 0,
    position: 'relative',
    marginBottom: 16,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  readoutBubble: {
    position: 'absolute',
    top: 6,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 10,
  },
  readoutBubbleNumber: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 24,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -0.5,
  },
  readoutBubbleUnit: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 13,
    fontWeight: '700',
    color: '#52525B',
    marginLeft: 4,
  },
  weightSecondaryContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  weightSecondaryText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 14,
    fontWeight: '500',
    color: '#71717A',
  },
  verticalHeightSetterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 240,
    backgroundColor: 'transparent',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  heightHeroContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 12,
  },
  heightHeroRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  heightHeroNumber: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 52,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  heightHeroUnit: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 20,
    fontWeight: '700',
    color: '#10B981',
  },
  heightHeroSecondary: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 15,
    fontWeight: '500',
    color: '#71717A',
    marginTop: 6,
  },
  verticalRulerArea: {
    width: 130,
    height: 240,
    position: 'relative',
  },
  rulerFadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 44,
    zIndex: 5,
  },
  rulerFadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 44,
    zIndex: 5,
  },
  summaryCard: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  summaryRow: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 11,
    color: '#777777',
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  summaryValue: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  summaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: '#0A0A0A',
  },
  primaryButton: {
    backgroundColor: '#FFD600',
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  primaryButtonText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
});
