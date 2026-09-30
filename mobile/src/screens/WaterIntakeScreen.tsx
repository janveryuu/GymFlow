import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, SafeAreaView, Alert, Modal, Pressable, Dimensions,
  Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Droplets, Plus, X, Lock } from '../components/icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, borderRadius } from '../theme';
import { PercentRing } from '../components/PercentRing';
import { getDatabase } from '../db/connection';
import { useAuthStore } from '../store/authStore';
import { PrismBackground } from '../components/PrismBackground';
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

export const WaterIntakeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const user = useAuthStore((state) => state.user);
  const isProfileComplete = Boolean(user?.is_profile_completed);

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
    if (!isProfileComplete) {
      setIsLoading(false);
      return;
    }
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
  }, [isProfileComplete, dateKey]);

  useFocusEffect(useCallback(() => {
    if (!isProfileComplete) return;
    loadData();
  }, [isProfileComplete, loadData]));

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

  if (!isProfileComplete) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Luminous Animated 3D Prism Background in Electric Cyan */}
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
          tintColor="#00E5FF"
          gradientColor="#FFFFFF"
        />

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerCircleBtn}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft color={colors.text} size={18} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Water Intake</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.gateContainer}>
          <View style={styles.gateCard}>
            <View style={styles.gateIconWrapper}>
              <Lock size={38} color="#00E5FF" />
            </View>
            <Text style={styles.gateTitle}>Profile Setup Required</Text>
            <Text style={styles.gateMessage}>
              You must complete the profile setup in order to use this feature. Setting your weight and intensity is required to calculate accurate daily hydration targets.
            </Text>

            <TouchableOpacity
              style={styles.gatePrimaryBtn}
              onPress={() => navigation.navigate('ProfileSetup')}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Complete Profile Setup"
            >
              <Text style={styles.gatePrimaryBtnText}>Complete Profile Setup</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gateSecondaryBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Go Back"
            >
              <Text style={styles.gateSecondaryBtnText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Luminous Animated 3D Prism Background in Electric Cyan */}
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
        tintColor="#00E5FF"
        gradientColor="#FFFFFF"
      />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerCircleBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft color={colors.text} size={18} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Water Intake</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Progress Ring (Laid flat in background) */}
        <View style={styles.ringContainer}>
          <PercentRing
            percentage={percentage}
            size={200}
            strokeWidth={16}
            color={colors.cyan}
            trackColor={colors.cyanMuted}
            label={`${currentIntake} / ${dailyTarget} ml`}
            showPercentageText
          />
          <Text style={styles.targetLabel}>
            Daily target: {dailyTarget} ml
          </Text>
        </View>

        {/* Quick Add (2x2 Grid) */}
        <Text style={styles.sectionTitle}>Quick Add</Text>
        <View style={styles.quickGrid}>
          <View style={styles.quickRow}>
            <TouchableOpacity
              style={styles.quickBtnWrapper}
              onPress={() => logWater(250)}
              activeOpacity={0.85}
            >
              <View style={styles.quickBtnGradient}>
                <Droplets color="#000000" size={18} />
                <Text style={[styles.quickBtnText, { color: '#000000' }]}>+250 ml</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickBtnWrapper}
              onPress={() => logWater(500)}
              activeOpacity={0.85}
            >
              <View style={styles.quickBtnGradient}>
                <Droplets color="#000000" size={18} />
                <Text style={[styles.quickBtnText, { color: '#000000' }]}>+500 ml</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.quickRow}>
            <TouchableOpacity
              style={styles.quickBtnWrapper}
              onPress={() => logWater(750)}
              activeOpacity={0.85}
            >
              <View style={styles.quickBtnGradient}>
                <Droplets color="#000000" size={18} />
                <Text style={[styles.quickBtnText, { color: '#000000' }]}>+750 ml</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickBtn, styles.quickBtnOutline]}
              onPress={() => setShowModal(true)}
              activeOpacity={0.85}
            >
              <Plus color={colors.text} size={18} />
              <Text style={[styles.quickBtnText, { color: colors.text }]}>Custom</Text>
            </TouchableOpacity>
          </View>
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
              <View key={entry.id} style={styles.logCard}>
                <Droplets color={colors.cyan} size={18} />
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.10)',
    backgroundColor: Platform.OS === 'web' ? 'rgba(0, 0, 0, 0.35)' : 'transparent',
    zIndex: 10,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
    } as any : {}),
  },
  headerCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Platform.OS === 'web' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
    } as any : {}),
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.headingBold,
    color: colors.text,
  },
  content: {
    padding: 20,
  },
  ringContainer: {
    alignItems: 'center',
    marginBottom: 28,
    marginTop: 8,
  },
  targetLabel: {
    marginTop: 14,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.headingBold,
    color: colors.text,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  formulaNote: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fonts.headingBold,
    color: colors.text,
    marginBottom: 12,
    marginTop: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  quickGrid: {
    gap: 10,
    marginBottom: 24,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickBtnWrapper: {
    flex: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  quickBtnGradient: {
    flex: 1,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: borderRadius.lg,
    gap: 8,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  quickBtn: {
    flex: 1,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: borderRadius.lg,
    gap: 8,
  },
  quickBtnOutline: {
    backgroundColor: Platform.OS === 'web' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
    } as any : {}),
  },
  quickBtnText: {
    color: colors.textInverse,
    fontWeight: '700',
    fontSize: typography.sizes.sm,
  },
  emptyCard: {
    backgroundColor: Platform.OS === 'web' ? 'rgba(14, 14, 18, 0.65)' : 'rgba(18, 18, 22, 0.85)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    padding: 32,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(20px) saturate(190%)',
      WebkitBackdropFilter: 'blur(20px) saturate(190%)',
    } as any : {}),
  },
  emptyText: {
    fontSize: typography.sizes.sm,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    textAlign: 'center',
  },
  logList: {
    gap: 10,
  },
  logCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Platform.OS === 'web' ? 'rgba(14, 14, 18, 0.65)' : 'rgba(18, 18, 22, 0.85)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(20px) saturate(190%)',
      WebkitBackdropFilter: 'blur(20px) saturate(190%)',
    } as any : {}),
  },
  logAmount: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: colors.text,
  },
  logTime: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: Platform.OS === 'web' ? 'rgba(16, 16, 22, 0.88)' : 'rgba(20, 20, 26, 0.95)',
    borderRadius: borderRadius.xl,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.20)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(28px) saturate(190%)',
      WebkitBackdropFilter: 'blur(28px) saturate(190%)',
    } as any : {}),
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.headingBold,
    color: colors.text,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: borderRadius.md,
    padding: 14,
    fontSize: typography.sizes.base,
    color: colors.text,
    marginBottom: 16,
  },
  modalRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: typography.sizes.sm,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  addBtn: {
    flex: 1,
    padding: 14,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  addText: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: colors.textInverse,
  },
  gateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  gateCard: {
    backgroundColor: Platform.OS === 'web' ? 'rgba(14, 14, 18, 0.65)' : 'rgba(18, 18, 22, 0.85)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 8,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(24px) saturate(190%)',
      WebkitBackdropFilter: 'blur(24px) saturate(190%)',
    } as any : {}),
  },
  gateIconWrapper: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 229, 255, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  gateTitle: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: typography.fonts.headingBold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  gateMessage: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: typography.fonts.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  gatePrimaryBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: borderRadius.lg,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  gatePrimaryBtnText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '800',
    fontFamily: typography.fonts.headingBold,
  },
  gateSecondaryBtn: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: borderRadius.lg,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    backgroundColor: Platform.OS === 'web' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.12)',
  },
  gateSecondaryBtnText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
    fontFamily: typography.fonts.body,
  },
});
