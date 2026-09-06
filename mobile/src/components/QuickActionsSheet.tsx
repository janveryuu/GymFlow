import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { Droplets, Utensils, ScanBarcode, Camera, MessageSquare, Calendar, X } from 'lucide-react-native';
import { colors, typography, borderRadius } from '../theme';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type QuickActionsSheetProps = {
  visible: boolean;
  onClose: () => void;
};

const ACTIONS = [
  { id: 'schedule', label: 'Schedule & Classes', icon: Calendar, screen: 'ScheduleScreen' },
  { id: 'nutrition', label: 'Nutrition Tracker', icon: Utensils, screen: 'NutritionScreen' },
  { id: 'barcode', label: 'Barcode Scanner', icon: ScanBarcode, screen: 'BarcodeScannerScreen' },
  { id: 'ai_scan', label: 'AI Food Scanner', icon: Camera, screen: 'AiFoodScannerScreen' },
  { id: 'water', label: 'Water Intake', icon: Droplets, screen: 'WaterIntakeScreen' },
  { id: 'coach', label: 'AI Coach', icon: MessageSquare, screen: 'AiCoachScreen' },
];

export const QuickActionsSheet: React.FC<QuickActionsSheetProps> = ({ visible, onClose }) => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const handleAction = (screen: string) => {
    onClose();
    setTimeout(() => {
      navigation.navigate(screen);
    }, 150);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          <View style={styles.header}>
            <Text style={styles.title}>Quick Actions</Text>
            <TouchableOpacity onPress={onClose} accessibilityRole="button">
              <X color={colors.textSecondary} size={24} />
            </TouchableOpacity>
          </View>

          <View style={styles.grid}>
            {ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <TouchableOpacity
                  key={action.id}
                  style={styles.card}
                  onPress={() => handleAction(action.screen)}
                >
                  <Icon color={colors.text} size={28} />
                  <Text style={styles.cardLabel}>{action.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: 24,
    minHeight: 300,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.headingBold,
    color: colors.text,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'flex-start',
  },
  card: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'center',
    marginTop: 8,
  },
});
