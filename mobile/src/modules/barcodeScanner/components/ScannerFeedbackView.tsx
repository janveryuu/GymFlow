/**
 * Scanner Feedback View Component
 * Renders dedicated state screens for:
 * - Loading API Data
 * - Product Not Found
 * - Network / Timeout Error
 * - Camera Permission Denied
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import {
  ArrowLeft,
  ScanBarcode,
  AlertCircle,
  WifiOff,
  RotateCcw,
  Edit3,
  Camera,
} from 'lucide-react-native';
import { colors, typography, borderRadius } from '../../../theme';
import { ScannerPhase, ScannerErrorState } from '../types';

export interface ScannerFeedbackViewProps {
  phase: ScannerPhase;
  scannedBarcode?: string;
  errorState?: ScannerErrorState | null;
  onScanAgain: () => void;
  onEnterManually?: () => void;
  onRequestPermission?: () => void;
  onUploadImage?: () => void;
  onClose: () => void;
}

export const ScannerFeedbackView: React.FC<ScannerFeedbackViewProps> = ({
  phase,
  scannedBarcode,
  errorState,
  onScanAgain,
  onEnterManually,
  onRequestPermission,
  onUploadImage,
  onClose,
}) => {
  // 1. Permission Denied View
  if (phase === 'permission_denied') {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <ArrowLeft color={colors.text} size={22} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Barcode Scanner</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          <View style={[styles.iconWrapper, styles.iconWrapperWarning]}>
            <Camera color={colors.warning} size={42} />
          </View>

          <Text style={styles.title}>Camera Access Required</Text>
          <Text style={styles.description}>
            No camera feed is available in this environment. You can upload an image of a barcode.
          </Text>

          <View style={styles.actionContainer}>
            {onUploadImage && (
              <TouchableOpacity style={styles.primaryButton} onPress={onUploadImage}>
                <Text style={styles.primaryButtonText}>📁 Upload Barcode Image</Text>
              </TouchableOpacity>
            )}

            {onRequestPermission && (
              <TouchableOpacity style={styles.secondaryButton} onPress={onRequestPermission}>
                <Text style={styles.secondaryButtonText}>Request Camera Access</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
              <Text style={styles.secondaryButtonText}>Return</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // 2. Loading API Data View
  if (phase === 'loading') {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <ArrowLeft color={colors.text} size={22} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scanning Product</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingTitle}>Loading API Data…</Text>
            <Text style={styles.loadingSubtitle}>
              Querying Open Food Facts database for barcode:
            </Text>
            {scannedBarcode ? (
              <View style={styles.barcodeChip}>
                <ScanBarcode color={colors.textSecondary} size={16} style={{ marginRight: 6 }} />
                <Text style={styles.barcodeText}>{scannedBarcode}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // 3. Product Not Found View
  if (phase === 'not_found') {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <ArrowLeft color={colors.text} size={22} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Barcode Lookup</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          <View style={[styles.iconWrapper, styles.iconWrapperSubtle]}>
            <ScanBarcode color={colors.textMuted} size={44} />
          </View>

          <Text style={styles.title}>Product Not Found</Text>
          <Text style={styles.description}>
            We could not find matching nutritional data in the Open Food Facts open-source database.
          </Text>

          {scannedBarcode ? (
            <View style={styles.barcodeChip}>
              <Text style={styles.barcodeLabel}>Barcode:</Text>
              <Text style={styles.barcodeText}>{scannedBarcode}</Text>
            </View>
          ) : null}

          <View style={styles.actionContainer}>
            <TouchableOpacity style={styles.primaryButton} onPress={onScanAgain}>
              <RotateCcw color={colors.textInverse} size={18} style={{ marginRight: 8 }} />
              <Text style={styles.primaryButtonText}>Scan Again</Text>
            </TouchableOpacity>

            {onEnterManually && (
              <TouchableOpacity style={styles.secondaryButton} onPress={onEnterManually}>
                <Edit3 color={colors.text} size={18} style={{ marginRight: 8 }} />
                <Text style={styles.secondaryButtonText}>Enter Macros Manually</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // 4. Network / Unknown Error View
  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <ArrowLeft color={colors.text} size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Network Error</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={[styles.iconWrapper, styles.iconWrapperError]}>
          {errorState?.type === 'timeout' ? (
            <WifiOff color={colors.error} size={40} />
          ) : (
            <AlertCircle color={colors.error} size={40} />
          )}
        </View>

        <Text style={styles.title}>
          {errorState?.type === 'timeout' ? 'Connection Timed Out' : 'Network Error'}
        </Text>
        <Text style={styles.description}>
          {errorState?.details ||
            'Could not reach Open Food Facts. Please verify your internet connection and try again.'}
        </Text>

        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={onScanAgain}>
            <RotateCcw color={colors.textInverse} size={18} style={{ marginRight: 8 }} />
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </TouchableOpacity>

          {onEnterManually && (
            <TouchableOpacity style={styles.secondaryButton} onPress={onEnterManually}>
              <Edit3 color={colors.text} size={18} style={{ marginRight: 8 }} />
              <Text style={styles.secondaryButtonText}>Enter Manually</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  headerTitle: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fonts.headingBold,
    color: colors.text,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconWrapperSubtle: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconWrapperWarning: {
    backgroundColor: 'rgba(255, 159, 10, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 159, 10, 0.3)',
  },
  iconWrapperError: {
    backgroundColor: colors.errorMuted,
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.3)',
  },
  title: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.headingBlack,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
    maxWidth: 320,
  },
  barcodeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceHighlight,
    borderRadius: borderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  barcodeLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginRight: 6,
  },
  barcodeText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.headingBold,
    color: colors.text,
    letterSpacing: 1,
  },
  loadingCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  loadingTitle: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fonts.headingBold,
    color: colors.text,
    marginTop: 20,
    marginBottom: 6,
  },
  loadingSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 14,
  },
  actionContainer: {
    width: '100%',
    gap: 12,
    marginTop: 10,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: borderRadius.md,
  },
  primaryButtonText: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fonts.headingBold,
    color: colors.textInverse,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: borderRadius.md,
  },
  secondaryButtonText: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fonts.headingMedium,
    color: colors.text,
  },
});
