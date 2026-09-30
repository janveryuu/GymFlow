import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';

export interface PrismProps {
  height?: number;
  baseWidth?: number;
  animationType?: 'rotate' | 'hover' | '3drotate';
  glow?: number;
  offset?: { x?: number; y?: number };
  noise?: number;
  transparent?: boolean;
  scale?: number;
  hueShift?: number;
  colorFrequency?: number;
  hoverStrength?: number;
  inertia?: number;
  bloom?: number;
  suspendWhenOffscreen?: boolean;
  timeScale?: number;
  lightMode?: boolean;
  tintColor?: string;
  gradientColor?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Native fallback for iOS / Android.
 * Renders an ambient luminous prism glow layer without crashing on browser-only WebGL APIs.
 */
export const PrismBackground: React.FC<PrismProps> = ({
  glow = 1,
  bloom = 1,
  offset,
  scale = 1.1,
  tintColor,
  gradientColor,
  style,
}) => {
  const offX = offset?.x ?? 0;
  const offY = -(offset?.y ?? 0); // In native, positive translateY is downwards
  const visualScale = Math.max(0.5, (scale ?? 1.1) / 1.8);

  const coreColor = tintColor || '#7A35FF';
  const prismColor = gradientColor || tintColor || '#00E5FF';

  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        styles.container,
        style,
      ]}
    >
      <View
        style={[
          styles.glowCore,
          {
            backgroundColor: coreColor,
            shadowColor: coreColor,
            transform: [{ translateX: offX }, { translateY: offY }, { scale: visualScale }],
            opacity: Math.min(1, 0.25 * glow * bloom),
          },
        ]}
      />
      <View
        style={[
          styles.glowPrism,
          {
            backgroundColor: prismColor,
            shadowColor: '#FFFFFF',
            transform: [{ translateX: offX }, { translateY: offY }, { scale: visualScale }],
            opacity: Math.min(1, 0.18 * glow),
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    zIndex: 0,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowCore: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#7A35FF',
    shadowColor: '#FF6BF5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 80,
    elevation: 4,
  },
  glowPrism: {
    position: 'absolute',
    width: 200,
    height: 240,
    borderRadius: 40,
    backgroundColor: '#00E5FF',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 50,
    elevation: 3,
  },
});

export default PrismBackground;
