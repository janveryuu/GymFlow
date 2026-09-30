import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  PanResponder,
  Easing,
  Platform,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';

export interface SquishSwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  trackColor?: string;
  trackOnColor?: string;
  thumbColor?: string;
  thumbOnColor?: string;
  width?: number;
  height?: number;
  radius?: number;
  stretch?: number; // 0 - 100, default 36
  ariaLabel?: string;
  style?: ViewStyle;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const SquishSwitch: React.FC<SquishSwitchProps> = ({
  checked,
  defaultChecked = false,
  onChange,
  disabled = false,
  trackColor = '#27272a',
  trackOnColor = '#FFFFFF',
  thumbColor = '#52525b',
  thumbOnColor = '#000000',
  width = 44,
  height = 26,
  radius = 13,
  stretch = 36,
  ariaLabel = 'Switch',
  style,
}) => {
  const isControlled = checked !== undefined;
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const on = isControlled ? checked : internalChecked;

  const inset = Math.max(2, Math.round(height * 0.08));
  const thumbSize = height - inset * 2;
  const minX = inset;
  const maxX = width - inset - thumbSize;
  const travelDist = maxX - minX;

  // Animation values
  const progressAnim = useRef(new Animated.Value(on ? 1 : 0)).current;
  const squishAnim = useRef(new Animated.Value(0)).current;
  const pressAnim = useRef(new Animated.Value(0)).current;

  const onRef = useRef(on);
  onRef.current = on;

  const currentXRef = useRef(on ? maxX : minX);
  const isDraggingRef = useRef(false);

  // Sync when controlled prop changes
  useEffect(() => {
    if (isDraggingRef.current) return;
    const target = on ? 1 : 0;
    triggerSpringTransition(target);
  }, [on]);

  const commit = (next: boolean) => {
    if (next === onRef.current) return;
    onRef.current = next;
    if (!isControlled) {
      setInternalChecked(next);
    }
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onChange?.(next);
  };

  const triggerSpringTransition = (toProgress: number) => {
    Animated.parallel([
      Animated.spring(progressAnim, {
        toValue: toProgress,
        stiffness: 280,
        damping: 26,
        mass: 0.8,
        useNativeDriver: false,
      }),
      Animated.sequence([
        Animated.timing(squishAnim, {
          toValue: 1,
          duration: 110,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.spring(squishAnim, {
          toValue: 0,
          stiffness: 380,
          damping: 24,
          mass: 0.6,
          useNativeDriver: false,
        }),
      ]),
    ]).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: (_, gesture) =>
        !disabled && Math.abs(gesture.dx) > 4,
      onPanResponderGrant: () => {
        isDraggingRef.current = false;
        Animated.spring(pressAnim, {
          toValue: 1,
          stiffness: 450,
          damping: 30,
          useNativeDriver: false,
        }).start();
      },
      onPanResponderMove: (_, gesture) => {
        if (Math.abs(gesture.dx) > 4) {
          isDraggingRef.current = true;
          const startX = onRef.current ? maxX : minX;
          const rawX = startX + gesture.dx;
          const clampedX = clamp(rawX, minX, maxX);
          const newProgress = (clampedX - minX) / travelDist;
          progressAnim.setValue(newProgress);
          currentXRef.current = clampedX;
        }
      },
      onPanResponderRelease: (_, gesture) => {
        Animated.spring(pressAnim, {
          toValue: 0,
          stiffness: 450,
          damping: 30,
          useNativeDriver: false,
        }).start();

        if (!isDraggingRef.current) {
          // It was a tap!
          const next = !onRef.current;
          commit(next);
          triggerSpringTransition(next ? 1 : 0);
        } else {
          // Was dragged, commit position based on halfway mark
          const isPastHalf = currentXRef.current > (minX + maxX) / 2;
          commit(isPastHalf);
          triggerSpringTransition(isPastHalf ? 1 : 0);
        }
        isDraggingRef.current = false;
      },
      onPanResponderTerminate: () => {
        isDraggingRef.current = false;
        Animated.spring(pressAnim, {
          toValue: 0,
          stiffness: 450,
          damping: 30,
          useNativeDriver: false,
        }).start();
        triggerSpringTransition(onRef.current ? 1 : 0);
      },
    })
  ).current;

  // Stretch factor derived from stretch prop (default 36 -> stretch 1.30x)
  const stretchGain = clamp(stretch, 0, 100) / 100;
  const maxStretchX = 1 + 0.38 * stretchGain;
  const maxSquashY = 1 / (1 + 0.28 * stretchGain);

  const translateX = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [minX, maxX],
  });

  const scaleX = Animated.multiply(
    squishAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, maxStretchX],
    }),
    pressAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.08],
    })
  );

  const scaleY = Animated.multiply(
    squishAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, maxSquashY],
    }),
    pressAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0.94],
    })
  );

  const backgroundColor = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [trackColor, trackOnColor],
  });

  const thumbBackgroundColor = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [thumbColor, thumbOnColor],
  });

  return (
    <View
      style={[styles.container, { width, height }, style]}
      accessible
      accessibilityRole="switch"
      accessibilityState={{ checked: on, disabled }}
      accessibilityLabel={ariaLabel}
      {...panResponder.panHandlers}
    >
      {/* Fluid Track */}
      <Animated.View
        style={[
          styles.track,
          {
            width,
            height,
            borderRadius: radius,
            backgroundColor,
            opacity: disabled ? 0.45 : 1,
          },
        ]}
      >
        {/* Squishing Organic Thumb */}
        <Animated.View
          style={[
            styles.thumb,
            {
              width: thumbSize,
              height: thumbSize,
              borderRadius: thumbSize / 2,
              top: inset,
              backgroundColor: thumbBackgroundColor,
              transform: [
                { translateX },
                { scaleX },
                { scaleY },
              ],
            },
          ]}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    cursor: Platform.OS === 'web' ? ('pointer' as any) : undefined,
    userSelect: 'none',
  },
  track: {
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    ...(Platform.OS === 'web'
      ? ({
          transition: 'background-color 280ms cubic-bezier(0.25, 1, 0.5, 1)',
        } as any)
      : {}),
  },
  thumb: {
    position: 'absolute',
    left: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
});
