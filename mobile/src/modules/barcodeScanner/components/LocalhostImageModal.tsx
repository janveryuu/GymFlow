/**
 * Localhost Barcode Testing & Image Upload Modal
 * Allows developers and users on localhost (with no physical camera)
 * to upload barcode images, verify scanned codes, or select popular gym food presets.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
} from 'react-native';
import { X, Upload, Sparkles, ScanBarcode, ArrowRight } from 'lucide-react-native';
import { colors, typography, borderRadius } from '../../../theme';
import { POPULAR_TEST_BARCODES } from '../imageBarcodeScanner';

export interface LocalhostImageModalProps {
  visible: boolean;
  uploadedImageUri: string | null;
  detectedBarcode?: string | null;
  onConfirmBarcode: (barcode: string) => void;
  onPickAnotherImage: () => void;
  onClose: () => void;
}

export const LocalhostImageModal: React.FC<LocalhostImageModalProps> = ({
  visible,
  uploadedImageUri,
  detectedBarcode,
  onConfirmBarcode,
  onPickAnotherImage,
  onClose,
}) => {
  const [inputCode, setInputCode] = useState<string>(detectedBarcode || '');

  if (!visible) return null;

  const handleLookup = (code: string) => {
    const trimmed = code.trim();
    if (trimmed) {
      onConfirmBarcode(trimmed);
    }
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.modalCard}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={styles.devBadge}>
              <Text style={styles.devBadgeText}>LOCALHOST DEV</Text>
            </View>
            <Text style={styles.title}>Upload Barcode Image</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close">
            <X color={colors.textSecondary} size={20} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Uploaded Image Preview */}
          {uploadedImageUri ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: uploadedImageUri }} style={styles.previewImage} resizeMode="contain" />
              <TouchableOpacity style={styles.changeImageBtn} onPress={onPickAnotherImage}>
                <Upload color={colors.text} size={14} style={{ marginRight: 6 }} />
                <Text style={styles.changeImageText}>Choose Different Image</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.uploadBox} onPress={onPickAnotherImage}>
              <Upload color={colors.primary} size={28} style={{ marginBottom: 8 }} />
              <Text style={styles.uploadBoxTitle}>Select Image from Device</Text>
              <Text style={styles.uploadBoxSubtitle}>Pick a photo of a barcode from your files</Text>
            </TouchableOpacity>
          )}

          {/* Barcode Input Field */}
          <Text style={styles.inputLabel}>Barcode Number (UPC / EAN)</Text>
          <View style={styles.inputRow}>
            <View style={styles.inputWrapper}>
              <ScanBarcode color={colors.textMuted} size={18} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 0748927028669"
                placeholderTextColor={colors.textMuted}
                value={inputCode}
                onChangeText={setInputCode}
                keyboardType="numeric"
                autoFocus={!uploadedImageUri}
              />
            </View>
            <TouchableOpacity
              style={[styles.searchBtn, !inputCode.trim() && styles.searchBtnDisabled]}
              onPress={() => handleLookup(inputCode)}
              disabled={!inputCode.trim()}
            >
              <ArrowRight color={colors.textInverse} size={18} />
            </TouchableOpacity>
          </View>

          {/* Preset Sample Barcodes for Quick Testing on Localhost */}
          <View style={styles.presetsSection}>
            <View style={styles.presetsHeader}>
              <Sparkles color={colors.yellow} size={14} style={{ marginRight: 6 }} />
              <Text style={styles.presetsTitle}>Quick Sample Barcodes</Text>
            </View>
            <Text style={styles.presetsSubtitle}>
              Tap any popular item to test Open Food Facts macros immediately:
            </Text>

            <View style={styles.chipGrid}>
              {POPULAR_TEST_BARCODES.map((item) => (
                <TouchableOpacity
                  key={item.code}
                  style={styles.chip}
                  onPress={() => {
                    setInputCode(item.code);
                    handleLookup(item.code);
                  }}
                >
                  <Text style={styles.chipLabel} numberOfLines={1}>
                    {item.label}
                  </Text>
                  <Text style={styles.chipCode}>{item.code}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 30,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
    width: '100%',
    maxWidth: 440,
    maxHeight: '88%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  devBadge: {
    backgroundColor: 'rgba(255, 214, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 0, 0.3)',
    borderRadius: borderRadius.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  devBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.yellow,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fonts.headingBold,
    color: colors.text,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  previewImage: {
    width: '100%',
    height: 140,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  changeImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.surfaceHighlight,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  changeImageText: {
    fontSize: typography.sizes.xs,
    color: colors.text,
    fontFamily: typography.fonts.headingMedium,
  },
  uploadBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderHighlight,
    borderRadius: borderRadius.lg,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    marginBottom: 16,
  },
  uploadBoxTitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.headingBold,
    color: colors.text,
    marginBottom: 4,
  },
  uploadBoxSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.headingBold,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 48,
  },
  textInput: {
    flex: 1,
    color: colors.text,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.body,
  },
  searchBtn: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtnDisabled: {
    opacity: 0.4,
  },
  presetsSection: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  presetsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  presetsTitle: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.headingBold,
    color: colors.text,
  },
  presetsSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 12,
  },
  chipGrid: {
    gap: 8,
  },
  chip: {
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chipLabel: {
    flex: 1,
    fontSize: typography.sizes.xs,
    color: colors.text,
    fontFamily: typography.fonts.headingMedium,
    marginRight: 8,
  },
  chipCode: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: typography.fonts.body,
  },
});
