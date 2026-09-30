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
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Line, Polygon, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import {
  ChevronLeft,
  CheckCircle2,
  User,
  Shield,
  TrendingUp,
  TrendingDown,
  Activity,
  Flame,
  Zap,
} from '../../components/icons';
import { colors, typography, borderRadius, spacing } from '../../theme';
import { OptionWheel } from '../../components/OptionWheel';
import { useAuthStore } from '../../store/authStore';
import { getSyncRepository } from '../../sync/SyncRepository';
import { getDatabase } from '../../db/connection';
import { calculateDailyCalorieTarget } from '../../utils/nutritionCalculator';

interface ProfileSetupScreenProps {
  navigation: any;
  route?: any;
}

type GenderOption = 'male' | 'female' | 'prefer_not_to_say';

const APPLE_FONT_FAMILY = Platform.OS === 'web'
  ? '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif'
  : Platform.OS === 'ios'
  ? 'System'
  : 'Roboto';

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

/**
 * Animated Step Title Group with Native iOS Entrance Animation (+20px to 0px fade)
 */
interface StepTitleGroupProps {
  title: string;
  subtitle?: string;
  stepKey: number;
}

const StepTitleGroup: React.FC<StepTitleGroupProps> = ({ title, subtitle, stepKey }) => {
  const entranceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    entranceAnim.setValue(0);
    Animated.timing(entranceAnim, {
      toValue: 1,
      duration: 300,
      easing: Easing.bezier(0.32, 0.72, 0, 1),
      useNativeDriver: true,
    }).start();
  }, [stepKey]);

  const translateY = entranceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });

  return (
    <Animated.View
      style={[
        styles.centeredTitleGroup,
        {
          opacity: entranceAnim,
          transform: [{ translateY }],
        },
      ]}
    >
      <Text style={styles.centeredStepTitle}>{title}</Text>
      {subtitle ? <Text style={styles.stepSubtitleText}>{subtitle}</Text> : null}
    </Animated.View>
  );
};

/**
 * Apple Inset Grouped Selection Card with:
 * - Tap Physics: spring scale to 0.97 on press
 * - Staggered Entrance: +20px to 0px fade with 50ms delay
 * - iOS dark translucent background rgba(28, 28, 30, 0.8) & 16px squircle
 * - Neutral translucent icon box background rgba(255, 255, 255, 0.08)
 * - Right-aligned checkmark.circle.fill on selection
 */
interface AppleSelectionCardProps {
  isSelected: boolean;
  onPress: () => void;
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  title: string;
  subtitle: string;
  tag?: string;
  index: number;
  stepKey: number;
}

