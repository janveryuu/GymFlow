import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, AccessibilityProps, StyleProp, ViewStyle } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { colors, typography, borderRadius, spacing } from '../theme';

interface EmptyStateProps extends AccessibilityProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  style,
  ...accessibilityProps
}) => {
  return (
    <View style={[styles.container, style]} {...accessibilityProps}>
      {Icon && (
        <View style={styles.iconWrapper}>
          <View style={styles.iconContainer}>
            <Icon size={32} color={colors.textSecondary} strokeWidth={1.5} />
          </View>
        </View>
      )}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onAction}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={styles.actionButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  iconWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    width: '100%',
    fontFamily: typography.fonts.headingBold,
    fontSize: typography.sizes.lg,
    color: colors.text,
    textAlign: 'center',
    alignSelf: 'center',
    marginBottom: spacing.xs,
  },
  description: {
    width: '100%',
    maxWidth: 280,
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    alignSelf: 'center',
    lineHeight: typography.lineHeights.sm,
  },
  actionButton: {
    marginTop: spacing.md,
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    minHeight: 44, // Minimum 44px tap target
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  actionButtonText: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
});

