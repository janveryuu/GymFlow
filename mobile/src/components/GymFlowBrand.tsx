import React from 'react';
import {
  Image,
  ImageStyle,
  StyleProp,
  StyleSheet,
  View,
  Text,
  ViewStyle,
} from 'react-native';
import { colors, typography, spacing } from '../theme';

// Logo source: 1254 x 1254 (aspect ratio: 1.0) with black rounded squircle background
const LOGO_SOURCE = require('../../assets/gymflow-logo-new.png');
const LOGO_ASPECT_RATIO = 1.0;

// Wordmark sources: 2170 x 725 (aspect ratio: ~2.9931)
const TEXT_WHITE_SOURCE = require('../../assets/gymflow-text.png');
const TEXT_DARK_SOURCE = require('../../assets/gymflow-text-dark.png');
const TEXT_ASPECT_RATIO = 2170 / 725;

export interface GymFlowLogoProps {
  size?: number;
  width?: number;
  height?: number;
  tintColor?: string;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'contain' | 'cover' | 'stretch' | 'center';
  accessibilityLabel?: string;
}

export const GymFlowLogo: React.FC<GymFlowLogoProps> = ({
  size = 36,
  width,
  height,
  tintColor,
  style,
  resizeMode = 'contain',
  accessibilityLabel = 'GymFlow Logo',
}) => {
  let resolvedWidth: number;
  let resolvedHeight: number;

  if (width && height) {
    resolvedWidth = width;
    resolvedHeight = height;
  } else if (width) {
    resolvedWidth = width;
    resolvedHeight = Math.round(width / LOGO_ASPECT_RATIO);
  } else if (height) {
    resolvedHeight = height;
    resolvedWidth = Math.round(height * LOGO_ASPECT_RATIO);
  } else {
    resolvedHeight = size;
    resolvedWidth = Math.round(size * LOGO_ASPECT_RATIO);
  }

  const imageStyle: StyleProp<ImageStyle> = [
    {
      width: resolvedWidth,
      height: resolvedHeight,
    },
    tintColor ? { tintColor } : null,
    style,
  ];

  return (
    <Image
      source={LOGO_SOURCE}
      style={imageStyle}
      resizeMode={resizeMode}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    />
  );
};

export interface GymFlowWordmarkProps {
  height?: number;
  width?: number;
  variant?: 'light' | 'dark' | 'auto';
  color?: string;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'contain' | 'cover' | 'stretch' | 'center';
  accessibilityLabel?: string;
}

export const GymFlowWordmark: React.FC<GymFlowWordmarkProps> = ({
  height = 28,
  width,
  variant = 'auto',
  color,
  style,
  resizeMode = 'contain',
  accessibilityLabel = 'GymFlow',
}) => {
  let resolvedWidth: number;
  let resolvedHeight: number;

  if (width && height) {
    resolvedWidth = width;
    resolvedHeight = height;
  } else if (width) {
    resolvedWidth = width;
    resolvedHeight = Math.round(width / TEXT_ASPECT_RATIO);
  } else {
    resolvedHeight = height;
    resolvedWidth = Math.round(height * TEXT_ASPECT_RATIO);
  }

  // Determine source and tintColor
  let source = TEXT_DARK_SOURCE;
  let computedTint: string | undefined;

  if (color) {
    source = TEXT_WHITE_SOURCE;
    computedTint = color;
  } else if (variant === 'light') {
    // White text on dark surface
    source = TEXT_WHITE_SOURCE;
  } else if (variant === 'dark') {
    // Dark text on light surface
    source = TEXT_DARK_SOURCE;
  } else {
    // Auto: Default to dark text because the app design system is light-first (#FAFAFA)
    source = TEXT_DARK_SOURCE;
  }

  const imageStyle: StyleProp<ImageStyle> = [
    {
      width: resolvedWidth,
      height: resolvedHeight,
    },
    computedTint ? { tintColor: computedTint } : null,
    style,
  ];

  return (
    <Image
      source={source}
      style={imageStyle}
      resizeMode={resizeMode}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    />
  );
};

export interface GymFlowBrandHeaderProps {
  layout?: 'row' | 'column';
  logoSize?: number;
  textSize?: number;
  textColor?: string;
  variant?: 'light' | 'dark' | 'auto';
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export const GymFlowBrandHeader: React.FC<GymFlowBrandHeaderProps> = ({
  layout = 'row',
  logoSize = 38,
  textSize = 28,
  textColor,
  variant = 'auto',
  subtitle,
  style,
  accessibilityLabel = 'GymFlow Brand Header',
}) => {
  if (layout === 'column') {
    return (
      <View style={[styles.columnContainer, style]} accessibilityLabel={accessibilityLabel}>
        <GymFlowLogo size={logoSize} />
        <GymFlowWordmark
          height={textSize}
          variant={variant}
          color={textColor}
          style={{ marginTop: spacing.xs }}
        />
        {subtitle ? (
          <Text
            style={[
              styles.subtitle,
              variant === 'light' ? { color: colors.textMuted } : { color: colors.textSecondary },
            ]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.rowContainer, style]} accessibilityLabel={accessibilityLabel}>
      <GymFlowLogo size={logoSize} />
      <View style={styles.rowTextContainer}>
        <GymFlowWordmark height={textSize} variant={variant} color={textColor} />
        {subtitle ? (
          <Text
            style={[
              styles.subtitle,
              variant === 'light' ? { color: colors.textMuted } : { color: colors.textSecondary },
            ]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowTextContainer: {
    marginLeft: spacing.sm,
    justifyContent: 'center',
  },
  columnContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    marginTop: 2,
    letterSpacing: 0.2,
  },
});
