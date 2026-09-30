import React, { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Platform, Animated } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { Home, Dumbbell, TrendingUp, User as UserIcon, AlertCircle, Plus } from './icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, borderRadius } from '../theme';
import { useSyncStore } from '../store/syncStore';
import { QuickActionsSheet } from './QuickActionsSheet';

const APPLE_FONT_FAMILY = Platform.OS === 'web'
  ? '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'
  : Platform.OS === 'ios'
  ? 'System'
  : 'Roboto';

const TAB_ICONS: Record<string, React.FC<{ color: string; size: number }>> = {
  DashboardTab: ({ color, size }) => <Home color={color} size={size} />,
  CatalogTab: ({ color, size }) => <Dumbbell color={color} size={size} />,
  ProgressTab: ({ color, size }) => <TrendingUp color={color} size={size} />,
  ProfileTab: ({ color, size }) => <UserIcon color={color} size={size} />,
};

const TAB_LABELS: Record<string, string> = {
  DashboardTab: 'Home',
  CatalogTab: 'Workouts',
  ProgressTab: 'Progress',
  ProfileTab: 'Profile',
};

interface TabItemProps {
  route: any;
  index: number;
  isFocused: boolean;
  label: string;
  IconComponent?: React.FC<{ color: string; size: number }>;
  onPress: () => void;
  onLayout: (e: any) => void;
  hasAmberWarning: boolean;
  rejectedCount: number;
}

