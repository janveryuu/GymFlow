/**
 * BarcodeScannerScreen
 * High-performance on-device barcode scanner screen for GymFlow.
 * Fetches product macros from Open Food Facts API (zero-cost, open-source).
 * Supports camera mode and dedicated image upload mode (without opening camera).
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Alert,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { CameraView } from 'expo-camera';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  ArrowLeft,
  Camera,
  Image as ImageLucide,
} from 'lucide-react-native';
import * as Crypto from 'expo-crypto';

import { colors, typography, borderRadius } from '../theme';
import { getDatabase } from '../db/connection';
import {
  useBarcodeScanner,
  ScannerOverlay,
  ScannerFeedbackView,
  MacroBottomSheet,
  ProductMacroInfo,
  MealType,
  MacroNutrientValues,
  detectBarcodeFromImage,
  isValidFoodBarcode,
} from '../modules/barcodeScanner';

export const BarcodeScannerScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [isLogging, setIsLogging] = useState(false);

  // Mode: 'camera' or 'upload'
  const initialMode: 'camera' | 'upload' =
    route.params?.mode === 'upload' || route.params?.autoPickImage
      ? 'upload'
      : 'camera';
  const [mode, setMode] = useState<'camera' | 'upload'>(initialMode);

  // Image upload state
  const [uploadedImageUri, setUploadedImageUri] = useState<string | null>(
    route.params?.initialImageUri || null
  );
  const [detectedBarcode, setDetectedBarcode] = useState<string | null>(null);

  const isCameraMode = mode === 'camera';

  const {
    permission,
    requestPermission,
    phase,
    productInfo,
    scannedBarcode,
    errorState,
    torch,
    toggleTorch,
    resetScanner,
    handleBarcodeScanned,
    scanBarcodeDirectly,
    pickAndScanImage,
  } = useBarcodeScanner({
    autoRequestPermission: isCameraMode,
  });

  /**
   * Process a chosen image URI: detects barcode, and looks up macros.
   */
  const processImageUri = useCallback(
    async (uri: string) => {
      setUploadedImageUri(uri);
      const detected = await detectBarcodeFromImage(uri);
      if (detected?.rawValue && isValidFoodBarcode(detected.rawValue)) {
        setDetectedBarcode(detected.rawValue);
        await scanBarcodeDirectly(detected.rawValue);
      } else {
        setDetectedBarcode(null);
        Alert.alert(
          'Barcode Not Detected',
          'Could not read a barcode from this image. Please make sure the barcode is clear and well-lit, then try again.',
          [
            { text: 'Choose Another Image', onPress: handleUploadImage },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      }
    },
    [scanBarcodeDirectly]
  );

  /**
   * Triggers image upload from the device gallery.
   * If currently in camera mode, switches to upload mode first so the camera turns off.
   */
  const handleUploadImage = async () => {
    // Switch to upload mode so CameraView is unmounted and camera hardware stops immediately
    if (mode === 'camera') {
      setMode('upload');
    }

    const result = await pickAndScanImage();
    if (result.canceled) return;

    setUploadedImageUri(result.uri);
    setDetectedBarcode(result.detectedCode);

    if (!result.detectedCode) {
      Alert.alert(
        'Barcode Not Detected',
        'Could not read a barcode from this image. Please make sure the barcode is clear and well-lit, then try again.',
        [
          { text: 'Choose Another Image', onPress: handleUploadImage },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  /**
   * Automatically process initialImageUri if passed via navigation route param
   */
  useEffect(() => {
    if (route.params?.initialImageUri) {
      processImageUri(route.params.initialImageUri);
    } else if (route.params?.autoPickImage && mode === 'upload') {
      const timer = setTimeout(() => {
        handleUploadImage();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [route.params?.initialImageUri, route.params?.autoPickImage]);

  /**
   * Persists the scanned food and chosen macro basis into the local SQLite database.
   */
  const handleLogMeal = async ({
    product,
    mealType,
    macros,
    basis,
  }: {
    product: ProductMacroInfo;
    mealType: MealType;
    macros: MacroNutrientValues;
    basis: 'serving' | '100g';
  }) => {
    setIsLogging(true);
    try {
      const db = await getDatabase();
      const id = Crypto.randomUUID();
      const d = new Date();
      const now = d.toISOString();
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;

      const servingLabel = basis === 'serving' ? product.servingSize : '100g';

      await db.runAsync(
        `INSERT INTO NutritionEntry
         (id, food_name, calories, protein_g, carbs_g, fat_g, serving_size, meal_type, source, logged_at, date_key, barcode)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          product.productName,
          macros.calories,
          macros.protein_g,
          macros.carbs_g,
          macros.fat_g,
          servingLabel,
          mealType,
          'barcode',
          now,
          dateKey,
          product.barcode,
        ]
      );

      Alert.alert('Meal Logged!', `${product.productName} added to ${mealType}.`, [
        {
          text: 'Scan Another',
          onPress: () => {
            resetScanner();
            if (mode === 'upload') {
              handleUploadImage();
            }
          },
        },
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      console.error('[BarcodeScanner] SQLite insert error:', err);
      Alert.alert('Error', 'Could not save to nutrition log. Please try again.');
    } finally {
      setIsLogging(false);
    }
  };

  const handleManualEntry = () => {
    navigation.navigate('NutritionScreen', { openManualEntry: true });
  };

  // State Feedback: Permission Denied (in camera mode only)
  if (isCameraMode && phase === 'permission_denied') {
    return (
      <View style={styles.container}>
        <ScannerFeedbackView
          phase={phase}
          scannedBarcode={scannedBarcode}
          errorState={errorState}
          onScanAgain={resetScanner}
          onEnterManually={handleManualEntry}
          onRequestPermission={requestPermission}
          onUploadImage={handleUploadImage}
          onClose={() => navigation.goBack()}
        />
      </View>
    );
  }

  // State Feedback: Loading, Not Found, Network Error
  if (phase === 'loading' || phase === 'not_found' || phase === 'error') {
    return (
      <View style={styles.container}>
        <ScannerFeedbackView
          phase={phase}
          scannedBarcode={scannedBarcode}
          errorState={errorState}
          onScanAgain={resetScanner}
          onEnterManually={handleManualEntry}
          onRequestPermission={requestPermission}
          onUploadImage={handleUploadImage}
          onClose={() => navigation.goBack()}
        />
      </View>
    );
  }

  // Camera Scanning & Result View (only rendered when mode === 'camera')
  if (isCameraMode) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            enableTorch={torch}
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
            }}
            onBarcodeScanned={phase === 'scanning' ? handleBarcodeScanned : undefined}
          />

          {/* Viewfinder Target & Laser Scanning Animation */}
          <ScannerOverlay
            torchOn={torch}
            onToggleTorch={toggleTorch}
            onClose={() => navigation.goBack()}
            title="Barcode Scanner"
          />

          {/* Macro Breakdown Bottom Sheet Overlay */}
          {phase === 'result' && productInfo && (
            <MacroBottomSheet
              product={productInfo}
              onLogMeal={handleLogMeal}
              onScanAnother={resetScanner}
              onClose={resetScanner}
              isLogging={isLogging}
            />
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Upload Mode View (NO CameraView rendered; camera hardware remains off)
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.uploadContainer}>
        {/* Top Header */}
        <View style={styles.uploadHeader}>
          <TouchableOpacity
            style={styles.circleButton}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Back"
            accessibilityRole="button"
          >
            <ArrowLeft color={colors.text} size={22} />
          </TouchableOpacity>

          <View style={styles.headerTitleGroup}>
            <Text style={styles.headerTitleText}>Barcode Scanner</Text>
            <View style={styles.uploadBadge}>
              <Text style={styles.uploadBadgeText}>IMAGE SCAN</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.circleButton}
            onPress={() => {
              resetScanner();
              setMode('camera');
            }}
            accessibilityLabel="Switch to Camera"
            accessibilityRole="button"
          >
            <Camera color={colors.text} size={20} />
          </TouchableOpacity>
        </View>

        {/* Body Content */}
        <View style={styles.uploadBody}>
          {uploadedImageUri ? (
            <View style={styles.previewCard}>
              <Image
                source={{ uri: uploadedImageUri }}
                style={styles.previewImage}
                resizeMode="contain"
              />
              {detectedBarcode ? (
                <View style={styles.detectedBadge}>
                  <Text style={styles.detectedText}>Barcode: {detectedBarcode}</Text>
                </View>
              ) : null}
            </View>
          ) : (
            <TouchableOpacity
              style={styles.emptyCard}
              onPress={handleUploadImage}
              activeOpacity={0.8}
            >
              <View style={styles.emptyIconCircle}>
                <ImageLucide color="#60A5FA" size={36} />
              </View>
              <Text style={styles.emptyCardTitle}>Select Barcode Image</Text>
              <Text style={styles.emptyCardSubtitle}>
                Choose a photo or screenshot from your gallery to automatically detect product macros
              </Text>
              <View style={styles.chooseFileBtn}>
                <Text style={styles.chooseFileBtnText}>📁 Open Gallery</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Action Button */}
          <View style={styles.uploadActionRow}>
            <TouchableOpacity
              style={styles.uploadBtn}
              onPress={handleUploadImage}
              activeOpacity={0.8}
            >
              <Text style={styles.uploadBtnText}>📁 Choose Another Image</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.attributionText}>
            Powered by Open Food Facts (Free & Open Source)
          </Text>
        </View>

        {/* Macro Breakdown Bottom Sheet Overlay */}
        {phase === 'result' && productInfo && (
          <MacroBottomSheet
            product={productInfo}
            onLogMeal={handleLogMeal}
            onScanAnother={() => {
              resetScanner();
              handleUploadImage();
            }}
            onClose={resetScanner}
            isLogging={isLogging}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  uploadContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  uploadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 12,
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleGroup: {
    alignItems: 'center',
  },
  headerTitleText: {
    fontSize: typography.sizes.xl,
    lineHeight: typography.lineHeights.xl,
    fontFamily: typography.fonts.headingBold,
    color: colors.text,
    fontWeight: '700',
  },
  uploadBadge: {
    marginTop: 4,
    backgroundColor: 'rgba(96, 165, 250, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.3)',
  },
  uploadBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#60A5FA',
    letterSpacing: 0.8,
  },
  uploadBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  previewCard: {
    width: '100%',
    height: 280,
    backgroundColor: '#141414',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262626',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  detectedBadge: {
    position: 'absolute',
    bottom: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CCFF00',
  },
  detectedText: {
    color: '#CCFF00',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    width: '100%',
    padding: 28,
    backgroundColor: '#141414',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262626',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(96, 165, 250, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyCardTitle: {
    fontSize: typography.sizes.lg,
    lineHeight: typography.lineHeights.lg,
    fontFamily: typography.fonts.headingBold,
    color: colors.text,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyCardSubtitle: {
    fontSize: typography.sizes.sm,
    lineHeight: typography.lineHeights.sm,
    fontFamily: typography.fonts.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 20,
  },
  chooseFileBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  chooseFileBtnText: {
    color: '#60A5FA',
    fontWeight: '700',
    fontSize: 14,
  },
  uploadActionRow: {
    marginTop: 24,
    width: '100%',
  },
  uploadBtn: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  uploadBtnText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  attributionText: {
    fontSize: typography.sizes.xs,
    lineHeight: typography.lineHeights.xs,
    fontFamily: typography.fonts.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 20,
  },
});
