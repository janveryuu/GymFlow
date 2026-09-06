/**
 * GymFlow Mobile Light-First Design System Tokens.
 * Based on clean white/off-white with strict black/white/grayscale elements.
 */

export const colors = {
  // Backgrounds
  background: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceElevated: '#F5F5F5',
  surfaceHighlight: '#EFEFEF',

  // Borders
  border: '#E5E5E5',
  borderSubtle: '#F0F0F0',
  borderHighlight: '#D4D4D4',

  // Accent & Brand (Monochrome black)
  primary: '#0A0A0A',
  primaryMuted: 'rgba(10, 10, 10, 0.15)',
  primaryGlow: 'rgba(10, 10, 10, 0.25)',

  // Text
  text: '#0A0A0A',
  textSecondary: '#6B6B6B',
  textMuted: '#8E8E8E',
  textInverse: '#FFFFFF',

  // Status & Semantic
  success: '#30D158',
  warning: '#FF9F0A',
  warningAmber: '#FFB800',
  error: '#FF453A',
  errorMuted: 'rgba(255, 69, 58, 0.15)',
  info: '#64D2FF',
} as const;

export const typography = {
  fonts: {
    headingBlack: 'Archivo_900Black',
    headingBold: 'Archivo_700Bold',
    headingSemiBold: 'Archivo_600SemiBold',
    headingMedium: 'Archivo_500Medium',
    headingRegular: 'Archivo_400Regular',
    body: undefined,
  },
  fontFamily: {
    headingBlack: 'Archivo_900Black',
    headingBold: 'Archivo_700Bold',
    heading: 'Archivo_700Bold',
    body: undefined,
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
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  limeGlow: { // Kept name for compatibility, but it's now black glow
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
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
