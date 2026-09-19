import React, { useState, useRef, useEffect } from 'react';
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
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Zap,
  Sparkles,
  Bot,
  Lock,
  CheckCircle2,
  Calendar,
  Dumbbell,
  Target,
  Flame,
  Activity,
  Check,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, typography, borderRadius, spacing } from '../../theme';
import { FloatingLabelInput } from '../../components/FloatingLabelInput';

interface OnboardingScreenProps {
  route?: {
    params?: {
      autofill?: boolean;
    };
  };
  navigation: any;
}

// -------------------------------------------------------------
// QUESTION DATA DEFINITIONS
// -------------------------------------------------------------
const BODY_TYPE_OPTIONS = [
  {
    id: 'thin',
    title: 'Thin',
    subtitle: 'Slender Frame / Fast Metabolism',
    desc: 'Naturally lean with a fast metabolism. Focuses on progressive overload, hypertrophy, and building clean athletic muscle.',
  },
  {
    id: 'regular',
    title: 'Regular',
    subtitle: 'Balanced / Medium Athletic Build',
    desc: 'Evenly proportioned with standard metabolism. Thrives on balanced resistance training to build strength and sculpt definition.',
  },
  {
    id: 'rounded',
    title: 'Rounded',
    subtitle: 'Curvier / Soft Frame',
    desc: 'Naturally holds weight around midsection or hips. Thrives on high-density circuits to torch body fat and sculpt tone.',
  },
  {
    id: 'plus_size',
    title: 'Plus Size',
    subtitle: 'Heavier Frame / High Strength Base',
    desc: 'Broad, sturdy build with natural lifting leverage. Focuses on joint-friendly compound lifting, stamina, and progressive recomposition.',
  },
];

const FITNESS_LEVEL_OPTIONS = [
  {
    id: 'beginner',
    title: 'Beginner',
    subtitle: '0 – 6 months experience',
    desc: 'Building a consistent routine, mastering lifting mechanics, and priming neurological adaptations.',
  },
  {
    id: 'intermediate',
    title: 'Intermediate',
    subtitle: '6 months – 2 years',
    desc: 'Comfortable with compound barbell & dumbbell lifts. Consistently applying progressive overload.',
  },
  {
    id: 'advanced',
    title: 'Advanced',
    subtitle: '2+ years continuous training',
    desc: 'Experienced lifter with high volume tolerance, RPE auto-regulation, and specialized split goals.',
  },
];

const DAYS_PER_WEEK_OPTIONS = [
  {
    id: '2-3',
    title: '2 – 3 Days / week',
    desc: 'Ideal for building consistency with plenty of recovery days between workouts.',
  },
  {
    id: '4',
    title: '4 Days / week',
    desc: 'The sweet spot for building strength and muscle with balanced rest.',
  },
  {
    id: '5',
    title: '5 Days / week',
    desc: 'High-frequency routine for dedicated athletes targeting maximum progress.',
  },
  {
    id: '6',
    title: '6 Days / week',
    desc: 'Maximum weekly training volume and conditioning for advanced lifters.',
  },
];

const TRAINING_TYPE_OPTIONS = [
  {
    id: 'hypertrophy',
    title: 'Strength & Hypertrophy',
    subtitle: 'Muscle Building & Aesthetics',
    desc: 'Heavy compound lifts paired with targeted isolation sets (8–15 reps) for optimal hypertrophy.',
  },
  {
    id: 'powerlifting',
    title: 'Powerlifting & Heavy Compounds',
    subtitle: 'Max Strength & Big 3',
    desc: 'Focus on squat, bench press, deadlift, and explosive neurological force production.',
  },
  {
    id: 'hiit',
    title: 'HIIT & Functional Conditioning',
    subtitle: 'Athleticism & Stamina',
    desc: 'High-density circuits, explosive athletic movements, and metabolic fat burning.',
  },
  {
    id: 'calisthenics',
    title: 'Calisthenics & Bodyweight',
    subtitle: 'Relative Strength & Control',
    desc: 'Gymnastic movements, pull-up progressions, core compression, and functional joint health.',
  },
];

