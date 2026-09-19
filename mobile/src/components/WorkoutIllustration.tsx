import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, StyleProp, ViewStyle, ImageStyle } from 'react-native';
import { Dumbbell } from 'lucide-react-native';
import { getLocalWorkoutFrame } from '../assets/workoutAssetMap';
import { colors, borderRadius } from '../theme';

interface WorkoutIllustrationProps {
  slug?: string;
  frameIndex?: 1 | 2 | 3;
  size?: number;
  interactive?: boolean;
  autoPlay?: boolean;
  loopIntervalMs?: number;
  containerStyle?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  backgroundColor?: string;
}

/**
 * Contained monochrome workout illustration component.
 * Displays transparent line-art from @bryllim/workout-guide centered with generous padding.
 * Supports manual stepping (tap to advance frame) and auto-play looping (frames 1 -> 2 -> 3).
 */
export const WorkoutIllustration: React.FC<WorkoutIllustrationProps> = ({
  slug,
  frameIndex = 1,
  size = 140,
  interactive = false,
  autoPlay = false,
  loopIntervalMs = 750,
  containerStyle,
  imageStyle,
  backgroundColor = '#FFFFFF',
}) => {
  const [currentFrame, setCurrentFrame] = useState<1 | 2 | 3>(frameIndex);
  const [prevPropFrame, setPrevPropFrame] = useState(frameIndex);

  if (frameIndex !== prevPropFrame) {
    setPrevPropFrame(frameIndex);
    setCurrentFrame(frameIndex);
  }

  useEffect(() => {
    if (!autoPlay || !slug) return;
    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev === 3 ? 1 : ((prev + 1) as 1 | 2 | 3)));
    }, loopIntervalMs);

    return () => clearInterval(interval);
  }, [autoPlay, slug, loopIntervalMs]);

  const handlePress = () => {
    if (!interactive) return;
    setCurrentFrame((prev) => (prev === 3 ? 1 : ((prev + 1) as 1 | 2 | 3)));
  };

  const assetSource = slug ? getLocalWorkoutFrame(slug, currentFrame) : null;

  const flatContainerStyle = StyleSheet.flatten(containerStyle);
  const resolvedBg = (flatContainerStyle?.backgroundColor as string) || backgroundColor;
  const isLightBg =
    typeof resolvedBg === 'string' &&
    (resolvedBg.toLowerCase() === '#ffffff' ||
      resolvedBg.toLowerCase() === '#fff' ||
      resolvedBg.toLowerCase() === 'white' ||
      resolvedBg.toLowerCase() === '#f5f5f5' ||
      resolvedBg.toLowerCase() === '#fafafa' ||
      resolvedBg.toLowerCase().startsWith('rgba(255, 255, 255') ||
      resolvedBg.toLowerCase().startsWith('rgb(255, 255, 255'));

  const content = (
    <View
      style={[
        styles.wrapper,
        {
          width: size,
          height: size,
          backgroundColor,
          borderRadius: borderRadius.lg,
        },
        containerStyle,
      ]}
    >
      {assetSource ? (
        <Image
          source={assetSource}
          style={[
            styles.image,
            {
              width: size * 0.78,
              height: size * 0.78,
            },
            imageStyle,
          ]}
          resizeMode="contain"
          fadeDuration={0}
        />
      ) : (
        <View style={styles.fallback}>
          <Dumbbell size={size * 0.36} color={isLightBg ? '#0A0A0A' : colors.textSecondary} />
        </View>
      )}

      {interactive && (
        <View style={styles.dotsIndicator}>
          {[1, 2, 3].map((idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                currentFrame === idx
                  ? (isLightBg ? styles.dotActiveDark : styles.dotActive)
                  : (isLightBg ? styles.dotInactiveDark : styles.dotInactive),
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );

  if (interactive) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`Illustration frame ${currentFrame} of 3. Tap to advance.`}
        style={{ width: '100%', alignItems: 'center' }}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  image: {
    tintColor: '#0A0A0A', // Enforces strict monochrome line-art
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsIndicator: {
    position: 'absolute',
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 12,
  },
  dotInactive: {
    backgroundColor: colors.borderHighlight,
  },
  dotActiveDark: {
    backgroundColor: '#0A0A0A',
    width: 12,
  },
  dotInactiveDark: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
});
