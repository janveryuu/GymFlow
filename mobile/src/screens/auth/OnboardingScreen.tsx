import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Zap,
  Sparkles,
  Bot,
  CheckCircle2,
  Calendar,
  Dumbbell,
  Target,
  Flame,
  Activity,
  Check,
  User,
  Shield,
} from '../../components/icons';
import * as Haptics from 'expo-haptics';
import { colors, typography, borderRadius, spacing } from '../../theme';
import { FloatingLabelInput } from '../../components/FloatingLabelInput';
import { useCustomWorkoutsStore, CustomRoutineWorkout, CustomExerciseItem } from '../../store/customWorkoutsStore';
import { useAuthStore } from '../../store/authStore';
import { useDevMockStore } from '../../store/devMockStore';
import { ThoughtLine } from '../../components/ThoughtLine';

interface OnboardingScreenProps {
  route?: {
    params?: {
      autofill?: boolean;
    };
  };
  navigation: any;
}

const APPLE_FONT_FAMILY = Platform.OS === 'web'
  ? '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif'
  : Platform.OS === 'ios'
  ? 'System'
  : 'Roboto';

/**
 * Animated Step Title Group matching ProfileSetupScreen UI/UX (+20px to 0px fade)
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
  subtitle?: string;
  desc?: string;
  tag?: string;
  hasError?: boolean;
  index: number;
  stepKey: number;
}

const AppleSelectionCard: React.FC<AppleSelectionCardProps> = ({
  isSelected,
  onPress,
  icon: IconComponent,
  title,
  desc,
  hasError,
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
        style={[
          styles.optionCard,
          isSelected && styles.optionCardSelected,
          hasError && styles.optionCardError,
        ]}
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
          <Text style={[styles.optionTitle, isSelected && styles.optionTitleSelected]}>
            {title}
          </Text>
          {desc ? <Text style={styles.optionDesc}>{desc}</Text> : null}
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

// -------------------------------------------------------------
// QUESTION DATA DEFINITIONS
// -------------------------------------------------------------
const BODY_TYPE_OPTIONS = [
  {
    id: 'thin',
    title: 'Thin',
    desc: 'Naturally lean with a fast metabolism. Focuses on progressive overload, hypertrophy, and building clean athletic muscle.',
    icon: Activity,
  },
  {
    id: 'regular',
    title: 'Regular',
    desc: 'Evenly proportioned with standard metabolism. Thrives on balanced resistance training to build strength and sculpt definition.',
    icon: User,
  },
  {
    id: 'rounded',
    title: 'Rounded',
    desc: 'Naturally holds weight around midsection or hips. Thrives on high-density circuits to torch body fat and sculpt tone.',
    icon: Flame,
  },
  {
    id: 'plus_size',
    title: 'Plus Size',
    desc: 'Broad, sturdy build with natural lifting leverage. Focuses on joint-friendly compound lifting, stamina, and progressive recomposition.',
    icon: Shield,
  },
];

const FITNESS_LEVEL_OPTIONS = [
  {
    id: 'beginner',
    title: 'Beginner',
    desc: 'Building a consistent routine, mastering lifting mechanics, and priming neurological adaptations.',
    icon: Shield,
  },
  {
    id: 'intermediate',
    title: 'Intermediate',
    desc: 'Comfortable with compound barbell & dumbbell lifts. Consistently applying progressive overload.',
    icon: Activity,
  },
  {
    id: 'advanced',
    title: 'Advanced',
    desc: 'Experienced lifter with high volume tolerance, RPE auto-regulation, and specialized split goals.',
    icon: Zap,
  },
];

const DAYS_PER_WEEK_OPTIONS = [
  {
    id: '2-3',
    title: '2 – 3 Days / week',
    desc: 'Ideal for building consistency with plenty of recovery days between workouts.',
    icon: Calendar,
  },
  {
    id: '4',
    title: '4 Days / week',
    desc: 'The sweet spot for building strength and muscle with balanced rest.',
    icon: Activity,
  },
  {
    id: '5',
    title: '5 Days / week',
    desc: 'High-frequency routine for dedicated athletes targeting maximum progress.',
    icon: Flame,
  },
  {
    id: '6',
    title: '6 Days / week',
    desc: 'Maximum weekly training volume and conditioning for advanced lifters.',
    icon: Zap,
  },
];

const TRAINING_TYPE_OPTIONS = [
  {
    id: 'hypertrophy',
    title: 'Strength & Hypertrophy',
    desc: 'Heavy compound lifts paired with targeted isolation sets (8–15 reps) for optimal hypertrophy.',
    icon: Dumbbell,
  },
  {
    id: 'powerlifting',
    title: 'Powerlifting & Heavy Compounds',
    desc: 'Focus on squat, bench press, deadlift, and explosive neurological force production.',
    icon: Zap,
  },
  {
    id: 'hiit',
    title: 'HIIT & Functional Conditioning',
    desc: 'High-density circuits, explosive athletic movements, and metabolic fat burning.',
    icon: Flame,
  },
  {
    id: 'calisthenics',
    title: 'Calisthenics & Bodyweight',
    desc: 'Gymnastic movements, pull-up progressions, core compression, and functional joint health.',
    icon: Activity,
  },
];

const FITNESS_GOAL_OPTIONS = [
  {
    id: 'build_muscle',
    title: 'Build Muscle & Strength',
    desc: 'Increase lean muscle tissue, break lifting plateaus, and sculpt athletic muscularity.',
    icon: Dumbbell,
  },
  {
    id: 'lose_fat',
    title: 'Lose Body Fat & Get Toned',
    desc: 'Burn calories through metabolic training while preserving lean muscle definition.',
    icon: Flame,
  },
  {
    id: 'athletic',
    title: 'Increase Athletic Performance',
    desc: 'Build explosive power, movement capacity, and resilience for sports and life.',
    icon: Zap,
  },
  {
    id: 'health',
    title: 'Health & Longevity',
    desc: 'Sustainable functional fitness to boost daily energy, posture, and cardiovascular health.',
    icon: Activity,
  },
];

const GENERATE_WORKOUT_OPTIONS = [
  {
    id: 'yes',
    title: 'Generate me a personalized workout',
    desc: 'Our AI engine will calibrate your exercises, sets, reps, and weekly volume tailored to your body type, goals, and training frequency.',
    icon: Sparkles,
  },
  {
    id: 'no',
    title: 'No (for experienced lifters)',
    desc: 'I already have my own workout split and know what I want to train. Take me straight to the app without generating an AI routine.',
    icon: Activity,
  },
];

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ route, navigation }) => {
  const isAutofill = Boolean(route?.params?.autofill);

  // 1 to 7: Question steps
  // 8: Agentic Loading Screen
  // 9: "Your Plan is Ready" Blurred Screen
  const [currentStep, setCurrentStep] = useState(1);
  const totalQuestionSteps = 7;

  // Step 1: Names
  const [firstName, setFirstName] = useState(isAutofill ? 'Jane' : '');
  const [lastName, setLastName] = useState(isAutofill ? 'Doe' : '');
  const [firstNameError, setFirstNameError] = useState(false);
  const [lastNameError, setLastNameError] = useState(false);

  // Step 2: Body Type
  const [bodyType, setBodyType] = useState<string>(isAutofill ? 'regular' : '');
  const [bodyTypeError, setBodyTypeError] = useState(false);

  // Step 3: Fitness Level
  const [fitnessLevel, setFitnessLevel] = useState<string>(isAutofill ? 'intermediate' : '');
  const [fitnessLevelError, setFitnessLevelError] = useState(false);

  // Step 4: Days Per Week
  const [daysPerWeek, setDaysPerWeek] = useState<string>(isAutofill ? '4' : '');
  const [daysPerWeekError, setDaysPerWeekError] = useState(false);

  // Step 5: Training Preference
  const [trainingType, setTrainingType] = useState<string>(isAutofill ? 'hypertrophy' : '');
  const [trainingTypeError, setTrainingTypeError] = useState(false);

  // Step 6: Fitness Goal
  const [fitnessGoal, setFitnessGoal] = useState<string>(isAutofill ? 'build_muscle' : '');
  const [fitnessGoalError, setFitnessGoalError] = useState(false);

  // Step 7: Personalized Workout Preference ('yes' | 'no')
  const [generateWorkoutPreference, setGenerateWorkoutPreference] = useState<string>(isAutofill ? 'yes' : '');
  const [generateWorkoutPreferenceError, setGenerateWorkoutPreferenceError] = useState(false);

  // General error state & shake
  const [shakeTrigger, setShakeTrigger] = useState(0);
  const [globalError, setGlobalError] = useState('');

  // Agentic Loading step index (0 to 5)
  const [agentStepIndex, setAgentStepIndex] = useState(0);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const dotAnim1 = useRef(new Animated.Value(1)).current;
  const dotAnim2 = useRef(new Animated.Value(0.3)).current;
  const dotAnim3 = useRef(new Animated.Value(0.3)).current;
  const cardScaleAnims = useRef<Record<string, Animated.Value>>({}).current;
  const scrollViewRef = useRef<ScrollView>(null);

  // Progress bar animation matching ProfileSetupScreen
  const progressAnim = useRef(new Animated.Value(1 / totalQuestionSteps)).current;
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: currentStep / totalQuestionSteps,
      duration: 300,
      easing: Easing.bezier(0.32, 0.72, 0, 1),
      useNativeDriver: false,
    }).start();
  }, [currentStep, totalQuestionSteps]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // Automatically scroll to top on step transitions so titles never get scrolled out of view
  useEffect(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  }, [currentStep]);

  // Agentic Loading spinner, dots & step sequencing
  useEffect(() => {
    if (currentStep === 8) {
      // Continuous rotating spinner for active step
      const spinLoop = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.linear,
          useNativeDriver: Platform.OS !== 'web',
        })
      );
      spinLoop.start();

      // Sequential dots pulsing
      let isMounted = true;
      const animateDots = () => {
        if (!isMounted) return;
        Animated.sequence([
          Animated.parallel([
            Animated.timing(dotAnim1, { toValue: 1, duration: 250, useNativeDriver: Platform.OS !== 'web' }),
            Animated.timing(dotAnim2, { toValue: 0.3, duration: 250, useNativeDriver: Platform.OS !== 'web' }),
            Animated.timing(dotAnim3, { toValue: 0.3, duration: 250, useNativeDriver: Platform.OS !== 'web' }),
          ]),
          Animated.parallel([
            Animated.timing(dotAnim1, { toValue: 0.3, duration: 250, useNativeDriver: Platform.OS !== 'web' }),
            Animated.timing(dotAnim2, { toValue: 1, duration: 250, useNativeDriver: Platform.OS !== 'web' }),
            Animated.timing(dotAnim3, { toValue: 0.3, duration: 250, useNativeDriver: Platform.OS !== 'web' }),
          ]),
          Animated.parallel([
            Animated.timing(dotAnim1, { toValue: 0.3, duration: 250, useNativeDriver: Platform.OS !== 'web' }),
            Animated.timing(dotAnim2, { toValue: 0.3, duration: 250, useNativeDriver: Platform.OS !== 'web' }),
            Animated.timing(dotAnim3, { toValue: 1, duration: 250, useNativeDriver: Platform.OS !== 'web' }),
          ]),
        ]).start(() => {
          if (isMounted && currentStep === 8) {
            animateDots();
          }
        });
      };
      animateDots();

      // Step reasoning timeline (5 milestones)
      setAgentStepIndex(0);
      const timers: (ReturnType<typeof setTimeout>)[] = [];
      timers.push(setTimeout(() => setAgentStepIndex(1), 750));
      timers.push(setTimeout(() => setAgentStepIndex(2), 1500));
      timers.push(setTimeout(() => setAgentStepIndex(3), 2250));
      timers.push(setTimeout(() => setAgentStepIndex(4), 3000));
      timers.push(setTimeout(() => setAgentStepIndex(5), 3750));
      timers.push(
        setTimeout(() => {
          isMounted = false;
          spinLoop.stop();
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {
            // Ignore
          }
          // Proceed directly to homescreen with generated workout!
          proceedToHomeScreenWithGeneratedPlan();
        }, 4400)
      );

      return () => {
        isMounted = false;
        spinLoop.stop();
        timers.forEach(clearTimeout);
      };
    }
  }, [currentStep, spinAnim, dotAnim1, dotAnim2, dotAnim3]);

  const spinInterpolation = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const autofillFields = () => {
    setFirstName('Jane');
    setLastName('Doe');
    setBodyType('regular');
    setFitnessLevel('intermediate');
    setDaysPerWeek('4');
    setTrainingType('hypertrophy');
    setFitnessGoal('build_muscle');
    setGenerateWorkoutPreference('yes');
    setFirstNameError(false);
    setLastNameError(false);
    setBodyTypeError(false);
    setFitnessLevelError(false);
    setDaysPerWeekError(false);
    setTrainingTypeError(false);
    setFitnessGoalError(false);
    setGenerateWorkoutPreferenceError(false);
    setGlobalError('');
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    if (route?.params?.autofill) {
      autofillFields();
    }
  }, [route?.params?.autofill]);

  // Smooth slide & fade transition between steps
  const transitionToStep = (nextStep: number, direction: 'forward' | 'backward') => {
    setFirstNameError(false);
    setLastNameError(false);
    setBodyTypeError(false);
    setFitnessLevelError(false);
    setDaysPerWeekError(false);
    setTrainingTypeError(false);
    setFitnessGoalError(false);
    setGenerateWorkoutPreferenceError(false);
    setGlobalError('');

    const exitOffset = direction === 'forward' ? -35 : 35;
    const enterOffset = direction === 'forward' ? 35 : -35;

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 140,
        easing: Easing.bezier(0.32, 0.72, 0, 1),
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(slideAnim, {
        toValue: exitOffset,
        duration: 140,
        easing: Easing.bezier(0.32, 0.72, 0, 1),
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => {
      setCurrentStep(nextStep);
      slideAnim.setValue(enterOffset);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 240,
          easing: Easing.bezier(0.32, 0.72, 0, 1),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 240,
          easing: Easing.bezier(0.32, 0.72, 0, 1),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    });
  };

  const handleNext = () => {
    // Step 1: Names
    if (currentStep === 1) {
      const isFirstEmpty = !firstName.trim();
      const isLastEmpty = !lastName.trim();
      if (isFirstEmpty || isLastEmpty) {
        setFirstNameError(isFirstEmpty);
        setLastNameError(isLastEmpty);
        setShakeTrigger((p) => p + 1);
        setGlobalError('Please enter both your first and last name to continue.');
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } catch {
          // Ignore
        }
        return;
      }
      transitionToStep(2, 'forward');
      return;
    }

    // Step 2: Body Type
    if (currentStep === 2) {
      if (!bodyType) {
        setBodyTypeError(true);
        setShakeTrigger((p) => p + 1);
        setGlobalError('Please select your body type to calibrate metabolic benchmarks.');
        return;
      }
      transitionToStep(3, 'forward');
      return;
    }

    // Step 3: Fitness Level
    if (currentStep === 3) {
      if (!fitnessLevel) {
        setFitnessLevelError(true);
        setShakeTrigger((p) => p + 1);
        setGlobalError('Please choose your fitness level.');
        return;
      }
      transitionToStep(4, 'forward');
      return;
    }

    // Step 4: Days Per Week
    if (currentStep === 4) {
      if (!daysPerWeek) {
        setDaysPerWeekError(true);
        setShakeTrigger((p) => p + 1);
        setGlobalError('Please choose how many days you plan to train per week.');
        return;
      }
      transitionToStep(5, 'forward');
      return;
    }

    // Step 5: Training Preference
    if (currentStep === 5) {
      if (!trainingType) {
        setTrainingTypeError(true);
        setShakeTrigger((p) => p + 1);
        setGlobalError('Please select your preferred style of training.');
        return;
      }
      transitionToStep(6, 'forward');
      return;
    }

    // Step 6: Main Fitness Goal -> Proceed to Step 7 (Personalized Workout Question)
    if (currentStep === 6) {
      if (!fitnessGoal) {
        setFitnessGoalError(true);
        setShakeTrigger((p) => p + 1);
        setGlobalError('Please select your primary fitness goal.');
        return;
      }
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        // Ignore
      }
      transitionToStep(7, 'forward');
      return;
    }

    // Step 7: Personalized Workout Preference
    if (currentStep === 7) {
      if (!generateWorkoutPreference) {
        setGenerateWorkoutPreferenceError(true);
        setShakeTrigger((p) => p + 1);
        setGlobalError('Please choose whether you want GymFlow to generate a personalized workout.');
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } catch {
          // Ignore
        }
        return;
      }

      if (generateWorkoutPreference === 'yes') {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } catch {
          // Ignore
        }
        transitionToStep(8, 'forward');
      } else {
        // 'no' (for experienced lifters) - proceed directly to login/signup without generated plan
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch {
          // Ignore
        }
        handleSkipPlan();
      }
      return;
    }
  };

  const handleBack = () => {
    if (currentStep > 1 && currentStep <= 7) {
      transitionToStep(currentStep - 1, 'backward');
    } else if (currentStep === 1) {
      navigation.navigate('Welcome');
    }
  };

  const handleSkipPlan = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Ignore
    }

    useDevMockStore.getState().setMockEnabled(true);
    const memberUser = {
      id: 1,
      name: `${firstName.trim() || 'Jane'} ${lastName.trim() || 'Doe'}`,
      email: `${(firstName.trim() || 'jane').toLowerCase()}@gymflow.test`,
      role: 'member' as const,
      must_change_password: false,
      fitness_goal: fitnessGoal || 'build_muscle',
    };
    await useAuthStore.getState().setAuth('dev-offline-token-gymflow', memberUser, false);
  };

  const handleOptionSelect = (setter: (val: string) => void, val: string, errorClearer: (err: boolean) => void) => {
    setter(val);
    errorClearer(false);
    setGlobalError('');
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Ignore
    }
  };

  // Build the generated workout plan metadata
  const getGeneratedPlanDetails = () => {
    const freqLabel = daysPerWeek === '2-3' ? '3 Days/Wk' : `${daysPerWeek} Days/Wk`;
    const diffLabel = fitnessLevel ? fitnessLevel.charAt(0).toUpperCase() + fitnessLevel.slice(1) : 'Intermediate';

    let splitName = 'Custom Hypertrophy & Athletic Split';
    if (daysPerWeek === '4') {
      splitName = '4-Day Upper / Lower Hypertrophy Split';
    } else if (daysPerWeek === '5' || daysPerWeek === '6') {
      splitName = 'Push / Pull / Legs Hypertrophy Split';
    } else if (daysPerWeek === '2-3') {
      splitName = 'Full Body Strength & Density Split';
    }

    const bodyTypeLabels: Record<string, string> = {
      thin: 'Thin',
      regular: 'Regular',
      rounded: 'Rounded',
      plus_size: 'Plus Size',
    };

    const calories = bodyType === 'thin' ? 480 : bodyType === 'plus_size' ? 520 : bodyType === 'rounded' ? 460 : 440;

    return {
      splitName,
      daysPerWeek: freqLabel,
      difficulty: diffLabel,
      goal: fitnessGoal === 'build_muscle' ? 'Muscle Building' : fitnessGoal === 'lose_fat' ? 'Fat Loss & Tone' : 'Athletic Performance',
      calories,
      bodyTypeLabel: bodyTypeLabels[bodyType] || 'Regular',
    };
  };

  const planDetails = getGeneratedPlanDetails();

  const createCustomRoutineFromPlan = (): CustomRoutineWorkout => {
    const workoutId = `plan-${Date.now()}`;
    const exercises: CustomExerciseItem[] = [
      {
        id: `ex-${workoutId}-1`,
        title: trainingType === 'calisthenics' ? 'Weighted Pull-Ups' : 'Barbell Back Squats',
        slug: 'barbell-squat',
        category: trainingType === 'calisthenics' ? 'Back' : 'Legs',
        equipment: trainingType === 'calisthenics' ? 'Pull-Up Bar' : 'Barbell & Squat Rack',
        difficulty: planDetails.difficulty,
        preferredSets: 4,
        preferredReps: '8 - 10 reps',
        restTimeSeconds: 90,
        tips: 'Brace your abdominal wall and control the eccentric tempo.',
        duration_minutes: 15,
        calories: 120,
      },
      {
        id: `ex-${workoutId}-2`,
        title: trainingType === 'powerlifting' ? 'Competition Bench Press' : 'Flat Barbell Bench Press',
        slug: 'bench-press',
        category: 'Chest',
        equipment: 'Barbell & Bench',
        difficulty: planDetails.difficulty,
        preferredSets: 4,
        preferredReps: '8 - 10 reps',
        restTimeSeconds: 90,
        tips: 'Retract shoulder blades and press with controlled tempo.',
        duration_minutes: 15,
        calories: 110,
      },
      {
        id: `ex-${workoutId}-3`,
        title: 'Barbell Bent-Over Row',
        slug: 'bent-over-row',
        category: 'Back',
        equipment: 'Barbell',
        difficulty: planDetails.difficulty,
        preferredSets: 3,
        preferredReps: '10 - 12 reps',
        restTimeSeconds: 60,
        tips: 'Hinge at the hips and pull towards the belly button.',
        duration_minutes: 12,
        calories: 95,
      },
      {
        id: `ex-${workoutId}-4`,
        title: 'Standing Overhead Press',
        slug: 'overhead-press',
        category: 'Shoulders',
        equipment: 'Barbell',
        difficulty: planDetails.difficulty,
        preferredSets: 3,
        preferredReps: '8 - 10 reps',
        restTimeSeconds: 75,
        tips: 'Squeeze glutes and press in a vertical path.',
        duration_minutes: 10,
        calories: 80,
      },
      {
        id: `ex-${workoutId}-5`,
        title: 'Romanian Deadlifts',
        slug: 'deadlift',
        category: 'Hamstrings',
        equipment: 'Barbell',
        difficulty: planDetails.difficulty,
        preferredSets: 3,
        preferredReps: '10 - 12 reps',
        restTimeSeconds: 60,
        tips: 'Hinge at hips with soft knees and stretch hamstrings.',
        duration_minutes: 10,
        calories: 85,
      },
    ];

    return {
      id: workoutId,
      title: planDetails.splitName,
      slug: `custom-plan-${Date.now()}`,
      category: 'Personalized AI Routine',
      difficulty: planDetails.difficulty,
      duration_minutes: 50,
      calories: planDetails.calories,
      equipment: 'Full Gym Setup',
      sets: exercises.reduce((sum, e) => sum + e.preferredSets, 0),
      reps: 10,
      sets_reps: `${exercises.length} Exercises`,
      image_url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800&auto=format&fit=crop',
      description: `Personalized ${planDetails.daysPerWeek} split synthesized for ${firstName.trim() || 'you'} targeting ${planDetails.goal}.`,
      completion_percentage: 0,
      is_favorite: false,
      source: 'local',
      primaryMuscle: 'Full Body',
      secondaryMuscles: ['Chest', 'Back', 'Legs', 'Shoulders'],
      exerciseType: 'strength',
      created_at: new Date().toISOString(),
      isCustomRoutine: true,
      routineExercises: exercises,
    };
  };

  const proceedToHomeScreenWithGeneratedPlan = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Ignore
    }

    const customWorkout = createCustomRoutineFromPlan();
    useCustomWorkoutsStore.getState().addCustomWorkout(customWorkout);
    useCustomWorkoutsStore.getState().setPendingGeneratedWorkout(customWorkout);
    useDevMockStore.getState().setMockEnabled(true);

    const memberUser = {
      id: 1,
      name: `${firstName.trim() || 'Jane'} ${lastName.trim() || 'Doe'}`,
      email: `${(firstName.trim() || 'jane').toLowerCase()}@gymflow.test`,
      role: 'member' as const,
      must_change_password: false,
      fitness_goal: fitnessGoal || 'build_muscle',
    };
    await useAuthStore.getState().setAuth('dev-offline-token-gymflow', memberUser, false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Standard iOS Navigation Header & Continuous Slim Animated Progress Bar */}
        {currentStep <= 7 && (
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
        )}

        {/* Dynamic Wizard Steps Container */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollContainer}
          contentContainerStyle={[
            styles.scrollContent,
            currentStep === 8 && styles.centerScrollContent,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.stepAnimatedWrapper,
              currentStep === 8 && { justifyContent: 'center' },
              {
                opacity: fadeAnim,
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            {/* ============================================================ */}
            {/* STEP 1: First Name / Last Name                               */}
            {/* ============================================================ */}
            {currentStep === 1 && (
              <View style={styles.stepContainer}>
                <StepTitleGroup
                  title="What's your name?"
                  subtitle="We'll use this to personalize your training dashboard and AI coach experience."
                  stepKey={currentStep}
                />

                <View style={styles.fieldsContainer}>
                  <FloatingLabelInput
                    label="First Name"
                    value={firstName}
                    onChangeText={(text) => {
                      setFirstName(text);
                      if (firstNameError) setFirstNameError(false);
                      if (globalError) setGlobalError('');
                    }}
                    hasError={firstNameError}
                    errorMessage="Please enter your first name"
                    shakeTrigger={shakeTrigger}
                    autoCapitalize="words"
                    autoFocus={true}
                  />

                  <FloatingLabelInput
                    label="Last Name"
                    value={lastName}
                    onChangeText={(text) => {
                      setLastName(text);
                      if (lastNameError) setLastNameError(false);
                      if (globalError) setGlobalError('');
                    }}
                    hasError={lastNameError}
                    errorMessage="Please enter your last name"
                    shakeTrigger={shakeTrigger}
                    autoCapitalize="words"
                  />
                </View>
              </View>
            )}

            {/* ============================================================ */}
            {/* STEP 2: Choose your body type                                */}
            {/* ============================================================ */}
            {currentStep === 2 && (
              <View style={styles.stepContainer}>
                <StepTitleGroup
                  title="Choose your body type"
                  subtitle="Calibrates your baseline metabolic rate and progressive overload parameters."
                  stepKey={currentStep}
                />

                <View style={styles.optionsStack}>
                  {BODY_TYPE_OPTIONS.map((item, idx) => (
                    <AppleSelectionCard
                      key={item.id}
                      index={idx}
                      stepKey={currentStep}
                      isSelected={bodyType === item.id}
                      onPress={() => handleOptionSelect(setBodyType, item.id, setBodyTypeError)}
                      icon={item.icon}
                      title={item.title}
                      desc={item.desc}
                      hasError={bodyTypeError && !bodyType}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* ============================================================ */}
            {/* STEP 3: Fitness Level                                        */}
            {/* ============================================================ */}
            {currentStep === 3 && (
              <View style={styles.stepContainer}>
                <StepTitleGroup
                  title="Describe your fitness level"
                  subtitle="Helps us tailor your routine's starting volume, exercise complexity, and recovery rates."
                  stepKey={currentStep}
                />

                <View style={styles.optionsStack}>
                  {FITNESS_LEVEL_OPTIONS.map((item, idx) => (
                    <AppleSelectionCard
                      key={item.id}
                      index={idx}
                      stepKey={currentStep}
                      isSelected={fitnessLevel === item.id}
                      onPress={() => handleOptionSelect(setFitnessLevel, item.id, setFitnessLevelError)}
                      icon={item.icon}
                      title={item.title}
                      desc={item.desc}
                      hasError={fitnessLevelError && !fitnessLevel}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* ============================================================ */}
            {/* STEP 4: How many days you train per week                    */}
            {/* ============================================================ */}
            {currentStep === 4 && (
              <View style={styles.stepContainer}>
                <StepTitleGroup
                  title="How many days per week?"
                  subtitle="Determines your training frequency and workout split distribution."
                  stepKey={currentStep}
                />

                <View style={styles.optionsStack}>
                  {DAYS_PER_WEEK_OPTIONS.map((item, idx) => (
                    <AppleSelectionCard
                      key={item.id}
                      index={idx}
                      stepKey={currentStep}
                      isSelected={daysPerWeek === item.id}
                      onPress={() => handleOptionSelect(setDaysPerWeek, item.id, setDaysPerWeekError)}
                      icon={item.icon}
                      title={item.title}
                      desc={item.desc}
                      hasError={daysPerWeekError && !daysPerWeek}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* ============================================================ */}
            {/* STEP 5: What type of training do you prefer?                */}
            {/* ============================================================ */}
            {currentStep === 5 && (
              <View style={styles.stepContainer}>
                <StepTitleGroup
                  title="Preferred training style"
                  subtitle="Select the primary stimulus and movement modality for your workouts."
                  stepKey={currentStep}
                />

                <View style={styles.optionsStack}>
                  {TRAINING_TYPE_OPTIONS.map((item, idx) => (
                    <AppleSelectionCard
                      key={item.id}
                      index={idx}
                      stepKey={currentStep}
                      isSelected={trainingType === item.id}
                      onPress={() => handleOptionSelect(setTrainingType, item.id, setTrainingTypeError)}
                      icon={item.icon}
                      title={item.title}
                      desc={item.desc}
                      hasError={trainingTypeError && !trainingType}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* ============================================================ */}
            {/* STEP 6: Main fitness goal                                   */}
            {/* ============================================================ */}
            {currentStep === 6 && (
              <View style={styles.stepContainer}>
                <StepTitleGroup
                  title="What is your main goal?"
                  subtitle="We'll tune progressive intensity and rep targets to hit your objective."
                  stepKey={currentStep}
                />

                <View style={styles.optionsStack}>
                  {FITNESS_GOAL_OPTIONS.map((item, idx) => (
                    <AppleSelectionCard
                      key={item.id}
                      index={idx}
                      stepKey={currentStep}
                      isSelected={fitnessGoal === item.id}
                      onPress={() => handleOptionSelect(setFitnessGoal, item.id, setFitnessGoalError)}
                      icon={item.icon}
                      title={item.title}
                      desc={item.desc}
                      hasError={fitnessGoalError && !fitnessGoal}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* ============================================================ */}
            {/* STEP 7: DO YOU WANT ME TO GENERATE A PERSONALIZED WORKOUT?  */}
            {/* ============================================================ */}
            {currentStep === 7 && (
              <View style={styles.stepContainer}>
                <StepTitleGroup
                  title="Generate personalized workout?"
                  subtitle="Choose whether GymFlow AI should build a custom training protocol for you or if you prefer self-guided routines."
                  stepKey={currentStep}
                />

                <View style={styles.optionsStack}>
                  {GENERATE_WORKOUT_OPTIONS.map((item, idx) => (
                    <AppleSelectionCard
                      key={item.id}
                      index={idx}
                      stepKey={currentStep}
                      isSelected={generateWorkoutPreference === item.id}
                      onPress={() => handleOptionSelect(setGenerateWorkoutPreference, item.id, setGenerateWorkoutPreferenceError)}
                      icon={item.icon}
                      title={item.title}
                      desc={item.desc}
                      hasError={generateWorkoutPreferenceError && !generateWorkoutPreference}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* ============================================================ */}
            {/* STEP 8: AGENTIC AI SYNTHESIS LOADING SCREEN                 */}
            {/* ============================================================ */}
            {currentStep === 8 && (
              <View style={styles.agenticContainer}>
                {/* Modern ThoughtLine Component */}
                <ThoughtLine
                  label="Thinking..."
                  doneLabel="Thought for"
                  working={agentStepIndex < 5}
                  currentStepIndex={agentStepIndex}
                  steps={[
                    'Analyzing training frequency',
                    `Calibrating ${(fitnessLevel || 'intermediate')} intensity`,
                    `Designing ${daysPerWeek === '2-3' ? '3-4' : daysPerWeek || '3-4'}-day workout split`,
                    'Selecting exercises & volume',
                    'Finalizing personalized protocol',
                  ]}
                  collapsible={true}
                  style={{ alignSelf: 'center', marginTop: 30 }}
                />
              </View>
            )}
          </Animated.View>
        </ScrollView>

        {/* Bottom CTA Button matching ProfileSetupScreen */}
        {currentStep <= 7 && (
          <View style={styles.footer}>
            {globalError ? (
              <View style={styles.globalErrorBanner}>
                <AlertCircle size={15} color="#FF3B30" style={{ marginRight: 6 }} />
                <Text style={styles.globalErrorText}>{globalError}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleNext}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={
                currentStep === 7
                  ? generateWorkoutPreference === 'no'
                    ? 'Continue to App'
                    : 'Generate My Plan'
                  : 'Continue'
              }
            >
              <Text style={styles.primaryButtonText}>
                {currentStep === 7
                  ? generateWorkoutPreference === 'no'
                    ? 'Continue to App'
                    : 'Generate My Plan'
                  : 'Continue'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  keyboardView: {
    flex: 1,
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
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  centerScrollContent: {
    justifyContent: 'center',
    paddingVertical: 32,
  },
  stepAnimatedWrapper: {
    flex: 1,
  },
  stepContainer: {
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
  fieldsContainer: {
    gap: 16,
    marginTop: 8,
  },
  optionsStack: {
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
      ? ({
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        } as any)
      : {}),
  },
  optionCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: 'rgba(0, 122, 255, 0.12)',
  },
  optionCardError: {
    borderColor: '#FF3B30',
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
  optionDesc: {
    fontFamily: APPLE_FONT_FAMILY,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.55)',
    lineHeight: 18,
    marginTop: 4,
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
  globalErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.35)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  globalErrorText: {
    color: '#FF3B30',
    fontSize: 13,
    fontFamily: APPLE_FONT_FAMILY,
    fontWeight: '500',
    flex: 1,
  },
  agenticContainer: {
    flex: 1,
    paddingTop: 50,
    paddingBottom: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
