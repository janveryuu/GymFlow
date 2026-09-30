import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  LayoutChangeEvent,
  Platform,
  ViewStyle,
  StyleProp,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { ArrowRight, Check } from './icons';

export interface SlideCommitProps {
  label?: string;
  doneLabel?: string;
  errorLabel?: string;
  onConfirm?: () => void | Promise<void>;
  onDone?: () => void;
  onError?: (error: any) => void;
  trackColor?: string;
  handleColor?: string;
  successColor?: string;
  dangerColor?: string;
  width?: number | string;
  height?: number;
  radius?: number;
  holdMs?: number;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const PAD = 4;

const APPLE_FONT_FAMILY = Platform.OS === 'web'
  ? '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif'
  : Platform.OS === 'ios'
  ? 'System'
  : 'Roboto';

export const SlideCommit: React.FC<SlideCommitProps> = ({
  label = 'Slide to confirm',
  doneLabel = 'Saved',
  errorLabel = 'Failed',
  onConfirm,
  onDone,
  onError,
  trackColor = '#262626',
  handleColor = '#FFFFFF',
  successColor = '#30D158',
  dangerColor = '#FF453A',
  width = '100%',
  height = 56,
  radius = 28,
  holdMs = 600,
  disabled = false,
  icon,
  style,
}) => {
  const [trackWidth, setTrackWidth] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'dragging' | 'done' | 'error'>('idle');

  const panX = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const doneFadeAnim = useRef(new Animated.Value(0)).current;

  const trackWidthRef = useRef(0);
  const travelDistRef = useRef(0);
  const phaseRef = useRef(phase);
  const disabledRef = useRef(disabled);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  const GRIP = height - PAD * 2;
  const gripR = Math.max(0, radius - PAD);
  const travelDist = Math.max(1, trackWidth - GRIP - PAD * 2);

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== trackWidthRef.current) {
      trackWidthRef.current = w;
      const travel = Math.max(1, w - GRIP - PAD * 2);
      travelDistRef.current = travel;
      setTrackWidth(w);
    }
  };

  const commit = () => {
    const currentTravel = travelDistRef.current;
    setPhase('done');
    phaseRef.current = 'done';

    Animated.parallel([
      Animated.spring(panX, {
        toValue: currentTravel,
        friction: 8,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(doneFadeAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    onDone?.();

    setTimeout(async () => {
      try {
        await onConfirm?.();
      } catch (err) {
        setPhase('error');
        phaseRef.current = 'error';
        onError?.(err);
      }
    }, holdMs);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabledRef.current && phaseRef.current === 'idle',
      onMoveShouldSetPanResponder: (_, gestureState) =>
        !disabledRef.current && phaseRef.current === 'idle' && Math.abs(gestureState.dx) > 3,
      onPanResponderGrant: () => {
        if (disabledRef.current || phaseRef.current !== 'idle') return;
        setPhase('dragging');
        phaseRef.current = 'dragging';
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch {}
        Animated.spring(scaleAnim, {
          toValue: 1.03,
          friction: 6,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderMove: (_, gestureState) => {
        if (phaseRef.current !== 'dragging') return;
        const currentTravel = travelDistRef.current;
        const nextX = Math.min(currentTravel, Math.max(0, gestureState.dx));
        panX.setValue(nextX);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (phaseRef.current !== 'dragging') return;
        const currentTravel = travelDistRef.current;
        const commitThreshold = currentTravel * 0.72;

        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          useNativeDriver: true,
        }).start();

        if (gestureState.dx >= commitThreshold || gestureState.vx > 0.75) {
          commit();
        } else {
          setPhase('idle');
          phaseRef.current = 'idle';
          Animated.spring(panX, {
            toValue: 0,
            friction: 7,
            tension: 50,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        if (phaseRef.current === 'dragging') {
          setPhase('idle');
          phaseRef.current = 'idle';
          Animated.spring(panX, {
            toValue: 0,
            friction: 7,
            tension: 50,
            useNativeDriver: true,
          }).start();
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 6,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // Track label opacity (fades out as thumb passes halfway)
  const labelOpacity = panX.interpolate({
    inputRange: [0, Math.max(1, travelDist * 0.55)],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const arrowOpacity = doneFadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const isDone = phase === 'done';

  return (
    <View
      style={[
        styles.container,
        {
          width: width as any,
          height,
          borderRadius: radius,
          backgroundColor: isDone ? successColor : trackColor,
        },
        disabled && styles.disabled,
        style,
      ]}
      onLayout={handleLayout}
      accessibilityRole="button"
      accessibilityLabel={isDone ? doneLabel : label}
    >
      {/* Centered track prompt text */}
      <Animated.View
        style={[
          styles.labelWrap,
          {
            opacity: isDone ? 0 : labelOpacity,
          },
        ]}
        pointerEvents="none"
      >
        <Text style={styles.labelText}>{label}</Text>
      </Animated.View>

      {/* Done state text (centered when complete) */}
      {isDone && (
        <Animated.View
          style={[
            styles.labelWrap,
            {
              opacity: doneFadeAnim,
            },
          ]}
          pointerEvents="none"
        >
          <View style={styles.doneContentRow}>
            <Check size={18} color="#FFFFFF" strokeWidth={2.8} />
            <Text style={styles.doneLabelText}>{doneLabel}</Text>
          </View>
        </Animated.View>
      )}

      {/* Sliding Capsule Handle */}
      {!isDone && (
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.handle,
            {
              width: GRIP,
              height: GRIP,
              borderRadius: gripR,
              backgroundColor: handleColor,
              transform: [{ translateX: panX }, { scale: scaleAnim }],
            },
            Platform.OS === 'web' ? ({ cursor: 'grab' } as any) : null,
          ]}
        >
          <Animated.View style={{ opacity: arrowOpacity, alignItems: 'center', justifyContent: 'center' }}>
            {icon ?? <ArrowRight size={20} color="#111111" strokeWidth={2.4} />}
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
};

export default SlideCommit;

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  disabled: {
    opacity: 0.5,
  },
  labelWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 54,
  },
  labelText: {
    fontFamily: APPLE_FONT_FAMILY,
    fontSize: 14.5,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.45)',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  doneContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  doneLabelText: {
    fontFamily: APPLE_FONT_FAMILY,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  handle: {
    position: 'absolute',
    left: PAD,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
});
