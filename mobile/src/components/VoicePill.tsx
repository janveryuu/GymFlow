import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  ViewStyle,
} from 'react-native';
import { Mic } from './icons';
import * as Haptics from 'expo-haptics';

export interface VoicePillProps {
  isListening: boolean;
  onStart: () => void;
  onStop: (reason?: string) => void;
  accentColor?: string;
  iconColor?: string;
  backgroundColor?: string;
  disabled?: boolean;
  style?: ViewStyle;
}

const BAR_COUNT = 22;
const LOOP = 4.8;
const SYLLABLES: [number, number, number][] = [
  [0.1, 0.16, 0.9],
  [0.3, 0.12, 0.7],
  [0.5, 0.2, 1],
  [0.95, 0.14, 0.8],
  [1.15, 0.1, 0.6],
  [1.3, 0.22, 0.95],
  [1.9, 0.16, 0.85],
  [2.12, 0.12, 0.7],
  [2.3, 0.18, 0.9],
  [2.55, 0.1, 0.5],
  [3.05, 0.24, 1],
  [3.4, 0.12, 0.75],
  [3.6, 0.16, 0.9],
];

const simulatedLevel = (t: number) => {
  const u = t % LOOP;
  let a = 0.08;
  for (const [s, d, p] of SYLLABLES) {
    const x = (u - s) / d;
    if (x >= 0 && x <= 1) {
      a = Math.max(a, p * 0.5 * (1 - Math.cos(2 * Math.PI * x)));
    }
  }
  return a * (0.7 + 0.3 * Math.abs(Math.sin(2 * Math.PI * 7.1 * u)));
};

const formatClock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
};

