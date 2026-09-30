import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Easing,
  Platform,
  ViewStyle,
  Modal,
  Dimensions,
} from 'react-native';
import { ChevronDown, Check } from './icons';
import * as Haptics from 'expo-haptics';

export interface GlideSelectOption {
  value: string;
  label: string;
  tag?: string;
}

export interface GlideSelectProps {
  options: (string | GlideSelectOption)[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string, item: GlideSelectOption) => void;
  placeholder?: string;
  showTags?: boolean;
  accentColor?: string;
  surfaceColor?: string;
  highlightColor?: string;
  textColor?: string;
  size?: 'sm' | 'md' | 'lg';
  radius?: number;
  menuWidth?: number;
  disabled?: boolean;
  ariaLabel?: string;
  style?: ViewStyle;
}

const SIZES = {
  sm: { chip: 30, row: 30, font: 12, paddingH: 10 },
  md: { chip: 34, row: 34, font: 13, paddingH: 12 },
  lg: { chip: 42, row: 40, font: 14, paddingH: 14 },
};

const GAP = 2;
const PAD = 4;

export const GlideSelect: React.FC<GlideSelectProps> = ({
  options = ['One', 'Two', 'Three'],
  value,
  defaultValue,
  onChange,
  placeholder = 'Select…',
  showTags = true,
  accentColor = '#FFFFFF',
  surfaceColor = 'rgba(32, 32, 38, 0.96)',
  highlightColor = 'rgba(255, 255, 255, 0.12)',
  textColor = '#FFFFFF',
  size = 'md',
  radius = 12,
  menuWidth = 180,
  disabled = false,
  ariaLabel = 'Select option',
  style,
}) => {
  const normItems: GlideSelectOption[] = options.map((o) =>
    typeof o === 'string' ? { value: o, label: o } : o
  );

  const [internalValue, setInternalValue] = useState<string>(defaultValue ?? normItems[0]?.value ?? '');
  const currentValue = value !== undefined ? value : internalValue;
  const selectedIndex = normItems.findIndex((it) => it.value === currentValue);

  const [isOpen, setIsOpen] = useState(false);
  const [triggerLayout, setTriggerLayout] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  const triggerRef = useRef<View>(null);
  const S = SIZES[size] ?? SIZES.md;
  const step = S.row + GAP;

  // Animations
  const openAnim = useRef(new Animated.Value(0)).current;
  const chevronAnim = useRef(new Animated.Value(0)).current;
  const pillY = useRef(new Animated.Value(Math.max(0, selectedIndex) * step)).current;

  // When value changes from parent, adjust pill position immediately
  useEffect(() => {
    if (selectedIndex >= 0) {
      pillY.setValue(selectedIndex * step);
    }
  }, [selectedIndex, step, pillY]);

  const openMenu = () => {
    if (disabled) return;
    try {
      Haptics.selectionAsync();
    } catch {}

    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setTriggerLayout({ x, y, width, height });
      setIsOpen(true);
      if (selectedIndex >= 0) {
        pillY.setValue(selectedIndex * step);
      }
      Animated.parallel([
        Animated.timing(openAnim, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(chevronAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const closeMenu = (cb?: () => void) => {
    Animated.parallel([
      Animated.timing(openAnim, {
        toValue: 0,
        duration: 140,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(chevronAnim, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsOpen(false);
      cb?.();
    });
  };

  const pickItem = (index: number) => {
    const item = normItems[index];
    if (!item) return;

    try {
      Haptics.selectionAsync();
    } catch {}

    // Smoothly glide pill to selected item
    Animated.spring(pillY, {
      toValue: index * step,
      stiffness: 340,
      damping: 28,
      mass: 0.7,
      useNativeDriver: true,
    }).start();

    if (value === undefined) {
      setInternalValue(item.value);
    }
    onChange?.(item.value, item);

    // Close after pill glides
    setTimeout(() => {
      closeMenu();
    }, 120);
  };

  const chevronRotate = chevronAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const selectedItem = normItems[selectedIndex];

  return (
    <View style={style}>
      {/* Trigger Chip */}
      <View ref={triggerRef} collapsable={false}>
        <TouchableOpacity
          style={[
            styles.trigger,
            {
              height: S.chip,
              borderRadius: radius,
              paddingHorizontal: S.paddingH,
              backgroundColor: isOpen ? highlightColor : surfaceColor,
              opacity: disabled ? 0.45 : 1,
            },
          ]}
          onPress={isOpen ? () => closeMenu() : openMenu}
          activeOpacity={0.75}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={ariaLabel}
          accessibilityState={{ expanded: isOpen }}
        >
          <Text
            style={[
              styles.triggerLabel,
              { fontSize: S.font, color: textColor },
              !selectedItem && styles.triggerLabelEmpty,
            ]}
            numberOfLines={1}
          >
            {selectedItem ? selectedItem.label : placeholder}
          </Text>

          <Animated.View style={{ transform: [{ rotate: chevronRotate }], marginLeft: 6 }}>
            <ChevronDown size={14} color="rgba(255, 255, 255, 0.60)" strokeWidth={2.4} />
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* Popout Menu Modal for reliable overlay */}
      {isOpen && (
        <Modal
          visible={isOpen}
          transparent
          animationType="none"
          onRequestClose={() => closeMenu()}
        >
          <TouchableWithoutFeedback onPress={() => closeMenu()}>
            <View style={styles.modalBackdrop}>
              <TouchableWithoutFeedback>
                <Animated.View
                  style={[
                    styles.menu,
                    {
                      width: Math.max(menuWidth, triggerLayout.width),
                      borderRadius: radius,
                      backgroundColor: surfaceColor,
                      top: Math.min(triggerLayout.y + triggerLayout.height + 6, Dimensions.get('window').height - (normItems.length * step + 40)),
                      left: Math.max(16, Math.min(triggerLayout.x, Dimensions.get('window').width - menuWidth - 16)),
                      opacity: openAnim,
                      transform: [
                        {
                          scale: openAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.94, 1],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <View style={styles.listContainer}>
                    {/* The Gliding Pill */}
                    <Animated.View
                      style={[
                        styles.glidePill,
                        {
                          height: S.row,
                          borderRadius: Math.max(4, radius - 4),
                          backgroundColor: highlightColor,
                          transform: [{ translateY: pillY }],
                        },
                      ]}
                    />

                    {/* Options List */}
                    {normItems.map((item, idx) => {
                      const isItemChecked = idx === selectedIndex;
                      return (
                        <TouchableOpacity
                          key={item.value}
                          style={[
                            styles.optionRow,
                            {
                              height: S.row,
                              paddingHorizontal: 10,
                              borderRadius: Math.max(4, radius - 4),
                            },
                          ]}
                          onPress={() => pickItem(idx)}
                          activeOpacity={0.8}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: isItemChecked }}
                          accessibilityLabel={item.label}
                        >
                          <Text
                            style={[
                              styles.optionLabel,
                              { fontSize: S.font, color: textColor },
                              isItemChecked && styles.optionLabelActive,
                            ]}
                            numberOfLines={1}
                          >
                            {item.label}
                          </Text>

                          {showTags && item.tag ? (
                            <Text style={styles.optionTag}>{item.tag}</Text>
                          ) : null}

                          <View style={styles.checkContainer}>
                            {isItemChecked && (
                              <Check size={14} color={accentColor} strokeWidth={2.4} />
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </Animated.View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          transition: 'all 160ms cubic-bezier(0.23, 1, 0.32, 1)',
        } as any)
      : {}),
  },
  triggerLabel: {
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  triggerLabelEmpty: {
    opacity: 0.6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  menu: {
    position: 'absolute',
    padding: PAD,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 12,
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(30px) saturate(190%)',
          WebkitBackdropFilter: 'blur(30px) saturate(190%)',
        } as any)
      : {}),
  },
  listContainer: {
    position: 'relative',
    gap: GAP,
  },
  glidePill: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 0,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  optionLabel: {
    flex: 1,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  optionLabelActive: {
    fontWeight: '700',
  },
  optionTag: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.40)',
    fontWeight: '500',
    marginRight: 6,
    letterSpacing: 0.2,
  },
  checkContainer: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
