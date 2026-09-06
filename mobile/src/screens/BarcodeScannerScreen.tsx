import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, Image, ActivityIndicator, Alert,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, ScanBarcode, AlertCircle, RefreshCw } from 'lucide-react-native';
import { colors, typography, borderRadius } from '../theme';
import { getDatabase } from '../db/connection';
import * as Crypto from 'expo-crypto';

// ---------------------------------------------------------------------------
// Open Food Facts public API — no API key required.
// Endpoint: https://world.openfoodfacts.org/api/v2/product/{barcode}.json
// Response shape documented in CONTRACT.md §3.
// ---------------------------------------------------------------------------
const OFF_API = (barcode: string) =>
  `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`;

interface FoodResult {
  barcode: string;
  product_name: string;
  image_url: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  serving_size: string;
}

type Phase = 'scanning' | 'loading' | 'result' | 'not_found' | 'error' | 'permission_denied';

export const BarcodeScannerScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase]               = useState<Phase>('scanning');
  const [foodResult, setFoodResult]     = useState<FoodResult | null>(null);
  const [errorMsg, setErrorMsg]         = useState('');
  const [isSaving, setIsSaving]         = useState(false);
  const isProcessing = useRef(false);

  // Request camera permission on mount
  useEffect(() => {
    if (permission && !permission.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleBarcodeScan = async (result: BarcodeScanningResult) => {
    if (isProcessing.current || phase !== 'scanning') return;
    isProcessing.current = true;
    setPhase('loading');

    try {
      const url = OFF_API(result.data);
      const response = await fetch(url, {
        headers: { 'User-Agent': 'GymFlowMobile/1.0 (fitness tracking app)' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();

      if (json.status !== 1 || !json.product) {
        setPhase('not_found');
        isProcessing.current = false;
        return;
      }

      const p = json.product;
      const n = p.nutriments ?? {};

      // Prefer per-serving values; fall back to per-100g
      const cal  = Math.round(n['energy-kcal_serving'] ?? n['energy-kcal_100g'] ?? 0);
      const prot = +(n['proteins_serving'] ?? n['proteins_100g'] ?? 0).toFixed(1);
      const carb = +(n['carbohydrates_serving'] ?? n['carbohydrates_100g'] ?? 0).toFixed(1);
      const fat  = +(n['fat_serving'] ?? n['fat_100g'] ?? 0).toFixed(1);

      setFoodResult({
        barcode:      result.data,
        product_name: p.product_name || p.product_name_en || 'Unknown product',
        image_url:    p.image_front_url ?? p.image_url ?? null,
        calories:     cal,
        protein_g:    prot,
        carbs_g:      carb,
        fat_g:        fat,
        serving_size: p.serving_size ?? '100g',
      });
      setPhase('result');
    } catch (err) {
      console.error('[BarcodeScanner] fetch error:', err);
      setErrorMsg('Could not connect to the food database. Check your connection and try again.');
      setPhase('error');
      isProcessing.current = false;
    }
  };

  const reset = () => {
    setPhase('scanning');
    setFoodResult(null);
    setErrorMsg('');
    isProcessing.current = false;
  };

  const addToLog = async (mealType: string = 'Snacks') => {
    if (!foodResult) return;
    setIsSaving(true);
    try {
      const db  = await getDatabase();
      const id  = Crypto.randomUUID();
      const d   = new Date();
      const now = d.toISOString();
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      await db.runAsync(
        `INSERT INTO NutritionEntry
         (id, food_name, calories, protein_g, carbs_g, fat_g, serving_size, meal_type, source, logged_at, date_key, barcode)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, foodResult.product_name, foodResult.calories, foodResult.protein_g,
         foodResult.carbs_g, foodResult.fat_g, foodResult.serving_size,
         mealType, 'barcode', now, dateKey, foodResult.barcode]
      );
      Alert.alert('Added!', `${foodResult.product_name} added to ${mealType}.`, [
        { text: 'Scan Another', onPress: reset },
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      console.error('[BarcodeScanner] addToLog:', err);
      Alert.alert('Error', 'Could not save to nutrition log. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // --- Permission denied ---
  if (permission && !permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><ArrowLeft color={colors.text} size={24} /></TouchableOpacity>
          <Text style={styles.headerTitle}>Barcode Scanner</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContent}>
          <AlertCircle color={colors.textMuted} size={48} />
          <Text style={styles.permTitle}>Camera Access Required</Text>
          <Text style={styles.permBody}>
            GymFlow needs camera access to scan barcodes. Please enable it in your device Settings.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
            <Text style={styles.primaryBtnText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- Loading state ---
  if (phase === 'loading') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><ArrowLeft color={colors.text} size={24} /></TouchableOpacity>
          <Text style={styles.headerTitle}>Barcode Scanner</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Looking up product…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // --- Not found state ---
  if (phase === 'not_found') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><ArrowLeft color={colors.text} size={24} /></TouchableOpacity>
          <Text style={styles.headerTitle}>Barcode Scanner</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContent}>
          <ScanBarcode color={colors.textMuted} size={48} />
          <Text style={styles.permTitle}>Product Not Found</Text>
          <Text style={styles.permBody}>
            This barcode isn&apos;t in the Open Food Facts database yet. You can add it manually.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={reset}>
            <Text style={styles.primaryBtnText}>Scan Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.outlineBtn} onPress={() => navigation.navigate('NutritionScreen', { openManualEntry: true })}>
            <Text style={styles.outlineBtnText}>Enter Manually</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- Network error state ---
  if (phase === 'error') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><ArrowLeft color={colors.text} size={24} /></TouchableOpacity>
          <Text style={styles.headerTitle}>Barcode Scanner</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContent}>
          <AlertCircle color={colors.error} size={48} />
          <Text style={styles.permTitle}>Lookup Failed</Text>
          <Text style={styles.permBody}>{errorMsg}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={reset}>
            <RefreshCw color={colors.textInverse} size={16} />
            <Text style={styles.primaryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- Result card ---
  if (phase === 'result' && foodResult) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={reset}><ArrowLeft color={colors.text} size={24} /></TouchableOpacity>
          <Text style={styles.headerTitle}>Product Found</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Product image — only real color allowed per design system */}
          {foodResult.image_url ? (
            <Image source={{ uri: foodResult.image_url }} style={styles.productImage} resizeMode="contain" />
          ) : (
            <View style={styles.productImagePlaceholder}>
              <ScanBarcode color={colors.textMuted} size={48} />
            </View>
          )}

          <Text style={styles.productName}>{foodResult.product_name}</Text>
          <Text style={styles.servingSize}>Per serving: {foodResult.serving_size}</Text>

          {/* Macro cards */}
          <View style={styles.macroRow}>
            {[
              { label: 'Calories', value: `${foodResult.calories}`, unit: 'kcal', highlight: true },
              { label: 'Protein',  value: `${foodResult.protein_g}`,  unit: 'g' },
              { label: 'Carbs',    value: `${foodResult.carbs_g}`,    unit: 'g' },
              { label: 'Fat',      value: `${foodResult.fat_g}`,      unit: 'g' },
            ].map(item => (
              <View key={item.label} style={[styles.macroCard, item.highlight && styles.macroCardHighlight]}>
                <Text style={[styles.macroValue, item.highlight && styles.macroValueHighlight]}>{item.value}</Text>
                <Text style={[styles.macroUnit,  item.highlight && styles.macroUnitHighlight]}>{item.unit}</Text>
                <Text style={[styles.macroLabel, item.highlight && styles.macroLabelHighlight]}>{item.label}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.mealLabel}>Add to meal</Text>
          <View style={styles.mealRow}>
            {['Breakfast','Lunch','Dinner','Snacks'].map(meal => (
              <TouchableOpacity key={meal} style={styles.mealBtn} onPress={() => addToLog(meal)} disabled={isSaving}>
                <Text style={styles.mealBtnText}>{meal}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {isSaving && <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />}
          <TouchableOpacity style={styles.outlineBtn} onPress={reset}>
            <Text style={styles.outlineBtnText}>Scan Another</Text>
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- Camera / Scanning state ---
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><ArrowLeft color={colors.text} size={24} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Barcode Scanner</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['ean13','ean8','upc_a','upc_e','qr','code128','code39'] }}
          onBarcodeScanned={phase === 'scanning' ? handleBarcodeScan : undefined}
        />
        {/* Viewfinder overlay */}
        <View style={styles.overlay} pointerEvents="none">
          <View style={styles.viewfinder}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.scanHint}>Point at a product barcode to scan</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const CORNER = 20;
const styles = StyleSheet.create({
  container:              { flex: 1, backgroundColor: colors.background },
  header:                 { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle:            { fontSize: typography.sizes.lg, fontFamily: typography.fonts.headingBold, color: colors.text },
  centerContent:          { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 16 },
  permTitle:              { fontSize: typography.sizes.xl, fontFamily: typography.fonts.headingBold, color: colors.text, textAlign: 'center' },
  permBody:               { fontSize: typography.sizes.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  loadingText:            { fontSize: typography.sizes.base, color: colors.textSecondary, marginTop: 16 },
  primaryBtn:             { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: 28, borderRadius: borderRadius.lg, marginTop: 8 },
  primaryBtnText:         { fontSize: typography.sizes.base, fontWeight: '700', color: colors.textInverse },
  outlineBtn:             { borderWidth: 1, borderColor: colors.border, paddingVertical: 14, paddingHorizontal: 28, borderRadius: borderRadius.lg, alignItems: 'center', marginTop: 8, width: '100%' },
  outlineBtnText:         { fontSize: typography.sizes.base, fontWeight: '500', color: colors.text },
  content:                { padding: 24 },
  productImage:           { width: '100%', height: 200, borderRadius: borderRadius.lg, marginBottom: 20, backgroundColor: colors.surfaceElevated },
  productImagePlaceholder:{ width: '100%', height: 180, borderRadius: borderRadius.lg, backgroundColor: colors.surfaceElevated, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  productName:            { fontSize: typography.sizes.xxl, fontFamily: typography.fonts.headingBlack, color: colors.text, marginBottom: 4 },
  servingSize:            { fontSize: typography.sizes.sm, color: colors.textSecondary, marginBottom: 20 },
  macroRow:               { flexDirection: 'row', gap: 10, marginBottom: 28 },
  macroCard:              { flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, padding: 12, alignItems: 'center' },
  macroCardHighlight:     { backgroundColor: colors.primary, borderColor: colors.primary },
  macroValue:             { fontSize: typography.sizes.lg, fontFamily: typography.fonts.headingBlack, color: colors.text },
  macroValueHighlight:    { color: colors.textInverse },
  macroUnit:              { fontSize: typography.sizes.xs, color: colors.textMuted },
  macroUnitHighlight:     { color: 'rgba(255,255,255,0.7)' },
  macroLabel:             { fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: 2 },
  macroLabelHighlight:    { color: 'rgba(255,255,255,0.85)' },
  mealLabel:              { fontSize: typography.sizes.base, fontFamily: typography.fonts.headingBold, color: colors.text, marginBottom: 12 },
  mealRow:                { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  mealBtn:                { flex: 1, minWidth: 120, backgroundColor: colors.text, paddingVertical: 12, borderRadius: borderRadius.md, alignItems: 'center' },
  mealBtnText:            { fontSize: typography.sizes.sm, fontWeight: '500', color: colors.textInverse },
  cameraContainer:        { flex: 1, position: 'relative' },
  camera:                 { flex: 1 },
  overlay:                { ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'center' },
  viewfinder:             { width: 260, height: 180, position: 'relative' },
  corner:                 { position: 'absolute', width: CORNER, height: CORNER, borderColor: '#FFFFFF', borderWidth: 3 },
  cornerTL:               { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  cornerTR:               { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  cornerBL:               { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  cornerBR:               { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },
  scanHint:               { color: '#FFFFFF', fontSize: typography.sizes.sm, marginTop: 24, textAlign: 'center', paddingHorizontal: 32 },
});
