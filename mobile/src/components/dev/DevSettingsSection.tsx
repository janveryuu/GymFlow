import React from 'react';
import { View, Text, Switch, TouchableOpacity, StyleSheet } from 'react-native';
import { useDevMockStore, ForcedErrorType } from '../../store/devMockStore';
import { colors } from '../../theme';

export const DevSettingsSection: React.FC = () => {
  const {
    isMockEnabled,
    latencyMode,
    forcedError,
    setMockEnabled,
    setLatencyMode,
    setForcedError,
    resetMockData,
  } = useDevMockStore();

  if (!__DEV__) return null;

  const errors: ForcedErrorType[] = ['none', '401', '404', '409', '422', 'timeout', '500'];

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>🛠️ DEV MOCK CONTROLS</Text>

      <View style={styles.row}>
        <Text style={styles.label}>MSW Mock Mode</Text>
        <Switch
          value={isMockEnabled}
          onValueChange={(val) => setMockEnabled(val)}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.background}
        />
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Realistic Latency (300-800ms)</Text>
        <Switch
          value={latencyMode === 'realistic'}
          onValueChange={(val) => setLatencyMode(val ? 'realistic' : 'instant')}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.background}
        />
      </View>

      <Text style={[styles.label, { marginTop: 12 }]}>Force Error Simulation:</Text>
      <View style={styles.pillContainer}>
        {errors.map((err) => (
          <TouchableOpacity
            key={err}
            style={[styles.pill, forcedError === err && styles.pillActive]}
            onPress={() => setForcedError(err)}
          >
            <Text style={[styles.pillText, forcedError === err && styles.pillTextActive]}>
              {err.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.resetButton} onPress={resetMockData}>
        <Text style={styles.resetButtonText}>Reset Mock Database & Idempotency Cache</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  heading: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 16,
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  label: {
    color: colors.text,
    fontSize: 14,
  },
  pillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  pillTextActive: {
    color: colors.textInverse,
  },
  resetButton: {
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    borderColor: colors.border,
    borderWidth: 1,
  },
  resetButtonText: {
    color: colors.error,
    fontSize: 13,
    fontWeight: '600',
  },
});
