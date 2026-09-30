import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  TextInput, FlatList, KeyboardAvoidingView, Platform,
  Animated, Easing, Modal, Dimensions, Image, Pressable,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, ArrowUp, Bot, Menu, Plus, Trash2, X, Mic, SquarePen, Clock } from '../components/icons';
import * as Haptics from 'expo-haptics';
import { colors, typography, borderRadius } from '../theme';
import { getDatabase } from '../db/connection';
import * as Crypto from 'expo-crypto';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { PrismBackground } from '../components/PrismBackground';
import { TypewriterPlaceholder } from '../components/TypewriterPlaceholder';
import { TypewriterText } from '../components/TypewriterText';
import { VoicePill } from '../components/VoicePill';
import { calculateDailyCalorieTarget, resolveAge } from '../utils/nutritionCalculator';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = Math.min(320, Math.round(SCREEN_WIDTH * 0.82));
const APPLE_FONT_FAMILY = Platform.OS === 'web'
  ? '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif'
  : Platform.OS === 'ios'
  ? 'System'
  : 'System';

interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatSession {
  sessionId: string;
  title: string;
  lastActivity: string;
  messageCount: number;
}

// ─── Full health/fitness context sent to the AI Coach ──────────────────────
interface UserHealthContext {
  // Body metrics
  weight_kg: number | null;
  height_cm: number | null;
  gender: string | null;
  age: number | null;
  bmi: number | null;
  fitness_goal: string | null;
  // Training preferences
  weekly_workout_goal: number;
  intensity: string;
  // Nutrition — today
  daily_calorie_target: number | null;
  calories_consumed_today: number;
  protein_g_today: number;
  carbs_g_today: number;
  fat_g_today: number;
  meals_logged_today: string[];
  // Water — today
  water_intake_ml_today: number;
  water_target_ml: number | null;
  // Workout history
  recent_workouts: { title: string; date: string; calories_burned: number }[];
  workouts_this_week: number;
  current_streak_days: number;
}

function localDateKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Gather the user's full health & fitness snapshot from SQLite + auth store.
 * Runs on screen focus so the AI always has the latest numbers.
 */
