import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import {
  ChevronLeft,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Dumbbell,
  Clock,
  Flame,
  Bot,
  RotateCcw,
  Zap,
  Target,
  ShieldCheck,
  Check,
  Calendar,
} from 'lucide-react-native';
import { colors, typography, borderRadius, spacing } from '../theme';
import { WorkoutIllustration } from '../components/WorkoutIllustration';
import { useCustomWorkoutsStore, CustomExerciseItem, CustomRoutineWorkout } from '../store/customWorkoutsStore';

type FrequencyOption = '1-2' | '3-4' | '5-6' | '7';
type DifficultyOption = 'beginner' | 'intermediate' | 'advanced';

interface GeneratedDayRoutine {
  dayLabel: string;       // e.g. "Day 1 – Push", "Day 2 – Pull"
  title: string;          // Full routine name
  category: string;
  durationMinutes: number;
  calories: number;
  exercises: CustomExerciseItem[];
}

interface GeneratedSplitData {
  splitName: string;        // e.g. "Push / Pull / Legs"
  difficulty: DifficultyOption;
  frequency: FrequencyOption;
  coachRationale: string;
  days: GeneratedDayRoutine[];
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const AiWorkoutGenerateScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { addCustomWorkout } = useCustomWorkoutsStore();

  // Wizard state: 1 (Frequency), 2 (Difficulty), 3 (Agentic Loading), 4 (Result View)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // User selections
  const [selectedFrequency, setSelectedFrequency] = useState<FrequencyOption>('3-4');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyOption>('intermediate');

  // Generated routine state
  const [generatedSplit, setGeneratedSplit] = useState<GeneratedSplitData | null>(null);
  const [activeDayIndex, setActiveDayIndex] = useState(0);

