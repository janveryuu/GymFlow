import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { CameraView, CameraRef, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Camera, AlertCircle, CheckCircle, Edit2 } from 'lucide-react-native';
import { colors, typography, borderRadius } from '../theme';
import { getDatabase } from '../db/connection';
import * as Crypto from 'expo-crypto';

// ===========================================================================
// MOCK — PENDING REAL VISION MODEL
// When the backend session wires in a real vision model, replace the
// mockAnalyzeImage() function below with a real API call.
//
// CONTRACT (see CONTRACT.md §4 — Pending Real AI Integration):
//   Request:  POST /api/v1/food-scan
//             Body: { image_base64: string }   OR multipart form-data image
//   Response: {
//               food_name: string,
//               calories: number,
//               protein_g: number,
//               carbs_g: number,
//               fat_g: number,
//               serving_size: string,
//               confidence: number   // 0.0 – 1.0
//             }
//
// Candidate real backends: GPT-4o Vision, Google Cloud Vision + Nutritionix,
// or LogMeal API (https://logmeal.es/api). See CONTRACT.md for full spec.
// ===========================================================================

interface FoodScanResult {
  food_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  serving_size: string;
}

// MOCK — PENDING REAL VISION MODEL: rotating set of plausible example results
const MOCK_RESULTS: FoodScanResult[] = [
  { food_name: 'Grilled Chicken Breast',  calories: 165, protein_g: 31.0, carbs_g: 0.0,  fat_g: 3.6, serving_size: '100g' },
  { food_name: 'Avocado Toast',           calories: 290, protein_g: 8.5,  carbs_g: 30.0, fat_g: 15.0, serving_size: '1 slice' },
  { food_name: 'Greek Yogurt (plain)',    calories: 100, protein_g: 17.0, carbs_g: 6.0,  fat_g: 0.7, serving_size: '170g' },
  { food_name: 'Brown Rice (cooked)',     calories: 216, protein_g: 4.5,  carbs_g: 45.0, fat_g: 1.8, serving_size: '1 cup (195g)' },
  { food_name: 'Banana',                  calories: 89,  protein_g: 1.1,  carbs_g: 23.0, fat_g: 0.3, serving_size: '1 medium (118g)' },
  { food_name: 'Scrambled Eggs (2)',      calories: 182, protein_g: 12.5, carbs_g: 2.0,  fat_g: 13.5, serving_size: '2 large eggs' },
  { food_name: 'Oatmeal (rolled oats)',   calories: 154, protein_g: 5.3,  carbs_g: 28.0, fat_g: 3.0, serving_size: '1/2 cup dry (40g)' },
];

let mockIndex = 0;

// MOCK — PENDING REAL VISION MODEL
async function mockAnalyzeImage(_base64?: string): Promise<FoodScanResult> {
  // Simulate realistic vision-model API latency (1.5 – 2.5 s)
  const delay = 1500 + Math.random() * 1000;
  await new Promise(r => setTimeout(r, delay));
  // Rotate through example results so different photos look different
  // Non-null: modulo guarantees index is always in bounds
  const result = MOCK_RESULTS[mockIndex % MOCK_RESULTS.length]!;
  mockIndex++;
  return result;
}

const MEAL_TYPES = ['Breakfast','Lunch','Dinner','Snacks'] as const;
type MealType = typeof MEAL_TYPES[number];
type Phase = 'camera' | 'analyzing' | 'result' | 'permission_denied';