export const VoicePill: React.FC<VoicePillProps> = ({
  isListening,
  onStart,
  onStop,
  accentColor = '#f5f5f5',
  iconColor = '#FFFFFF',
  backgroundColor = '#27272a',
  disabled = false,
  style,
}) => {
  const [elapsedTime, setElapsedTime] = useState('0:00');
  const [bars, setBars] = useState<{ height: number; opacity: number }[]>(() =>
    new Array(BAR_COUNT).fill({ height: 3, opacity: 0 })
  );

  const expandAnim = useRef(new Animated.Value(isListening ? 1 : 0)).current;
  const startTimeRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const audioContextRef = useRef<any>(null);
  const analyserRef = useRef<any>(null);
  const audioDataRef = useRef<Uint8Array | null>(null);

  // Smooth expansion / collapse animation
  useEffect(() => {
    Animated.spring(expandAnim, {
      toValue: isListening ? 1 : 0,
      stiffness: 380,
      damping: 32,
      mass: 0.7,
      useNativeDriver: false,
    }).start();

    if (isListening) {
      startTimeRef.current = Date.now();
      setElapsedTime('0:00');
    }
  }, [isListening, expandAnim]);

  // Audio waveform animation loop
  useEffect(() => {
    if (!isListening) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setBars(new Array(BAR_COUNT).fill({ height: 3, opacity: 0 }));
      return;
    }

    startTimeRef.current = Date.now();

    // Connect Web Audio API analyzer if on web
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx && !audioContextRef.current && navigator.mediaDevices?.getUserMedia) {
          const ctx = new AudioCtx();
          navigator.mediaDevices
            .getUserMedia({ audio: true })
            .then((stream) => {
              const src = ctx.createMediaStreamSource(stream);
              const analyser = ctx.createAnalyser();
              analyser.fftSize = 64;
              src.connect(analyser);
              audioContextRef.current = ctx;
              analyserRef.current = analyser;
              audioDataRef.current = new Uint8Array(analyser.frequencyBinCount);
            })
            .catch(() => {
              // Smooth fallback to simulated speech frequency
            });
        }
      } catch {}
    }

    let lastClockUpdate = 0;

    const tick = () => {
      const now = Date.now();
      const elapsed = now - startTimeRef.current;

      // Clock update every 200ms
      if (now - lastClockUpdate > 200) {
        lastClockUpdate = now;
        setElapsedTime(formatClock(elapsed));
      }

      // Voice level calculation
      let currentLevel = 0.1;
      if (analyserRef.current && audioDataRef.current) {
        analyserRef.current.getByteFrequencyData(audioDataRef.current);
        let sum = 0;
        for (let i = 0; i < audioDataRef.current.length; i++) {
          sum += audioDataRef.current[i] || 0;
        }
        currentLevel = Math.min(1, (sum / (audioDataRef.current.length * 255)) * 2.4);
      } else {
        currentLevel = simulatedLevel(elapsed / 1000);
      }

      // Compute symmetrical waveform heights with left opacity fade
      const newBars = [];
      const minH = 3;
      const maxH = 18;
      for (let i = 0; i < BAR_COUNT; i++) {
        const normalizedPos = i / (BAR_COUNT - 1); // 0 at far left, 1 at right
        const waveOffset = normalizedPos * Math.PI * 2.4;
        const waveSin = 0.5 + 0.5 * Math.sin((elapsed / 1000) * 9.2 + waveOffset);
        const barVal = Math.max(0.12, Math.min(1, currentLevel * (0.35 + 0.65 * waveSin)));
        const height = Math.round(minH + barVal * (maxH - minH));

        // Smooth fade-out towards the left edge
        const fade = Math.pow(normalizedPos, 1.5);
        const opacity = Math.max(0.04, Math.min(1, (0.35 + 0.65 * barVal) * fade));

        newBars.push({ height, opacity });
      }
      setBars(newBars);

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch {}
        audioContextRef.current = null;
      }
    };
  }, [isListening]);

  const handleStart = useCallback(() => {
    if (disabled) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    onStart();
  }, [disabled, onStart]);

  const handleStop = useCallback(() => {
    if (disabled) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onStop('tap');
  }, [disabled, onStop]);

  // Width interpolates from 36px (standalone icon) to 150px (capsule)
  const pillWidth = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [36, 150],
  });

  const contentOpacity = expandAnim.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [0, 0, 1],
  });

  const micOpacity = expandAnim.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [1, 0, 0],
  });

  const pillBackground = expandAnim.interpolate({
    inputRange: [0, 0.05, 1],
    outputRange: ['transparent', backgroundColor, backgroundColor],
  });

  return (
    <Animated.View
      style={[
        styles.capsule,
        {
          width: pillWidth,
          backgroundColor: pillBackground,
        },
        style,
      ]}
    >
      {/* Idle Standalone Mic Icon (NO circle container) */}
      <Animated.View
        style={[
          styles.idleContainer,
          {
            opacity: micOpacity,
            pointerEvents: isListening ? 'none' : 'auto',
          },
        ]}
      >
        <TouchableOpacity
          style={styles.micButton}
          onPress={handleStart}
          disabled={disabled || isListening}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Start dictation"
        >
          <Mic size={20} color={iconColor} strokeWidth={2.1} />
        </TouchableOpacity>
      </Animated.View>

      {/* Active Waveform + Timer + Stop Square */}
      <Animated.View
        style={[
          styles.activeContainer,
          {
            opacity: contentOpacity,
            pointerEvents: isListening ? 'auto' : 'none',
          },
        ]}
      >
        {/* Left: Waveform bars fading out towards left edge */}
        <View style={styles.waveformContainer}>
          {bars.map((bar, idx) => (
            <View
              key={idx}
              style={[
                styles.waveformBar,
                {
                  height: bar.height,
                  opacity: bar.opacity,
                  backgroundColor: accentColor,
                },
              ]}
            />
          ))}
        </View>

        {/* Center: Live Recording Timer */}
        <Text style={[styles.timerText, { color: accentColor }]}>
          {elapsedTime}
        </Text>

        {/* Right: Solid Rounded White Stop Square */}
        <TouchableOpacity
          style={styles.stopButton}
          onPress={handleStop}
          disabled={disabled || !isListening}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Stop dictation"
        >
          <View style={[styles.stopSquare, { backgroundColor: accentColor }]} />
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  capsule: {
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    ...(Platform.OS === 'web'
      ? ({
          userSelect: 'none',
          WebkitUserSelect: 'none',
        } as any)
      : {}),
  },
  idleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  activeContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 8,
    paddingRight: 8,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 20,
    paddingRight: 4,
  },
  waveformBar: {
    width: 1.8,
    marginHorizontal: 0.8,
    borderRadius: 1,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.3,
    marginHorizontal: 4,
  },
  stopButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopSquare: {
    width: 10,
    height: 10,
    borderRadius: 2.2,
  },
});
