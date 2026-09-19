/**
 * BarcodeScannerScreen
 * High-performance on-device barcode scanner screen for GymFlow.
 * Fetches product macros from Open Food Facts API (zero-cost, open-source).
 * Supports image uploads and test presets for localhost / environments without a camera.
 */

import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { CameraView } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import * as Crypto from 'expo-crypto';

import { colors } from '../theme';
import { getDatabase } from '../db/connection';
import {
  useBarcodeScanner,
  ScannerOverlay,
  ScannerFeedbackView,
  MacroBottomSheet,
  LocalhostImageModal,
  ProductMacroInfo,
  MealType,
  MacroNutrientValues,
} from '../modules/barcodeScanner';

export const BarcodeScannerScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [isLogging, setIsLogging] = useState(false);

  // Localhost / image upload dev state
  const [localhostModalVisible, setLocalhostModalVisible] = useState(false);
  const [uploadedImageUri, setUploadedImageUri] = useState<string | null>(null);
  const [detectedBarcode, setDetectedBarcode] = useState<string | null>(null);

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
    autoRequestPermission: true,
  });

  /**
   * Triggers image upload from the device gallery.
   * If a barcode is automatically detected, it initiates lookup right away.
   * Otherwise, it opens the localhost modal showing the image preview and manual barcode input.
   */
  const handleUploadImage = async () => {
    const result = await pickAndScanImage();
    if (result.canceled) return;

    setUploadedImageUri(result.uri);
    setDetectedBarcode(result.detectedCode);

    // If no code was automatically detected by browser, open the confirmation modal
    if (!result.detectedCode) {
      setLocalhostModalVisible(true);
    }
  };

  /**
   * Confirms and triggers lookup for a given barcode string.
   */
  const handleConfirmBarcode = async (barcode: string) => {
    setLocalhostModalVisible(false);
    await scanBarcodeDirectly(barcode);
  };

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
        { text: 'Scan Another', onPress: resetScanner },
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

  // State Feedback: Permission Denied, Loading, Not Found, Network Error
  if (
    phase === 'permission_denied' ||
    phase === 'loading' ||
    phase === 'not_found' ||
    phase === 'error'
  ) {
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
          onOpenManual={() => setLocalhostModalVisible(true)}
          onClose={() => navigation.goBack()}
        />

        {/* Localhost Image Upload & Barcode Dialog */}
        <LocalhostImageModal
          visible={localhostModalVisible}
          uploadedImageUri={uploadedImageUri}
          detectedBarcode={detectedBarcode}
          onConfirmBarcode={handleConfirmBarcode}
          onPickAnotherImage={handleUploadImage}
          onClose={() => setLocalhostModalVisible(false)}
        />
      </View>
    );
  }

  // Active Camera Scanning & Result View
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
          onUploadImage={handleUploadImage}
          onOpenManual={() => setLocalhostModalVisible(true)}
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

        {/* Localhost Image Upload & Barcode Dialog */}
        <LocalhostImageModal
          visible={localhostModalVisible}
          uploadedImageUri={uploadedImageUri}
          detectedBarcode={detectedBarcode}
          onConfirmBarcode={handleConfirmBarcode}
          onPickAnotherImage={handleUploadImage}
          onClose={() => setLocalhostModalVisible(false)}
        />
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
});