async function gatherUserHealthContext(
  user: { weight_kg?: number; height_cm?: number; gender?: string; birthdate?: string; fitness_goal?: string } | null,
): Promise<UserHealthContext> {
  const db = await getDatabase();
  const dateKey = localDateKey();

  // 1. Preferences
  const prefs = await db.getFirstAsync<{
    weight_kg: number | null;
    weekly_workout_goal: number;
    intensity: string;
    fitness_goal: string | null;
  }>('SELECT weight_kg, weekly_workout_goal, intensity, fitness_goal FROM Preferences WHERE id = ?', ['default']);

  // 2. Body metrics — prefer Preferences weight, fallback to auth store
  const weight = prefs?.weight_kg ?? user?.weight_kg ?? null;
  const height = user?.height_cm ?? null;
  const gender = user?.gender ?? null;
  const age = user?.birthdate ? resolveAge({ birthdate: user.birthdate }) : null;
  const bmi = (weight && height) ? +(weight / ((height / 100) ** 2)).toFixed(1) : null;
  const fitnessGoal = prefs?.fitness_goal ?? user?.fitness_goal ?? null;

  // 3. Calorie target via Mifflin-St Jeor
  let dailyCalorieTarget: number | null = null;
  if (weight && height && gender) {
    try {
      const result = calculateDailyCalorieTarget({
        weightKg: weight,
        heightCm: height,
        gender,
        birthdate: user?.birthdate,
        fitnessGoal: fitnessGoal ?? 'maintain',
      });
      dailyCalorieTarget = result.targetCalories;
    } catch { /* graceful fallback */ }
  }

  // 4. Today's nutrition totals
  const nutritionRow = await db.getFirstAsync<{
    total_cal: number; total_p: number; total_c: number; total_f: number;
  }>(
    `SELECT COALESCE(SUM(calories),0) as total_cal,
            COALESCE(SUM(protein_g),0) as total_p,
            COALESCE(SUM(carbs_g),0) as total_c,
            COALESCE(SUM(fat_g),0) as total_f
     FROM NutritionEntry WHERE date_key = ?`, [dateKey]
  );

  const mealsLogged = await db.getAllAsync<{ meal_type: string }>(
    `SELECT DISTINCT meal_type FROM NutritionEntry WHERE date_key = ?`, [dateKey]
  );

  // 5. Today's water intake
  const waterRow = await db.getFirstAsync<{ total_ml: number }>(
    `SELECT COALESCE(SUM(amount_ml),0) as total_ml FROM WaterIntakeEntry WHERE date_key = ?`,
    [dateKey]
  );
  const intensityStr = prefs?.intensity ?? 'moderate';
  const waterTarget = weight
    ? Math.round(weight * 35) + (intensityStr.toUpperCase() === 'HIGH' ? 500 : 0)
    : null;

  // 6. Recent workouts (last 7 days, max 5)
  const recentWorkouts = await db.getAllAsync<{
    workout_title: string; completed_at: string; calories_burned: number;
  }>(
    `SELECT workout_title, completed_at, calories_burned
     FROM ProgressEntry
     WHERE completed_at >= date('now', '-7 days')
     ORDER BY completed_at DESC LIMIT 5`
  );

  // 7. Workouts completed this week
  const weekCountRow = await db.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM ProgressEntry
     WHERE completed_at >= date('now', 'weekday 0', '-6 days')`
  );

  // 8. Streak — count consecutive days with at least 1 workout
  let streak = 0;
  try {
    const streakRows = await db.getAllAsync<{ d: string }>(
      `SELECT DISTINCT date(completed_at) as d FROM ProgressEntry ORDER BY d DESC LIMIT 60`
    );
    if (streakRows.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      for (let i = 0; i < streakRows.length; i++) {
        const expected = new Date(today);
        expected.setDate(expected.getDate() - i);
        const expectedStr = `${expected.getFullYear()}-${String(expected.getMonth() + 1).padStart(2, '0')}-${String(expected.getDate()).padStart(2, '0')}`;
        if (streakRows[i]?.d === expectedStr) {
          streak++;
        } else {
          break;
        }
      }
    }
  } catch { /* streak is a nice-to-have, don't fail the whole context */ }

  return {
    weight_kg: weight,
    height_cm: height,
    gender,
    age,
    bmi,
    fitness_goal: fitnessGoal,
    weekly_workout_goal: prefs?.weekly_workout_goal ?? 5,
    intensity: intensityStr,
    daily_calorie_target: dailyCalorieTarget,
    calories_consumed_today: nutritionRow?.total_cal ?? 0,
    protein_g_today: Math.round(nutritionRow?.total_p ?? 0),
    carbs_g_today: Math.round(nutritionRow?.total_c ?? 0),
    fat_g_today: Math.round(nutritionRow?.total_f ?? 0),
    meals_logged_today: mealsLogged.map(m => m.meal_type),
    water_intake_ml_today: waterRow?.total_ml ?? 0,
    water_target_ml: waterTarget,
    recent_workouts: recentWorkouts.map(w => ({
      title: w.workout_title ?? 'Workout',
      date: w.completed_at,
      calories_burned: w.calories_burned,
    })),
    workouts_this_week: weekCountRow?.cnt ?? 0,
    current_streak_days: streak,
  };
}

const GREETING_VARIANTS = [
  (name: string) => `The floor is yours, ${name}`,
  (name: string) => `The mic is yours, ${name}`,
  (name: string) => `Ready when you are, ${name}`,
  (name: string) => `What are we crushing today, ${name}?`,
  (name: string) => `The barbell is yours, ${name}`,
  (name: string) => `Locked in and ready, ${name}`,
  (name: string) => `How can I coach you today, ${name}?`,
  (name: string) => `Let's make progress, ${name}`,
];

// Clean any asterisks and markdown header hashes from AI responses
// (* bullets -> •, **bold** -> clean text, lone * -> stripped, ## headings -> clean text)
const cleanMessageText = (raw: string): string => {
  if (!raw) return '';
  return raw
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/^\s*\*\s+/gm, '• ')
    .replace(/\*/g, '')
    .replace(/^\s*#{1,6}\s+/gm, '')
    .replace(/#{2,}/g, '')
    .trim();
};

const formatSessionTime = (isoString: string): string => {
  try {
    const d = new Date(isoString);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
};

// 3-dot waving thinking animation
const WavingDots: React.FC = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const wave = (val: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, {
            toValue: -6,
            duration: 280,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0,
            duration: 280,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.delay(Math.max(0, 560 - delay)),
        ])
      );
    };

    const a1 = wave(dot1, 0);
    const a2 = wave(dot2, 160);
    const a3 = wave(dot3, 320);

    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.wavingDotsRow}>
      <Animated.View style={[styles.wavingDot, { transform: [{ translateY: dot1 }] }]} />
      <Animated.View style={[styles.wavingDot, { transform: [{ translateY: dot2 }] }]} />
      <Animated.View style={[styles.wavingDot, { transform: [{ translateY: dot3 }] }]} />
    </View>
  );
};

