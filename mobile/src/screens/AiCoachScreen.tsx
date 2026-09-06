import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  TextInput, FlatList, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Send, Bot } from 'lucide-react-native';
import { colors, typography, borderRadius } from '../theme';
import { getDatabase } from '../db/connection';
import * as Crypto from 'expo-crypto';

// ===========================================================================
// MOCK — PENDING REAL LLM INTEGRATION
// When the backend session wires in a real LLM, replace mockGetAiResponse()
// with a real API call to the configured LLM endpoint.
//
// CONTRACT (see CONTRACT.md §4 — Pending Real AI Integration):
//   Request:  POST /api/v1/chat
//             Body: {
//               messages: Array<{ role: 'user' | 'assistant', content: string }>,
//               user_context: {
//                 weight_kg: number | null,
//                 weekly_workout_goal: number,
//                 intensity: string,
//                 recent_workout_title?: string,
//                 daily_calories_today?: number,
//               }
//             }
//   Response: { content: string }
//
// Candidate LLM backends: OpenAI gpt-4o, Anthropic Claude, Google Gemini.
// ===========================================================================

// MOCK — PENDING REAL LLM INTEGRATION
// Canned Q&A flows relevant to a gym context. The mock handler occasionally
// references personalised local data (workout_goal, intensity) to demonstrate
// INTENDED real behaviour — this will be replaced by real context-aware LLM.
const MOCK_FLOWS: { triggers: string[]; response: string }[] = [
  {
    triggers: ['pre-workout','before workout','eat before','pre workout'],
    response: `Great question! For a pre-workout meal, aim to eat 1–2 hours before training:\n\n• **Carbs** (30–60g) for quick energy — oats, banana, rice cakes\n• **Moderate protein** (15–20g) — chicken, Greek yogurt, eggs\n• **Low fat & fibre** to avoid digestive discomfort\n\nBased on your {intensity} intensity level, you'll want to be on the higher end of those carb ranges. Hydrate with 400–600ml of water beforehand too! 💧`,
  },
  {
    triggers: ['leg day','legs','quad','hamstring','glute'],
    response: `Here's a solid leg day routine you can do at the gym:\n\n1. **Barbell Squat** — 4 × 6–8 reps (primary compound)\n2. **Romanian Deadlift** — 3 × 10 reps (hamstring focus)\n3. **Leg Press** — 3 × 12 reps\n4. **Walking Lunges** — 3 × 10/leg\n5. **Leg Curl** — 3 × 12 reps\n6. **Calf Raises** — 4 × 20 reps\n\nYou have a goal of {goal} workouts/week — if this is one of them, leave at least 48h before training legs again for full recovery. 🦵`,
  },
  {
    triggers: ['protein','macros','macro','how much protein'],
    response: `For muscle building and recovery, a good protein target is **1.6–2.2g per kg of body weight** per day.\n\nAt {weight_kg} kg, that puts you in the range of **{protein_min}–{protein_max}g of protein/day**.\n\nTop sources:\n• Chicken breast (31g/100g)\n• Greek yogurt (17g/170g)\n• Eggs (6g each)\n• Lentils (9g/100g)\n• Whey protein (25g/scoop)\n\nTrack it daily in the Nutrition Tracker to make sure you're hitting your targets! 🥗`,
  },
  {
    triggers: ['lose weight','fat loss','cut','calorie deficit'],
    response: `For sustainable fat loss:\n\n• **Calorie deficit**: aim for 300–500 kcal below your TDEE (Total Daily Energy Expenditure)\n• **Protein**: keep it high (1.8–2.2g/kg) to preserve muscle\n• **Resistance training**: at least {goal} sessions/week to maintain muscle mass\n• **Cardio**: 2–3 sessions of 20–30 min HIIT or steady-state\n\nAvoid crash diets — they tank your metabolism and make it harder to maintain results. Slow and steady wins here! 📉`,
  },
  {
    triggers: ['rest','recovery','rest day','sleep','overtraining'],
    response: `Recovery is just as important as training — this is when your muscles actually grow!\n\n• **Sleep**: aim for 7–9 hours\n• **Active recovery**: light walks, yoga, or swimming on rest days\n• **Nutrition**: don't undereat on rest days — protein is still critical\n• **Hydration**: keep hitting your water target even on rest days\n\nWith {goal} workouts/week on your plan, make sure you're scheduling at least 1–2 dedicated rest days. Listen to your body! 🛌`,
  },
  {
    triggers: ['motivation','motivated','not motivated','no motivation'],
    response: `Feeling unmotivated happens to everyone — here are some strategies that work:\n\n• **Lower the bar**: commit to just 10 minutes. You'll almost always continue once you start.\n• **Revisit your why**: why did you start training? Write it down somewhere visible.\n• **Accountability**: share your {goal}-per-week goal with someone.\n• **Track progress**: looking back at logged workouts (even just 2–3 weeks) is a powerful reminder of how far you've come.\n\nYou've got this — consistency beats perfection every time. 💪`,
  },
];

