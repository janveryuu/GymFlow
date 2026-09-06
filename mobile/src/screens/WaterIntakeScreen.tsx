import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, SafeAreaView, Alert, Modal, Pressable, Dimensions,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Droplets, Plus, X } from 'lucide-react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { colors, typography, borderRadius } from '../theme';
import { PercentRing } from '../components/PercentRing';
import { getDatabase } from '../db/connection';
import * as Crypto from 'expo-crypto';

// ---------------------------------------------------------------------------
// WATER FORMULA — documented per CONTRACT.md §2
// Source: European Food Safety Authority (EFSA), Dietary Reference Values for Water, 2010.
//   Base:              weight_kg × 35 ml/day
//   HIGH intensity:    + 500 ml (exercise sweat-loss adjustment)
// ---------------------------------------------------------------------------
function calcDailyTargetMl(weightKg: number, intensity: string): number {
  const base = Math.round(weightKg * 35);
  const bonus = intensity.toUpperCase() === 'HIGH' ? 500 : 0;
  return base + bonus;
}

function localDateKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface WaterEntry { id: string; amount_ml: number; logged_at: string; }
interface DayHistory  { date_key: string; total_ml: number; }

const CHART_WIDTH  = Dimensions.get('window').width - 80;
const CHART_HEIGHT = 90;