export const AiFoodScannerScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [permission, requestPermission] = useCameraPermissions();
  const [phase,      setPhase]          = useState<Phase>(
    permission?.granted === false ? 'permission_denied' : 'camera'
  );
  const [result,     setResult]         = useState<FoodScanResult | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<MealType>('Snacks');
  const [isSaving,   setIsSaving]       = useState(false);
  const cameraRef = useRef<CameraRef>(null);

  // Editable result fields
  const [editName, setEditName]     = useState('');
  const [editCal,  setEditCal]      = useState('');
  const [editProt, setEditProt]     = useState('');
  const [editCarb, setEditCarb]     = useState('');
  const [editFat,  setEditFat]      = useState('');
  const [editServ, setEditServ]     = useState('');
  const [editing,  setEditing]      = useState(false);

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    setPhase('analyzing');
    try {
      // MOCK — PENDING REAL VISION MODEL
      // In production: capture photo, send base64 to real endpoint.
      // const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });
      // const analysisResult = await realVisionAPI(photo.base64);
      const analysisResult = await mockAnalyzeImage();
      setResult(analysisResult);
      setEditName(analysisResult.food_name);
      setEditCal(String(analysisResult.calories));
      setEditProt(String(analysisResult.protein_g));
      setEditCarb(String(analysisResult.carbs_g));
      setEditFat(String(analysisResult.fat_g));
      setEditServ(analysisResult.serving_size);
      setPhase('result');
    } catch (err) {
      console.error('[AiFoodScanner] capture/analyze error:', err);
      Alert.alert('Analysis Failed', 'Could not analyze the photo. Please try again.', [
        { text: 'OK', onPress: () => setPhase('camera') },
      ]);
    }
  };

  const addToLog = async () => {
    setIsSaving(true);
    try {
      const db  = await getDatabase();
      const id  = Crypto.randomUUID();
      const d   = new Date();
      const now = d.toISOString();
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      await db.runAsync(
        `INSERT INTO NutritionEntry
         (id, food_name, calories, protein_g, carbs_g, fat_g, serving_size, meal_type, source, logged_at, date_key)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, editName.trim(), parseInt(editCal, 10) || 0,
         parseFloat(editProt) || 0, parseFloat(editCarb) || 0, parseFloat(editFat) || 0,
         editServ, selectedMeal, 'ai_scan', now, dateKey]
      );
      Alert.alert('Added!', `${editName} added to ${selectedMeal}.`, [
        { text: 'Scan Another', onPress: () => { setPhase('camera'); setResult(null); } },
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      console.error('[AiFoodScanner] addToLog:', err);
      Alert.alert('Error', 'Could not save entry. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // --- Permission denied ---
  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><ArrowLeft color={colors.text} size={24} /></TouchableOpacity>
          <Text style={styles.headerTitle}>AI Food Scanner</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.center}>
          <AlertCircle color={colors.textMuted} size={48} />
          <Text style={styles.permTitle}>Camera Access Required</Text>
          <Text style={styles.permBody}>GymFlow needs camera access to photograph food for analysis.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
            <Text style={styles.primaryBtnText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- Analyzing state ---
  if (phase === 'analyzing') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={{ width: 24 }} />
          <Text style={styles.headerTitle}>AI Food Scanner</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.analyzingTitle}>Analyzing your meal…</Text>
          {/* MOCK — PENDING REAL VISION MODEL */}
          <Text style={styles.analyzingSubtitle}>Identifying food and estimating nutrition</Text>
        </View>
      </SafeAreaView>
    );
  }

  // --- Result / Confirmation state ---
  if (phase === 'result' && result) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { setPhase('camera'); setResult(null); }}>
            <ArrowLeft color={colors.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review & Confirm</Text>
          <TouchableOpacity onPress={() => setEditing(!editing)}>
            <Edit2 color={colors.text} size={20} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Mock disclaimer — honest about AI status */}
          {/* MOCK — PENDING REAL VISION MODEL */}
          <View style={styles.mockBanner}>
            <Text style={styles.mockBannerText}>
              ⚠️ Demo mode — AI results are illustrative. Edit values if needed before saving.
            </Text>
          </View>

          <View style={styles.resultCard}>
            <CheckCircle color={colors.success} size={24} style={{ marginBottom: 8 }} />
            <Text style={styles.resultLabel}>Identified food</Text>

            {editing ? (
              <TextInput style={styles.editInput} value={editName} onChangeText={setEditName}
                placeholder="Food name" placeholderTextColor={colors.textMuted} />
            ) : (
              <Text style={styles.resultFoodName}>{editName}</Text>
            )}
            <Text style={styles.resultServing}>Serving: {editServ}</Text>
          </View>

          <View style={styles.macroGrid}>
            {[
              { label: 'Calories', key: 'cal',  val: editCal,  set: setEditCal,  unit: 'kcal', highlight: true },
              { label: 'Protein',  key: 'prot', val: editProt, set: setEditProt, unit: 'g' },
              { label: 'Carbs',    key: 'carb', val: editCarb, set: setEditCarb, unit: 'g' },
              { label: 'Fat',      key: 'fat',  val: editFat,  set: setEditFat,  unit: 'g' },
            ].map(item => (
              <View key={item.key} style={[styles.macroCard, item.highlight && styles.macroCardHL]}>
                {editing ? (
                  <TextInput style={[styles.macroEditInput, item.highlight && styles.macroEditInputHL]}
                    value={item.val} onChangeText={item.set} keyboardType="decimal-pad" />
                ) : (
                  <Text style={[styles.macroValue, item.highlight && styles.macroValueHL]}>{item.val}</Text>
                )}
                <Text style={[styles.macroUnit, item.highlight && styles.macroUnitHL]}>{item.unit}</Text>
                <Text style={[styles.macroLabel, item.highlight && styles.macroLabelHL]}>{item.label}</Text>
              </View>
            ))}
          </View>

          {editing && (
            <TextInput style={styles.editInput} value={editServ} onChangeText={setEditServ}
              placeholder="Serving size" placeholderTextColor={colors.textMuted} />
          )}

          <Text style={styles.mealSectionTitle}>Add to meal</Text>
          <View style={styles.mealPills}>
            {MEAL_TYPES.map(m => (
              <TouchableOpacity key={m}
                style={[styles.mealPill, selectedMeal === m && styles.mealPillActive]}
                onPress={() => setSelectedMeal(m)}>
                <Text style={[styles.mealPillText, selectedMeal === m && styles.mealPillTextActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={addToLog} disabled={isSaving}>
            {isSaving
              ? <ActivityIndicator color={colors.textInverse} />
              : <Text style={styles.primaryBtnText}>Add to {selectedMeal}</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.outlineBtn} onPress={() => { setPhase('camera'); setResult(null); }}>
            <Text style={styles.outlineBtnText}>Retake Photo</Text>
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- Camera capture state ---
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><ArrowLeft color={colors.text} size={24} /></TouchableOpacity>
        <Text style={styles.headerTitle}>AI Food Scanner</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={{ flex: 1, position: 'relative' }}>
        <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
        <View style={styles.cameraOverlay} pointerEvents="none">
          <Text style={styles.cameraHint}>Frame your meal in the centre</Text>
        </View>
        <View style={styles.captureBar}>
          {/* MOCK — PENDING REAL VISION MODEL */}
          <Text style={styles.captureNote}>Demo mode — tap to simulate AI scan</Text>
          <TouchableOpacity style={styles.captureBtn} onPress={handleCapture}>
            <Camera color={colors.textInverse} size={28} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: colors.background },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle:      { fontSize: typography.sizes.lg, fontFamily: typography.fonts.headingBold, color: colors.text },
  center:           { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 16 },
  permTitle:        { fontSize: typography.sizes.xl, fontFamily: typography.fonts.headingBold, color: colors.text, textAlign: 'center' },
  permBody:         { fontSize: typography.sizes.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  analyzingTitle:   { fontSize: typography.sizes.xl, fontFamily: typography.fonts.headingBold, color: colors.text, marginTop: 16 },
  analyzingSubtitle:{ fontSize: typography.sizes.sm, color: colors.textSecondary },
  content:          { padding: 24 },
  mockBanner:       { backgroundColor: colors.surfaceHighlight, borderRadius: borderRadius.md, padding: 12, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: colors.warning },
  mockBannerText:   { fontSize: typography.sizes.xs, color: colors.textSecondary, lineHeight: 18 },
  resultCard:       { backgroundColor: colors.surface, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, padding: 20, alignItems: 'center', marginBottom: 16 },
  resultLabel:      { fontSize: typography.sizes.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  resultFoodName:   { fontSize: typography.sizes.xxl, fontFamily: typography.fonts.headingBlack, color: colors.text, textAlign: 'center' },
  resultServing:    { fontSize: typography.sizes.sm, color: colors.textSecondary, marginTop: 4 },
  macroGrid:        { flexDirection: 'row', gap: 10, marginBottom: 16 },
  macroCard:        { flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, padding: 12, alignItems: 'center' },
  macroCardHL:      { backgroundColor: colors.primary, borderColor: colors.primary },
  macroValue:       { fontSize: typography.sizes.lg, fontFamily: typography.fonts.headingBlack, color: colors.text },
  macroValueHL:     { color: colors.textInverse },
  macroUnit:        { fontSize: typography.sizes.xs, color: colors.textMuted },
  macroUnitHL:      { color: 'rgba(255,255,255,0.65)' },
  macroLabel:       { fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: 2 },
  macroLabelHL:     { color: 'rgba(255,255,255,0.85)' },
  macroEditInput:   { fontSize: typography.sizes.lg, fontWeight: '700', color: colors.text, textAlign: 'center', borderBottomWidth: 1, borderBottomColor: colors.border, width: '100%', paddingVertical: 2 },
  macroEditInputHL: { color: colors.textInverse, borderBottomColor: 'rgba(255,255,255,0.4)' },
  editInput:        { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, padding: 14, fontSize: typography.sizes.sm, color: colors.text, marginBottom: 12 },
  mealSectionTitle: { fontSize: typography.sizes.base, fontFamily: typography.fonts.headingBold, color: colors.text, marginBottom: 12 },
  mealPills:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  mealPill:         { paddingHorizontal: 14, paddingVertical: 8, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.border },
  mealPillActive:   { backgroundColor: colors.primary, borderColor: colors.primary },
  mealPillText:     { fontSize: typography.sizes.sm, fontWeight: '500', color: colors.textSecondary },
  mealPillTextActive:{ color: colors.textInverse, fontWeight: '700' },
  primaryBtn:       { backgroundColor: colors.primary, padding: 16, borderRadius: borderRadius.lg, alignItems: 'center', marginBottom: 12 },
  primaryBtnText:   { fontSize: typography.sizes.base, fontWeight: '700', color: colors.textInverse },
  outlineBtn:       { borderWidth: 1, borderColor: colors.border, padding: 16, borderRadius: borderRadius.lg, alignItems: 'center' },
  outlineBtnText:   { fontSize: typography.sizes.base, fontWeight: '500', color: colors.text },
  cameraOverlay:    { position: 'absolute', top: 0, left: 0, right: 0, padding: 24, alignItems: 'center' },
  cameraHint:       { color: '#FFFFFF', fontSize: typography.sizes.sm, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: borderRadius.full },
  captureBar:       { position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: 40, paddingTop: 20, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', gap: 10 },
  captureNote:      { color: 'rgba(255,255,255,0.7)', fontSize: typography.sizes.xs },
  captureBtn:       { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#FFFFFF' },
});
