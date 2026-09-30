import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Flame } from '../components/icons';
import * as Haptics from 'expo-haptics';
import { colors, typography, borderRadius, spacing } from '../theme';
import { DarkVeil } from '../components/DarkVeil';

interface StreakScreenProps {
  navigation: any;
}

const WEEK_DAYS = [
  { day: 'Su', full: 'Sunday', active: true },
  { day: 'Mo', full: 'Monday', active: true },
  { day: 'Tu', full: 'Tuesday', active: true },
  { day: 'We', full: 'Wednesday', active: false },
  { day: 'Th', full: 'Thursday', active: false },
  { day: 'Fr', full: 'Friday', active: false },
  { day: 'Sa', full: 'Saturday', active: false },
];

export const StreakScreen: React.FC<StreakScreenProps> = ({ navigation }) => {
  const [streakCount] = useState(14);

  const handleBack = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Animated Dark Veil Background */}
      <DarkVeil
        speed={0.35}
        warpAmount={0.25}
        noiseIntensity={0.01}
        orangeMode={true}
      />

      {/* Top Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Daily Streak</Text>
        <View style={styles.navPlaceholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Flame Section */}
        <View style={styles.heroSection}>
          {/* Animated Flame GIF at Peak - No Container */}
          <Image
            source={require('../../assets/gif/Fire Streak Orange.gif')}
            style={styles.heroFlameGif}
            resizeMode="contain"
          />

          {/* Streak Number and Headline */}
          <Text style={styles.streakNumber}>{streakCount}</Text>
          <Text style={styles.streakTitle}>Days Streak!</Text>
          <Text style={styles.streakSubtitle}>
            You&apos;re on fire! Keep working out every day to keep your flame burning strong.
          </Text>
        </View>

        {/* 3-Stat Metric Summary Banner */}
        <View style={styles.statsBanner}>
          <View style={styles.statColumn}>
            <Text style={styles.statValue}>Nov 25, 2025</Text>
            <Text style={styles.statLabel}>Streak started</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statColumn}>
            <Text style={styles.statValue}>Top 10%</Text>
            <Text style={styles.statLabel}>Athlete Rank</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statColumn}>
            <Text style={styles.statValue}>95</Text>
            <Text style={styles.statLabel}>Max streak</Text>
          </View>
        </View>

        {/* Week Days Tracker Carousel / Row */}
        <View style={styles.weekCalendarSection}>
          <View style={styles.weekDaysRow}>
            {WEEK_DAYS.map((item) => {
              const isToday = item.day === 'Tu';
              return (
                <View key={item.day} style={styles.dayCol}>
                  {/* Weekday Name Label */}
                  <Text
                    style={[
                      styles.dayNameText,
                      item.active && styles.dayNameTextActive,
                      isToday && styles.dayNameTextToday,
                    ]}
                  >
                    {item.day}
                  </Text>

                  {/* Vertical Day Capsule Pill */}
                  <View
                    style={[
                      styles.dayCapsule,
                      item.active ? styles.dayCapsuleActive : styles.dayCapsuleInactive,
                      isToday && styles.dayCapsuleToday,
                    ]}
                  >
                    {item.active ? (
                      <Image
                        source={require('../../assets/gif/Fire Streak Orange.gif')}
                        style={styles.capsuleFlameGif}
                        resizeMode="contain"
                      />
                    ) : (
                      <Flame size={20} color="rgba(255, 255, 255, 0.14)" />
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default StreakScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'relative',
    overflow: 'hidden',
  },
  navBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Platform.OS === 'web' ? 'rgba(22, 22, 26, 0.65)' : '#161616',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
    } as any : {}),
  },
  navTitle: {
    fontFamily: typography.fonts.headingBold,
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  navPlaceholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },

  // Hero section with Flame
  heroSection: {
    alignItems: 'center',
    position: 'relative',
    marginTop: 14,
    marginBottom: 28,
  },
  heroFlameGif: {
    width: 140,
    height: 140,
    zIndex: 1,
    marginTop: 4,
    marginBottom: 6,
  },
  capsuleFlameGif: {
    width: 26,
    height: 26,
  },
  streakNumber: {
    fontFamily: typography.fonts.headingBlack || typography.fonts.headingBold,
    fontSize: 64,
    fontWeight: '900',
    color: '#FF6B00',
    lineHeight: 70,
    letterSpacing: -1.5,
    textAlign: 'center',
  },
  streakTitle: {
    fontFamily: typography.fonts.headingBold,
    fontSize: 26,
    fontWeight: '800',
    color: '#FF7A00',
    letterSpacing: -0.4,
    marginBottom: 10,
    textAlign: 'center',
  },
  streakSubtitle: {
    fontFamily: typography.fonts.body,
    fontSize: 14.5,
    color: '#A1A1A6',
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 21,
  },

  // 3-Stat Metric Row
  statsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Platform.OS === 'web' ? 'rgba(18, 18, 22, 0.65)' : '#121214',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 12,
    marginBottom: 32,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 6,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(20px) saturate(190%)',
      WebkitBackdropFilter: 'blur(20px) saturate(190%)',
    } as any : {}),
  },
  statColumn: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: typography.fonts.headingBold,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  statLabel: {
    fontFamily: typography.fonts.body,
    fontSize: 11,
    color: '#71717A',
    fontWeight: '500',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },

  // Week Days Tracker Row
  weekCalendarSection: {
    paddingHorizontal: 2,
    marginBottom: 10,
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayCol: {
    alignItems: 'center',
    gap: 8,
  },
  dayNameText: {
    fontFamily: typography.fonts.headingBold,
    fontSize: 13,
    fontWeight: '600',
    color: '#52525B',
  },
  dayNameTextActive: {
    color: '#D4D4D8',
  },
  dayNameTextToday: {
    color: '#FF7A00',
    fontWeight: '800',
  },
  dayCapsule: {
    width: 44,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  dayCapsuleActive: {
    backgroundColor: '#1C130D',
    borderColor: 'rgba(255, 122, 0, 0.4)',
  },
  dayCapsuleToday: {
    backgroundColor: '#26180E',
    borderColor: '#FF7A00',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  dayCapsuleInactive: {
    backgroundColor: '#121214',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
});
