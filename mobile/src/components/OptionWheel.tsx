import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const APPLE_FONT_FAMILY = Platform.OS === 'web'
  ? '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif'
  : Platform.OS === 'ios'
  ? 'System'
  : 'Roboto';

export interface OptionWheelProps {
  items: (string | number)[];
  selectedIndex: number;
  onChange: (index: number, value: string | number) => void;
  unit?: string;
  textColor?: string;
  activeColor?: string;
  side?: 'left' | 'right' | 'center';
  fontSize?: number;
  rowHeight?: number;
  curve?: number;
  tilt?: number;
  fade?: number;
  minOpacity?: number;
  containerHeight?: number;
  haptic?: boolean;
}

export const OptionWheel: React.FC<OptionWheelProps> = ({
  items,
  selectedIndex,
  onChange,
  unit,
  textColor = 'rgba(255, 255, 255, 0.4)',
  activeColor = '#FFFFFF',
  side = 'center',
  fontSize = 44,
  rowHeight = 56,
  curve = 1.0,
  tilt = 7.5,
  fade = 0.22,
  minOpacity = 0.05,
  containerHeight = 270,
  haptic = true,
}) => {
  const [renderPos, setRenderPos] = useState<number>(selectedIndex);
  const posRef = useRef<number>(selectedIndex);
  posRef.current = renderPos;

  const targetRef = useRef<number>(selectedIndex);
  const rafRef = useRef<number | null>(null);
  const lastHapticRef = useRef<number>(selectedIndex);
  const dragStartPos = useRef<number>(selectedIndex);
  const isDraggingRef = useRef<boolean>(false);

  // Sync external selectedIndex
  useEffect(() => {
    if (!isDraggingRef.current && Math.abs(posRef.current - selectedIndex) > 0.01) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      posRef.current = selectedIndex;
      targetRef.current = selectedIndex;
      setRenderPos(selectedIndex);
      lastHapticRef.current = selectedIndex;
    }
  }, [selectedIndex]);

  // Geometry calculations
  const tiltRad = useMemo(() => (tilt * Math.PI) / 180, [tilt]);
  const R = useMemo(() => (tiltRad > 0.0005 ? rowHeight / tiltRad : 0), [tiltRad, rowHeight]);

  const snapTo = useCallback((targetIndex: number) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const clampedTarget = Math.max(0, Math.min(items.length - 1, targetIndex));
    targetRef.current = clampedTarget;

    const startPos = posRef.current;
    const startTime = Date.now();
    const duration = 240;

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const nextPos = startPos + (clampedTarget - startPos) * ease;

      posRef.current = nextPos;
      setRenderPos(nextPos);

      const rounded = Math.round(nextPos);
      if (rounded !== lastHapticRef.current) {
        lastHapticRef.current = rounded;
        if (haptic) {
          try {
            Haptics.selectionAsync();
          } catch {}
        }
      }

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        posRef.current = clampedTarget;
        setRenderPos(clampedTarget);
        lastHapticRef.current = clampedTarget;
        onChange(clampedTarget, items[clampedTarget]!);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
  }, [items, onChange, haptic]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 3;
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        isDraggingRef.current = true;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        dragStartPos.current = posRef.current;
        lastHapticRef.current = Math.round(posRef.current);
      },
      onPanResponderMove: (_, gestureState) => {
        const deltaSteps = -gestureState.dy / rowHeight;
        let nextPos = dragStartPos.current + deltaSteps;

        // Rubberbanding resistance at bounds
        if (nextPos < 0) {
          nextPos = nextPos * 0.35;
        } else if (nextPos > items.length - 1) {
          const excess = nextPos - (items.length - 1);
          nextPos = items.length - 1 + excess * 0.35;
        }

        posRef.current = nextPos;
        setRenderPos(nextPos);

        const currentIdx = Math.round(nextPos);
        const clampedIdx = Math.max(0, Math.min(items.length - 1, currentIdx));
        if (clampedIdx !== lastHapticRef.current) {
          lastHapticRef.current = clampedIdx;
          if (haptic) {
            try {
              Haptics.selectionAsync();
            } catch {}
          }
          onChange(clampedIdx, items[clampedIdx]!);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        isDraggingRef.current = false;
        // Velocity momentum
        const velocitySteps = -gestureState.vy * 160 / rowHeight;
        const target = Math.round(posRef.current + velocitySteps);
        snapTo(target);
      },
      onPanResponderTerminate: () => {
        isDraggingRef.current = false;
        snapTo(Math.round(posRef.current));
      },
    })
  ).current;

  // Windowed visible items (5 above, center, 5 below)
  const visibleIndices = useMemo(() => {
    const center = Math.round(renderPos);
    const indices: number[] = [];
    for (let i = center - 5; i <= center + 5; i++) {
      if (i >= 0 && i < items.length) {
        indices.push(i);
      }
    }
    return indices;
  }, [renderPos, items.length]);

  const centerY = containerHeight / 2;

  return (
    <View
      style={[styles.container, { height: containerHeight }]}
      {...panResponder.panHandlers}
    >
      {/* Center Active Row Selection Highlight Frame */}
      <View
        style={[
          styles.highlightFrame,
          {
            top: centerY - rowHeight / 2,
            height: rowHeight,
          },
        ]}
        pointerEvents="none"
      />

      {/* Render Wheel Items along 3D Arc */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {visibleIndices.map((i) => {
          const d = i - renderPos;
          const dist = Math.abs(d);

          let x = 0;
          let y = d * rowHeight;
          let rotZ = 0;
          let rotX = 0;

          if (R > 0) {
            const ang = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, d * tiltRad));
            y = R * Math.sin(ang);
            if (side === 'left') {
              x = -R * (1 - Math.cos(ang)) * curve;
              rotZ = (ang * 180) / Math.PI;
            } else if (side === 'right') {
              x = R * (1 - Math.cos(ang)) * curve;
              rotZ = (-ang * 180) / Math.PI;
            } else {
              // center
              rotX = (-ang * 180) / Math.PI;
              x = -R * (1 - Math.cos(ang)) * (curve * 0.45);
            }
          }

          const opacity = Math.max(minOpacity, 1 - dist * fade);
          const scale = Math.max(0.72, 1 - dist * 0.06);
          const isSelected = dist < 0.5;

          return (
            <TouchableOpacity
              key={`wheel-item-${i}`}
              testID={`wheel-item-${i}`}
              accessibilityRole="button"
              accessibilityLabel={`Select ${items[i]}`}
              style={[
                styles.itemWrapper,
                {
                  top: centerY - rowHeight / 2,
                  height: rowHeight,
                  opacity,
                  transform: [
                    { translateY: y },
                    { translateX: x },
                    { rotateZ: `${rotZ.toFixed(2)}deg` },
                    ...(rotX !== 0 ? [{ rotateX: `${rotX.toFixed(2)}deg` }] : []),
                    { scale },
                  ],
                },
              ]}
              onPress={() => snapTo(i)}
              activeOpacity={0.8}
            >
              <View style={styles.itemRow}>
                <Text
                  style={[
                    styles.itemText,
                    {
                      fontSize: isSelected ? fontSize : fontSize * 0.76,
                      color: isSelected ? activeColor : textColor,
                      fontWeight: isSelected ? '700' : '400',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {items[i]}
                </Text>
                {isSelected && unit ? (
                  <Text style={styles.unitText}>{unit}</Text>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Top & Bottom Ambient Fade Masks */}
      <LinearGradient
        colors={['#0A0A0A', 'rgba(10, 10, 10, 0)']}
        style={styles.topGradient}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['rgba(10, 10, 10, 0)', '#0A0A0A']}
        style={styles.bottomGradient}
        pointerEvents="none"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    userSelect: 'none',
  },
  highlightFrame: {
    position: 'absolute',
    left: 20,
    right: 20,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  itemWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  itemText: {
    fontFamily: APPLE_FONT_FAMILY,
    letterSpacing: -0.6,
  },
  unitText: {
    fontFamily: APPLE_FONT_FAMILY,
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.65)',
    marginLeft: 6,
    letterSpacing: -0.2,
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 70,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
  },
});