// ── Smooth animated bubble for newly submitted user sentences ──────────────
interface AnimatedUserBubbleProps {
  item: ChatMsg;
  isEntering: boolean;
  onEnterComplete: () => void;
  onScrollToBottom: () => void;
}

const AnimatedUserBubble: React.FC<AnimatedUserBubbleProps> = ({
  item,
  isEntering,
  onEnterComplete,
  onScrollToBottom,
}) => {
  const enterAnim = useRef(new Animated.Value(isEntering ? 0 : 1)).current;

  useEffect(() => {
    if (isEntering) {
      Animated.timing(enterAnim, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [isEntering, enterAnim]);

  const translateY = enterAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  const scale = enterAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.93, 1],
  });

  const opacity = enterAnim.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [0, 0.75, 1],
  });

  return (
    <Animated.View
      style={[
        styles.bubbleRow,
        styles.bubbleRowUser,
        isEntering && {
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      <View style={[styles.bubble, styles.bubbleUser]}>
        {isEntering ? (
          <TypewriterText
            text={cleanMessageText(item.content)}
            speed={8}
            chunkSize={3}
            hideCursor={true}
            style={[styles.bubbleText, styles.bubbleTextUser]}
            onUpdate={onScrollToBottom}
            onComplete={onEnterComplete}
          />
        ) : (
          <Text style={[styles.bubbleText, styles.bubbleTextUser]}>
            {cleanMessageText(item.content)}
          </Text>
        )}
        <Text style={[styles.bubbleTime, styles.bubbleTimeUser]}>
          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </Animated.View>
  );
};

// ── Smooth animated bubble for AI Coach responses ──────────────────────────
interface AnimatedAiBubbleProps {
  item: ChatMsg;
  isTyping: boolean;
  onTypeComplete: () => void;
  onScrollToBottom: () => void;
}

const AnimatedAiBubble: React.FC<AnimatedAiBubbleProps> = ({
  item,
  isTyping,
  onTypeComplete,
  onScrollToBottom,
}) => {
  const enterAnim = useRef(new Animated.Value(isTyping ? 0 : 1)).current;

  useEffect(() => {
    if (isTyping) {
      Animated.timing(enterAnim, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [isTyping, enterAnim]);

  const translateY = enterAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 0],
  });

  const opacity = enterAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <Animated.View
      style={[
        styles.bubbleRow,
        styles.bubbleRowAi,
        isTyping && {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={[styles.bubble, styles.bubbleAi]}>
        {isTyping ? (
          <TypewriterText
            text={cleanMessageText(item.content)}
            speed={15}
            chunkSize={2}
            style={[styles.bubbleText, styles.bubbleTextAi]}
            onUpdate={onScrollToBottom}
            onComplete={onTypeComplete}
          />
        ) : (
          <Text style={[styles.bubbleText, styles.bubbleTextAi]}>
            {cleanMessageText(item.content)}
          </Text>
        )}
        <Text style={[styles.bubbleTime, styles.bubbleTimeAi]}>
          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </Animated.View>
  );
};

export const AiCoachScreen: React.FC = () => {
  const navigation = useNavigation();
  const user = useAuthStore((state) => state.user);
  const rawName = user?.name?.trim();
  const firstName = rawName ? rawName.split(' ')[0] : 'Champ';

  const [greetingIndex, setGreetingIndex] = useState(() => Math.floor(Math.random() * GREETING_VARIANTS.length));
  const greetingQuote = useMemo(() => {
    const safeIndex = ((greetingIndex % GREETING_VARIANTS.length) + GREETING_VARIANTS.length) % GREETING_VARIANTS.length;
    const fn = GREETING_VARIANTS[safeIndex];
    const name = firstName || 'Champ';
    return fn ? fn(name) : `The floor is yours, ${name}`;
  }, [greetingIndex, firstName]);

  const [messages,      setMessages]      = useState<ChatMsg[]>([]);
  const [inputText,     setInputText]     = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [activeTypingMsgId, setActiveTypingMsgId] = useState<string | null>(null);
  const [enteringUserMsgId, setEnteringUserMsgId] = useState<string | null>(null);
  const sendBtnScale = useRef(new Animated.Value(1)).current;
  const [isTyping,      setIsTyping]      = useState(false);
  const [isListening,   setIsListening]   = useState(false);
  const recognitionRef = useRef<any>(null);
  const [sessionId,     setSessionId]     = useState<string>(() => Crypto.randomUUID());
  const [sessions,      setSessions]      = useState<ChatSession[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const sidebarAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const [context, setContext] = useState<UserHealthContext>({
    weight_kg: null, height_cm: null, gender: null, age: null, bmi: null,
    fitness_goal: null, weekly_workout_goal: 5, intensity: 'moderate',
    daily_calorie_target: null, calories_consumed_today: 0,
    protein_g_today: 0, carbs_g_today: 0, fat_g_today: 0,
    meals_logged_today: [], water_intake_ml_today: 0, water_target_ml: null,
    recent_workouts: [], workouts_this_week: 0, current_streak_days: 0,
  });
  const listRef = useRef<FlatList<ChatMsg>>(null);

  // Load full user health/fitness context and start a fresh chat session on focus
  useFocusEffect(useCallback(() => {
    (async () => {
      try {
        const fullContext = await gatherUserHealthContext(user);
        setContext(fullContext);

        // Start a brand new chat session by default
        const newSessionId = Crypto.randomUUID();
        setSessionId(newSessionId);
        setMessages([]);
        setInputText('');
      } catch (err) { console.error('[AiCoach] load:', err); }
    })();
  }, []));

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages, isTyping]);

  // Load all distinct previous conversations
  const loadSessions = async () => {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<{
        session_id: string;
        started_at: string;
        last_activity: string;
        message_count: number;
      }>(
        `SELECT session_id, MIN(timestamp) as started_at, MAX(timestamp) as last_activity, COUNT(*) as message_count
         FROM ChatMessage
         GROUP BY session_id
         ORDER BY last_activity DESC`
      );

      const list: ChatSession[] = [];
      for (const row of rows) {
        const firstMsg = await db.getFirstAsync<{ content: string }>(
          `SELECT content FROM ChatMessage WHERE session_id = ? AND role = 'user' ORDER BY timestamp ASC LIMIT 1`,
          [row.session_id]
        );
        const rawTitle = firstMsg?.content ? cleanMessageText(firstMsg.content) : 'New Conversation';
        const title = rawTitle.length > 32 ? rawTitle.substring(0, 32) + '…' : rawTitle;

        list.push({
          sessionId: row.session_id,
          title,
          lastActivity: row.last_activity,
          messageCount: row.message_count,
        });
      }

      setSessions(list);
    } catch (err) {
      console.error('[AiCoach] loadSessions error:', err);
    }
  };

  const openSidebar = async () => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {}
    await loadSessions();
    setIsSidebarOpen(true);
    Animated.parallel([
      Animated.timing(sidebarAnim, {
        toValue: 0,
        duration: 280,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeSidebar = () => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {}
    Animated.parallel([
      Animated.timing(sidebarAnim, {
        toValue: -SIDEBAR_WIDTH,
        duration: 220,
        easing: Easing.bezier(0.32, 0, 0.67, 0),
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsSidebarOpen(false);
    });
  };

  const selectSession = async (targetSessionId: string) => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.selectionAsync();
      }
    } catch {}
    if (targetSessionId === sessionId) {
      closeSidebar();
      return;
    }
    setSessionId(targetSessionId);
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<ChatMsg>(
        'SELECT id, role, content, timestamp FROM ChatMessage WHERE session_id = ? ORDER BY timestamp ASC',
        [targetSessionId]
      );
      setMessages(rows);
    } catch (err) {
      console.error('[AiCoach] selectSession error:', err);
    }
    closeSidebar();
  };

  const startListening = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsListening(true);
        recognition.onresult = (event: any) => {
          const transcript = event.results?.[0]?.[0]?.transcript;
          if (transcript) {
            setInputText(prev => (prev ? `${prev} ${transcript}` : transcript));
          }
        };
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);

        recognitionRef.current = recognition;
        try {
          recognition.start();
        } catch {
          setIsListening(false);
        }
        return;
      }
    }

    setIsListening(true);
  };

  const stopListening = (reason?: string) => {
    if (recognitionRef.current) {
      try {
        if (reason === 'cancel') {
          recognitionRef.current.abort();
        } else {
          recognitionRef.current.stop();
        }
      } catch {}
    }
    setIsListening(false);
  };

  const startNewChat = () => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch {}
    const newId = Crypto.randomUUID();
    setSessionId(newId);
    setMessages([]);
    setGreetingIndex(prev => (prev + 1) % GREETING_VARIANTS.length);
    closeSidebar();
  };

  const deleteSession = async (targetSessionId: string) => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } catch {}
    try {
      const db = await getDatabase();
      await db.runAsync('DELETE FROM ChatMessage WHERE session_id = ?', [targetSessionId]);
      await loadSessions();

      if (targetSessionId === sessionId) {
        const newId = Crypto.randomUUID();
        setSessionId(newId);
        setMessages([]);
      }
    } catch (err) {
      console.error('[AiCoach] deleteSession error:', err);
    }
  };

  const saveMessage = async (msg: ChatMsg) => {
    try {
      const db = await getDatabase();
      await db.runAsync(
        'INSERT INTO ChatMessage (id, role, content, timestamp, session_id) VALUES (?, ?, ?, ?, ?)',
        [msg.id, msg.role, msg.content, msg.timestamp, sessionId]
      );
    } catch (err) { console.error('[AiCoach] saveMessage:', err); }
  };

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text || isTyping) return;

    const userMsg: ChatMsg = {
      id: Crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    // Micro-spring press animation on send button
    Animated.sequence([
      Animated.timing(sendBtnScale, { toValue: 0.82, duration: 80, useNativeDriver: true }),
      Animated.spring(sendBtnScale, { toValue: 1, friction: 4, tension: 90, useNativeDriver: true }),
    ]).start();

    // Subtle tactile haptic feedback
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch { /* graceful fallback */ }

    // Start smooth entrance animation & text stream into conversation
    setEnteringUserMsgId(userMsg.id);
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);
    await saveMessage(userMsg);

    // Initial smooth scroll as the sentence leaves the type bar
    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 30);

    try {
      const res = await apiClient.post<{ content: string }>('/api/v1/chat', {
        messages: [
          ...messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: text },
        ],
        user_context: context,
      });

      const responseText = cleanMessageText(res.data?.content || "No response received.");

      const aiMsg: ChatMsg = {
        id: Crypto.randomUUID(),
        role: 'assistant',
        content: responseText,
        timestamp: new Date().toISOString(),
      };
      setActiveTypingMsgId(aiMsg.id);
      setMessages(prev => [...prev, aiMsg]);
      await saveMessage(aiMsg);
    } catch (err) {
      console.error('[AiCoach] getResponse:', err);
      const errMsg: ChatMsg = {
        id: Crypto.randomUUID(),
        role: 'assistant',
        content: "Sorry, I couldn't process that right now. Please try again.",
        timestamp: new Date().toISOString(),
      };
      setActiveTypingMsgId(errMsg.id);
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const renderItem = ({ item }: { item: ChatMsg }) => {
    const isUser = item.role === 'user';
    const isEnteringUser = isUser && item.id === enteringUserMsgId;
    const isTypingAi = !isUser && item.id === activeTypingMsgId;

    if (isUser) {
      return (
        <AnimatedUserBubble
          item={item}
          isEntering={isEnteringUser}
          onEnterComplete={() => {
            setEnteringUserMsgId(null);
            listRef.current?.scrollToEnd({ animated: true });
          }}
          onScrollToBottom={() => {
            listRef.current?.scrollToEnd({ animated: true });
          }}
        />
      );
    }

    return (
      <AnimatedAiBubble
        item={item}
        isTyping={isTypingAi}
        onTypeComplete={() => {
          setActiveTypingMsgId(null);
          listRef.current?.scrollToEnd({ animated: true });
        }}
        onScrollToBottom={() => {
          listRef.current?.scrollToEnd({ animated: true });
        }}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Luminous Animated 3D Prism Background */}
      <PrismBackground
        height={3.5}
        baseWidth={5.5}
        animationType="rotate"
        glow={1}
        noise={0.3}
        transparent={true}
        scale={1.0}
        offset={{ x: 0, y: -310 }}
        hueShift={0}
        colorFrequency={1}
        bloom={1}
        timeScale={0.5}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft color={colors.text} size={24} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={openSidebar}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.burgerBtn}
        >
          <Menu color={colors.text} size={24} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Message list */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          style={styles.messageList}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyGreeting}>{greetingQuote}</Text>
            </View>
          }
          ListFooterComponent={
            isTyping ? (
              <View style={styles.typingRow}>
                {/* 3-dot waving thinking animation without avatar */}
                <View style={styles.typingBubble}>
                  <WavingDots />
                </View>
              </View>
            ) : null
          }
        />

        {/* Floating Input bar */}
        <View style={styles.floatingInputWrapper} pointerEvents="box-none">
          <View style={styles.floatingBar} pointerEvents="auto">
            <VoicePill
              isListening={isListening}
              onStart={startListening}
              onStop={stopListening}
              accentColor="#f5f5f5"
              iconColor="#FFFFFF"
              backgroundColor="#27272a"
            />

            <View style={styles.inputFieldContainer}>
              <TextInput
                style={styles.floatingInput}
                value={inputText}
                onChangeText={setInputText}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                placeholder=""
                placeholderTextColor="rgba(255, 255, 255, 0.65)"
                multiline
                maxLength={500}
                returnKeyType="send"
                onSubmitEditing={sendMessage}
                blurOnSubmit={false}
                onKeyPress={(e) => {
                  if (Platform.OS === 'web' && (e.nativeEvent as any).key === 'Enter' && !(e.nativeEvent as any).shiftKey) {
                    e.preventDefault?.();
                    sendMessage();
                  }
                }}
              />

              {!inputText && !isListening && (
                <TypewriterPlaceholder
                  isFocused={isInputFocused}
                  fontWeight="400"
                  prompts={[
                    'Ask Alab AI…',
                    'Ask how much protein I need today…',
                    'Ask for a 4-day muscle split…',
                    'Ask how to improve my squat depth…',
                    'Ask for healthy pre-workout meal ideas…',
                    'Ask to analyze my workout progress…',
                  ]}
                  typingSpeed={65}
                  deletingSpeed={28}
                  pauseDelay={2400}
                  initialDelay={600}
                />
              )}
            </View>

            <Animated.View style={{ transform: [{ scale: sendBtnScale }] }}>
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  inputText.trim() && !isTyping ? styles.sendBtnActive : styles.sendBtnDisabled,
                ]}
                onPress={sendMessage}
                disabled={!inputText.trim() || isTyping}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <ArrowUp
                  color={inputText.trim() && !isTyping ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)'}
                  size={18}
                  strokeWidth={2.4}
                />
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Sidebar Drawer Modal for previous conversations */}
      <Modal
        visible={isSidebarOpen}
        transparent
        animationType="none"
        onRequestClose={closeSidebar}
      >
        <View style={styles.sidebarOverlay}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              styles.sidebarBackdrop,
              { opacity: backdropAnim },
            ]}
          >
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={closeSidebar}
            />
          </Animated.View>
          <Animated.View style={[styles.sidebarContent, { transform: [{ translateX: sidebarAnim }] }]}>
            {/* Apple Navigation Bar Header */}
            <View style={styles.sidebarHeader}>
              <View style={styles.sidebarHeaderLeft}>
                <Text style={styles.sidebarTitle}>History</Text>
              </View>
              <TouchableOpacity
                onPress={closeSidebar}
                style={styles.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.6}
                accessibilityRole="button"
                accessibilityLabel="Close history"
              >
                <X color="#FFFFFF" size={12} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>

            {/* Apple Ultra-Thin Frosted Glass Action Button */}
            <Pressable
              style={({ pressed, hovered }: any) => [
                styles.newChatBtn,
                (pressed || hovered) && { backgroundColor: 'rgba(255, 255, 255, 0.12)' },
              ]}
              onPress={startNewChat}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              accessibilityRole="button"
              accessibilityLabel="New Chat"
            >
              <SquarePen color="#FFFFFF" size={17} strokeWidth={2.2} />
              <Text style={styles.newChatBtnText}>New Chat</Text>
            </Pressable>

            {/* Apple Inset Grouped Section Header */}
            <View style={styles.sessionsHeaderRow}>
              <Text style={styles.sessionsHeaderText}>PREVIOUS CHATS</Text>
              <View style={styles.sessionsCountBadge}>
                <Text style={styles.sessionsCountText}>{sessions.length}</Text>
              </View>
            </View>

            {/* Inset Grouped Sessions List */}
            <FlatList
              data={sessions}
              keyExtractor={item => item.sessionId}
              contentContainerStyle={styles.sessionsListContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.sessionsEmpty}>
                  <Clock
                    color="rgba(255, 255, 255, 0.4)"
                    size={30}
                    strokeWidth={2.0}
                    style={{ marginBottom: 12 }}
                  />
                  <Text style={styles.sessionsEmptyText}>No Previous Chats</Text>
                  <Text style={styles.sessionsEmptySub}>
                    Conversations with Alab AI will appear here so you can revisit workout tips and splits.
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const isActive = item.sessionId === sessionId;
                return (
                  <TouchableOpacity
                    style={[styles.sessionCard, isActive && styles.sessionCardActive]}
                    onPress={() => selectSession(item.sessionId)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.sessionCardHeader}>
                      <View style={[styles.sessionIndicator, isActive && styles.sessionIndicatorActive]} />
                      <Text
                        style={[styles.sessionCardTitle, isActive && styles.sessionCardTitleActive]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation?.();
                          deleteSession(item.sessionId);
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={styles.trashBtn}
                        activeOpacity={0.6}
                      >
                        <Trash2 size={13} color="rgba(255, 255, 255, 0.45)" strokeWidth={2} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.sessionCardFooter}>
                      <View style={styles.sessionTimeRow}>
                        <Clock size={11} color="rgba(235, 235, 245, 0.40)" strokeWidth={2} />
                        <Text style={styles.sessionCardTime}>{formatSessionTime(item.lastActivity)}</Text>
                      </View>
                      <View style={styles.sessionBadge}>
                        <Text style={styles.sessionBadgeText}>
                          {item.messageCount} {item.messageCount === 1 ? 'msg' : 'msgs'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container:             { flex: 1, backgroundColor: colors.background },
  header:                { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  burgerBtn:             { padding: 4 },
  messageList:           { flex: 1 },
  listContent:           { padding: 16, paddingBottom: Platform.OS === 'ios' ? 96 : 104, flexGrow: 1 },
  bubbleRow:             { flexDirection: 'row', marginBottom: 12, maxWidth: '88%', alignItems: 'flex-end', gap: 8 },
  bubbleRowUser:         { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  bubbleRowAi:           { alignSelf: 'flex-start' },
  aiBotIcon:             { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  bubble:                { borderRadius: borderRadius.lg, paddingHorizontal: 14, paddingVertical: 10, maxWidth: '100%' },
  bubbleUser:            { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleAi:              { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  bubbleText:            { fontSize: typography.sizes.sm, lineHeight: 22 },
  bubbleTextUser:        { color: colors.textInverse },
  bubbleTextAi:          { color: colors.text },
  bubbleTime:            { fontSize: 10, marginTop: 4 },
  bubbleTimeUser:        { color: 'rgba(255,255,255,0.55)', textAlign: 'right' },
  bubbleTimeAi:          { color: colors.textMuted },
  typingRow:             { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, paddingHorizontal: 0 },
  typingBubble:          { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg, borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 12, justifyContent: 'center', alignItems: 'center' },
  wavingDotsRow:         { flexDirection: 'row', alignItems: 'center', gap: 5, height: 16 },
  wavingDot:             { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.primary },
  emptyState:            { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 70 : 80, paddingBottom: 24 },
  emptyGreeting:         { fontSize: typography.sizes.xl, fontFamily: typography.fonts.headingBold, color: colors.text, textAlign: 'center', letterSpacing: -0.3, maxWidth: 320 },
  floatingInputWrapper:  {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 14 : 18,
    paddingTop: 6,
    backgroundColor: 'transparent',
  },
  floatingBar:           {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Platform.OS === 'web' ? 'rgba(14, 14, 18, 0.65)' : 'rgba(16, 16, 22, 0.78)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    minHeight: 52,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 8,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(20px) saturate(190%)',
      WebkitBackdropFilter: 'blur(20px) saturate(190%)',
    } as any : {}),
  },
  inputFieldContainer:   {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
    minHeight: 38,
  },
  floatingInput:         {
    width: '100%',
    fontSize: typography.sizes.sm,
    fontWeight: '400',
    lineHeight: 20,
    color: '#FFFFFF',
    paddingHorizontal: 8,
    paddingTop: Platform.OS === 'web' ? 15 : 10,
    paddingBottom: Platform.OS === 'web' ? 11 : 8,
    textAlignVertical: 'center',
    maxHeight: 100,
    ...(Platform.OS === 'web' ? { outlineWidth: 0, outlineStyle: 'none' } as any : {}),
  },
  sendBtn:               { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', flexShrink: 0, backgroundColor: 'transparent', borderWidth: 1, borderColor: 'transparent' },
  sendBtnActive:         { backgroundColor: 'rgba(255, 255, 255, 0.12)', borderColor: 'rgba(255, 255, 255, 0.22)' },
  sendBtnDisabled:       { opacity: 0.4 },

  // Apple HIG Sidebar styles
  sidebarOverlay:        {
    flex: 1,
    flexDirection: 'row',
  },
  sidebarBackdrop:       {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
    } as any : {}),
  },
  sidebarContent:        {
    width: SIDEBAR_WIDTH,
    height: '100%',
    backgroundColor: 'rgba(28, 28, 30, 0.75)',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    paddingTop: Platform.OS === 'ios' ? 52 : 22,
    zIndex: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 10, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 16,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(25px)',
      WebkitBackdropFilter: 'blur(25px)',
    } as any : {}),
  },
  sidebarHeader:         {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 0,
  },
  sidebarHeaderLeft:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sidebarTitle:          {
    fontSize: 20,
    fontFamily: APPLE_FONT_FAMILY,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  closeBtn:              {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newChatBtn:            {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 0,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 14,
    paddingVertical: 12,
    ...(Platform.OS === 'web' ? {
      transition: 'background-color 0.15s ease',
      cursor: 'pointer',
    } as any : {}),
  },
  newChatBtnText:        {
    fontFamily: APPLE_FONT_FAMILY,
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
    letterSpacing: -0.24,
  },
  sessionsHeaderRow:     {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  sessionsHeaderText:    {
    fontFamily: APPLE_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sessionsCountBadge:    {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sessionsCountText:     {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(235, 235, 245, 0.70)',
    fontVariant: ['tabular-nums'],
  },
  sessionsListContent:   { paddingHorizontal: 14, paddingBottom: 28 },
  sessionCard:           {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    marginBottom: 8,
    padding: 13,
  },
  sessionCardActive:     {
    borderColor: 'rgba(255, 255, 255, 0.30)',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 4,
  },
  sessionCardHeader:     { flexDirection: 'row', alignItems: 'center' },
  sessionIndicator:      {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'transparent',
    marginRight: 8,
  },
  sessionIndicatorActive:{
    backgroundColor: '#0A84FF',
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  sessionCardTitle:      {
    fontFamily: APPLE_FONT_FAMILY,
    flex: 1,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.88)',
    fontWeight: '600',
    letterSpacing: -0.2,
    marginRight: 6,
  },
  sessionCardTitleActive:{ color: '#FFFFFF', fontWeight: '700' },
  trashBtn:              {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionCardFooter:     {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  sessionTimeRow:        { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sessionCardTime:       {
    fontFamily: APPLE_FONT_FAMILY,
    fontSize: 12,
    color: 'rgba(235, 235, 245, 0.45)',
    fontVariant: ['tabular-nums'],
  },
  sessionBadge:          {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  sessionBadgeText:      {
    fontFamily: APPLE_FONT_FAMILY,
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(235, 235, 245, 0.65)',
  },
  sessionsEmpty:         {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
  },
  sessionsEmptyText:     {
    fontFamily: APPLE_FONT_FAMILY,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  sessionsEmptySub:      {
    fontFamily: APPLE_FONT_FAMILY,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    paddingHorizontal: 22,
    lineHeight: 18,
  },
});
