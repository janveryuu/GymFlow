/**
 * Scanner Viewfinder Overlay Component
 * Renders the targeting frame, alignment corners, grid lines,
 * laser scanning sweep animation, and top toolbar.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import { ArrowLeft, Zap, ZapOff } from 'lucide-react-native';
import { colors, typography, borderRadius } from '../../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIEWFINDER_WIDTH = Math.min(SCREEN_WIDTH - 64, 300);
const VIEWFINDER_HEIGHT = 200;
const CORNER_SIZE = 24;
const CORNER_THICKNESS = 3;

export interface ScannerOverlayProps {
  torchOn: boolean;
  onToggleTorch: () => void;
  onClose: () => void;
  title?: string;
}

export const ScannerOverlay: React.FC<ScannerOverlayProps> = ({
  torchOn,
  onToggleTorch,
  onClose,
  title = 'Barcode Scanner',
}) => {
  // Laser vertical sweep animation value: 0 -> VIEWFINDER_HEIGHT
  const laserAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const sweepAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(laserAnim, {
          toValue: VIEWFINDER_HEIGHT - 6,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(laserAnim, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    sweepAnimation.start();
    return () => sweepAnimation.stop();
  }, [laserAnim]);

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Top Controls Toolbar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.circleButton}
          onPress={onClose}
          accessibilityLabel="Back"
          accessibilityRole="button"
        >
          <ArrowLeft color={colors.text} size={22} />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={styles.titleText}>{title}</Text>
        </View>

        <TouchableOpacity
          style={[styles.circleButton, torchOn && styles.circleButtonActive]}
          onPress={onToggleTorch}
          accessibilityLabel={torchOn ? 'Turn flashlight off' : 'Turn flashlight on'}
          accessibilityRole="button"
        >
          {torchOn ? (
            <Zap color={colors.yellow} size={20} fill={colors.yellow} />
          ) : (
            <ZapOff color={colors.textSecondary} size={20} />
          )}
        </TouchableOpacity>
      </View>

      {/* Viewfinder Target Window */}
      <View style={styles.centerArea} pointerEvents="none">
        <View style={styles.viewfinder}>
          {/* 4 Framing Corner Brackets */}
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />

          {/* Alignment Crosshair / Grid Overlay */}
          <View style={styles.gridHorizontal} />
          <View style={styles.gridVertical} />

          {/* Animated Laser Scan Line */}
          <Animated.View
            style={[
              styles.laserLine,
              {
                transform: [{ translateY: laserAnim }],
              },
            ]}
          >
            <View style={styles.laserGlow} />
          </Animated.View>
        </View>
      </View>

      {/* Bottom Attribution */}
      <View style={styles.bottomBar} pointerEvents="none">
        <Text style={styles.databaseFooter}>Powered by Open Food Facts (Free & Open Source)</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
    zIndex: 10,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  titleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fonts.headingBold,
    color: colors.text,
    letterSpacing: 0.3,
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(18, 18, 20, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleButtonActive: {
    backgroundColor: 'rgba(255, 214, 0, 0.2)',
    borderColor: colors.yellow,
  },
  centerArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinder: {
    width: VIEWFINDER_WIDTH,
    height: VIEWFINDER_HEIGHT,
    position: 'relative',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: colors.primary,
    borderWidth: CORNER_THICKNESS,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: borderRadius.sm,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: borderRadius.sm,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: borderRadius.sm,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: borderRadius.sm,
  },
  gridHorizontal: {
    position: 'absolute',
    top: VIEWFINDER_HEIGHT / 2,
    left: 16,
    right: 16,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  gridVertical: {
    position: 'absolute',
    left: VIEWFINDER_WIDTH / 2,
    top: 16,
    bottom: 16,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  laserLine: {
    position: 'absolute',
    left: 6,
    right: 6,
    height: 2,
    backgroundColor: colors.cyan,
  },
  laserGlow: {
    position: 'absolute',
    top: -2,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: colors.cyan,
    opacity: 0.45,
  },
  bottomBar: {
    paddingBottom: 28,
    alignItems: 'center',
  },
  databaseFooter: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    letterSpacing: 0.2,
  },
});
