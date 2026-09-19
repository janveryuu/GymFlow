/**
 * GymFlow Mobile Dark-First Design System Tokens.
 * Based on deep black canvas (#000000) with dark charcoal surfaces,
 * crisp white primary elements, and surgical contrast.
 */

export const colors = {
  // Backgrounds
  background: '#000000',
  surface: '#121214',
  surfaceElevated: '#1C1C1E',
  surfaceHighlight: '#26262B',

  // Borders
  border: '#26262B',
  borderSubtle: '#1A1A1E',
  borderHighlight: '#3F3F46',

  // Accent & Brand (High contrast athletic white/black)
  primary: '#FFFFFF',
  primaryMuted: 'rgba(255, 255, 255, 0.15)',
  primaryGlow: 'rgba(255, 255, 255, 0.25)',

  // Text
  text: '#FFFFFF',
  textSecondary: '#A1A1A6',
  textMuted: '#71717A',
  textInverse: '#000000',

  // Status & Semantic
  success: '#30D158',
  warning: '#FF9F0A',
  warningAmber: '#FFB800',
  error: '#FF453A',
  errorMuted: 'rgba(255, 69, 58, 0.15)',
  info: '#64D2FF',
  cyan: '#00E5FF',
  cyanMuted: 'rgba(0, 229, 255, 0.18)',
  yellow: '#FFD600',
  yellowMuted: 'rgba(255, 214, 0, 0.18)',
} as const;

import { Platform } from 'react-native';

// Apple Company Typography: San Francisco (SF Pro Display / SF Pro Text)
const appleFontStack = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "SF Pro", system-ui, sans-serif';

const withFallback = (primaryFont: string): string => {
  return Platform.OS === 'web' ? `${primaryFont}, "SF Pro Display", "SF Pro Text", ${appleFontStack}` : primaryFont;
};

export const typography = {
  fonts: {
    headingBlack: withFallback('SF-Pro-Display-Black'),
    headingBold: withFallback('SF-Pro-Display-Bold'),
    headingSemiBold: withFallback('SF-Pro-Display-Semibold'),
    headingMedium: withFallback('SF-Pro-Display-Medium'),
    headingRegular: withFallback('SF-Pro-Display-Regular'),
    body: withFallback('SF-Pro-Text-Regular'),
    bodyBold: withFallback('SF-Pro-Display-Bold'),
    bodySemiBold: withFallback('SF-Pro-Display-Semibold'),
    bodyMedium: withFallback('SF-Pro-Display-Medium'),
  },
  fontFamily: {
    headingBlack: withFallback('SF-Pro-Display-Black'),
    headingBold: withFallback('SF-Pro-Display-Bold'),
    heading: withFallback('SF-Pro-Display-Bold'),
    body: withFallback('SF-Pro-Text-Regular'),
  },
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    display: 32,
    hero: 40,
  },
  lineHeights: {
    xs: 16,
    sm: 20,
    base: 24,
    lg: 26,
    xl: 28,
    xxl: 32,
    display: 40,
    hero: 48,
  },
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16, // rounded-2xl cards
  xl: 24,
  full: 9999,
} as const;

export const shadows = {
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  limeGlow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
} as const;

export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} as const;

export type Theme = typeof theme;
