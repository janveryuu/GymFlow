import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  LayoutChangeEvent,
  ActivityIndicator,
  Platform,
  Easing,
} from 'react-native';
import { ChevronRight, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { typography, borderRadius, spacing } from '../theme';

interface GlassmorphismSliderProps {
  onComplete: () => void;
  label?: string;
  completedLabel?: string;
  isLoading?: boolean;
}

const BUTTON_HEIGHT = 60;
const THUMB_SIZE = 52;
const THUMB_MARGIN = 4;

export const GlassmorphismSlider: React.FC<GlassmorphismSliderProps> = ({
  onComplete,
  label = 'Slide to Get Started',
  completedLabel = 'Entering GymFlow...',
  isLoading = false,
}) => {
  const [trackWidth, setTrackWidth] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const panX = useRef(new Animated.Value(0)).current;

  // Live mutable refs to eliminate stale closure bugs
  const trackWidthRef = useRef(0);
  const maxDistanceRef = useRef(0);
  const isCompletedRef = useRef(false);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    isCompletedRef.current = isCompleted;
  }, [isCompleted]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  const handleLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0) {
      setTrackWidth(width);
      trackWidthRef.current = width;
      maxDistanceRef.current = Math.max(0, width - THUMB_SIZE - THUMB_MARGIN * 2);
    }
  };

  // Safe trigger for completion animation and callback
  const completeSlide = () => {
    if (isCompletedRef.current || isLoadingRef.current) return;
    isCompletedRef.current = true;
    setIsCompleted(true);

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Haptics optional
    }

    const targetX = maxDistanceRef.current > 0 ? maxDistanceRef.current : 240;
    Animated.timing(panX, {
      toValue: targetX,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => {
      onComplete();
    });
  };

  // Web pointer event support for guaranteed mouse & touch dragging in desktop/mobile browsers
  const isDraggingWeb = useRef(false);
  const startXWeb = useRef(0);

  const handlePointerDown = (e: any) => {
    if (Platform.OS !== 'web' || isCompletedRef.current || isLoadingRef.current) return;
    try {
      e.target?.setPointerCapture?.(e.pointerId);
    } catch {
      // Ignore if not supported
    }
    isDraggingWeb.current = true;
    startXWeb.current = e.clientX;
    panX.stopAnimation();
  };

  const handlePointerMove = (e: any) => {
    if (Platform.OS !== 'web' || !isDraggingWeb.current || isCompletedRef.current || isLoadingRef.current) return;
    const dx = e.clientX - startXWeb.current;
    const maxDist = maxDistanceRef.current > 0 ? maxDistanceRef.current : 240;
    const boundedX = Math.max(0, Math.min(dx, maxDist));
    panX.setValue(boundedX);
  };

  const handlePointerUp = (e: any) => {
    if (Platform.OS !== 'web' || !isDraggingWeb.current) return;
    isDraggingWeb.current = false;
    try {
      e.target?.releasePointerCapture?.(e.pointerId);
    } catch {
      // Ignore
    }

    const dx = e.clientX - startXWeb.current;
    const maxDist = maxDistanceRef.current > 0 ? maxDistanceRef.current : 240;

    if (dx >= maxDist * 0.3 || (Math.abs(dx) < 6 && !isCompletedRef.current)) {
      // Slid past 30% OR clicked/tapped -> complete!
      completeSlide();
    } else {
      // Spring back smoothly
      Animated.spring(panX, {
        toValue: 0,
        bounciness: 6,
        useNativeDriver: false,
      }).start();
    }
  };

  // Native mobile PanResponder with termination protection
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isCompletedRef.current && !isLoadingRef.current,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          !isCompletedRef.current &&
          !isLoadingRef.current &&
          (Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.vx) > 0.1)
        );
      },
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        return (
          !isCompletedRef.current &&
          !isLoadingRef.current &&
          Math.abs(gestureState.dx) > 5
        );
      },
      onPanResponderTerminationRequest: () => false, // Prevent parent ScrollView from canceling the drag!
      onPanResponderGrant: () => {
        panX.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        if (isCompletedRef.current || isLoadingRef.current) return;
        const maxDist = maxDistanceRef.current > 0 ? maxDistanceRef.current : 240;
        const boundedX = Math.max(0, Math.min(gestureState.dx, maxDist));
        panX.setValue(boundedX);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (isCompletedRef.current || isLoadingRef.current) return;
        const maxDist = maxDistanceRef.current > 0 ? maxDistanceRef.current : 240;

        // Complete if dragged past 30% of track or flicked with horizontal velocity
        if (gestureState.dx >= maxDist * 0.3 || gestureState.vx > 0.3) {
          completeSlide();
        } else if (Math.abs(gestureState.dx) < 6 && Math.abs(gestureState.dy) < 6) {
          // Tap detected on the button/thumb -> trigger smooth slide to complete
          completeSlide();
        } else {
          // Spring back to start
          Animated.spring(panX, {
            toValue: 0,
            bounciness: 6,
            useNativeDriver: Platform.OS !== 'web',
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        if (isCompletedRef.current) return;
        Animated.spring(panX, {
          toValue: 0,
          bounciness: 6,
          useNativeDriver: Platform.OS !== 'web',
        }).start();
      },
    }),
  ).current;

  // Opacity of label text decreases as thumb slides across
  const textOpacity = panX.interpolate({
    inputRange: [0, (maxDistanceRef.current || trackWidth || 240) * 0.5],
    outputRange: [1, 0.1],
    extrapolate: 'clamp',
  });

  // Track progress fill width
  const progressFillWidth = panX.interpolate({
    inputRange: [0, maxDistanceRef.current || 240],
    outputRange: [THUMB_SIZE, trackWidth || THUMB_SIZE + 240],
    extrapolate: 'clamp',
  });

  const webHandlers =
    Platform.OS === 'web'
      ? {
          onPointerDown: handlePointerDown,
          onPointerMove: handlePointerMove,
          onPointerUp: handlePointerUp,
          onPointerCancel: handlePointerUp,
        }
      : {};

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {/* Glassmorphic Track with tap and drag support */}
      <View
        style={styles.glassTrack}
        {...panResponder.panHandlers}
        {...(webHandlers as any)}
      >
        {/* Dynamic Glowing Progress Fill */}
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: progressFillWidth,
            },
          ]}
        />

        {/* Center Prompt Text - pointerEvents none so dragging across text works */}
        <Animated.View style={[styles.textWrapper, { opacity: textOpacity }]} pointerEvents="none">
          <Text style={styles.labelText}>
            {isCompleted || isLoading ? completedLabel : label}
          </Text>
          {!isCompleted && !isLoading && (
            <View style={styles.arrowsRow}>
              <ChevronRight size={14} color="rgba(255, 255, 255, 0.4)" />
              <ChevronRight size={14} color="rgba(255, 255, 255, 0.7)" style={{ marginLeft: -8 }} />
              <ChevronRight size={14} color="#FFFFFF" style={{ marginLeft: -8 }} />
            </View>
          )}
        </Animated.View>

        {/* Sliding Thumb Handle */}
        <Animated.View
          style={[
            styles.thumbHandle,
            {
              transform: [{ translateX: panX }],
            },
          ]}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#0A0A0A" />
          ) : isCompleted ? (
            <Check size={22} color="#0A0A0A" strokeWidth={3} />
          ) : (
            <ChevronRight size={24} color="#0A0A0A" strokeWidth={2.5} />
          )}
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: BUTTON_HEIGHT,
    marginVertical: spacing.md,
  },
  glassTrack: {
    flex: 1,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
    userSelect: 'none',
    cursor: 'pointer',
  } as any,
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.20)',
    borderRadius: borderRadius.full,
  },
  textWrapper: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: THUMB_SIZE,
  },
  labelText: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fonts.headingRegular,
    fontWeight: '400',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  arrowsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.xs,
  },
  thumbHandle: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: borderRadius.full,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    left: THUMB_MARGIN,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    userSelect: 'none',
    cursor: 'grab',
  } as any,
});