export const WaterIntakeScreen: React.FC = () => {
  const navigation = useNavigation();

  const [weightKg,     setWeightKg]     = useState(70);
  const [intensity,    setIntensity]    = useState('moderate');
  const [todayEntries, setTodayEntries] = useState<WaterEntry[]>([]);
  const [weekHistory,  setWeekHistory]  = useState<DayHistory[]>([]);
  const [customAmount, setCustomAmount] = useState('');
  const [showModal,    setShowModal]    = useState(false);
  const [isLoading,    setIsLoading]    = useState(true);

  const dateKey    = localDateKey();
  const dailyTarget = calcDailyTargetMl(weightKg, intensity);
  const currentIntake = todayEntries.reduce((s, e) => s + e.amount_ml, 0);
  const percentage    = Math.min((currentIntake / dailyTarget) * 100, 100);

  const loadData = useCallback(async () => {
    try {
      const db = await getDatabase();
      const prefs = await db.getFirstAsync<{ weight_kg: number | null; intensity: string }>(
        'SELECT weight_kg, intensity FROM Preferences WHERE id = ?', ['default']
      );
      if (prefs?.weight_kg) setWeightKg(prefs.weight_kg);
      if (prefs?.intensity) setIntensity(prefs.intensity);

      const entries = await db.getAllAsync<WaterEntry>(
        'SELECT id, amount_ml, logged_at FROM WaterIntakeEntry WHERE date_key = ? ORDER BY logged_at ASC',
        [dateKey]
      );
      setTodayEntries(entries);

      const history = await db.getAllAsync<DayHistory>(
        `SELECT date_key, SUM(amount_ml) as total_ml
         FROM WaterIntakeEntry
         WHERE date_key >= date('now','-6 days')
         GROUP BY date_key ORDER BY date_key ASC`,
        []
      );
      setWeekHistory(history);
    } catch (err) {
      console.error('[WaterIntake] loadData:', err);
    } finally {
      setIsLoading(false);
    }
  }, [dateKey]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const logWater = async (amountMl: number) => {
    if (!amountMl || amountMl <= 0) return;
    try {
      const db  = await getDatabase();
      const id  = Crypto.randomUUID();
      const now = new Date().toISOString();
      await db.runAsync(
        'INSERT INTO WaterIntakeEntry (id, amount_ml, logged_at, date_key) VALUES (?, ?, ?, ?)',
        [id, amountMl, now, dateKey]
      );
      setTodayEntries(prev => [...prev, { id, amount_ml: amountMl, logged_at: now }]);
      await loadData();
    } catch (err) {
      console.error('[WaterIntake] logWater:', err);
      Alert.alert('Error', 'Could not log water intake. Please try again.');
    }
  };

  const handleCustomAdd = async () => {
    const parsed = parseInt(customAmount, 10);
    if (!parsed || parsed <= 0) { Alert.alert('Invalid amount', 'Please enter a positive number.'); return; }
    setShowModal(false);
    setCustomAmount('');
    await logWater(parsed);
  };

  const deleteEntry = async (id: string) => {
    try {
      const db = await getDatabase();
      await db.runAsync('DELETE FROM WaterIntakeEntry WHERE id = ?', [id]);
      setTodayEntries(prev => prev.filter(e => e.id !== id));
      await loadData();
    } catch (err) { console.error('[WaterIntake] deleteEntry:', err); }
  };

  // Build 7-day bar-chart data (fill missing days with 0)
  const chartDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const label = ['Su','Mo','Tu','We','Th','Fr','Sa'][d.getDay()];
    const found = weekHistory.find(h => h.date_key === key);
    return { key, label, total_ml: found?.total_ml ?? 0 };
  });
  const maxBarMl = Math.max(...chartDays.map(d => d.total_ml), dailyTarget, 1);
  const barGap   = CHART_WIDTH / 7;
  const barW     = barGap * 0.52;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button">
          <ArrowLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Water Intake</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Progress Ring */}
        <View style={styles.ringContainer}>
          <PercentRing
            percentage={percentage}
            size={200}
            strokeWidth={16}
            color={colors.primary}
            label={`${currentIntake} / ${dailyTarget} ml`}
            showPercentageText
          />
          <Text style={styles.targetLabel}>
            Daily target: {dailyTarget} ml
          </Text>
          <Text style={styles.formulaNote}>
            {weightKg} kg × 35 ml{intensity.toUpperCase() === 'HIGH' ? ' + 500 ml (HIGH)' : ''}
          </Text>
        </View>

        {/* Quick Add */}
        <Text style={styles.sectionTitle}>Quick Add</Text>
        <View style={styles.quickRow}>
          {([250, 500, 750] as const).map(ml => (
            <TouchableOpacity key={ml} style={styles.quickBtn} onPress={() => logWater(ml)}>
              <Droplets color={colors.textInverse} size={17} />
              <Text style={styles.quickBtnText}>+{ml} ml</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.quickBtn, styles.quickBtnOutline]} onPress={() => setShowModal(true)}>
            <Plus color={colors.text} size={17} />
            <Text style={[styles.quickBtnText, { color: colors.text }]}>Custom</Text>
          </TouchableOpacity>
        </View>

        {/* 7-Day Bar Chart */}
        <Text style={styles.sectionTitle}>Last 7 Days</Text>
        <View style={styles.chartCard}>
          <Svg width={CHART_WIDTH} height={CHART_HEIGHT + 20}>
            {chartDays.map((day, i) => {
              const barH   = Math.max(2, (day.total_ml / maxBarMl) * CHART_HEIGHT);
              const x      = i * barGap + (barGap - barW) / 2;
              const isToday = day.key === dateKey;
              return (
                <React.Fragment key={day.key}>
                  <Rect x={x} y={CHART_HEIGHT - barH} width={barW} height={barH} rx={4}
                    fill={isToday ? colors.primary : 'rgba(10,10,10,0.18)'} />
                  <SvgText x={x + barW / 2} y={CHART_HEIGHT + 14} textAnchor="middle"
                    fontSize={10}
                    fill={isToday ? colors.text : colors.textMuted}>
                    {day.label}
                  </SvgText>
                </React.Fragment>
              );
            })}
          </Svg>
          <Text style={styles.chartCaption}>Target {dailyTarget} ml/day · today highlighted</Text>
        </View>

        {/* Today's Log */}
        <Text style={styles.sectionTitle}>Today&apos;s Log</Text>
        {isLoading ? (
          <View style={styles.emptyCard}><Text style={styles.emptyText}>Loading…</Text></View>
        ) : todayEntries.length === 0 ? (
          <View style={styles.emptyCard}>
            <Droplets color={colors.textMuted} size={32} />
            <Text style={styles.emptyText}>No water logged yet today.</Text>
            <Text style={styles.emptySubtext}>Use the quick-add buttons above to get started.</Text>
          </View>
        ) : (
          <View style={styles.logList}>
            {todayEntries.map(entry => (
              <View key={entry.id} style={styles.logRow}>
                <Droplets color={colors.text} size={16} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.logAmount}>{entry.amount_ml} ml</Text>
                  <Text style={styles.logTime}>
                    {new Date(entry.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => deleteEntry(entry.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <X color={colors.textMuted} size={16} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Custom Amount Modal */}
      <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowModal(false)}>
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Custom Amount</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Amount in ml"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={customAmount}
              onChangeText={setCustomAmount}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCustomAdd}
            />
            <View style={styles.modalRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addBtn} onPress={handleCustomAdd}>
                <Text style={styles.addText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: colors.background },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle:   { fontSize: typography.sizes.lg, fontFamily: typography.fonts.headingBold, color: colors.text },
  content:       { padding: 24 },
  ringContainer: { alignItems: 'center', marginBottom: 28 },
  targetLabel:   { marginTop: 12, fontSize: typography.sizes.sm, fontWeight: '500', color: colors.textSecondary, textAlign: 'center' },
  formulaNote:   { fontSize: typography.sizes.xs, color: colors.textMuted, textAlign: 'center', marginTop: 4 },
  sectionTitle:  { fontSize: typography.sizes.base, fontFamily: typography.fonts.headingBold, color: colors.text, marginBottom: 12, marginTop: 8 },
  quickRow:      { flexDirection: 'row', gap: 10, marginBottom: 28, flexWrap: 'wrap' },
  quickBtn:      { flex: 1, minWidth: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.text, paddingVertical: 12, paddingHorizontal: 10, borderRadius: borderRadius.lg, gap: 6 },
  quickBtnOutline: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  quickBtnText:  { color: colors.textInverse, fontWeight: '600', fontSize: typography.sizes.sm },
  chartCard:     { backgroundColor: colors.surface, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 28, alignItems: 'center' },
  chartCaption:  { fontSize: typography.sizes.xs, color: colors.textMuted, marginTop: 8 },
  emptyCard:     { backgroundColor: colors.surface, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, padding: 32, alignItems: 'center', gap: 8 },
  emptyText:     { fontSize: typography.sizes.sm, fontWeight: '500', color: colors.textSecondary, textAlign: 'center' },
  emptySubtext:  { fontSize: typography.sizes.xs, color: colors.textMuted, textAlign: 'center' },
  logList:       { backgroundColor: colors.surface, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  logRow:        { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
  logAmount:     { fontSize: typography.sizes.sm, fontWeight: '600', color: colors.text },
  logTime:       { fontSize: typography.sizes.xs, color: colors.textMuted, marginTop: 2 },
  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard:     { backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: 24, width: '100%', maxWidth: 360 },
  modalTitle:    { fontSize: typography.sizes.lg, fontFamily: typography.fonts.headingBold, color: colors.text, marginBottom: 16 },
  modalInput:    { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, padding: 14, fontSize: typography.sizes.base, color: colors.text, marginBottom: 16 },
  modalRow:      { flexDirection: 'row', gap: 12 },
  cancelBtn:     { flex: 1, padding: 14, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  cancelText:    { fontSize: typography.sizes.sm, fontWeight: '500', color: colors.textSecondary },
  addBtn:        { flex: 1, padding: 14, borderRadius: borderRadius.md, backgroundColor: colors.primary, alignItems: 'center' },
  addText:       { fontSize: typography.sizes.sm, fontWeight: '700', color: colors.textInverse },
});