  // Loading screen: active agentic reasoning step index (0 to 4)
  const [agentStepIndex, setAgentStepIndex] = useState<number>(0);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const progressWidth = useRef(new Animated.Value(0.5)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const dotAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  // Step indicator animation
  useEffect(() => {
    if (currentStep <= 2) {
      Animated.timing(progressWidth, {
        toValue: currentStep / 2,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
  }, [currentStep, progressWidth]);

  // Start Agentic Pulse loop when in loading phase
  useEffect(() => {
    if (currentStep === 3) {
      // Fade in the loading screen
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();

      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.18,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

      // Animate the three dots
      const dotLoop = Animated.loop(
        Animated.stagger(200, dotAnims.map(dot =>
          Animated.sequence([
            Animated.timing(dot, {
              toValue: 1,
              duration: 400,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(dot, {
              toValue: 0,
              duration: 400,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        ))
      );

      pulseLoop.start();
      dotLoop.start();

      return () => {
        pulseLoop.stop();
        dotLoop.stop();
      };
    }
  }, [currentStep, pulseAnim, fadeAnim, dotAnims]);

  // Agentic Reasoning Timeline
  useEffect(() => {
    if (currentStep === 3) {
      setAgentStepIndex(0);

      const timers: (ReturnType<typeof setTimeout>)[] = [];
      timers.push(setTimeout(() => setAgentStepIndex(1), 800));
      timers.push(setTimeout(() => setAgentStepIndex(2), 1600));
      timers.push(setTimeout(() => setAgentStepIndex(3), 2400));
      timers.push(setTimeout(() => setAgentStepIndex(4), 3200));

      // Finalize after reasoning finishes
      timers.push(
        setTimeout(() => {
          const split = synthesizeAiRoutine(selectedFrequency, selectedDifficulty);
          setGeneratedSplit(split);
          setActiveDayIndex(0);
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {
            // Haptics optional
          }
          setCurrentStep(4);
        }, 4000)
      );

      return () => {
        timers.forEach(clearTimeout);
      };
    }
  }, [currentStep, selectedFrequency, selectedDifficulty]);

  // =====================================================
  // AI WORKOUT SPLIT SYNTHESIS ENGINE
  // Evidence-based splits mapped to frequency & difficulty
  // =====================================================
  const synthesizeAiRoutine = (freq: FrequencyOption, diff: DifficultyOption): GeneratedSplitData => {
    const ts = Date.now();
    const setsForDiff = diff === 'beginner' ? 3 : diff === 'intermediate' ? 4 : 5;
    const repsForDiff = diff === 'beginner' ? '10 - 12 reps' : diff === 'intermediate' ? '8 - 10 reps' : '5 - 8 reps';
    const restForDiff = diff === 'beginner' ? 75 : diff === 'intermediate' ? 90 : 120;
    const diffLabel = diff.charAt(0).toUpperCase() + diff.slice(1);

    // -------------------------------------------------
    // 1-2 DAYS/WEEK → FULL BODY (2 days)
    // -------------------------------------------------
    if (freq === '1-2') {
      return {
        splitName: 'Full Body',
        difficulty: diff,
        frequency: freq,
        coachRationale: `Designed for 1–2 training days per week. Each session targets every major muscle group with compound movements to maximize stimulus per session. Full body training at this frequency ensures each muscle is hit with sufficient weekly volume for ${diff === 'beginner' ? 'neurological adaptation and movement mastery' : diff === 'intermediate' ? 'progressive hypertrophy and strength gains' : 'maintaining strength and maximizing mechanical tension'}.`,
        days: [
          {
            dayLabel: 'Day 1 – Full Body A',
            title: 'Full Body Strength A',
            category: 'Full Body',
            durationMinutes: diff === 'beginner' ? 40 : 50,
            calories: diff === 'beginner' ? 280 : diff === 'intermediate' ? 360 : 420,
            exercises: [
              {
                id: `ai-${ts}-1-1`, title: 'Barbell Back Squats', slug: 'barbell-squat',
                category: 'Legs', equipment: 'Barbell & Squat Rack', difficulty: diffLabel,
                preferredSets: setsForDiff, preferredReps: repsForDiff, restTimeSeconds: restForDiff,
                tips: 'Brace your core hard, push knees out over toes, and drive through your midfoot. Descend until thighs are at least parallel.',
                duration_minutes: 12, calories: 100,
              },
              {
                id: `ai-${ts}-1-2`, title: 'Barbell Flat Bench Press', slug: 'bench-press',
                category: 'Chest', equipment: 'Flat Bench & Barbell', difficulty: diffLabel,
                preferredSets: setsForDiff, preferredReps: repsForDiff, restTimeSeconds: restForDiff,
                tips: 'Retract shoulder blades, plant feet firmly, and lower the bar to your lower chest under control.',
                duration_minutes: 10, calories: 85,
              },
              {
                id: `ai-${ts}-1-3`, title: 'Bent-Over Barbell Rows', slug: 'bent-over-row',
                category: 'Back', equipment: 'Barbell', difficulty: diffLabel,
                preferredSets: setsForDiff, preferredReps: repsForDiff, restTimeSeconds: restForDiff,
                tips: 'Hinge at the hips to about 45 degrees. Pull the bar towards your belly button, squeezing your lats at the top.',
                duration_minutes: 10, calories: 80,
              },
              {
                id: `ai-${ts}-1-4`, title: 'Overhead Dumbbell Press', slug: 'overhead-press',
                category: 'Shoulders', equipment: 'Dumbbells', difficulty: diffLabel,
                preferredSets: setsForDiff, preferredReps: repsForDiff, restTimeSeconds: 60,
                tips: 'Press dumbbells overhead in a slight arc. Keep your core braced and avoid arching your lower back.',
                duration_minutes: 8, calories: 65,
              },
              {
                id: `ai-${ts}-1-5`, title: 'Plank Hold', slug: 'core-plank',
                category: 'Core', equipment: 'Bodyweight', difficulty: diffLabel,
                preferredSets: 3, preferredReps: '30 - 45s hold', restTimeSeconds: 45,
                tips: 'Maintain a straight line from head to heels. Engage your glutes and don\'t let your hips sag.',
                duration_minutes: 6, calories: 40,
              },
            ],
          },
          {
            dayLabel: 'Day 2 – Full Body B',
            title: 'Full Body Strength B',
            category: 'Full Body',
            durationMinutes: diff === 'beginner' ? 40 : 50,
            calories: diff === 'beginner' ? 280 : diff === 'intermediate' ? 360 : 420,
            exercises: [
              {
                id: `ai-${ts}-2-1`, title: 'Romanian Deadlifts', slug: 'deadlift',
                category: 'Legs', equipment: 'Barbell', difficulty: diffLabel,
                preferredSets: setsForDiff, preferredReps: repsForDiff, restTimeSeconds: restForDiff,
                tips: 'Push your hips back while keeping the bar close to your body. Feel a deep stretch in your hamstrings before standing.',
                duration_minutes: 12, calories: 95,
              },
              {
                id: `ai-${ts}-2-2`, title: 'Incline Dumbbell Press', slug: 'bench-press',
                category: 'Chest', equipment: 'Incline Bench & Dumbbells', difficulty: diffLabel,
                preferredSets: setsForDiff, preferredReps: repsForDiff, restTimeSeconds: restForDiff,
                tips: 'Set bench at 30-45 degrees. Press dumbbells up in a slight arc, keeping wrists stacked over elbows.',
                duration_minutes: 10, calories: 80,
              },
              {
                id: `ai-${ts}-2-3`, title: 'Lat Pulldowns', slug: 'cable-lat-pulldown',
                category: 'Back', equipment: 'Cable Machine', difficulty: diffLabel,
                preferredSets: setsForDiff, preferredReps: repsForDiff, restTimeSeconds: 60,
                tips: 'Pull the bar down to your upper chest while driving elbows towards your hips. Squeeze your lats at the bottom.',
                duration_minutes: 10, calories: 75,
              },
              {
                id: `ai-${ts}-2-4`, title: 'Goblet Squats', slug: 'barbell-squat',
                category: 'Legs', equipment: 'Dumbbell', difficulty: diffLabel,
                preferredSets: setsForDiff, preferredReps: '12 - 15 reps', restTimeSeconds: 60,
                tips: 'Hold the dumbbell at your chest, sit between your heels, and keep your torso as upright as possible.',
                duration_minutes: 8, calories: 70,
              },
              {
                id: `ai-${ts}-2-5`, title: 'Dumbbell Bicep Curls', slug: 'dumbbell-curl',
                category: 'Arms', equipment: 'Dumbbells', difficulty: diffLabel,
                preferredSets: 3, preferredReps: '12 - 15 reps', restTimeSeconds: 45,
                tips: 'Keep elbows pinned at your sides. Control the negative for a full 2-second descent.',
                duration_minutes: 6, calories: 45,
              },
            ],
          },
        ],
      };
    }

    // -------------------------------------------------
    // 3-4 DAYS/WEEK → PUSH / PULL / LEGS (3-day split)
    // -------------------------------------------------
    if (freq === '3-4') {
      return {
        splitName: 'Push / Pull / Legs',
        difficulty: diff,
        frequency: freq,
        coachRationale: `Optimized 3-day Push/Pull/Legs split for ${freq} training days per week. This split groups muscles by movement pattern — pushing muscles (chest, shoulders, triceps), pulling muscles (back, biceps, rear delts), and legs (quads, hamstrings, glutes, calves). Each session maximizes synergistic muscle recruitment while allowing 48+ hours of recovery between overlapping muscle groups. ${diff === 'beginner' ? 'Volume is kept moderate with focus on compound movement mastery.' : diff === 'intermediate' ? 'Progressive overload with compound anchors and targeted accessories.' : 'High mechanical tension with heavy compound lifts and intensity techniques.'}`,
        days: [
          // ── PUSH DAY ──
          {
            dayLabel: 'Day 1 – Push',
            title: 'Push Day – Chest, Shoulders & Triceps',
            category: 'Push',
            durationMinutes: diff === 'beginner' ? 40 : diff === 'intermediate' ? 50 : 60,
            calories: diff === 'beginner' ? 300 : diff === 'intermediate' ? 380 : 450,
            exercises: [
              {
                id: `ai-${ts}-1-1`, title: 'Barbell Flat Bench Press', slug: 'bench-press',
                category: 'Chest', equipment: 'Flat Bench & Barbell', difficulty: diffLabel,
                preferredSets: setsForDiff, preferredReps: repsForDiff, restTimeSeconds: restForDiff,
                tips: 'Arch your upper back slightly, retract scapulae. Lower to lower chest, press back up in a slight arc.',
                duration_minutes: 12, calories: 100,
              },
              {
                id: `ai-${ts}-1-2`, title: 'Incline Dumbbell Press', slug: 'bench-press',
                category: 'Chest', equipment: 'Incline Bench & Dumbbells', difficulty: diffLabel,
                preferredSets: setsForDiff, preferredReps: diff === 'advanced' ? '6 - 8 reps' : '10 - 12 reps', restTimeSeconds: restForDiff - 15,
                tips: 'Set bench to 30 degrees. Focus on stretching the pecs at the bottom and squeezing hard at the top.',
                duration_minutes: 10, calories: 85,
              },
              {
                id: `ai-${ts}-1-3`, title: 'Standing Overhead Press', slug: 'overhead-press',
                category: 'Shoulders', equipment: 'Barbell', difficulty: diffLabel,
                preferredSets: setsForDiff, preferredReps: repsForDiff, restTimeSeconds: restForDiff,
                tips: 'Brace your core and glutes for a stable base. Press the bar straight up, moving your head forward slightly as it passes.',
                duration_minutes: 10, calories: 80,
              },
              {
                id: `ai-${ts}-1-4`, title: 'Dumbbell Lateral Raises', slug: 'lateral-raise',
                category: 'Shoulders', equipment: 'Dumbbells', difficulty: diffLabel,
                preferredSets: 3, preferredReps: '12 - 15 reps', restTimeSeconds: 45,
                tips: 'Lead with your elbows and tilt the dumbbells slightly forward like pouring water. Control the descent.',
                duration_minutes: 8, calories: 55,
              },
              {
                id: `ai-${ts}-1-5`, title: 'Tricep Rope Pushdowns', slug: 'cable-lat-pulldown',
                category: 'Arms', equipment: 'Cable Machine & Rope', difficulty: diffLabel,
                preferredSets: 3, preferredReps: '12 - 15 reps', restTimeSeconds: 45,
                tips: 'Keep elbows tucked at your sides. Spread the rope apart at the bottom for peak tricep contraction.',
                duration_minutes: 7, calories: 45,
              },
              ...(diff !== 'beginner' ? [{
                id: `ai-${ts}-1-6`, title: 'Overhead Tricep Extension', slug: 'dumbbell-curl',
                category: 'Arms', equipment: 'Dumbbell', difficulty: diffLabel,
                preferredSets: 3, preferredReps: '10 - 12 reps', restTimeSeconds: 45,
                tips: 'Lower the dumbbell behind your head with control. Stretch the long head of the tricep fully before pressing up.',
                duration_minutes: 7, calories: 40,
              }] : []),
            ],
          },
          // ── PULL DAY ──
          {
            dayLabel: 'Day 2 – Pull',
            title: 'Pull Day – Back, Biceps & Rear Delts',
            category: 'Pull',
            durationMinutes: diff === 'beginner' ? 40 : diff === 'intermediate' ? 50 : 60,
            calories: diff === 'beginner' ? 290 : diff === 'intermediate' ? 370 : 440,
            exercises: [
              {
                id: `ai-${ts}-2-1`, title: diff === 'advanced' ? 'Weighted Pull-Ups' : 'Lat Pulldowns', slug: 'cable-lat-pulldown',
                category: 'Back', equipment: diff === 'advanced' ? 'Pull-Up Bar & Weight Belt' : 'Cable Machine', difficulty: diffLabel,
                preferredSets: setsForDiff, preferredReps: repsForDiff, restTimeSeconds: restForDiff,
                tips: diff === 'advanced'
                  ? 'Initiate by depressing and retracting your scapulae. Pull your chest to the bar and control the descent.'
                  : 'Pull the bar to your upper chest, squeezing your lats hard at the bottom. Avoid leaning back excessively.',
                duration_minutes: 12, calories: 95,
              },
              {
                id: `ai-${ts}-2-2`, title: 'Barbell Bent-Over Rows', slug: 'bent-over-row',
                category: 'Back', equipment: 'Barbell', difficulty: diffLabel,
                preferredSets: setsForDiff, preferredReps: repsForDiff, restTimeSeconds: restForDiff,
                tips: 'Keep your back at 45 degrees with a neutral spine. Pull the bar to your belly button, driving elbows past your torso.',
                duration_minutes: 10, calories: 85,
              },
              {
                id: `ai-${ts}-2-3`, title: 'Seated Cable Rows', slug: 'cable-lat-pulldown',
                category: 'Back', equipment: 'Cable Row Machine', difficulty: diffLabel,
                preferredSets: setsForDiff, preferredReps: '10 - 12 reps', restTimeSeconds: 60,
                tips: 'Pull the handle to your lower chest/upper abdomen. Squeeze your shoulder blades together at peak contraction.',
                duration_minutes: 10, calories: 75,
              },
              {
                id: `ai-${ts}-2-4`, title: 'Face Pulls', slug: 'cable-lat-pulldown',
                category: 'Shoulders', equipment: 'Cable Machine & Rope', difficulty: diffLabel,
                preferredSets: 3, preferredReps: '15 - 20 reps', restTimeSeconds: 45,
                tips: 'Pull the rope towards your forehead with your elbows high and wide. Externally rotate at the end position.',
                duration_minutes: 7, calories: 45,
              },
              {
                id: `ai-${ts}-2-5`, title: 'Barbell Bicep Curls', slug: 'dumbbell-curl',
                category: 'Arms', equipment: 'EZ-Bar or Barbell', difficulty: diffLabel,
                preferredSets: 3, preferredReps: '10 - 12 reps', restTimeSeconds: 45,
                tips: 'Keep your elbows stationary at your sides. Curl with control and lower with a 2-second negative.',
                duration_minutes: 7, calories: 50,
              },
              ...(diff !== 'beginner' ? [{
                id: `ai-${ts}-2-6`, title: 'Incline Dumbbell Curls', slug: 'dumbbell-curl',
                category: 'Arms', equipment: 'Incline Bench & Dumbbells', difficulty: diffLabel,
                preferredSets: 3, preferredReps: '10 - 12 reps', restTimeSeconds: 45,
                tips: 'Pin your back against the incline bench. The stretch position maximizes long head bicep activation.',
                duration_minutes: 7, calories: 40,
              }] : []),
            ],
          },
          // ── LEGS DAY ──
          {
            dayLabel: 'Day 3 – Legs',
            title: 'Legs Day – Quads, Hamstrings, Glutes & Calves',
            category: 'Legs',
            durationMinutes: diff === 'beginner' ? 40 : diff === 'intermediate' ? 55 : 65,
            calories: diff === 'beginner' ? 320 : diff === 'intermediate' ? 420 : 500,
            exercises: [
              {
                id: `ai-${ts}-3-1`, title: 'Barbell Back Squats', slug: 'barbell-squat',
                category: 'Legs', equipment: 'Barbell & Squat Rack', difficulty: diffLabel,
                preferredSets: setsForDiff, preferredReps: repsForDiff, restTimeSeconds: restForDiff,
                tips: 'Brace your core, push your knees out over toes, and descend until thighs break parallel. Drive through midfoot.',
                duration_minutes: 14, calories: 120,
              },
              {
                id: `ai-${ts}-3-2`, title: 'Romanian Deadlifts', slug: 'deadlift',
                category: 'Legs', equipment: 'Barbell', difficulty: diffLabel,
                preferredSets: setsForDiff, preferredReps: repsForDiff, restTimeSeconds: restForDiff,
                tips: 'Hinge at the hips with a slight knee bend. Push hips back until you feel a deep hamstring stretch, then squeeze glutes to stand.',
                duration_minutes: 12, calories: 100,
              },
              {
                id: `ai-${ts}-3-3`, title: 'Leg Press', slug: 'leg-press',
                category: 'Legs', equipment: 'Leg Press Machine', difficulty: diffLabel,
                preferredSets: setsForDiff, preferredReps: '10 - 12 reps', restTimeSeconds: 75,
                tips: 'Place feet shoulder-width apart on the platform. Lower until your knees reach 90 degrees, then press through your heels.',
                duration_minutes: 10, calories: 85,
              },
              {
                id: `ai-${ts}-3-4`, title: 'Walking Lunges', slug: 'barbell-squat',
                category: 'Legs', equipment: 'Dumbbells', difficulty: diffLabel,
                preferredSets: 3, preferredReps: '12 reps each leg', restTimeSeconds: 60,
                tips: 'Take a controlled stride forward, lower your back knee towards the ground, and push off your front heel to step forward.',
                duration_minutes: 10, calories: 80,
              },
              {
                id: `ai-${ts}-3-5`, title: 'Standing Calf Raises', slug: 'calf-raise',
                category: 'Legs', equipment: 'Calf Machine or Smith Machine', difficulty: diffLabel,
                preferredSets: 4, preferredReps: '15 - 20 reps', restTimeSeconds: 45,
                tips: 'Pause for 1 second at peak contraction and lower with a slow 2-second negative for maximum stretch.',
                duration_minutes: 7, calories: 50,
              },
              ...(diff !== 'beginner' ? [{
                id: `ai-${ts}-3-6`, title: 'Leg Curls', slug: 'leg-press',
                category: 'Legs', equipment: 'Leg Curl Machine', difficulty: diffLabel,
                preferredSets: 3, preferredReps: '10 - 12 reps', restTimeSeconds: 45,
                tips: 'Curl the weight up slowly and squeeze your hamstrings hard at peak contraction. Control the descent.',
                duration_minutes: 7, calories: 45,
              }] : []),
            ],
          },
        ],
      };
    }

    // -------------------------------------------------
    // 5-6 DAYS/WEEK → PPL (6-day split, run twice)
    // -------------------------------------------------
    if (freq === '5-6') {
      return {
        splitName: 'Push / Pull / Legs (×2)',
        difficulty: diff,
        frequency: freq,
        coachRationale: `High-frequency 6-day Push/Pull/Legs split running each workout twice per week. This double rotation ensures every muscle group receives optimal weekly volume (14–20 sets per muscle group) with 48-hour recovery windows between identical sessions. ${diff === 'beginner' ? 'Volume per session is moderated for recovery.' : diff === 'intermediate' ? 'Balances compound drivers with isolation accessories for maximal hypertrophy.' : 'Heavy compound anchors paired with intensity techniques for advanced muscle fiber recruitment.'}`,
        days: [
          // ── PUSH A (Strength Focus) ──
          {
            dayLabel: 'Day 1 – Push (Strength)',
            title: 'Push A – Heavy Compounds',
            category: 'Push',
            durationMinutes: diff === 'beginner' ? 40 : 55,
            calories: diff === 'beginner' ? 300 : 420,
            exercises: [
              {
                id: `ai-${ts}-1-1`, title: 'Barbell Flat Bench Press', slug: 'bench-press',
                category: 'Chest', equipment: 'Flat Bench & Barbell', difficulty: diffLabel,
                preferredSets: setsForDiff, preferredReps: diff === 'advanced' ? '4 - 6 reps' : repsForDiff, restTimeSeconds: restForDiff,
                tips: 'Focus on bar path — lower to lower chest and press back up at a slight arc. Full scapular retraction throughout.',
                duration_minutes: 12, calories: 100,
              },
              {
                id: `ai-${ts}-1-2`, title: 'Standing Overhead Press', slug: 'overhead-press',
                category: 'Shoulders', equipment: 'Barbell', difficulty: diffLabel,
                preferredSets: setsForDiff, preferredReps: repsForDiff, restTimeSeconds: restForDiff,
                tips: 'Brace hard through your core and glutes. Press the bar vertically, moving your head slightly forward as it clears.',
                duration_minutes: 10, calories: 80,
              },
              {
                id: `ai-${ts}-1-3`, title: 'Incline Dumbbell Press', slug: 'bench-press',
                category: 'Chest', equipment: 'Incline Bench & Dumbbells', difficulty: diffLabel,
                preferredSets: setsForDiff, preferredReps: '8 - 10 reps', restTimeSeconds: 75,
                tips: 'Set bench to 30 degrees. Emphasize the stretch at the bottom and squeeze at the top.',
                duration_minutes: 10, calories: 80,
              },
              {
                id: `ai-${ts}-1-4`, title: 'Dumbbell Lateral Raises', slug: 'lateral-raise',
                category: 'Shoulders', equipment: 'Dumbbells', difficulty: diffLabel,
                preferredSets: 3, preferredReps: '12 - 15 reps', restTimeSeconds: 45,
                tips: 'Lead with elbows, tilt dumbbells slightly forward. Focus on side delt isolation.',
                duration_minutes: 7, calories: 45,
              },
              {
                id: `ai-${ts}-1-5`, title: 'Tricep Dips', slug: 'bench-press',
                category: 'Arms', equipment: 'Dip Station', difficulty: diffLabel,
                preferredSets: 3, preferredReps: diff === 'advanced' ? '8 - 12 reps (weighted)' : '10 - 15 reps', restTimeSeconds: 60,
                tips: 'Lean slightly forward for chest emphasis. Lower until upper arms are parallel, then press back up.',
                duration_minutes: 8, calories: 60,
              },
            ],
          },
          // ── PULL A (Strength Focus) ──
          {
            dayLabel: 'Day 2 – Pull (Strength)',
            title: 'Pull A – Heavy Rows & Pulls',
            category: 'Pull',
            durationMinutes: diff === 'beginner' ? 40 : 55,
            calories: diff === 'beginner' ? 290 : 410,
            exercises: [
              {
                id: `ai-${ts}-2-1`, title: diff === 'advanced' ? 'Weighted Pull-Ups' : 'Lat Pulldowns', slug: 'cable-lat-pulldown',
                category: 'Back', equipment: diff === 'advanced' ? 'Pull-Up Bar & Weight Belt' : 'Cable Machine', difficulty: diffLabel,
                preferredSets: setsForDiff, preferredReps: repsForDiff, restTimeSeconds: restForDiff,
                tips: 'Initiate with scapular depression. Drive your elbows down towards your hips.',
                duration_minutes: 12, calories: 95,
              },
              {
                id: `ai-${ts}-2-2`, title: 'Barbell Bent-Over Rows', slug: 'bent-over-row',
                category: 'Back', equipment: 'Barbell', difficulty: diffLabel,
                preferredSets: setsForDiff, preferredReps: repsForDiff, restTimeSeconds: restForDiff,
                tips: 'Maintain 45-degree torso angle. Pull to belly button, squeezing scapulae together.',
                duration_minutes: 10, calories: 85,
              },
              {
                id: `ai-${ts}-2-3`, title: 'Face Pulls', slug: 'cable-lat-pulldown',
                category: 'Shoulders', equipment: 'Cable Machine & Rope', difficulty: diffLabel,
                preferredSets: 3, preferredReps: '15 - 20 reps', restTimeSeconds: 45,
                tips: 'High elbows, pull to forehead level, externally rotate at the end. Essential for shoulder health.',
                duration_minutes: 7, calories: 45,
              },
              {
                id: `ai-${ts}-2-4`, title: 'Barbell Bicep Curls', slug: 'dumbbell-curl',
                category: 'Arms', equipment: 'EZ-Bar', difficulty: diffLabel,
                preferredSets: 3, preferredReps: '10 - 12 reps', restTimeSeconds: 45,
                tips: 'No momentum. Squeeze at peak and control the 2-second negative.',
                duration_minutes: 7, calories: 50,
              },
              {
                id: `ai-${ts}-2-5`, title: 'Hammer Curls', slug: 'dumbbell-curl',
                category: 'Arms', equipment: 'Dumbbells', difficulty: diffLabel,
                preferredSets: 3, preferredReps: '10 - 12 reps', restTimeSeconds: 45,
                tips: 'Keep palms facing each other. This targets the brachialis for wider arms.',
                duration_minutes: 7, calories: 45,
              },
            ],
          },
          // ── LEGS A (Quad Focus) ──
          {
            dayLabel: 'Day 3 – Legs (Quad Focus)',
            title: 'Legs A – Squats & Quad Dominant',
            category: 'Legs',
            durationMinutes: diff === 'beginner' ? 40 : 55,
            calories: diff === 'beginner' ? 320 : 460,
            exercises: [
              {
                id: `ai-${ts}-3-1`, title: 'Barbell Back Squats', slug: 'barbell-squat',
                category: 'Legs', equipment: 'Barbell & Squat Rack', difficulty: diffLabel,
                preferredSets: setsForDiff, preferredReps: repsForDiff, restTimeSeconds: restForDiff,
                tips: 'Full depth below parallel if mobility allows. Drive through midfoot and keep your chest tall.',
                duration_minutes: 14, calories: 120,
              },
              {
                id: `ai-${ts}-3-2`, title: 'Leg Press', slug: 'leg-press',
                category: 'Legs', equipment: 'Leg Press Machine', difficulty: diffLabel,
                preferredSets: setsForDiff, preferredReps: '10 - 12 reps', restTimeSeconds: 75,
                tips: 'Feet shoulder-width on the platform. Lower until 90 degrees, press through heels without locking out.',
                duration_minutes: 10, calories: 90,
              },
              {
                id: `ai-${ts}-3-3`, title: 'Walking Lunges', slug: 'barbell-squat',
                category: 'Legs', equipment: 'Dumbbells', difficulty: diffLabel,
                preferredSets: 3, preferredReps: '12 each leg', restTimeSeconds: 60,
                tips: 'Controlled strides, drive through the front heel to step forward.',
                duration_minutes: 10, calories: 80,
              },
              {
                id: `ai-${ts}-3-4`, title: 'Leg Extensions', slug: 'leg-press',
                category: 'Legs', equipment: 'Leg Extension Machine', difficulty: diffLabel,
                preferredSets: 3, preferredReps: '12 - 15 reps', restTimeSeconds: 45,
                tips: 'Pause at full extension and squeeze your quads hard. Control the descent.',
                duration_minutes: 8, calories: 55,
              },
              {
                id: `ai-${ts}-3-5`, title: 'Standing Calf Raises', slug: 'calf-raise',
                category: 'Legs', equipment: 'Calf Machine', difficulty: diffLabel,
                preferredSets: 4, preferredReps: '15 - 20 reps', restTimeSeconds: 45,
                tips: 'Full range of motion. 1-second hold at the top, 2-second lower.',
                duration_minutes: 7, calories: 50,
              },
            ],
          },
          // ── PUSH B (Hypertrophy Focus) ──
          {
            dayLabel: 'Day 4 – Push (Hypertrophy)',
            title: 'Push B – Volume & Isolation',
            category: 'Push',
            durationMinutes: diff === 'beginner' ? 40 : 50,
            calories: diff === 'beginner' ? 280 : 380,
            exercises: [
              {
                id: `ai-${ts}-4-1`, title: 'Dumbbell Flat Bench Press', slug: 'bench-press',
                category: 'Chest', equipment: 'Flat Bench & Dumbbells', difficulty: diffLabel,
                preferredSets: setsForDiff, preferredReps: '10 - 12 reps', restTimeSeconds: 75,
                tips: 'Wider range of motion than barbell. Lower with control, stretch the pecs at the bottom.',
                duration_minutes: 10, calories: 80,
              },
              {
                id: `ai-${ts}-4-2`, title: 'Cable Chest Flyes', slug: 'bench-press',
                category: 'Chest', equipment: 'Cable Crossover Machine', difficulty: diffLabel,
                preferredSets: 3, preferredReps: '12 - 15 reps', restTimeSeconds: 45,
                tips: 'Slight forward lean. Bring hands together with a slight bend in elbows, squeezing the pecs.',
                duration_minutes: 8, calories: 55,
              },
              {
                id: `ai-${ts}-4-3`, title: 'Arnold Press', slug: 'overhead-press',
                category: 'Shoulders', equipment: 'Dumbbells', difficulty: diffLabel,
                preferredSets: setsForDiff, preferredReps: '10 - 12 reps', restTimeSeconds: 60,
                tips: 'Start with palms facing you, rotate as you press up. This hits all three delt heads.',
                duration_minutes: 10, calories: 70,
              },
              {
                id: `ai-${ts}-4-4`, title: 'Lateral Raises', slug: 'lateral-raise',
                category: 'Shoulders', equipment: 'Dumbbells', difficulty: diffLabel,
                preferredSets: 4, preferredReps: '15 - 20 reps', restTimeSeconds: 30,
                tips: 'Use lighter weight, focus on the mind-muscle connection with your side delts.',
                duration_minutes: 7, calories: 45,
              },
              {
                id: `ai-${ts}-4-5`, title: 'Tricep Rope Pushdowns', slug: 'cable-lat-pulldown',
                category: 'Arms', equipment: 'Cable Machine & Rope', difficulty: diffLabel,
                preferredSets: 3, preferredReps: '12 - 15 reps', restTimeSeconds: 45,
                tips: 'Elbows pinned, spread the rope at the bottom. Full tricep squeeze.',
                duration_minutes: 7, calories: 40,
              },
            ],
          },
          // ── PULL B (Hypertrophy Focus) ──
          {
            dayLabel: 'Day 5 – Pull (Hypertrophy)',
            title: 'Pull B – Volume & Width',
            category: 'Pull',
            durationMinutes: diff === 'beginner' ? 40 : 50,
            calories: diff === 'beginner' ? 280 : 380,
            exercises: [
              {
                id: `ai-${ts}-5-1`, title: 'Seated Cable Rows', slug: 'cable-lat-pulldown',
                category: 'Back', equipment: 'Cable Row Machine', difficulty: diffLabel,
                preferredSets: setsForDiff, preferredReps: '10 - 12 reps', restTimeSeconds: 75,
                tips: 'Pull handle to lower chest. Squeeze shoulder blades together for 1 second at peak.',
                duration_minutes: 10, calories: 80,
              },
              {
                id: `ai-${ts}-5-2`, title: 'Wide-Grip Lat Pulldowns', slug: 'cable-lat-pulldown',
                category: 'Back', equipment: 'Cable Machine', difficulty: diffLabel,
                preferredSets: setsForDiff, preferredReps: '10 - 12 reps', restTimeSeconds: 60,
                tips: 'Grip wider than shoulder width. Drive elbows down towards your pockets.',
                duration_minutes: 10, calories: 75,
              },
              {
                id: `ai-${ts}-5-3`, title: 'Dumbbell Rows', slug: 'bent-over-row',
                category: 'Back', equipment: 'Dumbbell & Bench', difficulty: diffLabel,
                preferredSets: 3, preferredReps: '10 - 12 reps each', restTimeSeconds: 60,
                tips: 'One arm at a time for maximum mind-muscle connection. Pull towards your hip.',
                duration_minutes: 10, calories: 70,
              },
              {
                id: `ai-${ts}-5-4`, title: 'Reverse Pec Deck Flyes', slug: 'cable-lat-pulldown',
                category: 'Shoulders', equipment: 'Pec Deck Machine', difficulty: diffLabel,
                preferredSets: 3, preferredReps: '15 - 20 reps', restTimeSeconds: 45,
                tips: 'Focus on squeezing your rear delts. This balances out all the pressing volume.',
                duration_minutes: 7, calories: 40,
              },
              {
                id: `ai-${ts}-5-5`, title: 'Incline Dumbbell Curls', slug: 'dumbbell-curl',
                category: 'Arms', equipment: 'Incline Bench & Dumbbells', difficulty: diffLabel,
                preferredSets: 3, preferredReps: '10 - 12 reps', restTimeSeconds: 45,
                tips: 'Pin your back on the incline. The stretch at the bottom maximizes long-head bicep activation.',
                duration_minutes: 7, calories: 45,
              },
            ],
          },
          // ── LEGS B (Hamstring/Glute Focus) ──
          {
            dayLabel: 'Day 6 – Legs (Posterior)',
            title: 'Legs B – Hamstrings, Glutes & Calves',
            category: 'Legs',
            durationMinutes: diff === 'beginner' ? 40 : 55,
            calories: diff === 'beginner' ? 310 : 440,
            exercises: [
              {
                id: `ai-${ts}-6-1`, title: 'Romanian Deadlifts', slug: 'deadlift',
                category: 'Legs', equipment: 'Barbell', difficulty: diffLabel,
                preferredSets: setsForDiff, preferredReps: repsForDiff, restTimeSeconds: restForDiff,
                tips: 'Hinge at hips, keep bar close to body. Deep hamstring stretch before squeezing glutes to stand.',
                duration_minutes: 12, calories: 100,
              },
              {
                id: `ai-${ts}-6-2`, title: 'Bulgarian Split Squats', slug: 'barbell-squat',
                category: 'Legs', equipment: 'Dumbbells & Bench', difficulty: diffLabel,
                preferredSets: 3, preferredReps: '10 - 12 each leg', restTimeSeconds: 60,
                tips: 'Rear foot elevated on bench. Lower until your back knee nearly touches the ground.',
                duration_minutes: 12, calories: 90,
              },
              {
                id: `ai-${ts}-6-3`, title: 'Leg Curls', slug: 'leg-press',
                category: 'Legs', equipment: 'Leg Curl Machine', difficulty: diffLabel,
                preferredSets: setsForDiff, preferredReps: '10 - 12 reps', restTimeSeconds: 60,
                tips: 'Squeeze hamstrings at peak and control the negative. Don\'t swing.',
                duration_minutes: 9, calories: 65,
              },
              {
                id: `ai-${ts}-6-4`, title: 'Hip Thrusts', slug: 'deadlift',
                category: 'Legs', equipment: 'Barbell & Bench', difficulty: diffLabel,
                preferredSets: setsForDiff, preferredReps: '10 - 12 reps', restTimeSeconds: 75,
                tips: 'Drive through your heels and squeeze your glutes hard at the top. Avoid hyperextending your lower back.',
                duration_minutes: 10, calories: 80,
              },
              {
                id: `ai-${ts}-6-5`, title: 'Seated Calf Raises', slug: 'calf-raise',
                category: 'Legs', equipment: 'Seated Calf Machine', difficulty: diffLabel,
                preferredSets: 4, preferredReps: '15 - 20 reps', restTimeSeconds: 45,
                tips: 'Seated calf raises target the soleus. Pause and squeeze at the top.',
                duration_minutes: 7, calories: 45,
              },
            ],
          },
        ],
      };
    }

    // -------------------------------------------------
    // 7 DAYS/WEEK → BRO SPLIT (7-day body part)
    // -------------------------------------------------
    return {
      splitName: 'Body Part Split (7 Days)',
      difficulty: diff,
      frequency: freq,
      coachRationale: `Dedicated 7-day body part split for maximum daily training. Each day isolates one or two muscle groups, allowing extremely high per-session volume (15–25 sets per muscle group per week) while providing a full week of recovery before the same muscle group is trained again. ${diff === 'beginner' ? 'This protocol demands high consistency — movement quality is prioritized over load.' : diff === 'intermediate' ? 'A balanced blend of compound and isolation work for each muscle group.' : 'Advanced intensity techniques with heavy loads and strategic volume distribution.'}`,
      days: [
        // Day 1 – Chest
        {
          dayLabel: 'Day 1 – Chest',
          title: 'Chest Hypertrophy Day',
          category: 'Chest',
          durationMinutes: diff === 'beginner' ? 35 : 45,
          calories: diff === 'beginner' ? 250 : 350,
          exercises: [
            { id: `ai-${ts}-1-1`, title: 'Barbell Flat Bench Press', slug: 'bench-press', category: 'Chest', equipment: 'Flat Bench & Barbell', difficulty: diffLabel, preferredSets: setsForDiff, preferredReps: repsForDiff, restTimeSeconds: restForDiff, tips: 'Primary chest mass builder. Full range of motion, controlled eccentric.', duration_minutes: 12, calories: 95 },
            { id: `ai-${ts}-1-2`, title: 'Incline Dumbbell Press', slug: 'bench-press', category: 'Chest', equipment: 'Incline Bench & Dumbbells', difficulty: diffLabel, preferredSets: setsForDiff, preferredReps: '10 - 12 reps', restTimeSeconds: 75, tips: 'Targets upper chest. 30-degree incline for optimal upper pec recruitment.', duration_minutes: 10, calories: 80 },
            { id: `ai-${ts}-1-3`, title: 'Cable Crossover Flyes', slug: 'bench-press', category: 'Chest', equipment: 'Cable Machine', difficulty: diffLabel, preferredSets: 3, preferredReps: '12 - 15 reps', restTimeSeconds: 45, tips: 'Stretch and squeeze. Constant cable tension provides superior pec isolation.', duration_minutes: 8, calories: 55 },
            { id: `ai-${ts}-1-4`, title: 'Dumbbell Pullovers', slug: 'bench-press', category: 'Chest', equipment: 'Dumbbell & Bench', difficulty: diffLabel, preferredSets: 3, preferredReps: '12 reps', restTimeSeconds: 60, tips: 'Stretch your pecs and lats at the bottom. Keep a slight bend in your elbows.', duration_minutes: 8, calories: 50 },
          ],
        },
        // Day 2 – Back
        {
          dayLabel: 'Day 2 – Back',
          title: 'Back Thickness & Width',
          category: 'Back',
          durationMinutes: diff === 'beginner' ? 35 : 50,
          calories: diff === 'beginner' ? 260 : 380,
          exercises: [
            { id: `ai-${ts}-2-1`, title: diff === 'advanced' ? 'Weighted Pull-Ups' : 'Lat Pulldowns', slug: 'cable-lat-pulldown', category: 'Back', equipment: diff === 'advanced' ? 'Pull-Up Bar' : 'Cable Machine', difficulty: diffLabel, preferredSets: setsForDiff, preferredReps: repsForDiff, restTimeSeconds: restForDiff, tips: 'Width builder. Drive elbows down and back.', duration_minutes: 12, calories: 90 },
            { id: `ai-${ts}-2-2`, title: 'Barbell Bent-Over Rows', slug: 'bent-over-row', category: 'Back', equipment: 'Barbell', difficulty: diffLabel, preferredSets: setsForDiff, preferredReps: repsForDiff, restTimeSeconds: restForDiff, tips: 'Thickness builder. Pull to belly button with a neutral spine.', duration_minutes: 10, calories: 85 },
            { id: `ai-${ts}-2-3`, title: 'Seated Cable Rows', slug: 'cable-lat-pulldown', category: 'Back', equipment: 'Cable Row Machine', difficulty: diffLabel, preferredSets: setsForDiff, preferredReps: '10 - 12 reps', restTimeSeconds: 60, tips: 'Squeeze shoulder blades together at peak contraction. Full stretch forward.', duration_minutes: 10, calories: 70 },
            { id: `ai-${ts}-2-4`, title: 'Dumbbell Single-Arm Rows', slug: 'bent-over-row', category: 'Back', equipment: 'Dumbbell & Bench', difficulty: diffLabel, preferredSets: 3, preferredReps: '10 - 12 each', restTimeSeconds: 60, tips: 'Pull towards your hip for lat emphasis. Control the eccentric.', duration_minutes: 10, calories: 70 },
          ],
        },
        // Day 3 – Shoulders
        {
          dayLabel: 'Day 3 – Shoulders',
          title: 'Shoulder Development',
          category: 'Shoulders',
          durationMinutes: diff === 'beginner' ? 30 : 40,
          calories: diff === 'beginner' ? 200 : 300,
          exercises: [
            { id: `ai-${ts}-3-1`, title: 'Standing Overhead Press', slug: 'overhead-press', category: 'Shoulders', equipment: 'Barbell', difficulty: diffLabel, preferredSets: setsForDiff, preferredReps: repsForDiff, restTimeSeconds: restForDiff, tips: 'Primary delt mass builder. Strict form, full lockout overhead.', duration_minutes: 10, calories: 80 },
            { id: `ai-${ts}-3-2`, title: 'Dumbbell Lateral Raises', slug: 'lateral-raise', category: 'Shoulders', equipment: 'Dumbbells', difficulty: diffLabel, preferredSets: 4, preferredReps: '12 - 15 reps', restTimeSeconds: 45, tips: 'Lead with elbows. This is the key exercise for wider shoulders.', duration_minutes: 8, calories: 55 },
            { id: `ai-${ts}-3-3`, title: 'Face Pulls', slug: 'cable-lat-pulldown', category: 'Shoulders', equipment: 'Cable Machine & Rope', difficulty: diffLabel, preferredSets: 3, preferredReps: '15 - 20 reps', restTimeSeconds: 45, tips: 'High elbows, externally rotate. Targets rear delts and rotator cuff.', duration_minutes: 7, calories: 40 },
            { id: `ai-${ts}-3-4`, title: 'Arnold Press', slug: 'overhead-press', category: 'Shoulders', equipment: 'Dumbbells', difficulty: diffLabel, preferredSets: 3, preferredReps: '10 - 12 reps', restTimeSeconds: 60, tips: 'Rotate palms as you press. Hits all three heads of the deltoid.', duration_minutes: 8, calories: 55 },
          ],
        },
        // Day 4 – Legs
        {
          dayLabel: 'Day 4 – Legs',
          title: 'Legs Power & Hypertrophy',
          category: 'Legs',
          durationMinutes: diff === 'beginner' ? 40 : 55,
          calories: diff === 'beginner' ? 330 : 470,
          exercises: [
            { id: `ai-${ts}-4-1`, title: 'Barbell Back Squats', slug: 'barbell-squat', category: 'Legs', equipment: 'Barbell & Squat Rack', difficulty: diffLabel, preferredSets: setsForDiff, preferredReps: repsForDiff, restTimeSeconds: restForDiff, tips: 'King of leg exercises. Full depth, drive through midfoot.', duration_minutes: 14, calories: 120 },
            { id: `ai-${ts}-4-2`, title: 'Romanian Deadlifts', slug: 'deadlift', category: 'Legs', equipment: 'Barbell', difficulty: diffLabel, preferredSets: setsForDiff, preferredReps: repsForDiff, restTimeSeconds: restForDiff, tips: 'Hinge at hips, deep hamstring stretch, squeeze glutes to stand.', duration_minutes: 12, calories: 100 },
            { id: `ai-${ts}-4-3`, title: 'Leg Press', slug: 'leg-press', category: 'Legs', equipment: 'Leg Press Machine', difficulty: diffLabel, preferredSets: setsForDiff, preferredReps: '10 - 12 reps', restTimeSeconds: 75, tips: 'High foot placement for glutes/hams, low for quads.', duration_minutes: 10, calories: 85 },
            { id: `ai-${ts}-4-4`, title: 'Walking Lunges', slug: 'barbell-squat', category: 'Legs', equipment: 'Dumbbells', difficulty: diffLabel, preferredSets: 3, preferredReps: '12 each leg', restTimeSeconds: 60, tips: 'Controlled strides, push off front heel.', duration_minutes: 10, calories: 75 },
            { id: `ai-${ts}-4-5`, title: 'Standing Calf Raises', slug: 'calf-raise', category: 'Legs', equipment: 'Calf Machine', difficulty: diffLabel, preferredSets: 4, preferredReps: '15 - 20 reps', restTimeSeconds: 45, tips: 'Pause at top, slow descent. Full range of motion.', duration_minutes: 7, calories: 50 },
          ],
        },
        // Day 5 – Arms
        {
          dayLabel: 'Day 5 – Arms',
          title: 'Biceps & Triceps',
          category: 'Arms',
          durationMinutes: diff === 'beginner' ? 30 : 40,
          calories: diff === 'beginner' ? 200 : 280,
          exercises: [
            { id: `ai-${ts}-5-1`, title: 'Barbell Bicep Curls', slug: 'dumbbell-curl', category: 'Arms', equipment: 'EZ-Bar', difficulty: diffLabel, preferredSets: setsForDiff, preferredReps: '10 - 12 reps', restTimeSeconds: 60, tips: 'No momentum. Squeeze at peak and control the descent.', duration_minutes: 8, calories: 50 },
            { id: `ai-${ts}-5-2`, title: 'Incline Dumbbell Curls', slug: 'dumbbell-curl', category: 'Arms', equipment: 'Incline Bench & Dumbbells', difficulty: diffLabel, preferredSets: 3, preferredReps: '10 - 12 reps', restTimeSeconds: 45, tips: 'Maximum stretch on bicep long head. Pin back against the bench.', duration_minutes: 7, calories: 40 },
            { id: `ai-${ts}-5-3`, title: 'Close-Grip Bench Press', slug: 'bench-press', category: 'Arms', equipment: 'Flat Bench & Barbell', difficulty: diffLabel, preferredSets: setsForDiff, preferredReps: repsForDiff, restTimeSeconds: restForDiff, tips: 'Hands shoulder-width apart. Tuck elbows to target triceps.', duration_minutes: 10, calories: 70 },
            { id: `ai-${ts}-5-4`, title: 'Tricep Rope Pushdowns', slug: 'cable-lat-pulldown', category: 'Arms', equipment: 'Cable Machine & Rope', difficulty: diffLabel, preferredSets: 3, preferredReps: '12 - 15 reps', restTimeSeconds: 45, tips: 'Spread the rope at the bottom for peak tricep contraction.', duration_minutes: 7, calories: 40 },
            { id: `ai-${ts}-5-5`, title: 'Hammer Curls', slug: 'dumbbell-curl', category: 'Arms', equipment: 'Dumbbells', difficulty: diffLabel, preferredSets: 3, preferredReps: '10 - 12 reps', restTimeSeconds: 45, tips: 'Neutral grip targets the brachialis for arm width.', duration_minutes: 7, calories: 40 },
          ],
        },
        // Day 6 – Core & Conditioning
        {
          dayLabel: 'Day 6 – Core & Conditioning',
          title: 'Core Strength & Cardio',
          category: 'Core',
          durationMinutes: diff === 'beginner' ? 30 : 40,
          calories: diff === 'beginner' ? 220 : 320,
          exercises: [
            { id: `ai-${ts}-6-1`, title: 'Hanging Leg Raises', slug: 'core-plank', category: 'Core', equipment: 'Pull-Up Bar', difficulty: diffLabel, preferredSets: setsForDiff, preferredReps: '12 - 15 reps', restTimeSeconds: 60, tips: 'Curl your pelvis up toward your ribs. Avoid swinging.', duration_minutes: 8, calories: 55 },
            { id: `ai-${ts}-6-2`, title: 'Cable Woodchops', slug: 'cable-lat-pulldown', category: 'Core', equipment: 'Cable Machine', difficulty: diffLabel, preferredSets: 3, preferredReps: '12 each side', restTimeSeconds: 45, tips: 'Rotate through your core, not your arms. Control the movement.', duration_minutes: 8, calories: 50 },
            { id: `ai-${ts}-6-3`, title: 'Plank Variations', slug: 'core-plank', category: 'Core', equipment: 'Bodyweight', difficulty: diffLabel, preferredSets: 3, preferredReps: '45 - 60s hold', restTimeSeconds: 45, tips: 'Alternate between standard plank, side plank, and RKC plank each set.', duration_minutes: 8, calories: 45 },
            { id: `ai-${ts}-6-4`, title: 'Battle Ropes or Rowing', slug: 'core-plank', category: 'Cardio', equipment: 'Battle Ropes or Rower', difficulty: diffLabel, preferredSets: 4, preferredReps: '30 - 45s intervals', restTimeSeconds: 45, tips: 'High intensity intervals. Maximum effort for each round.', duration_minutes: 10, calories: 100 },
          ],
        },
        // Day 7 – Active Recovery
        {
          dayLabel: 'Day 7 – Active Recovery',
          title: 'Recovery & Mobility',
          category: 'Recovery',
          durationMinutes: 30,
          calories: 120,
          exercises: [
            { id: `ai-${ts}-7-1`, title: 'Foam Rolling', slug: 'core-plank', category: 'Recovery', equipment: 'Foam Roller', difficulty: 'Beginner', preferredSets: 1, preferredReps: '2 min per area', restTimeSeconds: 0, tips: 'Roll slowly over each muscle group — quads, hamstrings, back, and lats. Pause on tender spots.', duration_minutes: 10, calories: 30 },
            { id: `ai-${ts}-7-2`, title: 'Dynamic Stretching', slug: 'core-plank', category: 'Recovery', equipment: 'Bodyweight', difficulty: 'Beginner', preferredSets: 1, preferredReps: '10 each side', restTimeSeconds: 0, tips: 'Leg swings, hip circles, arm circles, and world\'s greatest stretch.', duration_minutes: 10, calories: 40 },
            { id: `ai-${ts}-7-3`, title: 'Light Walking or Yoga', slug: 'core-plank', category: 'Recovery', equipment: 'None', difficulty: 'Beginner', preferredSets: 1, preferredReps: '10 - 15 minutes', restTimeSeconds: 0, tips: 'Low intensity movement to promote blood flow and recovery. Keep heart rate under 120 bpm.', duration_minutes: 10, calories: 50 },
          ],
        },
      ],
    };
  };

  const handleSaveAllDays = () => {
    if (!generatedSplit) return;

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Haptics optional
    }

    generatedSplit.days.forEach((day, index) => {
      const newRoutine: CustomRoutineWorkout = {
        id: `custom-ai-${Date.now()}-${index}`,
        title: day.title,
        slug: `ai-routine-${generatedSplit.difficulty}-day${index + 1}`,
        category: day.category,
        duration_minutes: day.durationMinutes,
        calories: day.calories,
        difficulty: generatedSplit.difficulty,
        equipment: 'Full Gym Setup',
        sets: day.exercises.reduce((sum, e) => sum + e.preferredSets, 0),
        reps: 10,
        sets_reps: `${day.exercises.length} Exercises`,
        image_url: '',
        description: `${generatedSplit.splitName} — ${day.dayLabel}. ${generatedSplit.coachRationale}`,
        completion_percentage: 0,
        is_favorite: false,
        source: 'local',
        primaryMuscle: day.category,
        secondaryMuscles: [],
        exerciseType: 'strength',
        isCustomRoutine: true,
        routineExercises: day.exercises,
      };
      addCustomWorkout(newRoutine);
    });

    navigation.navigate('MainTabs', {
      screen: 'CatalogTab',
    });
  };

  const handleStartDayWorkout = () => {
    if (!generatedSplit) return;

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Haptics optional
    }

    const day = generatedSplit.days[activeDayIndex];
    if (!day) return;
    const newRoutine: CustomRoutineWorkout = {
      id: `custom-ai-${Date.now()}`,
      title: day.title,
      slug: `ai-routine-${generatedSplit.difficulty}-day${activeDayIndex + 1}`,
      category: day.category,
      duration_minutes: day.durationMinutes,
      calories: day.calories,
      difficulty: generatedSplit.difficulty,
      equipment: 'Full Gym Setup',
      sets: day.exercises.reduce((sum, e) => sum + e.preferredSets, 0),
      reps: 10,
      sets_reps: `${day.exercises.length} Exercises`,
      image_url: '',
      description: `${generatedSplit.splitName} — ${day.dayLabel}. ${generatedSplit.coachRationale}`,
      completion_percentage: 0,
      is_favorite: false,
      source: 'local',
      primaryMuscle: day.category,
      secondaryMuscles: [],
      exerciseType: 'strength',
      isCustomRoutine: true,
      routineExercises: day.exercises,
    };

    addCustomWorkout(newRoutine);
    navigation.replace('CustomWorkoutDetailScreen', { routineId: newRoutine.id });
  };

  const handleRegenerate = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Haptics optional
    }
    setGeneratedSplit(null);
    setActiveDayIndex(0);
    setCurrentStep(3);
  };

  // Agentic Reasoning Steps Definition
  const REASONING_STEPS = [
    {
      title: `Analyzing training frequency (${selectedFrequency} days/wk)`,
      desc: 'Determining optimal split type and recovery windows',
    },
    {
      title: `Calibrating ${selectedDifficulty.toUpperCase()} intensity`,
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
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header for Setup Steps (1 and 2) */}
      {currentStep <= 2 && (
        <View style={styles.topSection}>
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => {
                if (currentStep === 1) {
                  navigation.goBack();
                } else {
                  setCurrentStep(1);
                }
              }}
              style={styles.backButton}
              accessibilityLabel="Back"
            >
              <ChevronLeft size={22} color={colors.text} strokeWidth={2.5} />
            </TouchableOpacity>

            <View style={styles.aiPillHeader}>
              <Sparkles size={14} color="#0A0A0A" />
              <Text style={styles.aiPillHeaderText}>AI GENERATOR</Text>
            </View>

            <Text style={styles.stepCounterText}>Step {currentStep} of 2</Text>
          </View>

          {/* Continuous Progress Bar */}
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressWidth.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        </View>
      )}

      {/* Top Header for Result View (Step 4) */}
      {currentStep === 4 && (
        <View style={styles.resultHeader}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            accessibilityLabel="Close"
          >
            <ChevronLeft size={22} color={colors.text} strokeWidth={2.5} />
          </TouchableOpacity>

          <Text style={styles.resultHeaderTitle}>AI Generated Split</Text>

          <TouchableOpacity
            onPress={handleRegenerate}
            style={styles.regenerateHeaderBtn}
            accessibilityLabel="Regenerate"
          >
            <RotateCcw size={18} color="#0A0A0A" />
          </TouchableOpacity>
        </View>
      )}

      {/* ======================================================== */}
      {/* STEP 1: WORKOUT FREQUENCY SELECTION                      */}
      {/* ======================================================== */}
      {currentStep === 1 && (
        <View style={styles.screenWrapper}>
          <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
            <View style={styles.headingBlock}>
              <View style={styles.badgeRow}>
                <Clock size={15} color="#0A0A0A" />
                <Text style={styles.badgeRowText}>TRAINING SCHEDULE</Text>
              </View>
              <Text style={styles.headingTitle}>How often do you train?</Text>
              <Text style={styles.headingSubtitle}>
                Select your intended weekly frequency so GymFlow AI can calibrate volume, muscle splits, and recovery windows.
              </Text>
            </View>

            <View style={styles.optionsStack}>
              {[
                {
                  id: '1-2' as FrequencyOption,
                  title: '1–2 Days / week',
                  tag: 'Full Body',
                  desc: 'Full-body training each session. Maximum stimulus with minimal time investment.',
                },
                {
                  id: '3-4' as FrequencyOption,
                  title: '3–4 Days / week',
                  tag: 'Push/Pull/Legs',
                  desc: 'The gold standard PPL split for muscle hypertrophy and progressive overload.',
                },
                {
                  id: '5-6' as FrequencyOption,
                  title: '5–6 Days / week',
                  tag: 'PPL ×2',
                  desc: 'Double rotation push-pull-legs for maximum weekly volume and frequency.',
                },
                {
                  id: '7' as FrequencyOption,
                  title: 'Everyday (7 Days)',
                  tag: 'Body Part Split',
                  desc: 'Dedicated body part split with active recovery. Full dedication protocol.',
                },
              ].map((item) => {
                const isSelected = selectedFrequency === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.optionCard, isSelected && styles.optionCardActive]}
                    onPress={() => {
                      try {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      } catch {
                        // Haptics optional
                      }
                      setSelectedFrequency(item.id);
                    }}
                    activeOpacity={0.85}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={styles.optionHeaderRow}>
                        <Text style={[styles.optionTitleText, isSelected && styles.optionTitleTextActive]}>
                          {item.title}
                        </Text>
                        <View style={[styles.badgePill, isSelected && styles.badgePillActive]}>
                          <Text style={[styles.badgePillText, isSelected && styles.badgePillTextActive]}>
                            {item.tag}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.optionDescText}>{item.desc}</Text>
                    </View>

                    <View style={[styles.radioOuter, isSelected && styles.radioOuterActive]}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Bottom Action Bar */}
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                } catch {
                  // Haptics optional
                }
                setCurrentStep(2);
              }}
              activeOpacity={0.88}
            >
              <Text style={styles.primaryBtnText}>Continue to Difficulty</Text>
              <ArrowRight size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ======================================================== */}
      {/* STEP 2: WORKOUT DIFFICULTY SELECTION                     */}
      {/* ======================================================== */}
      {currentStep === 2 && (
        <View style={styles.screenWrapper}>
          <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
            <View style={styles.headingBlock}>
              <View style={styles.badgeRow}>
                <Target size={15} color="#0A0A0A" />
                <Text style={styles.badgeRowText}>INTENSITY CALIBRATION</Text>
              </View>
              <Text style={styles.headingTitle}>What is your target difficulty?</Text>
              <Text style={styles.headingSubtitle}>
                Calibrates technical complexity of exercises, mechanical tension, and target rest periods.
              </Text>
            </View>

            <View style={styles.optionsStack}>
              {[
                {
                  id: 'beginner' as DifficultyOption,
                  title: 'Beginner',
                  badge: 'Foundation',
                  desc: 'Movement pattern mastery, controlled tempo, and generous rest intervals for joint integrity.',
                },
                {
                  id: 'intermediate' as DifficultyOption,
                  title: 'Intermediate',
                  badge: 'Optimal Hypertrophy',
                  desc: 'Compound and accessory synergy, progressive overload, and standard rest periods.',
                },
                {
                  id: 'advanced' as DifficultyOption,
                  title: 'Advanced',
                  badge: 'High Mechanical Tension',
                  desc: 'Heavy multi-joint compound anchors, intensity techniques, strict rest, and peak output.',
                },
              ].map((item) => {
                const isSelected = selectedDifficulty === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.optionCard, isSelected && styles.optionCardActive]}
                    onPress={() => {
                      try {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      } catch {
                        // Haptics optional
                      }
                      setSelectedDifficulty(item.id);
                    }}
                    activeOpacity={0.85}
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

                    <View style={[styles.radioOuter, isSelected && styles.radioOuterActive]}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Bottom Action Bar */}
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={[styles.primaryBtn, styles.generateBtn]}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                } catch {
                  // Haptics optional
                }
                setCurrentStep(3);
              }}
              activeOpacity={0.88}
            >
              <Sparkles size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.primaryBtnText}>Generate AI Workout</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ======================================================== */}
      {/* STEP 3: AGENTIC AI LOADING & REASONING SCREEN           */}
      {/* ======================================================== */}
      {currentStep === 3 && (
        <Animated.View style={[styles.agenticLoadingFull, { opacity: fadeAnim }]}>
          <ScrollView
            contentContainerStyle={styles.agenticScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Pulsing AI Core */}
            <View style={styles.coreWrapper}>
              <Animated.View
                style={[
                  styles.coreAuraOuter,
                  {
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.coreAuraMiddle,
                  {
                    transform: [{ scale: Animated.multiply(pulseAnim, 0.85) }],
                  },
                ]}
              />
              <View style={styles.coreOrb}>
                <Bot size={34} color="#0A0A0A" />
              </View>
            </View>

            <View style={styles.agenticHeading}>
              <Text style={styles.agenticTitle}>Synthesizing AI Protocol</Text>
              <Text style={styles.agenticSubtitle}>
                GymFlow AI is designing your personalized {selectedFrequency}-day workout split.
              </Text>
              {/* Animated dots */}
              <View style={styles.dotsRow}>
                {dotAnims.map((dotAnim, i) => (
                  <Animated.View
                    key={i}
                    style={[
                      styles.thinkingDot,
                      {
                        opacity: dotAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.25, 1],
                        }),
                        transform: [{
                          scale: dotAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.8, 1.2],
                          }),
                        }],
                      },
                    ]}
                  />
                ))}
              </View>
            </View>

            {/* Agentic Reasoning Live Timeline */}
            <View style={styles.reasoningTimeline}>
              {REASONING_STEPS.map((step, idx) => {
                const isDone = agentStepIndex > idx;
                const isCurrent = agentStepIndex === idx;
                const isPending = agentStepIndex < idx;

                return (
                  <View key={idx} style={styles.reasoningStepRow}>
                    <View style={styles.reasoningIconColumn}>
                      {isDone ? (
                        <View style={styles.checkSquircle}>
                          <Check size={13} color="#FFFFFF" strokeWidth={3} />
                        </View>
                      ) : isCurrent ? (
                        <View style={styles.spinnerSquircle}>
                          <ActivityIndicator size="small" color="#0A0A0A" />
                        </View>
                      ) : (
                        <View style={styles.pendingDot} />
                      )}
                      {idx < REASONING_STEPS.length - 1 && (
                        <View
                          style={[
                            styles.stepConnector,
                            isDone && styles.stepConnectorDone,
                          ]}
                        />
                      )}
                    </View>

                    <View
                      style={[
                        styles.reasoningTextWrap,
                        isPending && { opacity: 0.3 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.reasoningStepTitle,
                          isCurrent && styles.reasoningStepTitleActive,
                        ]}
                      >
                        {step.title}
                      </Text>
                      <Text style={styles.reasoningStepDesc}>{step.desc}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </Animated.View>
      )}

      {/* ======================================================== */}
      {/* STEP 4: AI GENERATED WORKOUT SPLIT REVEAL               */}
      {/* ======================================================== */}
      {currentStep === 4 && generatedSplit && (
        <View style={styles.screenWrapper}>
          <ScrollView
            contentContainerStyle={styles.resultScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Split Overview Hero Card */}
            <View style={styles.routineHeroCard}>
              <View style={styles.heroAiBadgeRow}>
                <View style={styles.heroAiBadge}>
                  <Sparkles size={13} color="#FFFFFF" />
                  <Text style={styles.heroAiBadgeText}>AI GENERATED SPLIT</Text>
                </View>
                <View style={styles.frequencyTag}>
                  <Text style={styles.frequencyTagText}>
                    {generatedSplit.frequency === '7' ? '7' : generatedSplit.frequency} DAYS/WK
                  </Text>
                </View>
              </View>

              <Text style={styles.routineHeroTitle}>{generatedSplit.splitName}</Text>

              {/* Summary metrics */}
              <View style={styles.heroMetricsStrip}>
                <View style={styles.heroMetricItem}>
                  <Calendar size={14} color="#0A0A0A" />
                  <Text style={styles.heroMetricValue}>
                    {generatedSplit.days.length} Days
                  </Text>
                </View>
                <View style={styles.heroMetricDivider} />
                <View style={styles.heroMetricItem}>
                  <Zap size={14} color="#0A0A0A" />
                  <Text style={styles.heroMetricValue}>
                    {generatedSplit.difficulty.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.heroMetricDivider} />
                <View style={styles.heroMetricItem}>
                  <Dumbbell size={14} color="#0A0A0A" />
                  <Text style={styles.heroMetricValue}>
                    {generatedSplit.days.reduce((sum, d) => sum + d.exercises.length, 0)} Total
                  </Text>
                </View>
              </View>
            </View>

            {/* AI Coach Rationale Card */}
            <View style={styles.coachRationaleCard}>
              <View style={styles.coachHeaderRow}>
                <View style={styles.coachIconSquircle}>
                  <Bot size={18} color="#0A0A0A" />
                </View>
                <Text style={styles.coachHeaderTitle}>AI Coach Rationale</Text>
              </View>
              <Text style={styles.coachRationaleText}>
                {generatedSplit.coachRationale}
              </Text>
            </View>

            {/* Day Tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.dayTabsScroll}
              contentContainerStyle={styles.dayTabsContent}
            >
              {generatedSplit.days.map((day, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.dayTab,
                    activeDayIndex === idx && styles.dayTabActive,
                  ]}
                  onPress={() => {
                    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                    setActiveDayIndex(idx);
                  }}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.dayTabText,
                      activeDayIndex === idx && styles.dayTabTextActive,
                    ]}
                  >
                    {day.dayLabel}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Active Day Detail */}
            {(() => {
              const activeDay = generatedSplit.days[activeDayIndex];
              if (!activeDay) return null;
              return (
                <View style={styles.dayDetailWrap}>
                  <View style={styles.dayDetailHeader}>
                    <Text style={styles.dayDetailTitle}>{activeDay.title}</Text>
                    <View style={styles.dayDetailMetrics}>
                      <View style={styles.dayMetricPill}>
                        <Clock size={12} color="#0A0A0A" />
                        <Text style={styles.dayMetricText}>{activeDay.durationMinutes} min</Text>
                      </View>
                      <View style={styles.dayMetricPill}>
                        <Flame size={12} color="#0A0A0A" />
                        <Text style={styles.dayMetricText}>~{activeDay.calories} kcal</Text>
                      </View>
                      <View style={styles.dayMetricPill}>
                        <Dumbbell size={12} color="#0A0A0A" />
                        <Text style={styles.dayMetricText}>{activeDay.exercises.length} exercises</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.exercisesListStack}>
                    {activeDay.exercises.map((ex, index) => (
                      <View key={ex.id} style={styles.exerciseItemCard}>
                        <View style={styles.exerciseStepBadge}>
                          <Text style={styles.exerciseStepText}>{index + 1}</Text>
                        </View>

                        <View style={styles.exerciseIllustrationWrap}>
                          <WorkoutIllustration slug={ex.slug} size={50} />
                        </View>

                        <View style={styles.exerciseDetails}>
                          <Text style={styles.exerciseTitleText} numberOfLines={1}>
                            {ex.title}
                          </Text>
                          <Text style={styles.exerciseEquipmentText}>
                            {ex.equipment} • {ex.category}
                          </Text>

                          <View style={styles.exerciseSpecPillsRow}>
                            <View style={styles.specPill}>
                              <Dumbbell size={11} color="#0A0A0A" />
                              <Text style={styles.specPillText}>
                                {ex.preferredSets} Sets × {ex.preferredReps}
                              </Text>
                            </View>
                            {ex.restTimeSeconds > 0 && (
                              <View style={[styles.specPill, { marginLeft: 6 }]}>
                                <Clock size={11} color="#0A0A0A" />
                                <Text style={styles.specPillText}>
                                  {ex.restTimeSeconds}s rest
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })()}
          </ScrollView>

          {/* Bottom Action Bar */}
          <View style={styles.resultBottomBar}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleStartDayWorkout}
              activeOpacity={0.88}
            >
              <Dumbbell size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.primaryBtnText}>
                Start {generatedSplit.days[activeDayIndex]?.dayLabel || 'Workout'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondarySaveBtn}
              onPress={handleSaveAllDays}
              activeOpacity={0.8}
            >
              <Text style={styles.secondarySaveBtnText}>
                Save All {generatedSplit.days.length} Days to My Workouts
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  screenWrapper: {
    flex: 1,
  },
  topSection: {
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F7',
  },
  aiPillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  aiPillHeaderText: {
    fontSize: 11,
    fontFamily: typography.fonts.headingBold,
    color: '#0A0A0A',
    letterSpacing: 0.5,
  },
  stepCounterText: {
    fontSize: 12,
    fontFamily: typography.fonts.headingSemiBold,
    color: '#8E8E8E',
  },
  progressTrack: {
    width: '100%',
    height: 3,
    backgroundColor: '#EAEAED',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0A0A0A',
  },

  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F2',
  },
  resultHeaderTitle: {
    fontSize: 16,
    fontFamily: typography.fonts.headingBold,
    color: '#0A0A0A',
  },
  regenerateHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F7',
  },

  scrollBody: {
    padding: 20,
    paddingBottom: 40,
  },
  headingBlock: {
    marginBottom: 24,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  badgeRowText: {
    fontSize: 11,
    fontFamily: typography.fonts.headingBold,
    color: '#0A0A0A',
    letterSpacing: 0.6,
  },
  headingTitle: {
    fontSize: 26,
    fontFamily: typography.fonts.headingBlack,
    color: '#0A0A0A',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  headingSubtitle: {
    fontSize: 14,
    fontFamily: typography.fonts.headingRegular,
    color: '#6B6B6B',
    lineHeight: 20,
  },

  optionsStack: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#EAEAED',
    borderRadius: 16,
    padding: 18,
  },
  optionCardActive: {
    borderColor: '#0A0A0A',
    backgroundColor: '#F7F7F8',
  },
  optionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  optionTitleText: {
    fontSize: 16,
    fontFamily: typography.fonts.headingBold,
    color: '#0A0A0A',
    marginRight: 8,
  },
  optionTitleTextActive: {
    color: '#0A0A0A',
  },
  badgePill: {
    backgroundColor: '#F0F0F2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgePillActive: {
    backgroundColor: '#0A0A0A',
  },
  badgePillText: {
    fontSize: 10,
    fontFamily: typography.fonts.headingSemiBold,
    color: '#6B6B6B',
    textTransform: 'uppercase',
  },
  badgePillTextActive: {
    color: '#FFFFFF',
  },
  optionDescText: {
    fontSize: 12,
    fontFamily: typography.fonts.headingRegular,
    color: '#737373',
    lineHeight: 18,
    paddingRight: 8,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D4D4D8',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  radioOuterActive: {
    borderColor: '#0A0A0A',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0A0A0A',
  },

  bottomBar: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F2',
  },
  primaryBtn: {
    backgroundColor: '#0A0A0A',
    minHeight: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  generateBtn: {
    backgroundColor: '#0A0A0A',
  },
  primaryBtnText: {
    fontSize: 15,
    fontFamily: typography.fonts.headingBold,
    color: '#FFFFFF',
  },

  /* Agentic Loading Screen — flat on background, no card/container */
  agenticLoadingFull: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  agenticScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coreWrapper: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  coreAuraOuter: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#F0F0F2',
    opacity: 0.6,
  },
  coreAuraMiddle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EAEAED',
    opacity: 0.5,
  },
  coreOrb: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0A0A0A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  agenticHeading: {
    alignItems: 'center',
    marginBottom: 32,
  },
  agenticTitle: {
    fontSize: 24,
    fontFamily: typography.fonts.headingBlack,
    color: '#0A0A0A',
    marginBottom: 8,
    textAlign: 'center',
  },
  agenticSubtitle: {
    fontSize: 14,
    fontFamily: typography.fonts.headingRegular,
    color: '#6B6B6B',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  thinkingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0A0A0A',
  },

  /* Reasoning timeline — no card, just clean vertical list */
  reasoningTimeline: {
    width: '100%',
    paddingHorizontal: 4,
    gap: 20,
  },
  reasoningStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  reasoningIconColumn: {
    width: 24,
    alignItems: 'center',
    marginRight: 14,
  },
  checkSquircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerSquircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D4D4D8',
    marginTop: 6,
  },
  stepConnector: {
    width: 2,
    height: 24,
    backgroundColor: '#EAEAED',
    marginVertical: 4,
  },
  stepConnectorDone: {
    backgroundColor: '#16A34A',
  },
  reasoningTextWrap: {
    flex: 1,
  },
  reasoningStepTitle: {
    fontSize: 13,
    fontFamily: typography.fonts.headingSemiBold,
    color: '#0A0A0A',
  },
  reasoningStepTitleActive: {
    fontFamily: typography.fonts.headingBold,
    color: '#0A0A0A',
  },
  reasoningStepDesc: {
    fontSize: 11,
    fontFamily: typography.fonts.headingRegular,
    color: '#737373',
    marginTop: 2,
    lineHeight: 16,
  },

  /* Step 4: Result View */
  resultScrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  routineHeroCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#EAEAED',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  heroAiBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  heroAiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  heroAiBadgeText: {
    fontSize: 10,
    fontFamily: typography.fonts.headingBold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  frequencyTag: {
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  frequencyTagText: {
    fontSize: 10,
    fontFamily: typography.fonts.headingBold,
    color: '#6B6B6B',
  },
  routineHeroTitle: {
    fontSize: 22,
    fontFamily: typography.fonts.headingBlack,
    color: '#0A0A0A',
    letterSpacing: -0.4,
    marginBottom: 16,
  },
  heroMetricsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F7F8',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  heroMetricItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  heroMetricValue: {
    fontSize: 12,
    fontFamily: typography.fonts.headingBold,
    color: '#0A0A0A',
  },
  heroMetricDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#EAEAED',
  },

  coachRationaleCard: {
    backgroundColor: '#F7F7F8',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EAEAED',
    padding: 16,
    marginBottom: 20,
  },
  coachHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  coachIconSquircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EAEAED',
  },
  coachHeaderTitle: {
    fontSize: 13,
    fontFamily: typography.fonts.headingBold,
    color: '#0A0A0A',
  },
  coachRationaleText: {
    fontSize: 12,
    fontFamily: typography.fonts.headingRegular,
    color: '#525252',
    lineHeight: 18,
  },

  /* Day Tabs */
  dayTabsScroll: {
    marginBottom: 16,
    maxHeight: 44,
  },
  dayTabsContent: {
    gap: 8,
    paddingRight: 8,
  },
  dayTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F5F5F7',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  dayTabActive: {
    backgroundColor: '#0A0A0A',
    borderColor: '#0A0A0A',
  },
  dayTabText: {
    fontSize: 12,
    fontFamily: typography.fonts.headingBold,
    color: '#6B6B6B',
  },
  dayTabTextActive: {
    color: '#FFFFFF',
  },

  /* Day Detail */
  dayDetailWrap: {
    marginBottom: 16,
  },
  dayDetailHeader: {
    marginBottom: 12,
  },
  dayDetailTitle: {
    fontSize: 17,
    fontFamily: typography.fonts.headingBold,
    color: '#0A0A0A',
    marginBottom: 8,
  },
  dayDetailMetrics: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  dayMetricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 5,
  },
  dayMetricText: {
    fontSize: 11,
    fontFamily: typography.fonts.headingSemiBold,
    color: '#0A0A0A',
  },

  exercisesListStack: {
    gap: 10,
  },
  exerciseItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAEAED',
    borderRadius: 16,
    padding: 14,
  },
  exerciseStepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  exerciseStepText: {
    fontSize: 11,
    fontFamily: typography.fonts.headingBold,
    color: '#0A0A0A',
  },
  exerciseIllustrationWrap: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  exerciseDetails: {
    flex: 1,
  },
  exerciseTitleText: {
    fontSize: 14,
    fontFamily: typography.fonts.headingBold,
    color: '#0A0A0A',
    marginBottom: 2,
  },
  exerciseEquipmentText: {
    fontSize: 11,
    fontFamily: typography.fonts.headingRegular,
    color: '#737373',
    marginBottom: 6,
  },
  exerciseSpecPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  specPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  specPillText: {
    fontSize: 10,
    fontFamily: typography.fonts.headingBold,
    color: '#0A0A0A',
  },

  resultBottomBar: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F2',
    gap: 8,
  },
  secondarySaveBtn: {
    minHeight: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F7',
  },
  secondarySaveBtnText: {
    fontSize: 14,
    fontFamily: typography.fonts.headingSemiBold,
    color: '#0A0A0A',
  },
});
