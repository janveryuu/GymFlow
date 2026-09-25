/**
 * Image Barcode Detection Utility
 * Detects barcodes from an image URI using the standard Web BarcodeDetector API (localhost/web)
 * with graceful fallback.
 */

import { Platform } from 'react-native';

export interface BarcodeDetectionResult {
  rawValue: string;
  format?: string;
}

/**
 * Attempts to decode a barcode from a local image URI.
 * - On Native (Android / iOS): uses expo-camera scanFromURLAsync (Google MLKit / AVFoundation).
 * - On Web: uses window.BarcodeDetector API with ZXing WebAssembly polyfill fallback.
 * - Heuristic fallback: extracts 8-14 digit barcode string from filename/path if available.
 */
import { scanFromURLAsync, BarcodeType } from 'expo-camera';
import { isValidFoodBarcode } from './macroParser';

const BARCODE_TYPES: BarcodeType[] = [
  'ean13',
  'ean8',
  'upc_a',
  'upc_e',
  'code128',
  'code39',
  'qr',
];

export async function detectBarcodeFromImage(
  imageUri: string
): Promise<BarcodeDetectionResult | null> {
  if (!imageUri) return null;

  // 1. Native Mobile Scanning: Use expo-camera scanFromURLAsync (Google MLKit on Android / AVFoundation)
  if (Platform.OS !== 'web') {
    try {
      if (typeof scanFromURLAsync === 'function') {
        const results = await scanFromURLAsync(imageUri, BARCODE_TYPES);
        if (results && results.length > 0) {
          for (const item of results) {
            if (item?.data) {
              const cleaned = item.data.trim().replace(/[-\s]/g, '');
              if (isValidFoodBarcode(cleaned)) {
                return {
                  rawValue: cleaned,
                  format: item.type,
                };
              }
            }
          }
          if (results[0]?.data) {
            return {
              rawValue: results[0].data.trim(),
              format: results[0].type,
            };
          }
        }
      }
    } catch (nativeErr) {
      console.warn('[detectBarcodeFromImage] Native scanFromURLAsync error:', nativeErr);
    }
  }

  // 2. Web Scanning: Use native BarcodeDetector or ZXing WebAssembly polyfill
  if (Platform.OS === 'web') {
    try {
      let DetectorClass = typeof window !== 'undefined' ? (window as any).BarcodeDetector : null;
      if (!DetectorClass) {
        try {
          // Use synchronous require instead of dynamic import which can fail in Metro
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const poly = require('barcode-detector');
          DetectorClass = poly.BarcodeDetector;
        } catch {}
      }

      if (DetectorClass) {
        const detector = new DetectorClass({
          formats: [
            'upc_a',
            'ean_13',
            'ean_8',
            'upc_e',
            'code_128',
            'code_39',
            'qr_code',
          ],
        });

        const img = new (window as any).Image();
        img.crossOrigin = 'anonymous';
        img.src = imageUri;

        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = (e: any) => reject(e);
        });

        const barcodes = await detector.detect(img);
        if (barcodes && barcodes.length > 0) {
          for (const bc of barcodes) {
            if (bc?.rawValue) {
              const cleaned = bc.rawValue.trim().replace(/[-\s]/g, '');
              if (isValidFoodBarcode(cleaned)) {
                return {
                  rawValue: cleaned,
                  format: bc.format,
                };
              }
            }
          }
          if (barcodes[0]?.rawValue) {
            return {
              rawValue: barcodes[0].rawValue.trim(),
              format: barcodes[0].format,
            };
          }
        }
      }
    } catch (err) {
      console.warn('[detectBarcodeFromImage] Web BarcodeDetector failed or no barcode found:', err);
    }
  }

  // 3. Filename heuristic fallback: check if image filename/path contains a barcode number
  try {
    const filenameMatch = imageUri.match(/(\d{8,14})/);
    if (filenameMatch && filenameMatch[1] && isValidFoodBarcode(filenameMatch[1])) {
      return {
        rawValue: filenameMatch[1],
        format: 'filename_heuristic',
      };
    }
  } catch {}

  return null;
}

/**
 * Sample popular gym food barcodes for instant localhost testing
 */
export const POPULAR_TEST_BARCODES = [
  { label: 'Optimum Nutrition Gold Standard Whey', code: '0748927028669' },
  { label: 'Quest Nutrition Protein Bar', code: '0888849000010' },
  { label: 'Chobani Greek Yogurt', code: '0894700010045' },
  { label: 'Fairlife Core Power Elite Protein', code: '0856312002714' },
  { label: 'Alani Nu Energy Drink', code: '0850009713024' },
  { label: 'Premier Protein Shake', code: '0643843714424' },
];