const FALLBACK_RESPONSES = [
  "That's a great question! As your AI coach, I can help with workout planning, nutrition guidance, recovery tips, and staying motivated. What specific aspect would you like to focus on?",
  "I'm here to support your fitness journey! Try asking me about pre-workout nutrition, exercise form, recovery strategies, or how to structure your training week.",
  "Good question — I'd love to help with that. Could you give me a bit more detail so I can give you the most relevant advice for your situation?",
];

// MOCK — PENDING REAL LLM INTEGRATION
async function mockGetAiResponse(
  userMessage: string,
  context: { weight_kg: number | null; weekly_workout_goal: number; intensity: string }
): Promise<string> {
  // Simulate realistic LLM latency (0.8 – 2.0 s)
  const delay = 800 + Math.random() * 1200;
  await new Promise(r => setTimeout(r, delay));

  const lower = userMessage.toLowerCase();
  const matched = MOCK_FLOWS.find(f => f.triggers.some(t => lower.includes(t)));

  // Non-null: index is always within FALLBACK_RESPONSES.length bounds
  let response = matched?.response ??
    FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)]!;

  // Personalise with local context — demonstrating INTENDED real LLM behaviour
  // MOCK — PENDING REAL LLM INTEGRATION: real backend will do this server-side
  const weightKg = context.weight_kg ?? 75;
  response = response
    .replace('{intensity}',   context.intensity)
    .replace('{goal}',        String(context.weekly_workout_goal))
    .replace('{weight_kg}',   String(weightKg))
    .replace('{protein_min}', String(Math.round(weightKg * 1.6)))
    .replace('{protein_max}', String(Math.round(weightKg * 2.2)));

  return response;
}

interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// Chat history persistence decision:
// History IS persisted in SQLite and survives app restarts (single ongoing session).
// Rationale: a chatbot that loses context every reopen feels broken for a coaching
// use-case where continuity matters (e.g., following up on yesterday's advice).
// Session ID is fixed to 'default' for v1 (single-user). Multi-session support
// is a future enhancement. See CONTRACT.md for server-sync candidacy.

