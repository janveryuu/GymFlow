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
 * On modern Web browsers (Chrome, Edge, Opera), uses window.BarcodeDetector.
 */
export async function detectBarcodeFromImage(
  imageUri: string
): Promise<BarcodeDetectionResult | null> {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const BarcodeDetectorClass = (window as any).BarcodeDetector;
      const detector = new BarcodeDetectorClass({
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
      if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
        return {
          rawValue: barcodes[0].rawValue,
          format: barcodes[0].format,
        };
      }
    } catch (err) {
      console.warn('[detectBarcodeFromImage] Web BarcodeDetector failed or no barcode found:', err);
    }
  }

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
