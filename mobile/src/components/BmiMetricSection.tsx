import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SquarePen, X } from './icons';
import { colors, typography, borderRadius } from '../theme';
import { getSyncRepository } from '../sync/SyncRepository';
import { useAuthStore } from '../store/authStore';

interface BmiMetricSectionProps {
  onUpdated?: (height: number, weight: number) => void;
}

export const BmiMetricSection: React.FC<BmiMetricSectionProps> = ({ onUpdated }) => {
  const user = useAuthStore((state) => state.user);
  const [height, setHeight] = useState<number>(() => {
    return user?.height_cm && user.height_cm > 0 ? user.height_cm : 157;
  });
  const [weight, setWeight] = useState<number>(() => {
    return user?.weight_kg && user.weight_kg > 0 ? user.weight_kg : 62;
  });

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [inputHeight, setInputHeight] = useState(String(height));
  const [inputWeight, setInputWeight] = useState(String(weight));

  const repo = getSyncRepository();

  // Load from repository on mount
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const profile = await repo.getProfile().catch(() => null);
        if (active && profile) {
          if ((profile as any).height) {
            const h = Number((profile as any).height);
            if (h > 0) {
              setHeight(h);
              setInputHeight(String(h));
            }
          }
          if ((profile as any).weight) {
            const w = Number((profile as any).weight);
            if (w > 0) {
              setWeight(w);
              setInputWeight(String(w));
            }
          }
        }
      } catch {
        // Fallback to default
      }
    })();
    return () => {
      active = false;
    };
  }, [repo]);

  // BMI Calculation
  const bmiValue = useMemo(() => {
    if (!height || !weight || height <= 0) return 25.2;
    const heightInMeters = height / 100;
    return parseFloat((weight / (heightInMeters * heightInMeters)).toFixed(1));
  }, [height, weight]);

  // BMI Category
  const bmiCategory = useMemo(() => {
    if (bmiValue < 18.5) return 'underweight';
    if (bmiValue < 25.0) return 'normal';
    if (bmiValue < 30.0) return 'overweight';
    return 'obese';
  }, [bmiValue]);

  // Track position percentage (0% to 100%)
  const bmiSliderPercent = useMemo(() => {
    if (bmiValue < 18.5) {
      const val = Math.max(14, Math.min(18.5, bmiValue));
      return ((val - 14) / (18.5 - 14)) * 23 + 2;
    }
    if (bmiValue < 25.0) {
      return 25 + ((bmiValue - 18.5) / (25 - 18.5)) * 25;
    }
    if (bmiValue < 30.0) {
      return 50 + ((bmiValue - 25) / (30 - 25)) * 25;
    }
    const val = Math.min(40, bmiValue);
    return 75 + ((val - 30) / (40 - 30)) * 23;
  }, [bmiValue]);

  // Save updated measurements
  const handleSaveMeasurements = useCallback(() => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    const h = parseFloat(inputHeight);
    const w = parseFloat(inputWeight);

    let updatedH = height;
    let updatedW = weight;

    if (!isNaN(h) && h > 50 && h < 260) {
      setHeight(h);
      updatedH = h;
    }
    if (!isNaN(w) && w > 20 && w < 300) {
      setWeight(w);
      updatedW = w;
    }

    setIsEditModalVisible(false);
    onUpdated?.(updatedH, updatedW);
  }, [inputHeight, inputWeight, height, weight, onUpdated]);

  return (
    <View style={styles.container}>
      {/* 1. TOP METRIC CARDS ROW (Height, Weight, BMI) */}
      <View style={styles.metricRow}>
        {/* Height Card */}
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>HEIGHT</Text>
          <Text style={styles.metricValue}>{Math.round(height)}</Text>
          <Text style={styles.metricUnit}>cm</Text>
        </View>

        {/* Weight Card */}
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>WEIGHT</Text>
          <Text style={styles.metricValue}>{Math.round(weight)}</Text>
          <Text style={styles.metricUnit}>kg</Text>
        </View>

        {/* BMI Card */}
        <TouchableOpacity
          style={styles.metricCard}
          onPress={() => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch {}
            setIsEditModalVisible(true);
          }}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Edit BMI and measurements"
        >
          <View style={styles.bmiHeaderRow}>
            <Text style={styles.metricLabel}>BMI</Text>
            <SquarePen size={14} color={colors.textSecondary} />
          </View>
          <Text style={styles.bmiValue}>{bmiValue.toFixed(1)}</Text>
        </TouchableOpacity>
      </View>

      {/* 2. BMI SLIDER & CATEGORIES */}
      <View style={styles.bmiSliderSection}>
        {/* Continuous Track */}
        <View style={styles.sliderTrack}>
          <View
            style={[
              styles.sliderFilledTrack,
              { width: `${Math.min(100, Math.max(4, bmiSliderPercent))}%` },
            ]}
          />
          {/* Indicator Thumb */}
          <View
            style={[
              styles.sliderThumb,
              { left: `${Math.min(96, Math.max(2, bmiSliderPercent))}%` },
            ]}
          />
        </View>

        {/* Category Labels */}
        <View style={styles.sliderLabelsRow}>
          <Text
            style={[
              styles.categoryLabel,
              bmiCategory === 'underweight' && styles.categoryLabelActive,
            ]}
          >
            Underweight
          </Text>
          <Text
            style={[
              styles.categoryLabel,
              bmiCategory === 'normal' && styles.categoryLabelActive,
            ]}
          >
            Normal
          </Text>
          <Text
            style={[
              styles.categoryLabel,
              bmiCategory === 'overweight' && styles.categoryLabelActive,
            ]}
          >
            Overweight
          </Text>
          <Text
            style={[
              styles.categoryLabel,
              bmiCategory === 'obese' && styles.categoryLabelActive,
            ]}
          >
            Obese
          </Text>
        </View>
      </View>

      {/* Edit Height & Weight Modal */}
      <Modal
        visible={isEditModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Measurements</Text>
              <TouchableOpacity
                onPress={() => setIsEditModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color="#8E8E8E" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalInputLabel}>Height (cm)</Text>
              <TextInput
                style={styles.modalTextInput}
                value={inputHeight}
                onChangeText={setInputHeight}
                keyboardType="numeric"
                placeholder="157"
                placeholderTextColor="#71717A"
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalInputLabel}>Weight (kg)</Text>
              <TextInput
                style={styles.modalTextInput}
                value={inputWeight}
                onChangeText={setInputWeight}
                keyboardType="numeric"
                placeholder="62"
                placeholderTextColor="#71717A"
              />
            </View>

            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={handleSaveMeasurements}
              activeOpacity={0.85}
            >
              <Text style={styles.modalSaveButtonText}>Save & Recalculate</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  bmiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    width: '100%',
  },
  metricLabel: {
    fontSize: 11,
    fontFamily: typography.fonts.headingBold,
    color: colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 28,
    fontFamily: typography.fonts.headingBold,
    color: colors.text,
    marginTop: 4,
    marginBottom: 2,
    fontWeight: '800',
  },
  bmiValue: {
    fontSize: 28,
    fontFamily: typography.fonts.headingBold,
    color: colors.text,
    marginTop: 4,
    fontWeight: '800',
  },
  metricUnit: {
    fontSize: 12,
    fontFamily: typography.fonts.headingMedium,
    color: colors.textMuted,
  },
  bmiSliderSection: {
    marginBottom: 22,
    paddingHorizontal: 4,
  },
  sliderTrack: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    position: 'relative',
    justifyContent: 'center',
    marginBottom: 10,
  },
  sliderFilledTrack: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  sliderThumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    top: -5,
    marginLeft: -7,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 4,
  },
  sliderLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryLabel: {
    fontSize: 11,
    fontFamily: typography.fonts.headingMedium,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  categoryLabelActive: {
    color: '#FFFFFF',
    fontFamily: typography.fonts.headingBold,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: typography.fonts.headingBold,
    color: colors.text,
    fontWeight: '700',
  },
  modalInputGroup: {
    marginBottom: 14,
  },
  modalInputLabel: {
    fontSize: 12,
    fontFamily: typography.fonts.headingMedium,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  modalTextInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 15,
    fontFamily: typography.fonts.headingBold,
  },
  modalSaveButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  modalSaveButtonText: {
    fontSize: 14,
    fontFamily: typography.fonts.headingBold,
    color: '#000000',
    fontWeight: '700',
  },
});
