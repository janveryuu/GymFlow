import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';

export interface DarkVeilProps {
  hueShift?: number;
  noiseIntensity?: number;
  scanlineIntensity?: number;
  speed?: number;
  scanlineFrequency?: number;
  warpAmount?: number;
  resolutionScale?: number;
  lightMode?: boolean;
  whiteMode?: boolean;
  cyanMode?: boolean;
  orangeMode?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Native fallback for iOS / Android.
 * Renders an ambient luminous silk veil glow without crashing on browser-only WebGL APIs.
 */
export const DarkVeil: React.FC<DarkVeilProps> = ({ cyanMode = false, orangeMode = false, style }) => {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.container, style]}>
      <View
        style={[
          styles.veilWave1,
          cyanMode && styles.veilWave1Cyan,
          orangeMode && styles.veilWave1Orange,
        ]}
      />
      <View
        style={[
          styles.veilWave2,
          cyanMode && styles.veilWave2Cyan,
          orangeMode && styles.veilWave2Orange,
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
  veilWave1: {
    position: 'absolute',
    top: -60,
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 70,
    elevation: 2,
  },
  veilWave1Cyan: {
    backgroundColor: 'rgba(0, 229, 255, 0.09)',
    shadowColor: '#00E5FF',
    shadowOpacity: 0.28,
  },
  veilWave1Orange: {
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
    shadowColor: '#FF6B00',
    shadowOpacity: 0.35,
  },
  veilWave2: {
    position: 'absolute',
    top: 120,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 50,
    elevation: 1,
  },
  veilWave2Cyan: {
    backgroundColor: 'rgba(0, 229, 255, 0.06)',
    shadowColor: '#00E5FF',
    shadowOpacity: 0.22,
  },
  veilWave2Orange: {
    backgroundColor: 'rgba(255, 140, 0, 0.08)',
    shadowColor: '#FF8C00',
    shadowOpacity: 0.28,
  },
});

export default DarkVeil;
