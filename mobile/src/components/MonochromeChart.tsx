import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Svg, {
  Rect,
  Path,
  Line,
  Text as SvgText,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Circle as SvgCircle,
} from 'react-native-svg';
import { colors, typography, borderRadius, spacing } from '../theme';
import type { ProgressChartData } from '../types';

interface MonochromeChartProps {
  data: ProgressChartData[];
}

export const MonochromeChart: React.FC<MonochromeChartProps> = ({ data }) => {
  const [metric, setMetric] = useState<'calories' | 'duration'>('calories');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - spacing.md * 4;
  const chartHeight = 160;
  const paddingBottom = 28;
  const paddingTop = 24;
  const usableHeight = chartHeight - paddingBottom - paddingTop;

  if (!data || data.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Activity Trends</Text>
            <Text style={styles.subtitle}>No activity recorded in this period</Text>
          </View>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Complete workouts to visualize daily volume and calorie trends.</Text>
        </View>
      </View>
    );
  }

  const chartData = data;

  const values = chartData.map((d) => (metric === 'calories' ? d.calories : d.duration_minutes));
  const rawMax = Math.max(...values, 1);
  const maxVal = metric === 'calories' ? Math.ceil(rawMax / 100) * 100 || 500 : Math.ceil(rawMax / 15) * 15 || 60;

  const count = chartData.length;
  const stepX = chartWidth / count;
  const barWidth = Math.max(14, stepX * 0.42);

  // Line path points calculation for trend view
  const points = chartData.map((d, i) => {
    const val = metric === 'calories' ? d.calories : d.duration_minutes;
    const x = i * stepX + stepX / 2;
    const y = paddingTop + usableHeight - (val / maxVal) * usableHeight;
    return { x, y, val, label: d.label };
  });

  const linePath = points.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1]?.x ?? 0} ${paddingTop + usableHeight} L ${points[0]?.x ?? 0} ${paddingTop + usableHeight} Z`
    : '';

  const activePoint = selectedIndex !== null ? points[selectedIndex] : null;

  return (
    <View style={styles.container}>
      {/* Header & Metric Switcher */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Activity Trends</Text>
          <Text style={styles.subtitle}>
            {activePoint
              ? `${activePoint.label}: ${activePoint.val} ${metric === 'calories' ? 'kcal' : 'mins'}`
              : `Tap any point for details`}
          </Text>
        </View>

        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.togglePill, metric === 'calories' && styles.togglePillActive]}
            onPress={() => {
              setMetric('calories');
              setSelectedIndex(null);
            }}
            accessibilityRole="button"
            accessibilityLabel="Calories burned view"
          >
            <Text style={[styles.toggleText, metric === 'calories' && styles.toggleTextActive]}>
              Calories
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.togglePill, metric === 'duration' && styles.togglePillActive]}
            onPress={() => {
              setMetric('duration');
              setSelectedIndex(null);
            }}
            accessibilityRole="button"
            accessibilityLabel="Duration view"
          >
            <Text style={[styles.toggleText, metric === 'duration' && styles.toggleTextActive]}>
              Minutes
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* SVG Chart Surface */}
      <View style={styles.chartSurface}>
        <Svg width={chartWidth} height={chartHeight}>
          <Defs>
            <SvgLinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#0A0A0A" stopOpacity="0.18" />
              <Stop offset="100%" stopColor="#0A0A0A" stopOpacity="0.0" />
            </SvgLinearGradient>
          </Defs>

          {/* Horizontal Gridlines */}
          {[0, 0.5, 1].map((ratio) => {
            const y = paddingTop + usableHeight * (1 - ratio);
            return (
              <Line
                key={ratio}
                x1={0}
                y1={y}
                x2={chartWidth}
                y2={y}
                stroke={colors.borderSubtle}
                strokeWidth={1}
                strokeDasharray="3 3"
              />
            );
          })}

          {/* Area under curve */}
          {areaPath ? <Path d={areaPath} fill="url(#areaGradient)" /> : null}

          {/* Bars or Line Points */}
          {chartData.map((d, i) => {
            const val = metric === 'calories' ? d.calories : d.duration_minutes;
            const barH = (val / maxVal) * usableHeight;
            const x = i * stepX + (stepX - barWidth) / 2;
            const y = paddingTop + usableHeight - barH;
            const isSelected = selectedIndex === i;

            return (
              <Rect
                key={`bar-${d.date}-${i}`}
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(2, barH)}
                rx={4}
                ry={4}
                fill={isSelected ? '#0A0A0A' : 'rgba(10, 10, 10, 0.25)'}
                onPress={() => setSelectedIndex(i)}
              />
            );
          })}

          {/* Trend Line */}
          {linePath ? (
            <Path
              d={linePath}
              fill="none"
              stroke="#0A0A0A"
              strokeWidth={2}
              strokeLinecap="round"
            />
          ) : null}

          {/* Data Points */}
          {points.map((pt, i) => (
            <SvgCircle
              key={`pt-${i}`}
              cx={pt.x}
              cy={pt.y}
              r={selectedIndex === i ? 5 : 3.5}
              fill={selectedIndex === i ? '#0A0A0A' : '#FFFFFF'}
              stroke="#0A0A0A"
              strokeWidth={2}
              onPress={() => setSelectedIndex(i)}
            />
          ))}

          {/* X Axis Labels */}
          {chartData.map((d, i) => {
            const x = i * stepX + stepX / 2;
            const y = chartHeight - 8;
            const isSelected = selectedIndex === i;
            return (
              <SvgText
                key={`lbl-${d.date}-${i}`}
                x={x}
                y={y}
                textAnchor="middle"
                fontSize={10}
                fill={isSelected ? colors.text : colors.textMuted}
                onPress={() => setSelectedIndex(i)}
              >
                {d.label}
              </SvgText>
            );
          })}
        </Svg>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: typography.fonts.headingBold,
    fontSize: typography.sizes.base,
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.full,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  togglePill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  togglePillActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  toggleTextActive: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  chartSurface: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  emptyContainer: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  emptyText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
