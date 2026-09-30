import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
  LayoutAnimation,
  UIManager,
  ViewStyle,
} from 'react-native';
import { Sparkles, ChevronDown, Check } from './icons';
import { colors, typography } from '../theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface ThoughtStepObject {
  title: string;
  desc?: string;
}

export type ThoughtStep = string | ThoughtStepObject;

export interface ThoughtLineProps {
  label?: string;
  doneLabel?: string;
  glyph?: 'sparkle' | 'dot' | 'none' | React.ReactNode;
  steps?: ThoughtStep[];
  collapsible?: boolean;
  collapseOnSettle?: boolean;
  color?: string;
  fontSize?: number;
  breathPeriod?: number; // In seconds, default 1.6s
  working?: boolean;
  settleAfter?: number;  // auto-settle after seconds
  elapsed?: number;      // forced elapsed time in seconds
  showTimer?: boolean;
  currentStepIndex?: number; // 0-indexed progress for steps
  showAllSteps?: boolean; // if false, only reveals steps up to currentStepIndex (matching screenshot)
  onSettle?: (durationSeconds: number) => void;
  style?: ViewStyle;
}

const fmt = (ds: number): string =>
  ds < 600
    ? `${(ds / 10).toFixed(1)}s`
    : `${Math.floor(ds / 600)}m ${((ds % 600) / 10).toFixed(1)}s`;

