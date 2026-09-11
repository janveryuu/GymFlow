import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import {
  Camera,
  ScanBarcode,
  MessageSquare,
  Droplets,
  Utensils,
  Calendar,
  X,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { typography } from '../theme';

type QuickActionsSheetProps = {
  visible: boolean;
  onClose: () => void;
};

interface ActionItem {
  id: string;
  label: string;
  icon: React.FC<{ color: string; size: number }>;
  screen: string;
}

export const QuickActionsSheet: React.FC<QuickActionsSheetProps> = ({ visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  // Entrance pop & fade animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.92);
    }
  }, [visible, fadeAnim, scaleAnim]);

  const handleAction = (screen: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Haptics optional
    }
    onClose();
    setTimeout(() => {
      navigation.navigate(screen);
    }, 120);
  };

  // Section 1: All 6 Original Tools & Scanners (Row 1 & Row 2)
  const toolsRow1: ActionItem[] = [
    { id: 'ai_scan', label: 'AI Scanner', icon: Camera, screen: 'AiFoodScannerScreen' },
    { id: 'barcode', label: 'Barcode', icon: ScanBarcode, screen: 'BarcodeScannerScreen' },
    { id: 'coach', label: 'AI Coach', icon: MessageSquare, screen: 'AiCoachScreen' },
  ];

  const toolsRow2: ActionItem[] = [
    { id: 'water', label: 'Water Tracker', icon: Droplets, screen: 'WaterIntakeScreen' },
    { id: 'nutrition', label: 'Nutrition', icon: Utensils, screen: 'NutritionScreen' },
    { id: 'schedule', label: 'Schedule', icon: Calendar, screen: 'ScheduleScreen' },
  ];


  const renderActionCircle = (item: ActionItem) => {
    const IconComponent = item.icon;
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.actionItemWrapper}
        onPress={() => handleAction(item.screen)}
        activeOpacity={0.82}
      >
        <View style={styles.actionCircle}>
          <IconComponent color="#0A0A0A" size={24} />
        </View>
        <Text style={styles.actionLabel} numberOfLines={1}>
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View
          style={[
            styles.contentContainer,
            {
              paddingBottom: Math.max(insets.bottom, 16) + 29,
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Main Destination Title */}
          <Text style={styles.destinationTitle}>Navigate to your destination</Text>

          {/* All 6 Tools & Scanners */}
          <View style={styles.sectionBlock}>
            {/* Row 1: AI Scanner, Barcode, AI Coach */}
            <View style={styles.actionRow}>
              {toolsRow1.map(renderActionCircle)}
            </View>

            {/* Row 2: Water Tracker, Nutrition, Schedule */}
            <View style={styles.actionRow}>
              {toolsRow2.map(renderActionCircle)}
            </View>
          </View>

          {/* Bottom Center Close "X" Button */}
          <View style={styles.bottomCloseWrapper}>
            <TouchableOpacity
              style={styles.closeCircleButton}
              onPress={onClose}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Close navigation overlay"
            >
              <X color="#0A0A0A" size={20} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.68)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  contentContainer: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  destinationTitle: {
    fontSize: 17,
    fontFamily: typography.fonts.headingBold,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: -0.2,
  },
  sectionBlock: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 22,
    marginBottom: 14,
  },
  actionItemWrapper: {
    alignItems: 'center',
    width: 82,
  },
  actionCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  actionLabel: {
    fontSize: 12,
    fontFamily: typography.fonts.headingMedium,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 8,
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bottomCloseWrapper: {
    alignItems: 'center',
    marginTop: 18,
  },
  closeCircleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
  },
});
