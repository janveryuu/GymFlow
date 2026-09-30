import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform, ViewStyle, TextStyle } from 'react-native';

export interface TypewriterPlaceholderProps {
  prompts?: string[];
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseDelay?: number;
  initialDelay?: number;
  textColor?: string;
  cursorColor?: string;
  fontSize?: number;
  fontWeight?: '400' | '500' | '600' | '700';
  isFocused?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const DEFAULT_PROMPTS = [
  'Ask Alab AI…',
  'Ask how much protein I need today…',
  'Ask for a 4-day muscle split…',
  'Ask how to improve my squat depth…',
  'Ask for healthy pre-workout meal ideas…',
  'Ask to analyze my workout progress…',
];

export const TypewriterPlaceholder: React.FC<TypewriterPlaceholderProps> = ({
  prompts = DEFAULT_PROMPTS,
  typingSpeed = 65,
  deletingSpeed = 28,
  pauseDelay = 2400,
  initialDelay = 500,
  textColor = 'rgba(255, 255, 255, 0.65)',
  cursorColor = '#FFFFFF',
  fontSize = 14,
  fontWeight = '400',
  isFocused = false,
  style,
  textStyle,
}) => {
  const [promptIndex, setPromptIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [phase, setPhase] = useState<'initial_delay' | 'typing' | 'pausing' | 'deleting'>('initial_delay');

  // Pulsing cursor animation
  const cursorOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          toValue: 0.15,
          duration: 480,
          useNativeDriver: true,
        }),
        Animated.timing(cursorOpacity, {
          toValue: 1,
          duration: 480,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [cursorOpacity]);

  // Typing state machine with realistic human delay timing
  useEffect(() => {
    // If focused, freeze animation so native cursor and input take precedence cleanly
    if (isFocused) return;

    const currentPrompt = prompts[promptIndex] || prompts[0] || 'Ask Alab AI…';
    let timer: ReturnType<typeof setTimeout>;

    switch (phase) {
      case 'initial_delay': {
        timer = setTimeout(() => {
          setPhase('typing');
        }, initialDelay);
        break;
      }

      case 'typing': {
        if (displayedText.length < currentPrompt.length) {
          const nextChar = currentPrompt[displayedText.length];
          // Natural typing delay: pause slightly longer after punctuation and spaces
          let delay = typingSpeed;
          if (nextChar === ' ') {
            delay = typingSpeed * 1.5;
          } else if (nextChar === '.' || nextChar === '…' || nextChar === '?' || nextChar === ',') {
            delay = typingSpeed * 2.8;
          }

          timer = setTimeout(() => {
            setDisplayedText(currentPrompt.slice(0, displayedText.length + 1));
          }, delay);
        } else {
          setPhase('pausing');
        }
        break;
      }

      case 'pausing': {
        timer = setTimeout(() => {
          setPhase('deleting');
        }, pauseDelay);
        break;
      }

      case 'deleting': {
        if (displayedText.length > 0) {
          timer = setTimeout(() => {
            setDisplayedText((prev) => prev.slice(0, -1));
          }, deletingSpeed);
        } else {
          setPromptIndex((prev) => (prev + 1) % prompts.length);
          setPhase('initial_delay');
        }
        break;
      }
    }

    return () => clearTimeout(timer);
  }, [displayedText, phase, promptIndex, prompts, typingSpeed, deletingSpeed, pauseDelay, initialDelay, isFocused]);

  return (
    <View
      style={[
        styles.overlay,
        isFocused && styles.overlayFocused,
        style,
      ]}
      pointerEvents="none"
    >
      <View style={styles.textRow}>
        <Text
          style={[
            styles.text,
            {
              fontSize,
              fontWeight,
              color: textColor,
            },
            textStyle,
          ]}
          numberOfLines={1}
        >
          {displayedText}
        </Text>

        {/* Blinking vertical cursor line */}
        {!isFocused && (
          <Animated.View
            style={[
              styles.cursor,
              {
                height: fontSize + 4,
                backgroundColor: cursorColor,
                opacity: cursorOpacity,
              },
            ]}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  overlayFocused: {
    opacity: 0.35,
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    letterSpacing: -0.2,
    includeFontPadding: false,
    ...(Platform.OS === 'web'
      ? ({
          userSelect: 'none',
          WebkitUserSelect: 'none',
        } as any)
      : {}),
  },
  cursor: {
    width: 2,
    borderRadius: 1,
    marginLeft: 2,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 2,
  },
});
