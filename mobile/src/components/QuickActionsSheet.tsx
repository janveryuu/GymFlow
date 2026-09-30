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
  Alert,
} from 'react-native';
import {
  Camera,
  ScanBarcode,
  PenLine,
  X,
} from './icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { typography } from '../theme';
import { useAuthStore } from '../store/authStore';

type QuickActionsSheetProps = {
  visible: boolean;
  onClose: () => void;
};

interface ActionItem {
  id: string;
  label: string;
  icon: React.FC<{ color: string; size: number }>;
  screen: string;
  params?: any;
}

export const QuickActionsSheet: React.FC<QuickActionsSheetProps> = ({ visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const user = useAuthStore((state) => state.user);
  const isProfileComplete = Boolean(user?.is_profile_completed);

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

  const handleAction = (screen: string, params?: any) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Haptics optional
    }
    onClose();

    if (!isProfileComplete) {
      setTimeout(() => {
        Alert.alert(
          'Profile Setup Required',
          'Please complete your profile setup first before logging food.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Set Up Profile',
              onPress: () => navigation.navigate('ProfileSetup'),
            },
          ]
        );
      }, 180);
      return;
    }

    setTimeout(() => {
      navigation.navigate(screen, params);
    }, 120);
  };

  // 3 Choices: AI Camera, Barcode, Manual
  const tools: ActionItem[] = [
    { id: 'ai_camera', label: 'AI Camera', icon: Camera, screen: 'AiFoodScannerScreen' },
    { id: 'barcode', label: 'Barcode', icon: ScanBarcode, screen: 'BarcodeScannerScreen' },
    { id: 'manual', label: 'Manual', icon: PenLine, screen: 'NutritionScreen', params: { openManualEntry: true } },
  ];

  const renderActionCircle = (item: ActionItem) => {
    const IconComponent = item.icon;
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.actionItemWrapper}
        onPress={() => handleAction(item.screen, item.params)}
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

          {/* 3 Quick Action Choices */}
          <View style={styles.sectionBlock}>
            <View style={styles.actionRow}>
              {tools.map(renderActionCircle)}
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
