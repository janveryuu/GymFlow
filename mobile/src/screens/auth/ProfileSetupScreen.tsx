import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, borderRadius, spacing } from '../../theme';
import { CalendarPicker } from '../../components/CalendarPicker';
import { GlassmorphismSlider } from '../../components/GlassmorphismSlider';
import { FloatingLabelInput } from '../../components/FloatingLabelInput';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../api/client';

interface ProfileSetupScreenProps {
  route: {
    params?: {
      token?: string;
      user?: any;
    };
  };
  navigation: any;
}

export const ProfileSetupScreen: React.FC<ProfileSetupScreenProps> = ({ route, navigation }) => {
  const incomingUser = route?.params?.user || { name: '', email: '' };
  const incomingToken = route?.params?.token || '';
  const setAuth = useAuthStore((state) => state.setAuth);

  // Step state: 1 to 5 (1-4 are wizard steps, 5 is welcome screen)
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;

  // Slide 1: Name & Contact (no auto-fill/placeholders as requested)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  // Slide 2: Gender Selection
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [genderError, setGenderError] = useState(false);

  // Slide 3: Birthdate
  const [birthdate, setBirthdate] = useState<Date>(new Date(2000, 0, 15));

  // Slide 4: Weight & Height (clean, empty defaults)
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [height, setHeight] = useState('');
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');

  // Slide 5 loading state
  const [isFinishing, setIsFinishing] = useState(false);

  // Validation error states & shake animation trigger
  const [firstNameError, setFirstNameError] = useState(false);
  const [lastNameError, setLastNameError] = useState(false);
  const [weightError, setWeightError] = useState(false);
  const [heightError, setHeightError] = useState(false);
  const [shakeTrigger, setShakeTrigger] = useState(0);
  const [globalError, setGlobalError] = useState('');

  // Animation values for smooth screen transfer transitions
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Continuous Progress Bar animated value (starts at 25% for Step 1 of 4)
  const progressAnim = useRef(new Animated.Value(1 / 4)).current;

  useEffect(() => {
    if (currentStep <= 4) {
      Animated.timing(progressAnim, {
        toValue: currentStep / 4,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
  }, [currentStep, progressAnim]);

  // Transition helper for smooth slide & fade animation between screens
  const transitionToStep = (nextStep: number, direction: 'forward' | 'backward') => {
    // Clear transient validation errors when navigating
    setFirstNameError(false);
    setLastNameError(false);
    setGenderError(false);
    setWeightError(false);
    setHeightError(false);
    setGlobalError('');

    const exitOffset = direction === 'forward' ? -40 : 40;
    const enterOffset = direction === 'forward' ? 40 : -40;

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 130,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: exitOffset,
        duration: 130,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentStep(nextStep);
      slideAnim.setValue(enterOffset);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  // Next button handler with shake & error validation callback
  const handleNext = () => {
    if (currentStep === 1) {
      const isFirstEmpty = !firstName.trim();
      const isLastEmpty = !lastName.trim();

      if (isFirstEmpty || isLastEmpty) {
        setFirstNameError(isFirstEmpty);
        setLastNameError(isLastEmpty);
        setShakeTrigger((prev) => prev + 1);
        setGlobalError('You need to input before proceeding next');
        return;
      }

      setFirstNameError(false);
      setLastNameError(false);
      setGlobalError('');
    }

    if (currentStep === 2) {
      if (!gender) {
        setGenderError(true);
        setShakeTrigger((prev) => prev + 1);
        setGlobalError('Please select your gender before proceeding');
        return;
      }

      setGenderError(false);
      setGlobalError('');
    }

    if (currentStep === 4) {
      const isWeightEmpty = !weight.trim();
      const isHeightEmpty = !height.trim();

      if (isWeightEmpty || isHeightEmpty) {
        setWeightError(isWeightEmpty);
        setHeightError(isHeightEmpty);
        setShakeTrigger((prev) => prev + 1);
        setGlobalError('You need to input before proceeding next');
        return;
      }

      setWeightError(false);
      setHeightError(false);
      setGlobalError('');
    }

    if (currentStep < totalSteps) {
      transitionToStep(currentStep + 1, 'forward');
    }
  };

  const handleBack = () => {
    setFirstNameError(false);
    setLastNameError(false);
    setGenderError(false);
    setWeightError(false);
    setHeightError(false);
    setGlobalError('');

    if (currentStep > 1) {
      transitionToStep(currentStep - 1, 'backward');
    } else {
      navigation.goBack();
    }
  };

  const handleCompleteOnboarding = async () => {
    setIsFinishing(true);

    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      try {
        await apiClient.patch('/api/v1/member/profile', {
          name: fullName,
          phone: phone.trim(),
        });
      } catch (err) {
        console.log('[Onboarding] Profile patch optional warning:', err);
      }

      try {
        await apiClient.patch('/api/v1/member/preferences', {
          workout_type: 'full-body',
          intensity: 'moderate',
          weekly_workout_goal: 3,
        });
      } catch (err) {
        console.log('[Onboarding] Preferences patch optional warning:', err);
      }

      const updatedUser = {
        ...incomingUser,
        name: fullName || 'GymFlow Member',
        phone: phone.trim(),
        gender: gender || 'male',
      };

      await setAuth(incomingToken, updatedUser, false);
    } catch (error) {
      console.error('[Onboarding] Error completing profile setup:', error);
      await setAuth(incomingToken, incomingUser, false);
    } finally {
      setIsFinishing(false);
    }
  };

  const calculateAge = (date: Date) => {
    const ageDiffMs = Date.now() - date.getTime();
    const ageDate = new Date(ageDiffMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Top Header & Continuous Progress Bar */}
        {currentStep < 5 && (
          <View style={styles.topSection}>
            <View style={styles.topBar}>
              <TouchableOpacity
                onPress={handleBack}
                style={styles.backButton}
                accessibilityLabel="Go Back"
              >
                <ArrowLeft size={20} color={colors.text} />
              </TouchableOpacity>

              <Text style={styles.stepText}>
                Step {currentStep} of 4
              </Text>
            </View>

            {/* Continuous Progress Bar Track */}
            <View style={styles.progressBarTrack}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
          </View>
        )}

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            currentStep === 5 && styles.welcomeScrollContent,
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Animated step transition container */}
          <Animated.View
            style={[
              styles.stepAnimatedWrapper,
              currentStep === 5 && { flex: 1 },
              {
                opacity: fadeAnim,
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            {/* ============================================================ */}
            {/* SLIDE 1: First Name, Last Name, Contact Number               */}
            {/* (No container boxes, no icons, no placeholders)              */}
            {/* ============================================================ */}
            {currentStep === 1 && (
              <View style={styles.stepContainer}>
                <View style={styles.headerBlock}>
                  <Text style={styles.title}>What&apos;s your name?</Text>
                  <Text style={styles.subtitle}>
                    Enter your personal details to set up your member profile.
                  </Text>
                </View>

                {/* Outlined Floating Label Inputs with Border Radius */}
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
                    errorMessage="You need to input before proceeding next"
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
                    errorMessage="You need to input before proceeding next"
                    shakeTrigger={shakeTrigger}
                    autoCapitalize="words"
                  />

                  <FloatingLabelInput
                    label="Contact Number"
                    value={phone}
                    onChangeText={(text) => {
                      setPhone(text);
                      if (globalError) setGlobalError('');
                    }}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>
            )}

            {/* ============================================================ */}
            {/* SLIDE 2: Gender Selection                                    */}
            {/* ============================================================ */}
            {currentStep === 2 && (
              <View style={styles.stepContainer}>
                <View style={styles.headerBlock}>
                  <Text style={styles.title}>Select your gender</Text>
                  <Text style={styles.subtitle}>
                    Helps us calibrate your baseline metabolic rate and training benchmarks.
                  </Text>
                </View>

                <View style={styles.optionsStack}>
                  {[
                    {
                      id: 'male' as const,
                      title: 'Male',
                      badge: 'Metabolic & Strength',
                      desc: 'Calibrates basal metabolic rate and strength progression benchmarks.',
                    },
                    {
                      id: 'female' as const,
                      title: 'Female',
                      badge: 'Metabolic & Endurance',
                      desc: 'Calibrates energy expenditure and target heart rate zone benchmarks.',
                    },
                    {
                      id: 'other' as const,
                      title: 'Prefer not to say',
                      badge: 'Standard Metrics',
                      desc: 'Applies balanced, non-gendered fitness algorithms.',
                    },
                  ].map((item) => {
                    const isSelected = gender === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.selectableCard,
                          isSelected && styles.selectableCardActive,
                          genderError && !gender && styles.selectableCardError,
                        ]}
                        onPress={() => {
                          setGender(item.id);
                          setGenderError(false);
                          setGlobalError('');
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={{ flex: 1 }}>
                          <View style={styles.optionHeaderRow}>
                            <Text style={[styles.optionTitleText, isSelected && styles.optionTitleTextActive]}>
                              {item.title}
                            </Text>
                            <View style={[styles.badgePill, isSelected && styles.badgePillActive]}>
                              <Text style={[styles.badgePillText, isSelected && styles.badgePillTextActive]}>
                                {item.badge}
                              </Text>
                            </View>
                          </View>
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
            {/* SLIDE 3: Birthdate Calendar Picker                           */}
            {/* ============================================================ */}
            {currentStep === 3 && (
              <View style={styles.stepContainer}>
                <View style={styles.headerBlock}>
                  <Text style={styles.title}>When were you born?</Text>
                  <Text style={styles.subtitle}>
                    Used to calculate heart rate zones and caloric expenditure.
                  </Text>
                </View>

                {/* Birthdate preview directly on background */}
                <View style={styles.birthdateSummary}>
                  <Text style={styles.birthdateValue}>
                    {birthdate.toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                  <Text style={styles.birthdateAge}>
                    {calculateAge(birthdate)} years old
                  </Text>
                </View>

                {/* Calendar Picker laid directly on main background */}
                <CalendarPicker
                  selectedDate={birthdate}
                  onSelectDate={setBirthdate}
                  maxDate={new Date()}
                  style={styles.flatCalendar}
                />
              </View>
            )}

            {/* ============================================================ */}
            {/* SLIDE 4: Weight and Height Input                             */}
            {/* (Laid directly on main background, no icons/placeholders)     */}
            {/* ============================================================ */}
            {currentStep === 4 && (
              <View style={styles.stepContainer}>
                <View style={styles.headerBlock}>
                  <Text style={styles.title}>Your body measurements</Text>
                  <Text style={styles.subtitle}>
                    Help us accurately benchmark your workout intensities.
                  </Text>
                </View>

                <View style={styles.fieldsContainer}>
                  {/* Weight Field */}
                  <FloatingLabelInput
                    label="Weight"
                    value={weight}
                    onChangeText={(text) => {
                      setWeight(text);
                      if (weightError) setWeightError(false);
                      if (globalError) setGlobalError('');
                    }}
                    hasError={weightError}
                    errorMessage="You need to input before proceeding next"
                    shakeTrigger={shakeTrigger}
                    keyboardType="numeric"
                    autoFocus={true}
                    suffix={
                      <View style={styles.unitToggle}>
                        <TouchableOpacity
                          style={[styles.unitChip, weightUnit === 'kg' && styles.unitChipActive]}
                          onPress={() => setWeightUnit('kg')}
                        >
                          <Text style={[styles.unitChipText, weightUnit === 'kg' && styles.unitChipTextActive]}>
                            KG
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.unitChip, weightUnit === 'lbs' && styles.unitChipActive]}
                          onPress={() => setWeightUnit('lbs')}
                        >
                          <Text style={[styles.unitChipText, weightUnit === 'lbs' && styles.unitChipTextActive]}>
                            LBS
                          </Text>
                        </TouchableOpacity>
                      </View>
                    }
                  />

                  {/* Height Field */}
                  <FloatingLabelInput
                    label="Height"
                    value={height}
                    onChangeText={(text) => {
                      setHeight(text);
                      if (heightError) setHeightError(false);
                      if (globalError) setGlobalError('');
                    }}
                    hasError={heightError}
                    errorMessage="You need to input before proceeding next"
                    shakeTrigger={shakeTrigger}
                    keyboardType="numeric"
                    suffix={
                      <View style={styles.unitToggle}>
                        <TouchableOpacity
                          style={[styles.unitChip, heightUnit === 'cm' && styles.unitChipActive]}
                          onPress={() => setHeightUnit('cm')}
                        >
                          <Text style={[styles.unitChipText, heightUnit === 'cm' && styles.unitChipTextActive]}>
                            CM
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.unitChip, heightUnit === 'ft' && styles.unitChipActive]}
                          onPress={() => setHeightUnit('ft')}
                        >
                          <Text style={[styles.unitChipText, heightUnit === 'ft' && styles.unitChipTextActive]}>
                            FT
                          </Text>
                        </TouchableOpacity>
                      </View>
                    }
                  />
                </View>
              </View>
            )}

            {/* ============================================================ */}
            {/* SLIDE 5: Welcome Screen with Glassmorphism Sliding Button    */}
            {/* ============================================================ */}
            {currentStep === 5 && (
              <View style={styles.welcomeContainer}>
                {/* Super Seamless Eased Gradient: White at top, Deep Black at bottom */}
                <LinearGradient
                  colors={[
                    '#FFFFFF',
                    '#FFFFFF',
                    '#F7F7F8',
                    '#EAEAEF',
                    '#D2D2D7',
                    '#AEAEB2',
                    '#7C7C80',
                    '#48484A',
                    '#2C2C2E',
                    '#1C1C1E',
                    '#0A0A0A',
                    '#000000',
                  ]}
                  locations={[
                    0.0,
                    0.15,
                    0.25,
                    0.35,
                    0.45,
                    0.55,
                    0.65,
                    0.75,
                    0.84,
                    0.91,
                    0.96,
                    1.0,
                  ]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />

                <View style={styles.welcomeContent}>
                  {/* Top Wordmark replacing logo */}
                  <View style={styles.welcomeBrandRow}>
                    <Image
                      source={require('../../../assets/gymflow-wordmark.png')}
                      style={styles.welcomeWordmark}
                      tintColor="#0A0A0A"
                      resizeMode="contain"
                    />
                  </View>

                  {/* Motivational Gym App Quote */}
                  <View style={styles.quoteBlock}>
                    <Text style={styles.welcomeHeading}>
                      Transform your body.{'\n'}
                      Elevate your mind.
                    </Text>

                    <Text style={styles.welcomeSubheading}>
                      Consistency is where champions are forged. Step forward, put in the work, and unleash your ultimate potential.
                    </Text>
                  </View>

                  {/* Spacer to push slider to bottom black area */}
                  <View style={{ flex: 1 }} />

                  {/* Glassmorphism Sliding Button on Solid Black Background */}
                  <View style={styles.sliderWrapper}>
                    <Text style={styles.sliderInstruction}>
                      Slide right to launch your experience
                    </Text>
                    <GlassmorphismSlider
                      label="Slide to Get Started"
                      completedLabel="Entering GymFlow..."
                      isLoading={isFinishing}
                      onComplete={handleCompleteOnboarding}
                    />
                  </View>
                </View>
              </View>
            )}
          </Animated.View>
        </ScrollView>

        {/* Bottom Navigation Bar (Steps 1 to 4) */}
        {currentStep < 5 && (
          <View style={styles.bottomBar}>
            {/* Global Error Banner Callback */}
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
                Next
              </Text>
              <ArrowRight size={20} color={colors.textInverse} style={{ marginLeft: 8 }} />
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
  topSection: {
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.headingSemiBold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Continuous Smooth Progress Bar
  progressBarTrack: {
    width: '100%',
    height: 4,
    backgroundColor: colors.borderSubtle,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.xl,
  },
  welcomeScrollContent: {
    padding: 0,
    flexGrow: 1,
  },
  stepAnimatedWrapper: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
    paddingTop: spacing.md,
  },
  headerBlock: {
    marginBottom: spacing.xxl,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fonts.headingBlack,
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.headingRegular,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  // Flat inputs laid directly on main background
  fieldsContainer: {
    gap: spacing.xl,
  },
  fieldItem: {
    marginBottom: spacing.xs,
  },
  fieldHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  fieldLabel: {
    fontSize: 14,
    fontFamily: typography.fonts.headingSemiBold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  flatInput: {
    fontSize: 16,
    fontFamily: typography.fonts.headingRegular,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    minHeight: 52,
    borderWidth: 1.2,
    borderColor: '#D1D5DB',
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },
  metricInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    borderWidth: 1.2,
    borderColor: '#D1D5DB',
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  flatInputMetric: {
    flex: 1,
    fontSize: 16,
    fontFamily: typography.fonts.headingSemiBold,
    color: colors.text,
    paddingVertical: 10,
  },
  metricSuffix: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.headingBold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginLeft: spacing.sm,
  },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.sm,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unitChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  unitChipActive: {
    backgroundColor: colors.primary,
  },
  unitChipText: {
    fontSize: 10,
    fontFamily: typography.fonts.headingBold,
    color: colors.textSecondary,
  },
  unitChipTextActive: {
    color: colors.textInverse,
  },
  // Birthdate Display (Thin box with border radius)
  birthdateSummary: {
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderWidth: 1.2,
    borderColor: '#D1D5DB',
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },
  birthdateValue: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.headingBold,
    color: colors.text,
  },
  birthdateAge: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.headingSemiBold,
    color: colors.textSecondary,
    marginTop: 2,
  },
  flatCalendar: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
  },
  // Selectable Options (Frequency & Goal)
  optionsStack: {
    gap: spacing.md,
  },
  selectableCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  selectableCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceElevated,
  },
  selectableCardError: {
    borderColor: colors.error,
  },
  optionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  optionTitleText: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fonts.headingBold,
    color: colors.text,
    marginRight: spacing.sm,
  },
  optionTitleTextActive: {
    color: colors.text,
  },
  badgePill: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  badgePillActive: {
    backgroundColor: colors.primary,
  },
  badgePillText: {
    fontSize: 10,
    fontFamily: typography.fonts.headingSemiBold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  badgePillTextActive: {
    color: colors.textInverse,
  },
  optionDescText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.headingRegular,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.md,
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
  // Bottom Bar
  bottomBar: {
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  globalErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  globalErrorText: {
    color: colors.error,
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.headingSemiBold,
  },
  continueBtn: {
    backgroundColor: colors.primary,
    minHeight: 52,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtnDisabled: {
    opacity: 0.35,
  },
  continueBtnText: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fonts.headingBold,
    color: colors.textInverse,
  },
  // Welcome Slide
  welcomeContainer: {
    flex: 1,
    minHeight: 650,
    position: 'relative',
  },
  welcomeContent: {
    flex: 1,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    justifyContent: 'space-between',
  },
  welcomeBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  welcomeWordmark: {
    width: 140,
    height: 40,
  },
  quoteBlock: {
    marginTop: spacing.xxl,
  },
  welcomeHeading: {
    fontSize: 32,
    fontFamily: typography.fonts.headingBlack,
    color: '#0A0A0A',
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  welcomeSubheading: {
    fontSize: 15,
    fontFamily: typography.fonts.headingRegular,
    color: '#525252',
    marginTop: spacing.md,
    lineHeight: 22,
  },
  sliderWrapper: {
    marginTop: spacing.lg,
  },
  sliderInstruction: {
    textAlign: 'center',
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.headingMedium,
    color: 'rgba(255, 255, 255, 0.65)',
    marginBottom: spacing.xs,
    letterSpacing: 0.3,
  },
});
