import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Home, Dumbbell, Calendar, TrendingUp, User as UserIcon, AlertCircle, Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, borderRadius } from '../theme';
import { useSyncStore } from '../store/syncStore';
import { QuickActionsSheet } from './QuickActionsSheet';

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

export const GymTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const { hasAmberWarning, rejectedCount, activeBanner, dismissBanner } = useSyncStore();
  const [actionsSheetVisible, setActionsSheetVisible] = useState(false);

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

      {/* Floating Tab Bar */}
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const label = TAB_LABELS[route.name] || route.name;
          const IconComponent = TAB_ICONS[route.name];

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          // Render normal tab
          const tab = (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={`${label} Tab`}
              testID={`tab-${label.toLowerCase()}`}
              onPress={onPress}
              style={[styles.tabButton, isFocused && styles.tabButtonActive]}
              activeOpacity={0.7}
            >
              <View style={styles.iconWrapper}>
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
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  { color: isFocused ? colors.textInverse : colors.textMuted },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );

          // If this is the second tab (Workouts/CatalogTab), append the center "+" button right after it.
          if (index === 1) {
            return (
              <React.Fragment key="center-group">
                {tab}
                <TouchableOpacity
                  key="center-action-btn"
                  accessibilityRole="button"
                  accessibilityLabel="Action Hub"
                  style={styles.centerActionButton}
                  activeOpacity={0.8}
                  onPress={() => setActionsSheetVisible(true)}
                >
                  <View style={styles.centerActionIconWrapper}>
                    <Plus color={colors.surface} size={28} />
                  </View>
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
    left: 16,
    right: 16,
    alignItems: 'center',
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
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tabButton: {
    flex: 1,
    maxWidth: 72,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: borderRadius.lg,
  },
  tabButtonActive: {
    backgroundColor: colors.primary, // Surgical electric-lime rounded-square highlight
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
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 3,
    letterSpacing: 0.2,
  },
  centerActionButton: {
    top: -16, // Elevated slightly above the bar's baseline
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  centerActionIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.text, // Circular black button
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
});
