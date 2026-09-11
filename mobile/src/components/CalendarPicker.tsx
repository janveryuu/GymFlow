import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { colors, typography, borderRadius, spacing } from '../theme';

interface CalendarPickerProps {
  selectedDate?: Date;
  onSelectDate: (date: Date) => void;
  maxDate?: Date;
  minDate?: Date;
  style?: any;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const CalendarPicker: React.FC<CalendarPickerProps> = ({
  selectedDate,
  onSelectDate,
  maxDate = new Date(),
  minDate = new Date(1940, 0, 1),
  style,
}) => {
  const initialDate = selectedDate || new Date(2000, 0, 15);
  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth());
  const [selectorMode, setSelectorMode] = useState<'calendar' | 'year' | 'month'>('calendar');

  const daysInMonth = useMemo(() => {
    return new Date(viewYear, viewMonth + 1, 0).getDate();
  }, [viewYear, viewMonth]);

  const firstDayIndex = useMemo(() => {
    return new Date(viewYear, viewMonth, 1).getDay();
  }, [viewYear, viewMonth]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    const nextDate = new Date(viewYear, viewMonth + 1, 1);
    if (nextDate > maxDate) return;

    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const newDate = new Date(viewYear, viewMonth, day);
    onSelectDate(newDate);
  };

  const yearsList = useMemo(() => {
    const currentYear = maxDate.getFullYear();
    const startYear = minDate.getFullYear();
    const years: number[] = [];
    for (let y = currentYear; y >= startYear; y--) {
      years.push(y);
    }
    return years;
  }, [maxDate, minDate]);

  return (
    <View style={[styles.container, style]}>
      {/* Month & Year Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => setSelectorMode((prev) => (prev === 'month' ? 'calendar' : 'month'))}
          style={styles.headerTitleBtn}
        >
          <Text style={styles.monthText}>{MONTH_NAMES[viewMonth]}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setSelectorMode((prev) => (prev === 'year' ? 'calendar' : 'year'))}
          style={styles.headerYearBtn}
        >
          <Text style={styles.yearText}>{viewYear}</Text>
        </TouchableOpacity>

        <View style={styles.navControls}>
          <TouchableOpacity
            onPress={handlePrevMonth}
            style={styles.navBtn}
            accessibilityLabel="Previous month"
          >
            <ChevronLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleNextMonth}
            style={styles.navBtn}
            accessibilityLabel="Next month"
          >
            <ChevronRight size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Mode 1: Year Selector */}
      {selectorMode === 'year' && (
        <View style={styles.selectorModal}>
          <Text style={styles.selectorSubtitle}>Select Year</Text>
          <ScrollView style={styles.yearsScroll} contentContainerStyle={styles.yearsGrid}>
            {yearsList.map((year) => {
              const isSelected = year === viewYear;
              return (
                <TouchableOpacity
                  key={year}
                  style={[styles.yearItem, isSelected && styles.yearItemSelected]}
                  onPress={() => {
                    setViewYear(year);
                    setSelectorMode('calendar');
                  }}
                >
                  <Text style={[styles.yearItemText, isSelected && styles.yearItemTextSelected]}>
                    {year}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Mode 2: Month Selector */}
      {selectorMode === 'month' && (
        <View style={styles.selectorModal}>
          <Text style={styles.selectorSubtitle}>Select Month</Text>
          <View style={styles.monthsGrid}>
            {MONTH_NAMES.map((name, index) => {
              const isSelected = index === viewMonth;
              return (
                <TouchableOpacity
                  key={name}
                  style={[styles.monthItem, isSelected && styles.monthItemSelected]}
                  onPress={() => {
                    setViewMonth(index);
                    setSelectorMode('calendar');
                  }}
                >
                  <Text style={[styles.monthItemText, isSelected && styles.monthItemTextSelected]}>
                    {name.slice(0, 3)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Mode 3: Normal Day Grid */}
      {selectorMode === 'calendar' && (
        <>
          {/* Day of week labels */}
          <View style={styles.weekRow}>
            {DAYS_OF_WEEK.map((d) => (
              <Text key={d} style={styles.weekLabel}>
                {d}
              </Text>
            ))}
          </View>

          {/* Day Grid */}
          <View style={styles.daysGrid}>
            {/* Blank offset days */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <View key={`empty-${i}`} style={styles.dayCell} />
            ))}

            {/* Days of current month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isSelected =
                selectedDate &&
                selectedDate.getDate() === day &&
                selectedDate.getMonth() === viewMonth &&
                selectedDate.getFullYear() === viewYear;

              const cellDate = new Date(viewYear, viewMonth, day);
              const isFuture = cellDate > maxDate;

              return (
                <TouchableOpacity
                  key={`day-${day}`}
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                    isFuture && styles.dayCellDisabled,
                  ]}
                  onPress={() => !isFuture && handleSelectDay(day)}
                  disabled={isFuture}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isSelected && styles.dayTextSelected,
                      isFuture && styles.dayTextDisabled,
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerTitleBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthText: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fonts.headingBold,
    color: colors.text,
  },
  headerYearBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginLeft: spacing.xs,
  },
  yearText: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fonts.headingBold,
    color: colors.primary,
  },
  navControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  navBtn: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginLeft: spacing.xs,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.xs,
  },
  weekLabel: {
    width: 40,
    textAlign: 'center',
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.headingMedium,
    color: colors.textMuted,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    marginVertical: 2,
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
  },
  dayCellDisabled: {
    opacity: 0.25,
  },
  dayText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.headingMedium,
    color: colors.text,
  },
  dayTextSelected: {
    color: colors.textInverse,
    fontFamily: typography.fonts.headingBold,
  },
  dayTextDisabled: {
    color: colors.textMuted,
  },
  selectorModal: {
    height: 220,
    paddingVertical: spacing.xs,
  },
  selectorSubtitle: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.headingSemiBold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  yearsScroll: {
    flex: 1,
  },
  yearsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  yearItem: {
    width: '23%',
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  yearItemSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  yearItemText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.headingMedium,
    color: colors.text,
  },
  yearItemTextSelected: {
    color: colors.textInverse,
    fontFamily: typography.fonts.headingBold,
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  monthItem: {
    width: '31%',
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  monthItemSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  monthItemText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.headingMedium,
    color: colors.text,
  },
  monthItemTextSelected: {
    color: colors.textInverse,
    fontFamily: typography.fonts.headingBold,
  },
});