const AppleSelectionCard: React.FC<AppleSelectionCardProps> = ({
  isSelected,
  onPress,
  icon: IconComponent,
  title,
  subtitle,
  tag,
  index,
  stepKey,
}) => {
  const pressScale = useRef(new Animated.Value(1)).current;
  const entranceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    entranceAnim.setValue(0);
    const timer = setTimeout(() => {
      Animated.timing(entranceAnim, {
        toValue: 1,
        duration: 280,
        easing: Easing.bezier(0.32, 0.72, 0, 1),
        useNativeDriver: true,
      }).start();
    }, 50 * (index + 1));
    return () => clearTimeout(timer);
  }, [stepKey, index]);

  const handlePressIn = () => {
    Animated.spring(pressScale, {
      toValue: 0.97,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressScale, {
      toValue: 1,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const translateY = entranceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });

  return (
    <Animated.View
      style={{
        opacity: entranceAnim,
        transform: [{ translateY }, { scale: pressScale }],
      }}
    >
      <TouchableOpacity
        style={[styles.optionCard, isSelected && styles.optionCardSelected]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={title}
      >
        <View style={styles.optionIconBox}>
          <IconComponent size={22} color="rgba(255, 255, 255, 0.6)" strokeWidth={2} />
        </View>
        <View style={styles.optionContent}>
          <View style={styles.optionHeaderRow}>
            <Text style={[styles.optionTitle, isSelected && styles.optionTitleSelected]}>
              {title}
            </Text>
            {tag ? (
              <View style={[styles.tagBadge, isSelected && styles.tagBadgeSelected]}>
                <Text style={[styles.tagBadgeText, isSelected && styles.tagBadgeTextSelected]}>
                  {tag}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.optionSubtitle}>{subtitle}</Text>
        </View>
        <View style={styles.checkCircleWrapper}>
          {isSelected ? (
            <CheckCircle2 size={22} color="#007AFF" />
          ) : (
            <View style={styles.unselectedRing} />
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

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

  // Continuous slim progress bar animation (ease-in-out curve)
  const progressAnim = useRef(new Animated.Value(1 / totalSteps)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: currentStep / totalSteps,
      duration: 320,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [currentStep, totalSteps]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // Screen push transition: 300ms cubic-bezier(0.32, 0.72, 0, 1)
  const IOS_PUSH_EASING = useMemo(() => Easing.bezier(0.32, 0.72, 0, 1), []);
  const stepSlideAnim = useRef(new Animated.Value(0)).current;
  const stepOpacityAnim = useRef(new Animated.Value(1)).current;
  const prevStepRef = useRef(currentStep);

  useEffect(() => {
    if (prevStepRef.current === currentStep) return;
    const direction = currentStep > prevStepRef.current ? 1 : -1;
    prevStepRef.current = currentStep;

    stepSlideAnim.setValue(direction * 40);
    stepOpacityAnim.setValue(0);

    Animated.parallel([
      Animated.timing(stepSlideAnim, {
        toValue: 0,
        duration: 300,
        easing: IOS_PUSH_EASING,
        useNativeDriver: true,
      }),
      Animated.timing(stepOpacityAnim, {
        toValue: 1,
        duration: 260,
        easing: IOS_PUSH_EASING,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentStep, IOS_PUSH_EASING]);

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
  const KG_ITEMS = useMemo(() => Array.from({ length: 171 }, (_, i) => 30 + i), []); // 30 to 200 kg
  const LBS_ITEMS = useMemo(() => Array.from({ length: 385 }, (_, i) => 66 + i), []); // 66 to 450 lbs

  const handleToggleWeightUnit = (unit: 'kg' | 'lbs') => {
    if (unit === weightUnit) return;
    triggerHaptic();
    setWeightUnit(unit);
  };

  const handleWeightChange = (_index: number, val: string | number) => {
    const num = typeof val === 'number' ? val : parseInt(String(val), 10);
    if (weightUnit === 'kg') {
      setWeightKg(num);
    } else {
      setWeightKg(Math.round(num / 2.20462));
    }
  };

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
      {/* Standard iOS Navigation Header & Continuous Slim Animated Progress Bar */}
      <View style={styles.header}>
        <View style={styles.navBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.6}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ChevronLeft size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              { width: progressWidth },
            ]}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          style={[
            styles.stepWrapper,
            {
              opacity: stepOpacityAnim,
              transform: [{ translateX: stepSlideAnim }],
            },
          ]}
        >
          {/* STEP 1: GENDER */}
          {currentStep === 1 && (
            <View style={styles.stepSection}>
              <StepTitleGroup
                title="What is your gender?"
                stepKey={currentStep}
              />

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
                ].map((opt, idx) => (
                  <AppleSelectionCard
                    key={opt.id}
                    index={idx}
                    stepKey={currentStep}
                    isSelected={gender === opt.id}
                    title={opt.title}
                    subtitle={opt.subtitle}
                    icon={opt.icon}
                    onPress={() => {
                      triggerHaptic();
                      setGender(opt.id);
                    }}
                  />
                ))}
              </View>
            </View>
          )}

        {/* STEP 2: BIRTHDATE - APPLE 3-COLUMN SCROLL WHEEL */}
        {currentStep === 2 && (
          <View style={styles.stepSection}>
            <StepTitleGroup
              title={"Select your\ndate of birth"}
              stepKey={currentStep}
            />

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
            <StepTitleGroup
              title="What is your weight?"
              stepKey={currentStep}
            />

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

            {/* 3D Option Wheel Weight Selector */}
            <View style={styles.optionWheelCardContainer}>
              <OptionWheel
                items={weightUnit === 'kg' ? KG_ITEMS : LBS_ITEMS}
                selectedIndex={
                  weightUnit === 'kg'
                    ? Math.max(0, Math.min(KG_ITEMS.length - 1, weightKg - 30))
                    : Math.max(0, Math.min(LBS_ITEMS.length - 1, Math.round(weightKg * 2.20462) - 66))
                }
                onChange={handleWeightChange}
                unit={weightUnit}
                side="center"
                fontSize={46}
                rowHeight={58}
                curve={1.2}
                tilt={7.5}
                containerHeight={280}
              />
            </View>
          </View>
        )}

        {/* STEP 4: HEIGHT */}
        {currentStep === 4 && (
          <View style={styles.stepSection}>
            <StepTitleGroup
              title="What is your height?"
              stepKey={currentStep}
            />

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

                  {/* Horizontal Indicator Needle */}
                  <Line
                    x1={RULER_BASELINE_X - 32}
                    y1={HEIGHT_CENTER_Y}
                    x2={RULER_BASELINE_X}
                    y2={HEIGHT_CENTER_Y}
                    stroke="#007AFF"
                    strokeWidth={2.8}
                    strokeLinecap="round"
                  />

                  {/* Pointer Arrow (▶) pointing at the ruler tick */}
                  <Polygon
                    points={`${RULER_BASELINE_X - 8},${HEIGHT_CENTER_Y - 5} ${RULER_BASELINE_X + 2},${HEIGHT_CENTER_Y} ${RULER_BASELINE_X - 8},${HEIGHT_CENTER_Y + 5}`}
                    fill="#007AFF"
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
            <StepTitleGroup
              title="What is your primary goal?"
              subtitle="We will personalize your daily nutrition and training volume to match your physique objective."
              stepKey={currentStep}
            />

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
              ].map((opt, idx) => (
                <AppleSelectionCard
                  key={opt.id}
                  index={idx}
                  stepKey={currentStep}
                  isSelected={goal === opt.id}
                  title={opt.title}
                  tag={opt.tag}
                  subtitle={opt.subtitle}
                  icon={opt.icon}
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
                />
              ))}
            </View>
          </View>
        )}

        {/* STEP 6: CONDITIONAL CALORIE ADJUSTMENT */}
        {currentStep === 6 && (goal === 'bulk' || goal === 'cut') && (
          <View style={styles.stepSection}>
            <StepTitleGroup
              title={goal === 'bulk' ? 'Select your calorie surplus' : 'Select your calorie deficit'}
              subtitle={
                goal === 'bulk'
                  ? 'Choose how many extra calories to add above your daily maintenance level.'
                  : 'Choose how many calories to subtract below your daily maintenance level.'
              }
              stepKey={currentStep}
            />

            <View style={styles.optionsList}>
              {(goal === 'bulk'
                ? [
                    {
                      value: 300,
                      title: '+300 Calories',
                      tag: 'Lean Bulk',
                      subtitle: 'Gradual, steady lean muscle gain with minimal fat retention.',
                      icon: Flame,
                    },
                    {
                      value: 500,
                      title: '+500 Calories',
                      tag: 'Aggressive Bulk',
                      subtitle: 'Accelerated mass building and higher lifting strength progression.',
                      icon: Zap,
                    },
                  ]
                : [
                    {
                      value: -300,
                      title: '-300 Calories',
                      tag: 'Moderate Cut',
                      subtitle: 'Sustainable, steady fat loss while preserving maximum lean muscle mass.',
                      icon: Flame,
                    },
                    {
                      value: -500,
                      title: '-500 Calories',
                      tag: 'Aggressive Cut',
                      subtitle: 'Faster fat shredding and definition for accelerated transformation.',
                      icon: Zap,
                    },
                  ]
              ).map((opt, idx) => (
                <AppleSelectionCard
                  key={opt.value}
                  index={idx}
                  stepKey={currentStep}
                  isSelected={calorieAdjustment === opt.value}
                  title={opt.title}
                  tag={opt.tag}
                  subtitle={opt.subtitle}
                  icon={opt.icon}
                  onPress={() => {
                    triggerHaptic();
                    setCalorieAdjustment(opt.value);
                  }}
                />
              ))}
            </View>
          </View>
        )}
        </Animated.View>
      </ScrollView>

      {/* Bottom CTA Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryButton, isSaving && styles.primaryButtonDisabled]}
          onPress={handleNext}
          disabled={isSaving}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={
            (currentStep === 5 && goal === 'maintain') || currentStep === 6
              ? 'Complete Profile Setup'
              : 'Continue to next step'
          }
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {(currentStep === 5 && goal === 'maintain') || currentStep === 6
                ? 'Complete Profile Setup'
                : 'Continue'}
            </Text>
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
    paddingTop: 4,
    paddingBottom: 8,
  },
  navBar: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginLeft: -4,
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 1.5,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 1.5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  stepWrapper: {
    flex: 1,
  },
  stepSection: {
    flex: 1,
  },
  centeredTitleGroup: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 28,
  },
  centeredStepTitle: {
    fontFamily: APPLE_FONT_FAMILY,
    fontSize: 30,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.6,
    lineHeight: 38,
  },
  stepSubtitleText: {
    fontFamily: APPLE_FONT_FAMILY,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  optionsList: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(28, 28, 30, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    ...(Platform.OS === 'web'
      ? {
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        } as any
      : {}),
  },
  optionCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: 'rgba(0, 122, 255, 0.12)',
  },
  optionIconBox: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionContent: {
    flex: 1,
  },
  optionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  optionTitle: {
    fontFamily: APPLE_FONT_FAMILY,
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  optionTitleSelected: {
    color: '#FFFFFF',
  },
  optionSubtitle: {
    fontFamily: APPLE_FONT_FAMILY,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 18,
  },
  tagBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagBadgeSelected: {
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
  },
  tagBadgeText: {
    fontFamily: APPLE_FONT_FAMILY,
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  tagBadgeTextSelected: {
    color: '#007AFF',
  },
  checkCircleWrapper: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  unselectedRing: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
    fontFamily: APPLE_FONT_FAMILY,
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
    backgroundColor: 'rgba(28, 28, 30, 0.8)',
    borderRadius: 10,
    padding: 3,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  unitToggleTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  unitToggleTabActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  unitToggleText: {
    fontFamily: APPLE_FONT_FAMILY,
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  unitToggleTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  optionWheelCardContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 8,
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
    fontFamily: APPLE_FONT_FAMILY,
    fontSize: 52,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  heightHeroUnit: {
    fontFamily: APPLE_FONT_FAMILY,
    fontSize: 20,
    fontWeight: '700',
    color: '#007AFF',
  },
  heightHeroSecondary: {
    fontFamily: APPLE_FONT_FAMILY,
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
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
    backgroundColor: 'rgba(28, 28, 30, 0.8)',
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
    fontFamily: APPLE_FONT_FAMILY,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  summaryValue: {
    fontFamily: APPLE_FONT_FAMILY,
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 20 : 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#0A0A0A',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontFamily: APPLE_FONT_FAMILY,
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
});
