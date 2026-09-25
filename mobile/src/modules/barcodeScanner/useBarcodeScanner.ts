/**
 * Barcode Scanner Controller Hook
 * Manages camera permissions, barcode capture throttling, image uploads (localhost/dev),
 * API lifecycle, torch state, and haptics.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import {
  ScannerPhase,
  ProductMacroInfo,
  ScannerErrorState,
  MealType,
} from './types';
import {
  fetchProductMacros,
  ProductNotFoundError,
  OpenFoodFactsTimeoutError,
} from './openFoodFactsService';
import { isValidFoodBarcode } from './macroParser';
import { detectBarcodeFromImage } from './imageBarcodeScanner';

export interface UseBarcodeScannerOptions {
  autoRequestPermission?: boolean;
  userAgent?: string;
  onProductScanned?: (product: ProductMacroInfo) => void;
}

export function useBarcodeScanner(options: UseBarcodeScannerOptions = {}) {
  const { autoRequestPermission = true, userAgent, onProductScanned } = options;

  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<ScannerPhase>('scanning');
  const [productInfo, setProductInfo] = useState<ProductMacroInfo | null>(null);
  const [scannedBarcode, setScannedBarcode] = useState<string>('');
  const [errorState, setErrorState] = useState<ScannerErrorState | null>(null);
  const [torch, setTorch] = useState<boolean>(false);
  const [activeBasis, setActiveBasis] = useState<'serving' | '100g'>('serving');
  const [selectedMeal, setSelectedMeal] = useState<MealType>('Snacks');

  const isProcessingRef = useRef(false);

  // Automatically request camera permission on mount if specified
  useEffect(() => {
    if (autoRequestPermission && permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [autoRequestPermission, permission, requestPermission]);

  // Sync phase with permission state only when camera permission is actively used
  useEffect(() => {
    if (autoRequestPermission && permission && !permission.granted && !permission.canAskAgain) {
      setPhase('permission_denied');
    }
  }, [autoRequestPermission, permission]);

  const toggleTorch = useCallback(() => {
    setTorch((prev) => !prev);
  }, []);

  const toggleBasis = useCallback(() => {
    setActiveBasis((prev) => (prev === 'serving' ? '100g' : 'serving'));
  }, []);

  const resetScanner = useCallback(() => {
    isProcessingRef.current = false;
    setPhase('scanning');
    setProductInfo(null);
    setScannedBarcode('');
    setErrorState(null);
    setActiveBasis('serving');
  }, []);

  /**
   * Core lookup function for a given barcode string.
   */
  const performBarcodeLookup = useCallback(
    async (rawBarcode: string) => {
      const trimmed = rawBarcode.trim();
      if (!trimmed) return;

      isProcessingRef.current = true;
      setScannedBarcode(trimmed);
      setPhase('loading');

      // Trigger crisp haptic feedback on barcode capture
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // Safe failover if haptics are not supported
      }

      try {
        const product = await fetchProductMacros(trimmed, { userAgent });
        setProductInfo(product);
        setActiveBasis(product.basisAvailable === '100g' ? '100g' : 'serving');
        setPhase('result');
        if (onProductScanned) {
          onProductScanned(product);
        }
      } catch (err: any) {
        console.warn('[useBarcodeScanner] Scan lookup failed:', err);

        if (err instanceof ProductNotFoundError) {
          setPhase('not_found');
          setErrorState({
            type: 'not_found',
            message: `Barcode ${trimmed} was not found in Open Food Facts.`,
            details: 'This item may not be registered yet. You can enter its macros manually.',
          });
        } else if (err instanceof OpenFoodFactsTimeoutError) {
          setPhase('error');
          setErrorState({
            type: 'timeout',
            message: 'Connection timed out',
            details: 'The request took too long. Check your internet connection and try again.',
          });
        } else {
          setPhase('error');
          setErrorState({
            type: 'network',
            message: 'Unable to fetch product',
            details:
              err?.message ||
              'Could not connect to Open Food Facts database. Please check your network and try again.',
          });
        }
      } finally {
        isProcessingRef.current = false;
      }
    },
    [userAgent, onProductScanned]
  );

  /**
   * Barcode detection handler triggered by CameraView.
   */
  const handleBarcodeScanned = useCallback(
    async (result: BarcodeScanningResult) => {
      const rawBarcode = result?.data ? String(result.data).trim() : '';

      if (isProcessingRef.current || phase !== 'scanning' || !rawBarcode) {
        return;
      }

      if (!isValidFoodBarcode(rawBarcode)) {
        return;
      }

      await performBarcodeLookup(rawBarcode);
    },
    [phase, performBarcodeLookup]
  );

  /**
   * Allows picking an image from the local gallery / files (especially on localhost with no camera).
   */
  const pickAndScanImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled || !result.assets[0]?.uri) {
        return { canceled: true, uri: null, detectedCode: null };
      }

      const imageUri = result.assets[0].uri;

      // Attempt barcode detection from image
      const detected = await detectBarcodeFromImage(imageUri);
      if (detected?.rawValue && isValidFoodBarcode(detected.rawValue)) {
        await performBarcodeLookup(detected.rawValue);
        return { canceled: false, uri: imageUri, detectedCode: detected.rawValue };
      }

      return { canceled: false, uri: imageUri, detectedCode: null };
    } catch (err) {
      console.warn('[useBarcodeScanner] Image picker error:', err);
      return { canceled: true, uri: null, detectedCode: null };
    }
  }, [performBarcodeLookup]);

  return {
    permission,
    requestPermission,
    phase,
    productInfo,
    scannedBarcode,
    errorState,
    torch,
    activeBasis,
    selectedMeal,
    toggleTorch,
    toggleBasis,
    setSelectedMeal,
    resetScanner,
    handleBarcodeScanned,
    scanBarcodeDirectly: performBarcodeLookup,
    pickAndScanImage,
  };
}
