import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  PanResponder,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from './icons';

const APPLE_FONT = Platform.OS === 'web'
  ? '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif'
  : Platform.OS === 'ios'
  ? 'System'
  : 'Roboto';

export interface SwipeToastProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  open: boolean;
  onClose?: () => void;
  duration?: number;
  fuseColor?: string;
  closeButton?: boolean;
  bottomOffset?: number;
}

export const SwipeToast: React.FC<SwipeToastProps> = ({
  title,
  description,
  icon,
  actionLabel = 'Undo',
  onAction,
  open,
  onClose,
  duration = 4000,
  fuseColor = '#FF9F0A',
  closeButton = true,
  bottomOffset,
}) => {
  const insets = useSafeAreaInsets();
  const computedBottom = bottomOffset ?? Math.max(insets.bottom + 84, 114);
  const [visible, setVisible] = useState(open);
  const translateY = useRef(new Animated.Value(60)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const fuseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const dismiss = (why: 'action' | 'timeout' | 'swipe' | 'close') => {
    clearTimeout(timerRef.current);
    fuseAnim.stopAnimation();

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 60,
        duration: 220,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => {
      setVisible(false);
      onClose?.();
    });
  };

  useEffect(() => {
    if (open) {
      setVisible(true);
      translateY.setValue(60);
      opacity.setValue(0);
      fuseAnim.setValue(1);

      // Entrance animation
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          damping: 22,
          stiffness: 260,
          mass: 0.8,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();

      // Countdown fuse bar
      if (duration > 0) {
        Animated.timing(fuseAnim, {
          toValue: 0,
          duration,
          useNativeDriver: false,
        }).start();

        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          dismiss('timeout');
        }, duration);
      }
    } else {
      dismiss('close');
    }

    return () => {
      clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, duration]);

  const handleAction = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    onAction?.();
    dismiss('action');
  };

  // Drag down to dismiss
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 30 || gestureState.vy > 0.5) {
          dismiss('swipe');
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            damping: 20,
            useNativeDriver: Platform.OS !== 'web',
          }).start();
        }
      },
    })
  ).current;

  if (!visible) return null;

  const fuseWidthInterpolated = fuseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View
      style={[
        styles.toastWrapper,
        {
          bottom: computedBottom,
          transform: [{ translateY }],
          opacity,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.toastCard}>
        {/* Left icon */}
        {icon && <View style={styles.iconWrap}>{icon}</View>}

        {/* Text content */}
        <View style={styles.textContainer}>
          <Text style={styles.titleText} numberOfLines={1}>
            {title}
          </Text>
          {description ? (
            <Text style={styles.descText} numberOfLines={1}>
              {description}
            </Text>
          ) : null}
        </View>

        {/* Undo action button */}
        {actionLabel ? (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleAction}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
          >
            <Text style={styles.actionButtonText}>{actionLabel}</Text>
          </TouchableOpacity>
        ) : null}

        {/* Close X button */}
        {closeButton && (
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => dismiss('close')}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Close notification"
          >
            <X size={14} color="rgba(255, 255, 255, 0.45)" strokeWidth={2.5} />
          </TouchableOpacity>
        )}

        {/* Countdown Fuse Bar */}
        <Animated.View
          style={[
            styles.fuseBar,
            {
              width: fuseWidthInterpolated,
              backgroundColor: fuseColor,
            },
          ]}
        />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toastWrapper: {
    position: 'absolute',
    bottom: 114, // Lifted above GymTabBar floating bar and center + button
    left: 16,
    right: 16,
    zIndex: 99999,
    alignItems: 'center',
  },
  toastCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'rgba(28, 28, 30, 0.96)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        } as any)
      : {}),
  },
  iconWrap: {
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    marginRight: 10,
  },
  titleText: {
    fontSize: 14,
    fontFamily: APPLE_FONT,
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  descText: {
    fontSize: 12,
    fontFamily: APPLE_FONT,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 1,
  },
  actionButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginRight: 6,
  },
  actionButtonText: {
    fontSize: 13,
    fontFamily: APPLE_FONT,
    color: '#000000',
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fuseBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 2.5,
  },
});
