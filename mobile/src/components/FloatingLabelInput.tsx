import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Animated,
  Easing,
  KeyboardTypeOptions,
  StyleProp,
  ViewStyle,
  Pressable,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { AlertCircle } from 'lucide-react-native';
import { colors, typography, borderRadius } from '../theme';

interface FloatingLabelInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  hasError?: boolean;
  errorMessage?: string;
  shakeTrigger?: number;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoFocus?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  suffix?: React.ReactNode;
  backgroundColor?: string;
}

export const FloatingLabelInput: React.FC<FloatingLabelInputProps> = ({
  label,
  value,
  onChangeText,
  hasError = false,
  errorMessage,
  shakeTrigger = 0,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoFocus = false,
  containerStyle,
  suffix,
  backgroundColor = colors.background,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const isFloating = isFocused || (value && value.length > 0);

  const floatAnim = useRef(new Animated.Value(value && value.length > 0 ? 1 : 0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Animate label smoothly to border top left on focus or text presence
  useEffect(() => {
    Animated.timing(floatAnim, {
      toValue: isFloating ? 1 : 0,
      duration: 190,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: false,
    }).start();
  }, [isFloating, floatAnim]);

  // Shake animation triggered when Next is clicked with invalid/empty input
  useEffect(() => {
    if (shakeTrigger > 0 && hasError) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } catch {
        // Haptics optional
      }

      const useNative = Platform.OS !== 'web';
      shakeAnim.setValue(0);
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: -12, duration: 45, useNativeDriver: useNative }),
        Animated.timing(shakeAnim, { toValue: 12, duration: 45, useNativeDriver: useNative }),
        Animated.timing(shakeAnim, { toValue: -9, duration: 45, useNativeDriver: useNative }),
        Animated.timing(shakeAnim, { toValue: 9, duration: 45, useNativeDriver: useNative }),
        Animated.timing(shakeAnim, { toValue: -5, duration: 40, useNativeDriver: useNative }),
        Animated.timing(shakeAnim, { toValue: 5, duration: 40, useNativeDriver: useNative }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: useNative }),
      ]).start();
    }
  }, [shakeTrigger, hasError, shakeAnim]);

  // Interpolations for floating label position, size, and color
  const labelTop = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [16, -10],
  });

  const labelLeft = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 12],
  });

  const labelFontSize = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [15, 12],
  });

  const labelColor = hasError
    ? colors.error
    : isFocused
    ? colors.primary
    : isFloating
    ? colors.textSecondary
    : colors.textMuted;

  const borderColor = hasError
    ? colors.error
    : isFocused
    ? colors.primary
    : '#D1D5DB';

  return (
    <Animated.View
      style={[
        styles.outerWrapper,
        containerStyle,
        {
          transform: [{ translateX: shakeAnim }],
        },
      ]}
    >
      <Pressable onPress={() => inputRef.current?.focus()}>
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor,
              borderColor,
              borderWidth: isFocused || hasError ? 1.8 : 1.2,
            },
          ]}
        >
          {/* Text Input */}
          <TextInput
            ref={inputRef}
            style={styles.textInput}
            value={value}
            onChangeText={onChangeText}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            autoCorrect={false}
            autoFocus={autoFocus}
          />

          {suffix && <View style={styles.suffixWrapper}>{suffix}</View>}

          {/* Smooth Floating Label hovering to Border Top-Left */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.labelContainer,
              {
                top: labelTop,
                left: labelLeft,
                backgroundColor: isFloating ? backgroundColor : 'transparent',
              },
            ]}
          >
            <Animated.Text
              style={[
                styles.labelText,
                {
                  fontSize: labelFontSize,
                  color: labelColor,
                  fontFamily: isFloating ? typography.fonts.headingSemiBold : typography.fonts.headingRegular,
                },
              ]}
            >
              {label}
            </Animated.Text>
          </Animated.View>
        </View>
      </Pressable>

      {/* Error Callout Message Callback */}
      {hasError && errorMessage ? (
        <View style={styles.errorRow}>
          <AlertCircle size={13} color={colors.error} style={{ marginRight: 5 }} />
          <Text style={styles.errorMessage}>{errorMessage}</Text>
        </View>
      ) : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  outerWrapper: {
    marginBottom: 16,
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 54,
    borderRadius: borderRadius.md,
    paddingHorizontal: 16,
    position: 'relative',
  },
  labelContainer: {
    position: 'absolute',
    paddingHorizontal: 4,
    zIndex: 10,
    elevation: 4,
  },
  labelText: {
    letterSpacing: 0.2,
  },
  textInput: {
    flex: 1,
    height: '100%',
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: typography.fonts.headingRegular,
    color: colors.text,
  },
  suffixWrapper: {
    marginLeft: 8,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginLeft: 4,
  },
  errorMessage: {
    color: colors.error,
    fontSize: 12,
    fontFamily: typography.fonts.headingMedium,
  },
});
