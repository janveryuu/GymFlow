import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle, DimensionValue } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors, borderRadius } from '../theme';

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius: radius = borderRadius.md,
  style,
}) => {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.7, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius: radius },
        animatedStyle,
        style,
      ]}
    />
  );
};

export const WorkoutCardSkeleton: React.FC = () => (
  <View style={styles.cardSkeleton}>
    <Skeleton width="100%" height={160} borderRadius={borderRadius.lg} />
    <View style={styles.cardMeta}>
      <Skeleton width="70%" height={18} />
      <Skeleton width="40%" height={14} style={{ marginTop: 8 }} />
    </View>
  </View>
);

export const SessionCardSkeleton: React.FC = () => (
  <View style={styles.sessionSkeleton}>
    <View style={styles.sessionRow}>
      <Skeleton width={48} height={48} borderRadius={24} />
      <View style={{ marginLeft: 12, flex: 1 }}>
        <Skeleton width="60%" height={18} />
        <Skeleton width="40%" height={14} style={{ marginTop: 6 }} />
      </View>
    </View>
  </View>
);

export const NutritionCardSkeleton: React.FC = () => (
  <View style={styles.nutritionCardSkeleton}>
    <View style={styles.nutritionRingSkeletonWrap}>
      <Skeleton width={116} height={116} borderRadius={58} />
    </View>
    <View style={styles.nutritionContentSkeleton}>
      <Skeleton width="60%" height={18} borderRadius={borderRadius.sm} style={{ marginBottom: 12 }} />
      <Skeleton width="90%" height={13} borderRadius={borderRadius.sm} style={{ marginBottom: 8 }} />
      <Skeleton width="75%" height={13} borderRadius={borderRadius.sm} style={{ marginBottom: 14 }} />
      <Skeleton width="100%" height={34} borderRadius={17} />
    </View>
  </View>
);

export const BmiSectionSkeleton: React.FC = () => (
  <View style={styles.bmiSectionSkeleton}>
    {/* 3 Metric Cards */}
    <View style={styles.bmiCardsRow}>
      <View style={styles.bmiCardSkeleton}>
        <Skeleton width="50%" height={11} borderRadius={borderRadius.sm} style={{ marginBottom: 8 }} />
        <Skeleton width="70%" height={22} borderRadius={borderRadius.sm} style={{ marginBottom: 6 }} />
        <Skeleton width="30%" height={10} borderRadius={borderRadius.sm} />
      </View>
      <View style={styles.bmiCardSkeleton}>
        <Skeleton width="50%" height={11} borderRadius={borderRadius.sm} style={{ marginBottom: 8 }} />
        <Skeleton width="70%" height={22} borderRadius={borderRadius.sm} style={{ marginBottom: 6 }} />
        <Skeleton width="30%" height={10} borderRadius={borderRadius.sm} />
      </View>
      <View style={styles.bmiCardSkeleton}>
        <Skeleton width="50%" height={11} borderRadius={borderRadius.sm} style={{ marginBottom: 8 }} />
        <Skeleton width="70%" height={22} borderRadius={borderRadius.sm} style={{ marginBottom: 6 }} />
        <Skeleton width="30%" height={10} borderRadius={borderRadius.sm} />
      </View>
    </View>

    {/* Slider Track */}
    <View style={styles.bmiSliderSkeleton}>
      <Skeleton width="100%" height={8} borderRadius={4} style={{ marginBottom: 10 }} />
      <View style={styles.bmiLabelsRowSkeleton}>
        <Skeleton width="20%" height={10} borderRadius={borderRadius.sm} />
        <Skeleton width="20%" height={10} borderRadius={borderRadius.sm} />
        <Skeleton width="20%" height={10} borderRadius={borderRadius.sm} />
        <Skeleton width="20%" height={10} borderRadius={borderRadius.sm} />
      </View>
    </View>
  </View>
);

export const FeaturesSectionSkeleton: React.FC = () => (
  <View style={styles.featuresSectionSkeleton}>
    <Skeleton width={110} height={20} borderRadius={borderRadius.sm} style={{ marginBottom: 14 }} />
    <View style={styles.featuresGridSkeleton}>
      {[0, 1, 2, 3, 4, 5].map((key) => (
        <View key={key} style={styles.featureCardSkeleton}>
          <Skeleton width={32} height={32} borderRadius={16} style={{ marginBottom: 10 }} />
          <Skeleton width="70%" height={12} borderRadius={borderRadius.sm} style={{ marginBottom: 6 }} />
          <Skeleton width="45%" height={10} borderRadius={borderRadius.sm} />
        </View>
      ))}
    </View>
  </View>
);

export const DashboardSkeleton: React.FC = () => (
  <View style={styles.dashboardSkeletonContainer}>
    <NutritionCardSkeleton />
    <BmiSectionSkeleton />
    <FeaturesSectionSkeleton />
  </View>
);

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.surfaceElevated,
  },
  cardSkeleton: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardMeta: {
    marginTop: 12,
  },
  sessionSkeleton: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nutritionCardSkeleton: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  nutritionRingSkeletonWrap: {
    width: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nutritionContentSkeleton: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  bmiSectionSkeleton: {
    marginBottom: 20,
  },
  bmiCardsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  bmiCardSkeleton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bmiSliderSkeleton: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  bmiLabelsRowSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featuresSectionSkeleton: {
    marginBottom: 24,
  },
  featuresGridSkeleton: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  featureCardSkeleton: {
    width: '31%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardSkeletonContainer: {
    width: '100%',
  },
});
