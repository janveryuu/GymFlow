import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { DarkVeil } from '../../components/DarkVeil';
import { Zap } from '../../components/icons';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { GlassmorphismSlider } from '../../components/GlassmorphismSlider';
import { useAuthStore } from '../../store/authStore';
import { useDevMockStore } from '../../store/devMockStore';
import { apiClient, setAuthToken } from '../../api/client';

interface WelcomeScreenProps {
  navigation: any;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  const [isNavigating, setIsNavigating] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);

  // Smooth entrance animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const heroFadeAnim = useRef(new Animated.Value(0)).current;
  const bottomSlideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(heroFadeAnim, {
        toValue: 1,
        duration: 600,
        delay: 150,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(bottomSlideAnim, {
        toValue: 0,
        duration: 550,
        delay: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, [fadeAnim, slideAnim, heroFadeAnim, bottomSlideAnim]);

  const handleStartOnboarding = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Ignore
    }

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.ease),
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => {
      navigation.navigate('Onboarding');
      setIsNavigating(false);
      fadeAnim.setValue(1);
    });
  };

  const handleGoToLogin = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Ignore
    }
    navigation.navigate('Login');
  };

  const handleDevDirectHome = async () => {
    try {
      const response = await apiClient.post(
        '/api/v1/auth/login',
        {
          email: 'jane.doe@gymflow.test',
          password: 'Password123!',
        },
        { timeout: 2500 }
      );
      const { token, user } = response.data;
      await setAuth(token, user, false);
    } catch {
      useDevMockStore.getState().setMockEnabled(true);
      const fallbackUser = {
        id: 1,
        name: 'Jane Doe',
        email: 'jane.doe@gymflow.test',
        role: 'member' as const,
        must_change_password: false,
      };
      setAuthToken('dev-offline-token-gymflow');
      await setAuth('dev-offline-token-gymflow', fallbackUser, false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Luminous Animated Dark Veil Background (Silk Folds in Pure White - Matching Homescreen) */}
      <DarkVeil
        speed={0.35}
        warpAmount={0.25}
        noiseIntensity={0.01}
        whiteMode={true}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* Top bar with brand & Dev Bypass pill */}
        <Animated.View
          style={[
            styles.topBar,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.brandRow}>
            <Image
              source={require('../../../assets/gymflow-wordmark.png')}
              style={styles.wordmark}
              tintColor="#FFFFFF"
              resizeMode="contain"
            />
          </View>

          <TouchableOpacity
            onPress={handleDevDirectHome}
            style={styles.devBadge}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Dev Mode quick bypass to home"
          >
            <Zap size={11} color="#FFD600" style={{ marginRight: 4 }} />
            <Text style={styles.devBadgeText}>SKIP</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Motivational Gym App Hero Content */}
        <View style={styles.content}>
          <Animated.View
            style={[
              styles.quoteBlock,
              {
                opacity: heroFadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.heading}>
              Transform your body.{'\n'}
              Elevate your mind.
            </Text>

            <Text style={styles.subheading}>
              Consistency is where champions are forged. Step forward, put in the work, and unleash your ultimate potential.
            </Text>
          </Animated.View>

          {/* Spacer pushing controls into dark bottom half */}
          <View style={{ flex: 1 }} />

          {/* Interactive Slide to Get Started */}
          <Animated.View
            style={[
              styles.bottomSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: bottomSlideAnim }],
              },
            ]}
          >
            <Text style={styles.sliderInstruction}>
              Slide right to begin your onboarding
            </Text>

            <GlassmorphismSlider
              label="Slide to Get Started"
              completedLabel="Starting Onboarding..."
              isLoading={isNavigating}
              onComplete={handleStartOnboarding}
            />

            {/* Already a member shortcut */}
            <TouchableOpacity
              style={styles.loginLink}
              onPress={handleGoToLogin}
              activeOpacity={0.8}
            >
              <Text style={styles.loginLinkText}>
                Already a member? <Text style={styles.loginLinkHighlight}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordmark: {
    height: 38,
    width: 175,
  },
  devBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: borderRadius.md,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  devBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'space-between',
  },
  quoteBlock: {
    marginTop: spacing.xxl,
    paddingRight: spacing.md,
  },
  heading: {
    fontSize: 34,
    lineHeight: 42,
    fontFamily: typography.fonts.headingBold,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.6,
    marginBottom: spacing.md,
  },
  subheading: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fonts.body,
    lineHeight: 23,
    color: '#A1A1AA',
    fontWeight: '400',
    maxWidth: 320,
  },
  bottomSection: {
    paddingBottom: spacing.xl,
  },
  sliderInstruction: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.body,
    color: 'rgba(255, 255, 255, 0.50)',
    textAlign: 'center',
    marginBottom: spacing.xs,
    letterSpacing: 0.3,
  },
  loginLink: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  loginLinkText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.body,
    color: '#8A8A8E',
  },
  loginLinkHighlight: {
    fontFamily: typography.fonts.headingBold,
    color: '#FFD600',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
