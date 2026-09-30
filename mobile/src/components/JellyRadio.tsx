import React, {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  ViewStyle,
  ScrollView,
  AccessibilityRole,
} from 'react-native';
import * as Haptics from 'expo-haptics';

export interface JellyRadioItem {
  id?: string;
  value?: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface NormalizedJellyRadioItem extends JellyRadioItem {
  value: string;
}

export interface JellyRadioProps {
  items: (string | JellyRadioItem)[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string, index: number) => void;
  chipColor?: string;
  activeColor?: string;
  textColor?: string;
  activeTextColor?: string;
  size?: 'sm' | 'md' | 'lg';
  gap?: number;
  radius?: number;
  swell?: number;     // Scale expansion when selected (default: 0.2 -> 1.2x)
  barge?: number;     // Additional horizontal push in px (default: 6)
  shrink?: number;    // Scale contraction for non-selected items (default: 0.05 -> 0.95x)
  jelly?: number;     // Jelly wobble multiplier (default: 1)
  bounce?: number;    // Spring bounciness (default: 0.25)
  stagger?: number;   // Delay in ms per item distance (default: 22)
  stiffness?: number; // Base spring stiffness (default: 580)
  disabled?: boolean;
  scrollable?: boolean;
  hapticsEnabled?: boolean;
  ariaLabel?: string;
  accessibilityRole?: AccessibilityRole;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  testID?: string;
}

const SIZES = {
  sm: { h: 28, font: 12, px: 12 },
  md: { h: 36, font: 13, px: 16 },
  lg: { h: 44, font: 14, px: 20 },
};

const APPLE_FONT_FAMILY =
  Platform.OS === 'web'
    ? '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif'
    : Platform.OS === 'ios'
    ? 'System'
    : 'Roboto';

export const JellyRadio: React.FC<JellyRadioProps> = ({
  items = ['Off', 'Low', 'Medium', 'High', 'Max'],
  value,
  defaultValue,
  onChange,
  chipColor = 'rgba(255, 255, 255, 0.08)',
  activeColor = '#007AFF',
  textColor = 'rgba(255, 255, 255, 0.65)',
  activeTextColor = '#FFFFFF',
  size = 'md',
  gap = 8,
  radius = 18,
  swell = 0.2,
  barge = 6,
  shrink = 0.05,
  jelly = 1,
  bounce = 0.25,
  stagger = 22,
  stiffness = 580,
  disabled = false,
  scrollable = true,
  hapticsEnabled = true,
  ariaLabel = 'Options',
  accessibilityRole = 'tab',
  style,
  contentContainerStyle,
  testID,
}) => {
  // Normalize items to standard structure
  const list: NormalizedJellyRadioItem[] = items.map((it) => {
    if (typeof it === 'string') {
      return { value: it, label: it };
    }
    return {
      ...it,
      value: it.value ?? it.id ?? it.label,
    };
  });

  const [inner, setInner] = useState<string>(
    () => defaultValue ?? list[0]?.value ?? ''
  );
  const current = value !== undefined ? value : inner;
  const at = Math.max(
    0,
    list.findIndex((it) => it.value === current)
  );

  const appliedRef = useRef<number>(at);
  const widths = useRef<number[]>([]);
  const scrollRef = useRef<ScrollView>(null);
  const inFlightRef = useRef<boolean>(false);
  const pressAnims = useRef<Animated.Value[]>([]);

  // Motion values for each chip: x (translation), sx (scaleX), sy (scaleY)
  const mvs = useRef<{
    x: Animated.Value;
    sx: Animated.Value;
    sy: Animated.Value;
  }[]>([]);

  // Ensure motion values exist for each item
  for (let i = 0; i < list.length; i++) {
    if (!mvs.current[i]) {
      const isInitial = i === at;
      mvs.current[i] = {
        x: new Animated.Value(0),
        sx: new Animated.Value(isInitial ? 1 + swell : 1 - shrink),
        sy: new Animated.Value(isInitial ? 1 + swell : 1 - shrink),
      };
    }
    if (!pressAnims.current[i]) {
      pressAnims.current[i] = new Animated.Value(1);
    }
    if (widths.current[i] === undefined) {
      // Sensible initial width based on character count and padding
      const sizeCfg = SIZES[size] ?? SIZES.md;
      const itemLabel = list[i]?.label || '';
      widths.current[i] = Math.max(48, itemLabel.length * 8.5 + sizeCfg.px * 2);
    }
  }

  const apply = useCallback(
    (sel: number, instant: boolean = false) => {
      const activeWidth = widths.current[sel] ?? 60;
      const push = (activeWidth * swell) / 2 + barge;
      const inFlight = inFlightRef.current;
      inFlightRef.current = true;

      const animList: Animated.CompositeAnimation[] = [];

      for (let i = 0; i < list.length; i++) {
        const mv = mvs.current[i];
        if (!mv) continue;

        const on = i === sel;
        const far = Math.abs(i - sel);
        const dir = Math.sign(i - sel);
        const targetX = dir * push;
        const targetScale = on ? 1 + swell : 1 - shrink;

        if (instant) {
          mv.x.setValue(targetX);
          mv.sx.setValue(targetScale);
          mv.sy.setValue(targetScale);
          continue;
        }

        // Stop any running animations on these values
        mv.x.stopAnimation();
        mv.sx.stopAnimation();
        mv.sy.stopAnimation();

        // 1. Spring parameter calculations:
        const k = stiffness * (1 - 0.12 * Math.min(far, 3));
        const delay = inFlight ? 0 : Math.round(far * stagger);

        // X Spring:
        const massX = 0.9;
        const dampingX = 2 * Math.sqrt(k * massX) * (1 - bounce);
        const animX = Animated.spring(mv.x, {
          toValue: targetX,
          stiffness: k,
          damping: dampingX,
          mass: massX,
          overshootClamping: false,
          useNativeDriver: true,
        });

        // Scale X Spring (squish/spread in X):
        const kSX = k * (1 + 0.24 * jelly);
        const massSX = Math.max(0.1, 0.9 - 0.1 * jelly);
        const bounceSX = Math.min(0.85, bounce + 0.3 * jelly);
        const dampingSX = 2 * Math.sqrt(kSX * massSX) * (1 - bounceSX);
        const animSX = Animated.spring(mv.sx, {
          toValue: targetScale,
          stiffness: kSX,
          damping: dampingSX,
          mass: massSX,
          overshootClamping: false,
          useNativeDriver: true,
        });

        // Scale Y Spring (counter-squish in Y with offset delay for organic jelly jiggle):
        const kSY = k * (1 - 0.14 * jelly);
        const massSY = 0.9 + 0.05 * jelly;
        const bounceSY = bounce;
        const dampingSY = 2 * Math.sqrt(kSY * massSY) * (1 - bounceSY);
        const delaySY = delay + Math.round(50 * jelly);
        const animSY = Animated.spring(mv.sy, {
          toValue: targetScale,
          stiffness: kSY,
          damping: dampingSY,
          mass: massSY,
          overshootClamping: false,
          useNativeDriver: true,
        });

        if (delay > 0) {
          animList.push(Animated.sequence([Animated.delay(delay), animX]));
          animList.push(Animated.sequence([Animated.delay(delay), animSX]));
        } else {
          animList.push(animX);
          animList.push(animSX);
        }

        if (delaySY > 0) {
          animList.push(Animated.sequence([Animated.delay(delaySY), animSY]));
        } else {
          animList.push(animSY);
        }
      }

      if (!instant && animList.length > 0) {
        Animated.parallel(animList).start(() => {
          inFlightRef.current = false;
        });
      } else {
        inFlightRef.current = false;
      }
    },
    [barge, bounce, jelly, list.length, shrink, stagger, stiffness, swell]
  );

  // Sync animation when selected index changes from prop
  useEffect(() => {
    if (appliedRef.current !== at) {
      appliedRef.current = at;
      apply(at, false);
    }
  }, [at, apply]);

  // Initial layout settle
  useEffect(() => {
    apply(at, true);
  }, []);

  const commit = useCallback(
    (index: number) => {
      if (disabled || index === at || !list[index] || list[index].disabled) return;

      if (hapticsEnabled) {
        try {
          Haptics.selectionAsync();
        } catch {}
      }

      appliedRef.current = index;
      apply(index, false);

      if (value === undefined) {
        setInner(list[index].value);
      }
      onChange?.(list[index].value, index);
    },
    [disabled, at, list, hapticsEnabled, apply, value, onChange]
  );

  const handlePressIn = (i: number) => {
    if (pressAnims.current[i]) {
      Animated.timing(pressAnims.current[i], {
        toValue: 0.96,
        duration: 120,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePressOut = (i: number) => {
    if (pressAnims.current[i]) {
      Animated.spring(pressAnims.current[i], {
        toValue: 1,
        stiffness: 400,
        damping: 25,
        useNativeDriver: true,
      }).start();
    }
  };

  const sizeCfg = SIZES[size] ?? SIZES.md;
  const chipH = sizeCfg.h;
  const maxW = Math.max(60, ...widths.current);
  const padX = Math.ceil((maxW * swell * 1.3) / 2 + barge) + 4;
  const padY = Math.ceil((chipH * swell) / 2) + 4;

  const renderContent = () => (
    <View
      style={[
        styles.rowContainer,
        {
          gap,
          paddingHorizontal: padX,
          paddingVertical: padY,
        },
        contentContainerStyle,
      ]}
      accessibilityRole="radiogroup"
      aria-label={ariaLabel}
    >
      {list.map((it, i) => {
        const isSelected = i === at;
        const mv = mvs.current[i];
        const pressAnim = pressAnims.current[i];

        return (
          <Animated.View
            key={it.value}
            style={[
              styles.chipAnimWrapper,
              mv && {
                transform: [
                  { translateX: mv.x },
                  { scaleX: Animated.multiply(mv.sx, pressAnim || 1) },
                  { scaleY: Animated.multiply(mv.sy, pressAnim || 1) },
                ],
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => commit(i)}
              onPressIn={() => handlePressIn(i)}
              onPressOut={() => handlePressOut(i)}
              disabled={disabled || it.disabled}
              activeOpacity={0.88}
              accessibilityRole={accessibilityRole}
              accessibilityState={{ selected: isSelected, disabled: !!it.disabled }}
              accessibilityLabel={it.label}
              onLayout={(e) => {
                const w = e.nativeEvent.layout.width;
                if (w > 0 && Math.abs((widths.current[i] || 0) - w) > 1) {
                  widths.current[i] = w;
                }
              }}
              style={[
                styles.chipSkin,
                {
                  height: chipH,
                  borderRadius: radius,
                  paddingHorizontal: sizeCfg.px,
                  backgroundColor: isSelected ? activeColor : chipColor,
                  borderColor: isSelected ? activeColor : 'rgba(255, 255, 255, 0.16)',
                },
                isSelected && [
                  styles.chipSkinActive,
                  {
                    shadowColor: activeColor,
                  },
                ],
                (disabled || it.disabled) && styles.chipDisabled,
              ]}
            >
              {it.icon ? <View style={styles.iconWrap}>{it.icon}</View> : null}
              <Text
                style={[
                  styles.label,
                  {
                    fontSize: sizeCfg.font,
                    color: isSelected ? activeTextColor : textColor,
                    fontWeight: isSelected ? '600' : '500',
                  },
                ]}
                numberOfLines={1}
              >
                {it.label}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </View>
  );

  if (scrollable) {
    return (
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={[styles.scroll, style]}
        testID={testID}
      >
        {renderContent()}
      </ScrollView>
    );
  }

  return (
    <View style={[styles.staticContainer, style]} testID={testID}>
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  staticContainer: {
    alignSelf: 'flex-start',
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipAnimWrapper: {
    zIndex: 1,
  },
  chipSkin: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  chipSkinActive: {
    zIndex: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 3,
  },
  chipDisabled: {
    opacity: 0.4,
  },
  iconWrap: {
    marginRight: 5,
  },
  label: {
    fontFamily: APPLE_FONT_FAMILY,
    letterSpacing: -0.1,
  },
});

export default JellyRadio;