export const AiCoachScreen: React.FC = () => {
  const navigation = useNavigation();
  const [messages,    setMessages]    = useState<ChatMsg[]>([]);
  const [inputText,   setInputText]   = useState('');
  const [isTyping,    setIsTyping]    = useState(false);
  const [context,     setContext]     = useState<{ weight_kg: number | null; weekly_workout_goal: number; intensity: string }>({
    weight_kg: null, weekly_workout_goal: 5, intensity: 'moderate',
  });
  const listRef = useRef<FlatList<ChatMsg>>(null);
  const SESSION_ID = 'default';

  // Load chat history + user context on focus
  useFocusEffect(useCallback(() => {
    (async () => {
      try {
        const db = await getDatabase();

        const prefs = await db.getFirstAsync<{ weight_kg: number | null; weekly_workout_goal: number; intensity: string }>(
          'SELECT weight_kg, weekly_workout_goal, intensity FROM Preferences WHERE id = ?', ['default']
        );
        if (prefs) setContext(prefs);

        const rows = await db.getAllAsync<ChatMsg>(
          'SELECT id, role, content, timestamp FROM ChatMessage WHERE session_id = ? ORDER BY timestamp ASC',
          [SESSION_ID]
        );
        setMessages(rows);
      } catch (err) { console.error('[AiCoach] load:', err); }
    })();
  }, []));

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages, isTyping]);

  const saveMessage = async (msg: ChatMsg) => {
    try {
      const db = await getDatabase();
      await db.runAsync(
        'INSERT INTO ChatMessage (id, role, content, timestamp, session_id) VALUES (?, ?, ?, ?, ?)',
        [msg.id, msg.role, msg.content, msg.timestamp, SESSION_ID]
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

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);
    await saveMessage(userMsg);

    try {
      // MOCK — PENDING REAL LLM INTEGRATION
      const responseText = await mockGetAiResponse(text, context);

      const aiMsg: ChatMsg = {
        id: Crypto.randomUUID(),
        role: 'assistant',
        content: responseText,
        timestamp: new Date().toISOString(),
      };
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
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const renderItem = ({ item }: { item: ChatMsg }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowAi]}>
        {!isUser && (
          <View style={styles.aiBotIcon}>
            <Bot color={colors.textInverse} size={14} />
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAi]}>
          <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAi]}>
            {item.content}
          </Text>
          <Text style={[styles.bubbleTime, isUser ? styles.bubbleTimeUser : styles.bubbleTimeAi]}>
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  const STARTER_PROMPTS = [
    'What should I eat before a workout?',
    'Suggest a leg day routine',
    'How much protein do I need?',
    'Tips for staying motivated',
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><ArrowLeft color={colors.text} size={24} /></TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>AI Coach</Text>
          {/* MOCK — PENDING REAL LLM INTEGRATION */}
          <Text style={styles.headerSubtitle}>Demo mode · powered by mock responses</Text>
        </View>
        <View style={{ width: 24 }} />
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
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Bot color={colors.textMuted} size={48} />
              <Text style={styles.emptyTitle}>Your AI Coach</Text>
              <Text style={styles.emptyBody}>
                Ask me anything about workouts, nutrition, recovery, or motivation.
              </Text>
              {/* MOCK — PENDING REAL LLM INTEGRATION */}
              <Text style={styles.emptyDisclaimer}>
                ⚠️ Demo mode — responses are illustrative examples, not real AI output.
              </Text>
              <View style={styles.starterGrid}>
                {STARTER_PROMPTS.map(p => (
                  <TouchableOpacity key={p} style={styles.starterPill} onPress={() => {
                    setInputText(p);
                  }}>
                    <Text style={styles.starterText}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          }
          ListFooterComponent={
            isTyping ? (
              <View style={styles.typingRow}>
                <View style={styles.aiBotIcon}><Bot color={colors.textInverse} size={14} /></View>
                {/* Typing indicator — three animated dots */}
                <View style={styles.typingBubble}>
                  <ActivityIndicator size="small" color={colors.textSecondary} />
                  <Text style={styles.typingText}>Thinking…</Text>
                </View>
              </View>
            ) : null
          }
        />

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask your coach…"
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || isTyping) && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isTyping}
          >
            <Send color={colors.textInverse} size={18} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: colors.background },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerCenter:    { alignItems: 'center' },
  headerTitle:     { fontSize: typography.sizes.lg, fontFamily: typography.fonts.headingBold, color: colors.text },
  headerSubtitle:  { fontSize: 10, color: colors.textMuted, marginTop: 1 },
  listContent:     { padding: 16, paddingBottom: 8, flexGrow: 1 },
  bubbleRow:       { flexDirection: 'row', marginBottom: 12, maxWidth: '88%', alignItems: 'flex-end', gap: 8 },
  bubbleRowUser:   { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  bubbleRowAi:     { alignSelf: 'flex-start' },
  aiBotIcon:       { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  bubble:          { borderRadius: borderRadius.lg, paddingHorizontal: 14, paddingVertical: 10, maxWidth: '100%' },
  bubbleUser:      { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleAi:        { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  bubbleText:      { fontSize: typography.sizes.sm, lineHeight: 22 },
  bubbleTextUser:  { color: colors.textInverse },
  bubbleTextAi:    { color: colors.text },
  bubbleTime:      { fontSize: 10, marginTop: 4 },
  bubbleTimeUser:  { color: 'rgba(255,255,255,0.55)', textAlign: 'right' },
  bubbleTimeAi:    { color: colors.textMuted },
  typingRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, paddingHorizontal: 0 },
  typingBubble:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg, borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 10 },
  typingText:      { fontSize: typography.sizes.sm, color: colors.textSecondary },
  emptyState:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingTop: 48, gap: 12 },
  emptyTitle:      { fontSize: typography.sizes.xl, fontFamily: typography.fonts.headingBold, color: colors.text },
  emptyBody:       { fontSize: typography.sizes.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  emptyDisclaimer: { fontSize: typography.sizes.xs, color: colors.textMuted, textAlign: 'center', marginTop: 4, backgroundColor: colors.surfaceHighlight, padding: 10, borderRadius: borderRadius.sm, lineHeight: 18 },
  starterGrid:     { gap: 8, width: '100%', marginTop: 8 },
  starterPill:     { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center' },
  starterText:     { fontSize: typography.sizes.sm, color: colors.text, fontWeight: '500' },
  inputBar:        { flexDirection: 'row', alignItems: 'flex-end', padding: 12, paddingBottom: 24, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background, gap: 10 },
  input:           { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg, paddingHorizontal: 14, paddingVertical: 10, fontSize: typography.sizes.sm, color: colors.text, maxHeight: 120 },
  sendBtn:         { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  sendBtnDisabled: { opacity: 0.4 },
});