const TabItem: React.FC<TabItemProps> = ({
  route,
  index,
  isFocused,
  label,
  IconComponent,
  onPress,
  onLayout,
  hasAmberWarning,
  rejectedCount,
}) => {
  const iconScale = useRef(new Animated.Value(1)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  // Apple HIG fluid icon bounce micro-interaction on tab selection
  useEffect(() => {
    if (isFocused) {
      Animated.sequence([
        Animated.timing(iconScale, {
          toValue: 0.86,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.spring(iconScale, {
          toValue: 1,
          damping: 12,
          stiffness: 350,
          mass: 0.6,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isFocused]);

  const handlePressIn = () => {
    Animated.spring(pressScale, {
      toValue: 0.94,
      damping: 18,
      stiffness: 320,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressScale, {
      toValue: 1,
      damping: 18,
      stiffness: 320,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[styles.tabButtonWrapper, { transform: [{ scale: pressScale }] }]}
      onLayout={onLayout}
    >
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={`${label} Tab`}
        testID={`tab-${label.toLowerCase()}`}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.tabButton}
        activeOpacity={1}
      >
        <Animated.View style={[styles.iconWrapper, { transform: [{ scale: iconScale }] }]}>
          {IconComponent ? (
            <IconComponent
              color={isFocused ? colors.textInverse : colors.textSecondary}
              size={22}
            />
          ) : null}

          {/* Nav Shell Sync Indicator */}
          {route.name === 'DashboardTab' && (hasAmberWarning || rejectedCount > 0) && (
            <View
              style={[
                styles.syncDot,
                { backgroundColor: colors.primary },
              ]}
            />
          )}
        </Animated.View>
        <Text
          style={[
            styles.tabLabel,
            { color: isFocused ? colors.textInverse : colors.textMuted },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const GymTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const { hasAmberWarning, rejectedCount, activeBanner, dismissBanner } = useSyncStore();
  const [actionsSheetVisible, setActionsSheetVisible] = useState(false);

  // Layout measurement & Apple spring sliding pill indicator
  const [tabLayouts, setTabLayouts] = useState<Record<number, { x: number; width: number }>>({});
  const hasMeasuredFirst = useRef(false);
  const indicatorX = useRef(new Animated.Value(0)).current;
  const indicatorWidth = useRef(new Animated.Value(0)).current;
  const indicatorOpacity = useRef(new Animated.Value(0)).current;

  // Center button spring rotation & press scale
  const centerScale = useRef(new Animated.Value(1)).current;
  const centerRotate = useRef(new Animated.Value(actionsSheetVisible ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(centerRotate, {
      toValue: actionsSheetVisible ? 1 : 0,
      damping: 18,
      stiffness: 280,
      useNativeDriver: true,
    }).start();
  }, [actionsSheetVisible]);

  const rotateInterpolate = centerRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  // Apple Spring glide animation across tabs
  useEffect(() => {
    const currentLayout = tabLayouts[state.index];
    if (!currentLayout) return;

    if (!hasMeasuredFirst.current) {
      indicatorX.setValue(currentLayout.x);
      indicatorWidth.setValue(currentLayout.width);
      indicatorOpacity.setValue(1);
      hasMeasuredFirst.current = true;
    } else {
      Animated.parallel([
        Animated.spring(indicatorX, {
          toValue: currentLayout.x,
          damping: 25,
          stiffness: 280,
          mass: 0.75,
          useNativeDriver: false,
        }),
        Animated.spring(indicatorWidth, {
          toValue: currentLayout.width,
          damping: 25,
          stiffness: 280,
          mass: 0.75,
          useNativeDriver: false,
        }),
        Animated.timing(indicatorOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [state.index, tabLayouts]);

  const handleTabLayout = (index: number, e: any) => {
    const { x, width } = e.nativeEvent.layout;
    setTabLayouts((prev) => {
      if (prev[index]?.x === x && prev[index]?.width === width) {
        return prev;
      }
      return { ...prev, [index]: { x, width } };
    });
  };

  return (
    <View style={[styles.outerContainer, { bottom: Math.max(insets.bottom, 16) }]}>
      {/* 409 Rejection Banner */}
      {activeBanner ? (
        <View style={styles.bannerContainer}>
          <View style={styles.bannerContent}>
            <AlertCircle size={16} color={colors.error} />
            <Text style={styles.bannerText} numberOfLines={1}>
              {activeBanner}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.bannerDismiss}
            onPress={() => dismissBanner()}
            accessibilityRole="button"
            accessibilityLabel="Dismiss sync conflict banner"
          >
            <Text style={styles.bannerDismissText}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Floating Tab Bar with Smooth Spring Sliding Pill */}
      <View style={styles.tabBar}>
        {/* Apple HIG Fluid Sliding Indicator */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.slidingIndicator,
            {
              left: indicatorX,
              width: indicatorWidth,
              opacity: indicatorOpacity,
            },
          ]}
        />

        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const label = TAB_LABELS[route.name] || route.name;
          const IconComponent = TAB_ICONS[route.name];

          const onPress = () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch {
              // Haptics optional
            }

            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const tab = (
            <TabItem
              key={route.key}
              route={route}
              index={index}
              isFocused={isFocused}
              label={label}
              IconComponent={IconComponent}
              onPress={onPress}
              onLayout={(e) => handleTabLayout(index, e)}
              hasAmberWarning={hasAmberWarning}
              rejectedCount={rejectedCount}
            />
          );

          // If this is the second tab (Workouts/CatalogTab), append the center elevated button right after it.
          if (index === 1) {
            return (
              <React.Fragment key="center-group">
                {tab}
                <TouchableOpacity
                  key="center-action-btn"
                  accessibilityRole="button"
                  accessibilityLabel="Action Hub"
                  style={styles.centerActionButton}
                  activeOpacity={0.9}
                  onPress={() => {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    } catch {
                      // Haptics optional
                    }
                    setActionsSheetVisible((prev) => !prev);
                  }}
                  onPressIn={() => {
                    Animated.spring(centerScale, {
                      toValue: 0.9,
                      damping: 14,
                      stiffness: 300,
                      useNativeDriver: true,
                    }).start();
                  }}
                  onPressOut={() => {
                    Animated.spring(centerScale, {
                      toValue: 1,
                      damping: 14,
                      stiffness: 300,
                      useNativeDriver: true,
                    }).start();
                  }}
                >
                  <Animated.View
                    style={[
                      styles.centerActionIconWrapper,
                      {
                        transform: [
                          { scale: centerScale },
                          { rotate: rotateInterpolate },
                        ],
                      },
                    ]}
                  >
                    <Plus color="#000000" size={28} strokeWidth={2.4} />
                  </Animated.View>
                </TouchableOpacity>
              </React.Fragment>
            );
          }

          return tab;
        })}
      </View>
      <QuickActionsSheet visible={actionsSheetVisible} onClose={() => setActionsSheetVisible(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    left: 12,
    right: 12,
    alignItems: 'center',
    zIndex: 100,
  },
  bannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    width: '100%',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bannerText: {
    color: colors.text,
    fontSize: typography.sizes.xs,
    marginLeft: 8,
    flex: 1,
  },
  bannerDismiss: {
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  bannerDismissText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Platform.OS === 'web' ? 'rgba(18, 18, 22, 0.78)' : colors.surface,
    borderRadius: borderRadius.xl,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 8,
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(25px) saturate(180%)',
      WebkitBackdropFilter: 'blur(25px) saturate(180%)',
    } as any : {}),
  },
  slidingIndicator: {
    position: 'absolute',
    top: 7,
    bottom: 7,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 0,
  },
  tabButtonWrapper: {
    flex: 1,
    zIndex: 1,
  },
  tabButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 2,
    borderRadius: borderRadius.lg,
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncDot: {
    position: 'absolute',
    top: -2,
    right: -6,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  tabLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
    letterSpacing: 0.1,
    fontFamily: APPLE_FONT_FAMILY,
  },
  centerActionButton: {
    top: -16, // Elevated slightly above the bar's baseline
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    zIndex: 2,
  },
  centerActionIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
});

