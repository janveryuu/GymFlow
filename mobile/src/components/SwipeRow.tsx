import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  TouchableOpacity,
  Platform,
  LayoutChangeEvent,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { ArchiveBox, Trash } from './icons';

const APPLE_FONT = Platform.OS === 'web'
  ? '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif'
  : Platform.OS === 'ios'
  ? 'System'
  : 'Roboto';

export interface SwipeRowProps {
  children: React.ReactNode;
  onArchive?: () => void;
  onDelete?: () => void;
  archiveLabel?: string;
  deleteLabel?: string;
  archiveColor?: string;
  deleteColor?: string;
  actionWidth?: number;
  commitThreshold?: number;
  disabled?: boolean;
}

export const SwipeRow: React.FC<SwipeRowProps> = ({
  children,
  onArchive,
  onDelete,
  archiveLabel = 'Archive',
  deleteLabel = 'Delete',
  archiveColor = '#3f3f46',
  deleteColor = '#e5484d',
  actionWidth = 76,
  commitThreshold = 0.55,
  disabled = false,
}) => {
  const totalActionsWidth = actionWidth * 2;
  const [rowWidth, setRowWidth] = useState(360);
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsing, setIsCollapsing] = useState(false);

  const translateX = useRef(new Animated.Value(0)).current;
  const rowHeight = useRef(new Animated.Value(72)).current;
  const rowOpacity = useRef(new Animated.Value(1)).current;
  const rowMargin = useRef(new Animated.Value(8)).current;

  const currentTranslateX = useRef(0);
  const hasTriggeredCommitHaptic = useRef(false);

  translateX.addListener(({ value }) => {
    currentTranslateX.current = value;
  });

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0) setRowWidth(width);
    if (height > 0 && measuredHeight === null) {
      setMeasuredHeight(height);
      rowHeight.setValue(height);
    }
  }, [measuredHeight, rowHeight]);

  const snapTo = useCallback((toValue: number, callback?: () => void) => {
    Animated.spring(translateX, {
      toValue,
      damping: 24,
      stiffness: 280,
      mass: 0.8,
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => {
      setIsOpen(toValue < 0);
      callback?.();
    });
  }, [translateX]);

  const collapseAndExecute = useCallback((actionCallback?: () => void) => {
    if (isCollapsing) return;
    setIsCollapsing(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    Animated.parallel([
      Animated.timing(rowHeight, {
        toValue: 0,
        duration: 220,
        useNativeDriver: false,
      }),
      Animated.timing(rowOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: false,
      }),
      Animated.timing(rowMargin, {
        toValue: 0,
        duration: 220,
        useNativeDriver: false,
      }),
    ]).start(() => {
      actionCallback?.();
    });
  }, [isCollapsing, rowHeight, rowOpacity, rowMargin]);

  const handleArchivePress = () => {
    collapseAndExecute(onArchive);
  };

  const handleDeletePress = () => {
    collapseAndExecute(onDelete);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (disabled || isCollapsing) return false;
        // Strictly capture horizontal swipes, ignoring vertical scrolling
        return (
          Math.abs(gestureState.dx) > 10 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5
        );
      },
      onPanResponderGrant: () => {
        translateX.stopAnimation();
        hasTriggeredCommitHaptic.current = false;
      },
      onPanResponderMove: (_, gestureState) => {
        if (disabled || isCollapsing) return;
        const initialOffset = isOpen ? -totalActionsWidth : 0;
        let newX = initialOffset + gestureState.dx;

        // Overscroll to right (rubberbanding)
        if (newX > 0) {
          newX = newX * 0.2;
        }

        // Overscroll to left past full actions
        if (newX < -totalActionsWidth) {
          const excess = newX + totalActionsWidth;
          newX = -totalActionsWidth + excess * 0.45;
        }

        const commitPoint = rowWidth * commitThreshold;
        if (Math.abs(newX) >= commitPoint && !hasTriggeredCommitHaptic.current) {
          hasTriggeredCommitHaptic.current = true;
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } catch {}
        } else if (Math.abs(newX) < commitPoint && hasTriggeredCommitHaptic.current) {
          hasTriggeredCommitHaptic.current = false;
        }

        translateX.setValue(newX);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (disabled || isCollapsing) return;
        const currentVal = currentTranslateX.current;
        const commitPoint = rowWidth * commitThreshold;

        // Full swipe commit (delete action)
        if (Math.abs(currentVal) >= commitPoint && gestureState.dx < 0) {
          collapseAndExecute(onDelete);
          return;
        }

        // Snapping: if flicked or dragged past half the actions width
        if (gestureState.vx < -0.5 || currentVal < -actionWidth * 0.7) {
          snapTo(-totalActionsWidth);
        } else {
          snapTo(0);
        }
      },
      onPanResponderTerminate: () => {
        snapTo(0);
      },
    })
  ).current;

  // Rail reveal animations
  const archiveScale = translateX.interpolate({
    inputRange: [-totalActionsWidth, -actionWidth, 0],
    outputRange: [1, 0.85, 0.6],
    extrapolate: 'clamp',
  });

  const deleteScale = translateX.interpolate({
    inputRange: [-totalActionsWidth, -actionWidth, 0],
    outputRange: [1, 0.9, 0.6],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={[
        styles.outerContainer,
        {
          height: measuredHeight ? rowHeight : undefined,
          opacity: rowOpacity,
          marginBottom: rowMargin,
        },
      ]}
      onLayout={onLayout}
    >
      {/* Background action rail */}
      <View style={styles.actionRail}>
        {onArchive && (
          <TouchableOpacity
            style={[styles.actionBtn, { width: actionWidth, backgroundColor: archiveColor }]}
            onPress={handleArchivePress}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel={archiveLabel}
          >
            <Animated.View style={[styles.actionContent, { transform: [{ scale: archiveScale }] }]}>
              <ArchiveBox size={19} color="#FFFFFF" strokeWidth={2} />
              <Text style={styles.actionText}>{archiveLabel}</Text>
            </Animated.View>
          </TouchableOpacity>
        )}

        {onDelete && (
          <TouchableOpacity
            style={[styles.actionBtn, { width: actionWidth, backgroundColor: deleteColor }]}
            onPress={handleDeletePress}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel={deleteLabel}
          >
            <Animated.View style={[styles.actionContent, { transform: [{ scale: deleteScale }] }]}>
              <Trash size={19} color="#FFFFFF" strokeWidth={2} />
              <Text style={styles.actionText}>{deleteLabel}</Text>
            </Animated.View>
          </TouchableOpacity>
        )}
      </View>

      {/* Foreground card */}
      <Animated.View
        style={[
          styles.surface,
          {
            transform: [{ translateX }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        {children}

        {/* If open, clicking surface snaps closed */}
        {isOpen && (
          <TouchableOpacity
            style={styles.backdropCover}
            activeOpacity={1}
            onPress={() => snapTo(0)}
          />
        )}
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: '#27272a',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  actionRail: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  actionContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 11,
    fontFamily: APPLE_FONT,
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  surface: {
    backgroundColor: '#27272a',
    width: '100%',
  },
  backdropCover: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 99,
  },
});