const FITNESS_GOAL_OPTIONS = [
  {
    id: 'build_muscle',
    title: 'Build Muscle & Strength',
    subtitle: 'Hypertrophy & Mass',
    desc: 'Increase lean muscle tissue, break lifting plateaus, and sculpt athletic muscularity.',
  },
  {
    id: 'lose_fat',
    title: 'Lose Body Fat & Get Toned',
    subtitle: 'Recomposition & Definition',
    desc: 'Burn calories through metabolic training while preserving lean muscle definition.',
  },
  {
    id: 'athletic',
    title: 'Increase Athletic Performance',
    subtitle: 'Speed, Power & Agility',
    desc: 'Build explosive power, movement capacity, and resilience for sports and life.',
  },
  {
    id: 'health',
    title: 'Health & Longevity',
    subtitle: 'Daily Energy & Vitality',
    desc: 'Sustainable functional fitness to boost daily energy, posture, and cardiovascular health.',
  },
];

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ route, navigation }) => {
  const isAutofill = Boolean(route?.params?.autofill);

  // 1 to 6: Question steps
  // 7: Agentic Loading Screen
  // 8: "Your Plan is Ready" Blurred Screen
  const [currentStep, setCurrentStep] = useState(1);
  const totalQuestionSteps = 6;

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

  // Automatically scroll to top on step transitions so titles never get scrolled out of view
  useEffect(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  }, [currentStep]);

  // Agentic Loading spinner, dots & step sequencing
  useEffect(() => {
    if (currentStep === 7) {
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
          if (isMounted && currentStep === 7) {
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
          // Transition smoothly into Step 8 ("Your Plan is Ready")
          transitionToStep(8, 'forward');
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
    setFirstNameError(false);
    setLastNameError(false);
    setBodyTypeError(false);
    setFitnessLevelError(false);
    setDaysPerWeekError(false);
    setTrainingTypeError(false);
    setFitnessGoalError(false);
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
    setGlobalError('');

    const exitOffset = direction === 'forward' ? -35 : 35;
    const enterOffset = direction === 'forward' ? 35 : -35;

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 130,
        easing: Easing.in(Easing.ease),
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(slideAnim, {
        toValue: exitOffset,
        duration: 130,
        easing: Easing.in(Easing.ease),
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => {
      setCurrentStep(nextStep);
      slideAnim.setValue(enterOffset);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.ease),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.ease),
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

    // Step 6: Main Fitness Goal -> Start Agentic Synthesis!
    if (currentStep === 6) {
      if (!fitnessGoal) {
        setFitnessGoalError(true);
        setShakeTrigger((p) => p + 1);
        setGlobalError('Please select your primary fitness goal.');
        return;
      }
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch {
        // Ignore
      }
      transitionToStep(7, 'forward');
      return;
    }
  };

  const handleBack = () => {
    if (currentStep > 1 && currentStep <= 6) {
      transitionToStep(currentStep - 1, 'backward');
    } else if (currentStep === 1) {
      navigation.navigate('Welcome');
    } else if (currentStep === 8) {
      transitionToStep(6, 'backward');
    }
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

  const handleUnlockPlan = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Ignore
    }

    const onboardingData = {
      firstName: firstName.trim() || 'Jane',
      lastName: lastName.trim() || 'Doe',
      fullName: `${firstName.trim() || 'Jane'} ${lastName.trim() || 'Doe'}`,
      bodyType,
      fitnessLevel,
      daysPerWeek,
      trainingType,
      fitnessGoal,
    };

    const generatedPlan = {
      title: planDetails.splitName,
      daysPerWeek: planDetails.daysPerWeek,
      difficulty: planDetails.difficulty,
      goal: planDetails.goal,
      calories: planDetails.calories,
    };

    navigation.navigate('Login', {
      onboardingData,
      generatedPlan,
      mode: 'signup',
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top Header with Back button, Step Progress Bars, and Counter */}
        {currentStep <= 6 && (
          <View style={styles.header}>
            <TouchableOpacity
              onPress={handleBack}
              style={styles.backButton}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <ArrowLeft size={20} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.progressTrackContainer}>
              {Array.from({ length: totalQuestionSteps }, (_, i) => i + 1).map((step) => (
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
              <Text style={styles.stepBadgeText}>STEP {currentStep} OF {totalQuestionSteps}</Text>
            </View>
          </View>
        )}

        {/* Dynamic Wizard Steps Container */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollContainer}
          contentContainerStyle={[
            styles.scrollContent,
            (currentStep === 7 || currentStep === 8) && styles.centerScrollContent,
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.stepAnimatedWrapper,
              (currentStep === 7 || currentStep === 8) && { justifyContent: 'center' },
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
                <View style={styles.headerBlock}>
                  <Text style={styles.title}>What&apos;s your name?</Text>
                </View>

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
                <View style={styles.headerBlock}>
                  <Text style={styles.title}>Choose your body type</Text>
                </View>

                <View style={styles.optionsStack}>
                  {BODY_TYPE_OPTIONS.map((item) => {
                    const isSelected = bodyType === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.selectableCard,
                          isSelected && styles.selectableCardActive,
                          bodyTypeError && !bodyType && styles.selectableCardError,
                        ]}
                        onPress={() => handleOptionSelect(setBodyType, item.id, setBodyTypeError)}
                        activeOpacity={0.8}
                      >
                        <View style={{ flex: 1, paddingRight: spacing.sm }}>
                          <Text style={[styles.optionTitleText, isSelected && styles.optionTitleTextActive]}>
                            {item.title}
                          </Text>
                          <Text style={styles.optionSubtitleText}>{item.subtitle}</Text>
                          <Text style={styles.optionDescText}>{item.desc}</Text>
                        </View>

                        <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                          {isSelected && <View style={styles.radioInner} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ============================================================ */}
            {/* STEP 3: Fitness Level                                        */}
            {/* ============================================================ */}
            {currentStep === 3 && (
              <View style={styles.stepContainer}>
                <View style={styles.headerBlock}>
                  <Text style={styles.title}>Describe your fitness level</Text>
                </View>

                <View style={styles.optionsStack}>
                  {FITNESS_LEVEL_OPTIONS.map((item) => {
                    const isSelected = fitnessLevel === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.selectableCard,
                          isSelected && styles.selectableCardActive,
                          fitnessLevelError && !fitnessLevel && styles.selectableCardError,
                        ]}
                        onPress={() => handleOptionSelect(setFitnessLevel, item.id, setFitnessLevelError)}
                        activeOpacity={0.8}
                      >
                        <View style={{ flex: 1, paddingRight: spacing.sm }}>
                          <Text style={[styles.optionTitleText, isSelected && styles.optionTitleTextActive]}>
                            {item.title}
                          </Text>
                          <Text style={styles.optionSubtitleText}>{item.subtitle}</Text>
                          <Text style={styles.optionDescText}>{item.desc}</Text>
                        </View>

                        <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                          {isSelected && <View style={styles.radioInner} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ============================================================ */}
            {/* STEP 4: How many days you train per week                    */}
            {/* ============================================================ */}
            {currentStep === 4 && (
              <View style={styles.stepContainer}>
                <View style={styles.headerBlock}>
                  <Text style={styles.title}>How many days per week?</Text>
                </View>

                <View style={styles.optionsStack}>
                  {DAYS_PER_WEEK_OPTIONS.map((item) => {
                    const isSelected = daysPerWeek === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.selectableCard,
                          isSelected && styles.selectableCardActive,
                          daysPerWeekError && !daysPerWeek && styles.selectableCardError,
                        ]}
                        onPress={() => handleOptionSelect(setDaysPerWeek, item.id, setDaysPerWeekError)}
                        activeOpacity={0.8}
                      >
                        <View style={{ flex: 1, paddingRight: spacing.sm }}>
                          <Text style={[styles.optionTitleText, isSelected && styles.optionTitleTextActive]}>
                            {item.title}
                          </Text>
                          <Text style={styles.optionDescText}>{item.desc}</Text>
                        </View>

                        <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                          {isSelected && <View style={styles.radioInner} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ============================================================ */}
            {/* STEP 5: What type of training do you prefer?                */}
            {/* ============================================================ */}
            {currentStep === 5 && (
              <View style={styles.stepContainer}>
                <View style={styles.headerBlock}>
                  <Text style={styles.title}>Preferred training style</Text>
                </View>

                <View style={styles.optionsStack}>
                  {TRAINING_TYPE_OPTIONS.map((item) => {
                    const isSelected = trainingType === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.selectableCard,
                          isSelected && styles.selectableCardActive,
                          trainingTypeError && !trainingType && styles.selectableCardError,
                        ]}
                        onPress={() => handleOptionSelect(setTrainingType, item.id, setTrainingTypeError)}
                        activeOpacity={0.8}
                      >
                        <View style={{ flex: 1, paddingRight: spacing.sm }}>
                          <Text style={[styles.optionTitleText, isSelected && styles.optionTitleTextActive]}>
                            {item.title}
                          </Text>
                          <Text style={styles.optionSubtitleText}>{item.subtitle}</Text>
                          <Text style={styles.optionDescText}>{item.desc}</Text>
                        </View>

                        <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                          {isSelected && <View style={styles.radioInner} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ============================================================ */}
            {/* STEP 6: Main fitness goal                                   */}
            {/* ============================================================ */}
            {currentStep === 6 && (
              <View style={styles.stepContainer}>
                <View style={styles.headerBlock}>
                  <Text style={styles.title}>What is your main goal?</Text>
                </View>

                <View style={styles.optionsStack}>
                  {FITNESS_GOAL_OPTIONS.map((item) => {
                    const isSelected = fitnessGoal === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.selectableCard,
                          isSelected && styles.selectableCardActive,
                          fitnessGoalError && !fitnessGoal && styles.selectableCardError,
                        ]}
                        onPress={() => handleOptionSelect(setFitnessGoal, item.id, setFitnessGoalError)}
                        activeOpacity={0.8}
                      >
                        <View style={{ flex: 1, paddingRight: spacing.sm }}>
                          <Text style={[styles.optionTitleText, isSelected && styles.optionTitleTextActive]}>
                            {item.title}
                          </Text>
                          <Text style={styles.optionSubtitleText}>{item.subtitle}</Text>
                          <Text style={styles.optionDescText}>{item.desc}</Text>
                        </View>

                        <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                          {isSelected && <View style={styles.radioInner} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ============================================================ */}
            {/* STEP 7: AGENTIC AI SYNTHESIS LOADING SCREEN                 */}
            {/* ============================================================ */}
            {currentStep === 7 && (
              <View style={styles.agenticContainer}>
                {/* Header Block */}
                <View style={styles.agenticHeaderBlock}>
                  <Text style={styles.agenticTitle}>Synthesizing AI Protocol</Text>
                  <Text style={styles.agenticSubtitle}>
                    GymFlow AI is designing your personalized{' '}
                    {daysPerWeek === '2-3' ? '3-4' : daysPerWeek || '3-4'}-day workout split.
                  </Text>
                  <View style={styles.agenticDotsRow}>
                    <Animated.View style={[styles.agenticDot, { opacity: dotAnim1 }]} />
                    <Animated.View style={[styles.agenticDot, { opacity: dotAnim2 }]} />
                    <Animated.View style={[styles.agenticDot, { opacity: dotAnim3 }]} />
                  </View>
                </View>

                {/* Vertical Connected Timeline */}
                <View style={styles.agenticTimelineContainer}>
                  {[
                    {
                      title: `Analyzing training frequency (${daysPerWeek === '2-3' ? '3-4' : daysPerWeek || '3-4'} days/wk)`,
                      desc: 'Determining optimal split type and recovery windows',
                    },
                    {
                      title: `Calibrating ${(fitnessLevel || 'intermediate').toUpperCase()} intensity`,
                      desc: 'Setting load, sets, reps, and rest period parameters',
                    },
                    {
                      title: 'Designing multi-day workout split',
                      desc: 'Distributing muscle groups across training days for balanced recovery',
                    },
                    {
                      title: 'Selecting exercises & programming volume',
                      desc: 'Pairing compound lifts with targeted accessories for each day',
                    },
                    {
                      title: 'Finalizing AI personalized protocol',
                      desc: 'Validating weekly volume, exercise order, and biomechanical balance',
                    },
                  ].map((step, idx, arr) => {
                    const isDone = agentStepIndex > idx;
                    const isCurrent = agentStepIndex === idx;
                    const isLast = idx === arr.length - 1;

                    return (
                      <View key={idx} style={styles.timelineItemRow}>
                        <View style={styles.timelineNodeCol}>
                          <View style={styles.timelineCircleWrapper}>
                            {isDone ? (
                              <View style={styles.timelineDoneCircle}>
                                <Check size={11} color="#FFFFFF" strokeWidth={3.5} />
                              </View>
                            ) : isCurrent ? (
                              <Animated.View
                                style={[
                                  styles.timelineSpinnerCircle,
                                  { transform: [{ rotate: spinInterpolation }] },
                                ]}
                              />
                            ) : (
                              <View style={styles.timelinePendingDot} />
                            )}
                          </View>

                          {!isLast && (
                            <View
                              style={[
                                styles.timelineConnectorLine,
                                isDone ? styles.timelineConnectorLineDone : styles.timelineConnectorLinePending,
                              ]}
                            />
                          )}
                        </View>

                        <View style={styles.timelineTextContent}>
                          <Text
                            style={[
                              styles.timelineStepTitle,
                              (isDone || isCurrent) ? styles.timelineStepTitleActive : styles.timelineStepTitlePending,
                            ]}
                          >
                            {step.title}
                          </Text>
                          <Text
                            style={[
                              styles.timelineStepSubtitle,
                              (isDone || isCurrent) ? styles.timelineStepSubtitleActive : styles.timelineStepSubtitlePending,
                            ]}
                          >
                            {step.desc}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ============================================================ */}
            {/* STEP 8: "YOUR PLAN IS READY" (BLURRED PREVIEW SCREEN)        */}
            {/* ============================================================ */}
            {currentStep === 8 && (
              <View style={styles.resultContainer}>
                {/* Success Header */}
                <View style={styles.readyHeader}>
                  <Text style={styles.readyTitle}>Your Plan is Ready</Text>
                  <Text style={styles.readySubtitle}>
                    Tailored specifically for {firstName || 'you'} based on your {planDetails.bodyTypeLabel} profile.
                  </Text>
                </View>

                {/* Plan Metadata Summary Card */}
                <View style={styles.planCard}>
                  <View style={styles.planCardHeader}>
                    <Text style={styles.planSplitTitle}>{planDetails.splitName}</Text>
                    <View style={styles.tagRow}>
                      <View style={styles.tagBadge}>
                        <Calendar size={11} color={colors.textSecondary} style={{ marginRight: 4 }} />
                        <Text style={styles.tagBadgeText}>{planDetails.daysPerWeek}</Text>
                      </View>
                      <View style={styles.tagBadge}>
                        <Target size={11} color={colors.textSecondary} style={{ marginRight: 4 }} />
                        <Text style={styles.tagBadgeText}>{planDetails.goal}</Text>
                      </View>
                      <View style={styles.tagBadge}>
                        <Flame size={11} color={colors.textSecondary} style={{ marginRight: 4 }} />
                        <Text style={styles.tagBadgeText}>~{planDetails.calories} kcal</Text>
                      </View>
                    </View>
                  </View>

                  {/* Workout Days Preview (Blurred Behind Lock) */}
                  <View style={styles.workoutListWrapper}>
                    {/* Simulated Routine Day Previews */}
                    <View style={styles.routineDayItem}>
                      <View style={styles.routineDayRow}>
                        <Text style={styles.routineDayLabel}>DAY 1 • PUSH HYPERTROPHY</Text>
                        <Text style={styles.routineDayDuration}>52 min</Text>
                      </View>
                      <Text style={styles.routineExerciseSnippet}>
                        Barbell Bench Press (4x8) • Incline DB Press (4x10) • Overhead Press (3x10) • Cable Flyes • Triceps Pushdown
                      </Text>
                    </View>

                    <View style={styles.routineDayItem}>
                      <View style={styles.routineDayRow}>
                        <Text style={styles.routineDayLabel}>DAY 2 • PULL & CORE</Text>
                        <Text style={styles.routineDayDuration}>48 min</Text>
                      </View>
                      <Text style={styles.routineExerciseSnippet}>
                        Barbell Deadlift (4x6) • Lat Pulldowns (4x10) • Chest-Supported Row (3x12) • Hammer Curls • Facepulls
                      </Text>
                    </View>

                    <View style={styles.routineDayItem}>
                      <View style={styles.routineDayRow}>
                        <Text style={styles.routineDayLabel}>DAY 3 • LEGS & CALVES</Text>
                        <Text style={styles.routineDayDuration}>55 min</Text>
                      </View>
                      <Text style={styles.routineExerciseSnippet}>
                        Barbell Back Squat (4x8) • Romanian Deadlift (3x10) • Leg Press • Walking Lunges • Standing Calf Raises
                      </Text>
                    </View>

                    {/* ===================================================== */}
                    {/* FROSTED GLASS BLUR LOCK OVERLAY                       */}
                    {/* ===================================================== */}
                    <View style={styles.blurLockOverlay}>
                      <Text style={styles.lockTitle}>
                        Sign in to Unlock Your Workout Plan
                      </Text>

                      <Text style={styles.lockDescription}>
                        Your custom exercises, sets, reps, progressive overload targets, and coach rationale are ready. Sign in or register to activate your blueprint.
                      </Text>

                      <TouchableOpacity
                        style={styles.unlockButton}
                        onPress={handleUnlockPlan}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.unlockButtonText}>
                          Sign In
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </Animated.View>
        </ScrollView>

        {/* Bottom Navigation Bar for steps 1-6 */}
        {currentStep <= 6 && (
          <View style={styles.bottomBar}>
            {globalError ? (
              <View style={styles.globalErrorBanner}>
                <AlertCircle size={15} color={colors.error} style={{ marginRight: 6 }} />
                <Text style={styles.globalErrorText}>{globalError}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.continueBtn}
              onPress={handleNext}
              activeOpacity={0.85}
            >
              <Text style={styles.continueBtnText}>
                {currentStep === 6 ? 'Generate My Plan' : 'Next'}
              </Text>
              {currentStep === 6 ? (
                <Sparkles size={19} color={colors.textInverse} style={{ marginLeft: 8 }} />
              ) : (
                <ArrowRight size={20} color={colors.textInverse} style={{ marginLeft: 8 }} />
              )}
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
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
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
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: 12,
    paddingBottom: spacing.xxl,
  },
  centerScrollContent: {
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  stepAnimatedWrapper: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
  },
  headerBlock: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  title: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 30,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.6,
    lineHeight: 38,
  },
  fieldsContainer: {
    gap: spacing.lg,
  },
  optionsStack: {
    gap: spacing.md,
  },
  selectableCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  selectableCardActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  selectableCardError: {
    borderColor: colors.error,
  },
  optionTitleText: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fonts.headingBold,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  optionTitleTextActive: {
    color: colors.primary,
  },
  optionSubtitleText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.headingMedium,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  optionDescText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.body,
    color: colors.textMuted,
    lineHeight: 16,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
  },
  bottomBar: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  globalErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.35)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  globalErrorText: {
    color: colors.error,
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.headingMedium,
    fontWeight: '600',
    flex: 1,
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD600',
    height: 54,
    borderRadius: borderRadius.full,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  continueBtnText: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fonts.headingBold,
    fontWeight: '700',
    color: colors.textInverse,
    letterSpacing: 0.2,
  },
  // =====================================================
  // AGENTIC LOADING STYLES
  // =====================================================
  agenticContainer: {
    flex: 1,
    paddingTop: 50,
    paddingBottom: 40,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agenticHeaderBlock: {
    alignItems: 'center',
    marginBottom: 38,
  },
  agenticTitle: {
    fontSize: 25,
    fontFamily: typography.fonts.headingBold,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  agenticSubtitle: {
    fontSize: 14,
    fontFamily: typography.fonts.body,
    color: '#8E8E93',
    textAlign: 'center',
    maxWidth: 290,
    lineHeight: 20,
    marginBottom: 14,
  },
  agenticDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  agenticDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FFFFFF',
  },
  agenticTimelineContainer: {
    width: '100%',
    maxWidth: 340,
  },
  timelineItemRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 62,
  },
  timelineNodeCol: {
    width: 22,
    alignItems: 'center',
    marginRight: 14,
  },
  timelineCircleWrapper: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDoneCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#00C853',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineSpinnerCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderTopColor: '#FFFFFF',
    borderRightColor: '#FFFFFF',
    backgroundColor: 'transparent',
  },
  timelinePendingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#38383A',
  },
  timelineConnectorLine: {
    width: 2,
    flex: 1,
    marginVertical: 4,
    borderRadius: 1,
  },
  timelineConnectorLineDone: {
    backgroundColor: '#00C853',
  },
  timelineConnectorLinePending: {
    backgroundColor: '#27272A',
  },
  timelineTextContent: {
    flex: 1,
    paddingTop: 1,
    paddingBottom: 20,
  },
  timelineStepTitle: {
    fontSize: 14.5,
    fontFamily: typography.fonts.headingBold,
    letterSpacing: -0.2,
  },
  timelineStepTitleActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  timelineStepTitlePending: {
    color: '#52525B',
    fontWeight: '600',
  },
  timelineStepSubtitle: {
    fontSize: 12,
    fontFamily: typography.fonts.body,
    marginTop: 3,
    lineHeight: 16,
  },
  timelineStepSubtitleActive: {
    color: '#8E8E93',
  },
  timelineStepSubtitlePending: {
    color: '#38383A',
  },
  // =====================================================
  // RESULT & BLURRED PREVIEW STYLES
  // =====================================================
  resultContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: spacing.xl,
  },
  readyHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  readyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(204, 255, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(204, 255, 0, 0.35)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: spacing.sm,
  },
  readyPillText: {
    fontSize: 10,
    fontFamily: typography.fonts.headingBold,
    color: '#CCFF00',
    letterSpacing: 0.8,
  },
  readyTitle: {
    fontSize: 30,
    fontFamily: typography.fonts.headingBold,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.8,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  readySubtitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.body,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 20,
  },
  planCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    position: 'relative',
  },
  planCardHeader: {
    padding: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  planSplitTitle: {
    fontSize: 20,
    fontFamily: typography.fonts.headingBold,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'center',
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagBadgeText: {
    fontSize: 11,
    fontFamily: typography.fonts.headingBold,
    color: colors.textSecondary,
  },
  workoutListWrapper: {
    position: 'relative',
    padding: spacing.lg,
    gap: spacing.md,
  },
  routineDayItem: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    opacity: 0.7,
  },
  routineDayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  routineDayLabel: {
    fontSize: 12,
    fontFamily: typography.fonts.headingBold,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  routineDayDuration: {
    fontSize: 11,
    fontFamily: typography.fonts.bodyMedium,
    color: colors.textMuted,
  },
  routineExerciseSnippet: {
    fontSize: 12,
    fontFamily: typography.fonts.body,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  // Frosted Blur Lock Overlay
  blurLockOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 10, 12, 0.88)',
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    // Web backdrop filter blur
    backdropFilter: 'blur(12px)',
  } as any,
  lockTitle: {
    fontSize: 22,
    fontFamily: typography.fonts.headingBold,
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  lockDescription: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.body,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.xl,
    maxWidth: 280,
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD600',
    height: 52,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.xl,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
    width: '100%',
  },
  unlockButtonText: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fonts.headingBold,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.2,
  },
});