export const ThoughtLine: React.FC<ThoughtLineProps> = ({
  label = 'Thinking...',
  doneLabel = 'Thought for',
  glyph = 'sparkle',
  steps = [],
  collapsible = true,
  collapseOnSettle = false,
  fontSize = 15,
  breathPeriod = 1.6,
  working = true,
  settleAfter = 0,
  elapsed,
  showTimer = true,
  currentStepIndex = 0,
  showAllSteps = false,
  onSettle,
  style,
}) => {
  const [autoSettled, setAutoSettled] = useState(false);
  const [open, setOpen] = useState(true);
  const isWorking = working && !autoSettled;
  const hasTrace = steps.length > 0;

  // Live timer in deciseconds (10 = 1.0s)
  const [ds, setDs] = useState<number>(0);
  const dsRef = useRef<number>(0);
  const onSettleRef = useRef(onSettle);
  onSettleRef.current = onSettle;

  // Breathing loop animation for sparkle glyph
  const breathAnim = useRef(new Animated.Value(0.6)).current;
  const chevronAnim = useRef(new Animated.Value(1)).current; // 1 = open (180deg), 0 = closed (0deg)

  // Sync autoSettled when working changes
  useEffect(() => {
    if (working) setAutoSettled(false);
  }, [working]);

  // Handle collapsible settle
  useEffect(() => {
    if (isWorking) {
      if (hasTrace) setOpen(true);
    } else if (collapseOnSettle) {
      setOpen(false);
    }
  }, [isWorking, collapseOnSettle, hasTrace]);

  // Breathing loop for glyph while working
  useEffect(() => {
    let breathLoop: Animated.CompositeAnimation | null = null;

    if (isWorking) {
      breathLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(breathAnim, {
            toValue: 1,
            duration: (breathPeriod * 1000) / 2,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(breathAnim, {
            toValue: 0.55,
            duration: (breathPeriod * 1000) / 2,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      breathLoop.start();
    } else {
      Animated.timing(breathAnim, {
        toValue: 0.6,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }

    return () => {
      breathLoop?.stop();
    };
  }, [isWorking, breathPeriod, breathAnim]);

  // Timer interval
  useEffect(() => {
    if (elapsed != null) {
      const fixedDs = Math.round(elapsed * 10);
      dsRef.current = fixedDs;
      setDs(fixedDs);
      return;
    }

    if (!isWorking) {
      onSettleRef.current?.(dsRef.current / 10);
      return;
    }

    const startedAt = Date.now();
    dsRef.current = 0;
    setDs(0);

    const interval = setInterval(() => {
      const currentDs = Math.floor((Date.now() - startedAt) / 100);
      dsRef.current = currentDs;
      setDs(currentDs);

      if (settleAfter > 0 && currentDs >= Math.round(settleAfter * 10)) {
        setAutoSettled(true);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isWorking, elapsed, settleAfter]);

  // Animate chevron rotation
  useEffect(() => {
    Animated.timing(chevronAnim, {
      toValue: open ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [open, chevronAnim]);

  const toggleOpen = () => {
    if (!collapsible || !hasTrace) return;
    try {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    } catch {}
    setOpen((prev) => !prev);
  };

  const chevronRotate = chevronAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  // Filter visible steps: show steps reached so far (up to currentStepIndex when working), or all
  const visibleSteps = showAllSteps || !isWorking
    ? steps
    : steps.slice(0, Math.min(steps.length, currentStepIndex + 1));

  // Stationary height reservation: keeps the thinking header locked in place as new steps reveal downward
  const reservedHeight =
    open && isWorking && hasTrace
      ? Math.max(160, steps.length * 28 + 36)
      : undefined;

  return (
    <View
      style={[
        styles.container,
        reservedHeight != null ? { minHeight: reservedHeight } : null,
        style,
      ]}
    >
      {/* Header Line: ✦ Thinking... 3.4s   ^ */}
      <TouchableOpacity
        style={styles.headerRow}
        onPress={toggleOpen}
        activeOpacity={collapsible && hasTrace ? 0.7 : 1}
        disabled={!collapsible || !hasTrace}
        accessibilityRole="button"
        accessibilityLabel={`${isWorking ? label : doneLabel} ${fmt(ds)}`}
        accessibilityState={{ expanded: open }}
      >
        {/* Glyph (Sparkles) */}
        {glyph !== 'none' && (
          <Animated.View
            style={[
              styles.glyphWrap,
              { opacity: isWorking ? breathAnim : 0.65 },
            ]}
          >
            {glyph === 'sparkle' ? (
              <Sparkles size={fontSize * 1.05} color="#FFFFFF" strokeWidth={2.2} />
            ) : glyph === 'dot' ? (
              <View style={styles.glyphDot} />
            ) : (
              glyph
            )}
          </Animated.View>
        )}

        {/* Text + Timer: Thinking... 3.4s */}
        <Text style={[styles.headerLabel, { fontSize }]}>
          {isWorking ? label : doneLabel}{' '}
          {showTimer && (
            <Text style={styles.timerBold}>
              {fmt(ds)}
            </Text>
          )}
        </Text>

        {/* Small Chevron: ^ (upward when open, down when closed) */}
        {collapsible && hasTrace && (
          <Animated.View
            style={[
              styles.chevronWrap,
              { transform: [{ rotate: chevronRotate }] },
            ]}
          >
            <ChevronDown size={14} color="rgba(255, 255, 255, 0.6)" strokeWidth={2.4} />
          </Animated.View>
        )}
      </TouchableOpacity>

      {/* Indented Reasoning Steps Trace */}
      {hasTrace && open && (
        <View style={styles.stepsContainer}>
          {visibleSteps.map((step, i) => {
            const isStepObject = typeof step === 'object' && step !== null;
            const stepTitle = isStepObject ? (step as ThoughtStepObject).title : (step as string);

            const isDone = !isWorking || i < currentStepIndex;
            const isCurrent = isWorking && i === currentStepIndex;

            return (
              <View key={`${i}-${stepTitle}`} style={styles.stepItemRow}>
                {/* Mark: ✓ Checkmark if completed, • Bullet dot if active */}
                <View style={styles.markColumn}>
                  {isDone ? (
                    <Check size={12} color="rgba(255, 255, 255, 0.55)" strokeWidth={2.8} />
                  ) : isCurrent ? (
                    <View style={styles.bulletDot} />
                  ) : (
                    <View style={[styles.bulletDot, { opacity: 0.3 }]} />
                  )}
                </View>

                {/* Step Text: Muted gray when done, Bright bold white when current */}
                <Text
                  style={[
                    styles.stepText,
                    isDone ? styles.stepTextDone : isCurrent ? styles.stepTextActive : styles.stepTextPending,
                  ]}
                  numberOfLines={1}
                >
                  {stepTitle}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    alignSelf: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  glyphWrap: {
    marginRight: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  headerLabel: {
    fontFamily: typography.fonts.headingBold,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.95)',
    letterSpacing: -0.2,
  },
  timerBold: {
    fontFamily: typography.fonts.headingBold,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  chevronWrap: {
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepsContainer: {
    marginTop: 8,
    paddingLeft: 22, // Indents steps underneath the label
    gap: 7,
  },
  stepItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  markColumn: {
    width: 14,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  bulletDot: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.25,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
  },
  stepText: {
    fontSize: 14,
    letterSpacing: -0.1,
  },
  stepTextDone: {
    fontFamily: typography.fonts.body,
    color: 'rgba(255, 255, 255, 0.55)',
    fontWeight: '400',
  },
  stepTextActive: {
    fontFamily: typography.fonts.headingBold,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  stepTextPending: {
    fontFamily: typography.fonts.body,
    color: 'rgba(255, 255, 255, 0.25)',
    fontWeight: '400',
  },
});
