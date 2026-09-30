import React from 'react';
import Svg, { Path, Rect, Circle, G } from 'react-native-svg';
import { SFSymbolProps } from './types';

type RenderFn = (props: { color: string; strokeWidth: number }) => React.ReactNode;

export const SF_SYMBOLS_VECTORS: Record<string, RenderFn> = {
  // Apple Flame (flame.fill)
  'flame.fill': ({ color }) => (
    <Path
      d="M12 2C10.5 4.5 11 6.5 10 8.5C9 10.5 7 11.5 7 14C7 17.31 9.69 20 13 20C16.31 20 19 17.31 19 14C19 10 16 7 15 5C14.5 7.5 13 9 12 9.5C12.5 8 13.5 5 12 2ZM13 18C11.34 18 10 16.66 10 15C10 13.5 11 12.5 11.5 12C12.5 13 14 13.5 14 15C14 16.66 13.5 18 13 18Z"
      fill={color}
    />
  ),
  'flame': ({ color, strokeWidth }) => (
    <Path
      d="M12 3C10.5 5.5 11 7 10 9C9 11 7 12 7 14.5C7 17.5 9.5 20 13 20C16.5 20 19 17.5 19 14.5C19 10.5 16 7.5 15 5.5C14.5 7.5 13 9 12 9.5C12.5 8 13.5 5.5 12 3Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  ),

  // Apple Fitness Dumbbell (dumbbell.fill)
  'dumbbell.fill': ({ color }) => (
    <G fill={color}>
      {/* Left Plate Outer */}
      <Rect x="2" y="7" width="3" height="10" rx="1.5" />
      {/* Left Plate Inner */}
      <Rect x="6" y="9" width="2.5" height="6" rx="1.2" />
      {/* Central Handle Bar */}
      <Rect x="8.5" y="11" width="7" height="2" rx="1" />
      {/* Right Plate Inner */}
      <Rect x="15.5" y="9" width="2.5" height="6" rx="1.2" />
      {/* Right Plate Outer */}
      <Rect x="19" y="7" width="3" height="10" rx="1.5" />
    </G>
  ),
  'dumbbell': ({ color, strokeWidth }) => (
    <G stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill="none">
      <Rect x="2" y="7" width="3" height="10" rx="1.5" />
      <Rect x="6" y="9" width="2.5" height="6" rx="1.2" />
      <Path d="M8.5 12H15.5" />
      <Rect x="15.5" y="9" width="2.5" height="6" rx="1.2" />
      <Rect x="19" y="7" width="3" height="10" rx="1.5" />
    </G>
  ),

  // Apple Watch (applewatch)
  'applewatch': ({ color, strokeWidth }) => (
    <G fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {/* Watch case */}
      <Rect x="5" y="6" width="14" height="12" rx="4.5" />
      {/* Top band */}
      <Path d="M8 6V2.5H16V6" />
      {/* Bottom band */}
      <Path d="M8 18V21.5H16V18" />
      {/* Digital Crown */}
      <Path d="M19 9.5V11.5" strokeWidth={strokeWidth * 1.3} />
    </G>
  ),

  // Apple Calendar (calendar)
  'calendar': ({ color, strokeWidth }) => (
    <G fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="4" width="18" height="17" rx="3.5" />
      <Path d="M16 2V5" />
      <Path d="M8 2V5" />
      <Path d="M3 9.5H21" />
      <Circle cx="8" cy="14" r="1" fill={color} stroke="none" />
      <Circle cx="12" cy="14" r="1" fill={color} stroke="none" />
      <Circle cx="16" cy="14" r="1" fill={color} stroke="none" />
      <Circle cx="8" cy="17.5" r="1" fill={color} stroke="none" />
      <Circle cx="12" cy="17.5" r="1" fill={color} stroke="none" />
    </G>
  ),
  'calendar.badge.clock': ({ color, strokeWidth }) => (
    <G fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M11 20H5C3.89 20 3 19.11 3 18V6C3 4.89 3.89 4 5 4H17C18.11 4 19 4.89 19 6V11" />
      <Path d="M16 2V5" />
      <Path d="M8 2V5" />
      <Path d="M3 9H19" />
      <Circle cx="17.5" cy="17.5" r="4.5" />
      <Path d="M17.5 15.5V17.5L19 18.5" />
    </G>
  ),

  // Apple Health Trends (chart.line.uptrend.xyaxis)
  'chart.line.uptrend.xyaxis': ({ color, strokeWidth }) => (
    <G fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 3V20H21" />
      <Path d="M7 15L12 10L16 13L21 6" />
      <Path d="M17.5 6H21V9.5" />
    </G>
  ),
  'chart.line.downtrend.xyaxis': ({ color, strokeWidth }) => (
    <G fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 3V20H21" />
      <Path d="M7 7L12 12L16 9L21 16" />
      <Path d="M17.5 16H21V12.5" />
    </G>
  ),

  // Apple Droplet (drop.fill)
  'drop.fill': ({ color }) => (
    <Path
      d="M12 2.69C12 2.69 5 11.14 5 15.5C5 19.09 8.13 22 12 22C15.87 22 19 19.09 19 15.5C19 11.14 12 2.69 12 2.69ZM9.5 16C9.22 16 9 15.78 9 15.5C9 13.5 10.5 12 12.5 12C12.78 12 13 12.22 13 12.5C13 12.78 12.78 13 12.5 13C11 13 10 14 10 15.5C10 15.78 9.78 16 9.5 16Z"
      fill={color}
    />
  ),
  'drop': ({ color, strokeWidth }) => (
    <Path
      d="M12 2.69C12 2.69 5 11.14 5 15.5C5 19.09 8.13 22 12 22C15.87 22 19 19.09 19 15.5C19 11.14 12 2.69 12 2.69Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  ),

  // Apple Nutrition / Fork & Knife (fork.knife)
  'fork.knife': ({ color, strokeWidth }) => (
    <G fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {/* Fork */}
      <Path d="M5 2V8C5 9.5 6 10.5 7.5 10.5V22" />
      <Path d="M7.5 2V8" />
      <Path d="M10 2V8C10 9.5 9 10.5 7.5 10.5" />
      {/* Knife */}
      <Path d="M18 2C15.5 4 14.5 7 14.5 11V22H16.5V2C17 2 17.5 2 18 2Z" />
    </G>
  ),

  // Apple Intelligence / Bot (apple.intelligence)
  'apple.intelligence': ({ color, strokeWidth }) => (
    <G fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 2L13.8 7.2C14.2 8.3 15.1 9.2 16.2 9.6L21.4 11.4C22.2 11.7 22.2 12.7 21.4 13L16.2 14.8C15.1 15.2 14.2 16.1 13.8 17.2L12 22.4C11.7 23.2 10.7 23.2 10.4 22.4L8.6 17.2C8.2 16.1 7.3 15.2 6.2 14.8L1 13C0.2 12.7 0.2 11.7 1 11.4L6.2 9.6C7.3 9.2 8.2 8.3 8.6 7.2L10.4 2C10.7 1.2 11.7 1.2 12 2Z" />
      <Circle cx="12" cy="12" r="2.5" fill={color} stroke="none" />
    </G>
  ),
  'sparkles.bubble.fill': ({ color }) => (
    <G fill={color}>
      <Path d="M19 13.5C19 18 14.5 21 10.5 21C9.2 21 8 20.7 7 20.2L3.5 21.2C3.1 21.3 2.7 20.9 2.8 20.5L3.8 17C3.3 16 3 14.8 3 13.5C3 9 7.5 6 12 6C13.5 6 15 6.4 16.2 7.2C15.5 8.1 15 9.2 15 10.5C15 12.8 16.8 14.6 19 14.7V13.5Z" />
      <Path d="M19.5 2L20.2 4.2C20.4 4.8 20.8 5.2 21.4 5.4L23.5 6.1C24.1 6.3 24.1 7.1 23.5 7.3L21.4 8C20.8 8.2 20.4 8.6 20.2 9.2L19.5 11.4C19.3 12 18.5 12 18.3 11.4L17.6 9.2C17.4 8.6 17 8.2 16.4 8L14.3 7.3C13.7 7.1 13.7 6.3 14.3 6.1L16.4 5.4C17 5.2 17.4 4.8 17.6 4.2L18.3 2C18.5 1.4 19.3 1.4 19.5 2Z" />
    </G>
  ),

  // Apple Bell (bell.fill)
  'bell.fill': ({ color }) => (
    <G fill={color}>
      <Path d="M12 2C10.9 2 10 2.9 10 4C7.2 4.6 5 7.1 5 10.2V15.2L3.3 16.9C2.9 17.3 3.2 18 3.8 18H20.2C20.8 18 21.1 17.3 20.7 16.9L19 15.2V10.2C19 7.1 16.8 4.6 14 4C14 2.9 13.1 2 12 2Z" />
      <Path d="M9.5 19C9.8 20.7 10.7 22 12 22C13.3 22 14.2 20.7 14.5 19H9.5Z" />
    </G>
  ),
  'bell': ({ color, strokeWidth }) => (
    <G fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3C10.9 3 10 3.9 10 5C7.2 5.6 5 8.1 5 11.2V16.2L3.3 17.9C2.9 18.3 3.2 19 3.8 19H20.2C20.8 19 21.1 18.3 20.7 17.9L19 16.2V11.2C19 8.1 16.8 5.6 14 5C14 3.9 13.1 3 12 3Z" />
      <Path d="M10 20C10.3 21.2 11 22 12 22C13 22 13.7 21.2 14 20" />
    </G>
  ),

  // Apple Clock (clock.fill)
  'clock.fill': ({ color }) => (
    <G fill={color}>
      <Circle cx="12" cy="12" r="10" />
      <Path d="M12 7V12L15.5 14" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </G>
  ),
  'clock': ({ color, strokeWidth }) => (
    <G fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="9.5" />
      <Path d="M12 6.5V12L15.5 14" />
    </G>
  ),

  // Apple Sparkles (sparkles)
  'sparkles': ({ color }) => (
    <G fill={color}>
      {/* Main 4-point star */}
      <Path d="M11 2C11 7 7 11 2 11C7 11 11 15 11 20C11 15 15 11 20 11C15 11 11 7 11 2Z" />
      {/* Top right small star */}
      <Path d="M18.5 2C18.5 4 17 5.5 15 5.5C17 5.5 18.5 7 18.5 9C18.5 7 20 5.5 22 5.5C20 5.5 18.5 4 18.5 2Z" />
      {/* Bottom right tiny star */}
      <Circle cx="18.5" cy="17.5" r="1.5" />
    </G>
  ),

  // Apple Chevrons
  'chevron.right': ({ color, strokeWidth }) => (
    <Path
      d="M9 18L15 12L9 6"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  ),
  'chevron.left': ({ color, strokeWidth }) => (
    <Path
      d="M15 18L9 12L15 6"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  ),
  'chevron.down': ({ color, strokeWidth }) => (
    <Path
      d="M6 9L12 15L18 9"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  ),
  'chevron.up': ({ color, strokeWidth }) => (
    <Path
      d="M18 15L12 9L6 15"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  ),

  // Apple Navigation Arrows
  'arrow.left': ({ color, strokeWidth }) => (
    <G fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M19 12H5" />
      <Path d="M11 6L5 12L11 18" />
    </G>
  ),
  'arrow.right': ({ color, strokeWidth }) => (
    <G fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12H19" />
      <Path d="M13 6L19 12L13 18" />
    </G>
  ),
  'arrow.up': ({ color, strokeWidth }) => (
    <G fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 19V5" />
      <Path d="M6 11L12 5L18 11" />
    </G>
  ),
  'arrow.down': ({ color, strokeWidth }) => (
    <G fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 5V19" />
      <Path d="M18 13L12 19L6 13" />
    </G>
  ),

  // Apple Checkmark (checkmark)
  'checkmark': ({ color, strokeWidth }) => (
    <Path
      d="M5 13L9.5 17.5L19 7"
      stroke={color}
      strokeWidth={strokeWidth * 1.1}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  ),
  'checkmark.circle.fill': ({ color }) => (
    <G fill={color}>
      <Circle cx="12" cy="12" r="10" />
      <Path
        d="M8 12.2L10.7 14.8L16.2 9.2"
        stroke="#000000"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </G>
  ),
  'checkmark.circle': ({ color, strokeWidth }) => (
    <G fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="9.5" />
      <Path d="M8 12.2L10.7 14.8L16.2 9.2" strokeWidth={strokeWidth * 1.1} />
    </G>
  ),

  // Apple Cross (xmark)
  'xmark': ({ color, strokeWidth }) => (
    <G fill="none" stroke={color} strokeWidth={strokeWidth * 1.1} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 6L18 18" />
      <Path d="M18 6L6 18" />
    </G>
  ),
  'xmark.circle.fill': ({ color }) => (
    <G fill={color}>
      <Circle cx="12" cy="12" r="10" />
      <Path
        d="M8.5 8.5L15.5 15.5"
        stroke="#000000"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M15.5 8.5L8.5 15.5"
        stroke="#000000"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </G>
  ),
  'xmark.circle': ({ color, strokeWidth }) => (
    <G fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="9.5" />
      <Path d="M8.5 8.5L15.5 15.5" />
      <Path d="M15.5 8.5L8.5 15.5" />
    </G>
  ),

  // Apple Plus
  'plus': ({ color, strokeWidth }) => (
    <G fill="none" stroke={color} strokeWidth={strokeWidth * 1.1} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 5V19" />
      <Path d="M5 12H19" />
    </G>
  ),
  'plus.circle.fill': ({ color }) => (
    <G fill={color}>
      <Circle cx="12" cy="12" r="10" />
      <Path d="M12 7V17" stroke="#000000" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M7 12H17" stroke="#000000" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </G>
  ),

  // Apple Notes Compose / Pencil (square.and.pencil)
  'square.and.pencil': ({ color, strokeWidth }) => (
    <G fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M11 4H5C3.89 4 3 4.89 3 6V19C3 20.11 3.89 21 5 21H18C19.11 21 20 20.11 20 19V13" />
      <Path d="M18.5 2.5C19.33 1.67 20.67 1.67 21.5 2.5C22.33 3.33 22.33 4.67 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" />
    </G>
  ),
  'pencil': ({ color, strokeWidth }) => (
    <G fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M17 3C17.8 2.2 19.2 2.2 20 3C20.8 3.8 20.8 5.2 20 6L7 19L3 20L4 16L17 3Z" />
    </G>
  ),
  'pencil.line': ({ color, strokeWidth }) => (
    <G fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M17 3C17.8 2.2 19.2 2.2 20 3C20.8 3.8 20.8 5.2 20 6L7 19L3 20L4 16L17 3Z" />
      <Path d="M2 22H22" />
    </G>
  ),

  // Apple Microphone (mic.fill)
  'mic.fill': ({ color, strokeWidth }) => (
    <G fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="9" y="3" width="6" height="11" rx="3" fill={color} stroke="none" />
      <Path d="M5 10C5 13.87 8.13 17 12 17C15.87 17 19 13.87 19 10" />
      <Path d="M12 17V21" />
      <Path d="M8 21H16" />
    </G>
  ),
  'mic': ({ color, strokeWidth }) => (
    <G fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="9" y="3" width="6" height="11" rx="3" />
      <Path d="M5 10C5 13.87 8.13 17 12 17C15.87 17 19 13.87 19 10" />
      <Path d="M12 17V21" />
      <Path d="M8 21H16" />
    </G>
  ),

  // Apple Bolt / Zap (bolt.fill)
  'bolt.fill': ({ color }) => (
    <Path d="M13 2L4 13.5H11.5L10 22L20 9.5H12.5L13 2Z" fill={color} />
  ),
  'bolt': ({ color, strokeWidth }) => (
    <Path
      d="M13 2L4 13.5H11.5L10 22L20 9.5H12.5L13 2Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  ),
  'bolt.slash.fill': ({ color, strokeWidth }) => (
    <G fill={color}>
      <Path d="M12.5 4L11 8.5H13L12.5 4ZM10 13H4L10.5 5.5L14.5 9.5L11.5 13ZM11.5 15L10 22L16 14.5H13.5L11.5 15Z" />
      <Path d="M3 3L21 21" stroke={color} strokeWidth={strokeWidth * 1.1} strokeLinecap="round" fill="none" />
    </G>
  ),

  // Apple Trash (trash.fill)
  'trash.fill': ({ color }) => (
    <G fill={color}>
      <Path d="M6 7H18V19C18 20.1 17.1 21 16 21H8C6.9 21 6 20.1 6 19V7Z" />
      <Path d="M4 5H20V7H4V5Z" />
      <Path d="M9 3H15V5H9V3Z" />
    </G>
  ),
  'trash': ({ color, strokeWidth }) => (
    <G fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 6H20" />
      <Path d="M10 3H14" />
      <Path d="M6 6V19C6 20.1 6.9 21 8 21H16C17.1 21 18 20.1 18 19V6" />
      <Path d="M10 10V16" />
      <Path d="M14 10V16" />
    </G>
  ),

  // Apple Lock (lock.fill)
  'lock.fill': ({ color }) => (
    <G fill={color}>
      <Rect x="4" y="10" width="16" height="11" rx="3" />
      <Path
        d="M7.5 10V6.5C7.5 4.01 9.51 2 12 2C14.49 2 16.5 4.01 16.5 6.5V10"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx="12" cy="15" r="1.5" fill="#000000" />
      <Path d="M12 16.5V18.5" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" />
    </G>
  ),
  'lock': ({ color, strokeWidth }) => (
    <G fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="4" y="10" width="16" height="11" rx="3" />
      <Path d="M7 10V6.5C7 3.74 9.24 1.5 12 1.5C14.76 1.5 17 3.74 17 6.5V10" />
      <Circle cx="12" cy="15" r="1.5" fill={color} stroke="none" />
    </G>
  ),

  // Apple Mail (envelope.fill)
  'envelope.fill': ({ color }) => (
    <G fill={color}>
      <Rect x="3" y="5" width="18" height="14" rx="3" />
      <Path d="M4 7L12 13L20 7" stroke="#000000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </G>
  ),
  'envelope': ({ color, strokeWidth }) => (
    <G fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="5" width="18" height="14" rx="3" />
      <Path d="M4 7L12 13L20 7" />
    </G>
  ),

  // Apple User (person.crop.circle)
  'person.crop.circle': ({ color, strokeWidth }) => (
    <G fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="9.5" />
      <Circle cx="12" cy="9.5" r="3" fill={color} stroke="none" />
      <Path d="M6.5 18C7.5 15.5 9.5 14.5 12 14.5C14.5 14.5 16.5 15.5 17.5 18" fill={color} stroke="none" />
    </G>
  ),
  'person.crop.circle.fill': ({ color }) => (
    <G fill={color}>
      <Circle cx="12" cy="12" r="10" />
      <Circle cx="12" cy="9.5" r="3" fill="#000000" />
      <Path d="M6 18.5C7.2 15.8 9.4 14.5 12 14.5C14.6 14.5 16.8 15.8 18 18.5" fill="#000000" />
    </G>
  ),
  'person.2.fill': ({ color }) => (
    <G fill={color}>
      <Circle cx="9" cy="8" r="3" />
      <Path d="M3.5 17C4.5 14.5 6.5 13.5 9 13.5C11.5 13.5 13.5 14.5 14.5 17H3.5Z" />
      <Circle cx="16" cy="9" r="2.5" />
      <Path d="M15 13.6C15.8 13.8 16.5 14.2 17 15C17.5 15.8 17.8 16.8 17.8 17H20.5C20.5 15.5 19 14 17 13.5L15 13.6Z" />
    </G>
  ),

  // Apple Maps Pin (mappin.and.ellipse)
  'mappin.and.ellipse': ({ color, strokeWidth }) => (
    <G fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 2C8.69 2 6 4.69 6 8C6 12.5 12 19 12 19C12 19 18 12.5 18 8C18 4.69 15.31 2 12 2Z" fill={color} />
      <Circle cx="12" cy="8" r="2.2" fill="#000000" stroke="none" />
      <Path d="M8 21.5C8 20.67 9.79 20 12 20C14.21 20 16 20.67 16 21.5C16 22.33 14.21 23 12 23C9.79 23 8 22.33 8 21.5Z" />
    </G>
  ),

  // Apple Camera (camera.fill)
  'camera.fill': ({ color }) => (
    <G fill={color}>
      <Path d="M9 4L7.5 6H4C2.9 6 2 6.9 2 8V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V8C22 6.9 21.1 6 20 6H16.5L15 4H9Z" />
      <Circle cx="12" cy="13" r="4" fill="#000000" />
      <Circle cx="12" cy="13" r="2" fill={color} />
    </G>
  ),
  'camera': ({ color, strokeWidth }) => (
    <G fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 4L7.5 6H4C2.9 6 2 6.9 2 8V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V8C22 6.9 21.1 6 20 6H16.5L15 4H9Z" />
      <Circle cx="12" cy="13" r="3.5" />
    </G>
  ),

  // Apple Spotlight Search (magnifyingglass)
  'magnifyingglass': ({ color, strokeWidth }) => (
    <G fill="none" stroke={color} strokeWidth={strokeWidth * 1.1} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="10.5" cy="10.5" r="7" />
      <Path d="M15.5 15.5L21 21" />
    </G>
  ),

  // Apple Menu / Lines (line.3.horizontal)
  'line.3.horizontal': ({ color, strokeWidth }) => (
    <G fill="none" stroke={color} strokeWidth={strokeWidth * 1.1} strokeLinecap="round">
      <Path d="M4 6H20" />
      <Path d="M4 12H20" />
      <Path d="M4 18H20" />
    </G>
  ),

  // Apple Home (house.fill)
  'house.fill': ({ color }) => (
    <G fill={color}>
      <Path d="M12 2.5L2 10.5H5V20C5 20.6 5.4 21 6 21H10V15H14V21H18C18.6 21 19 20.6 19 20V10.5H22L12 2.5Z" />
    </G>
  ),
  'house': ({ color, strokeWidth }) => (
    <G fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 10L12 3L21 10V20C21 20.6 20.6 21 20 21H4C3.4 21 3 20.6 3 20V10Z" />
      <Path d="M9 21V14H15V21" />
    </G>
  ),

  // Apple Fitness Awards Trophy (trophy.fill)
  'trophy.fill': ({ color }) => (
    <G fill={color}>
      <Path d="M6 3H18V10C18 13.3 15.3 16 12 16C8.7 16 6 13.3 6 10V3Z" />
      <Path d="M3 5H6V9H3C2.4 9 2 8.6 2 8V6C2 5.4 2.4 5 3 5Z" />
      <Path d="M18 5H21C21.6 5 22 5.4 22 6V8C22 8.6 21.6 9 21 9H18V5Z" />
      <Path d="M10 16H14V19H10V16Z" />
      <Rect x="7" y="19" width="10" height="3" rx="1.5" />
    </G>
  ),

  // Apple Health Heart (heart.fill)
  'heart.fill': ({ color }) => (
    <Path
      d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z"
      fill={color}
    />
  ),
  'heart': ({ color, strokeWidth }) => (
    <Path
      d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  ),

  // Apple Health ECG Wave (waveform.path.ecg)
  'waveform.path.ecg': ({ color, strokeWidth }) => (
    <Path
      d="M2 12H6L9 4L13 20L16 10L18 14H22"
      stroke={color}
      strokeWidth={strokeWidth * 1.1}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  ),

  // Apple Security Shield (shield.fill)
  'shield.fill': ({ color }) => (
    <Path
      d="M12 2L4 5.5V11.5C4 16.5 7.4 21.1 12 22.3C16.6 21.1 20 16.5 20 11.5V5.5L12 2Z"
      fill={color}
    />
  ),
  'shield': ({ color, strokeWidth }) => (
    <Path
      d="M12 2L4 5.5V11.5C4 16.5 7.4 21.1 12 22.3C16.6 21.1 20 16.5 20 11.5V5.5L12 2Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  ),
  'checkmark.shield.fill': ({ color }) => (
    <G fill={color}>
      <Path d="M12 2L4 5.5V11.5C4 16.5 7.4 21.1 12 22.3C16.6 21.1 20 16.5 20 11.5V5.5L12 2Z" />
      <Path
        d="M8.5 12L10.8 14.5L15.5 9.5"
        stroke="#000000"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </G>
  ),
  'shield.lefthalf.filled.trianglebadge.exclamationmark': ({ color, strokeWidth }) => (
    <G fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 2L4 5.5V11.5C4 16.5 7.4 21.1 12 22.3C16.6 21.1 20 16.5 20 11.5V5.5L12 2Z" />
      <Path d="M12 7V13" strokeWidth={strokeWidth * 1.2} />
      <Circle cx="12" cy="16.5" r="1" fill={color} stroke="none" />
    </G>
  ),

  // Apple Stopwatch (timer)
  'timer': ({ color, strokeWidth }) => (
    <G fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="13" r="8.5" />
      <Path d="M12 9V13L15 15" />
      <Path d="M10 2H14" strokeWidth={strokeWidth * 1.1} />
      <Path d="M12 2V4.5" />
    </G>
  ),

  // Apple Music Repeat (repeat)
  'repeat': ({ color, strokeWidth }) => (
    <G fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M17 2L21 6L17 10" />
      <Path d="M3 11V9C3 7.34 4.34 6 6 6H21" />
      <Path d="M7 22L3 18L7 14" />
      <Path d="M21 13V15C21 16.66 19.66 18 18 18H3" />
    </G>
  ),

  // Apple Clockwise Reload (arrow.clockwise / arrow.triangle.2.circlepath)
  'arrow.clockwise': ({ color, strokeWidth }) => (
    <G fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 3V8H16" />
      <Path d="M20.49 13C19.98 16.89 16.7 19.9 12.65 19.99C8.37 20.08 4.79 16.79 4.52 12.51C4.24 8.24 7.4 4.54 11.66 4.09C13.56 3.89 15.48 4.41 17.06 5.52L21 8" />
    </G>
  ),
  'arrow.counterclockwise': ({ color, strokeWidth }) => (
    <G fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 3V8H8" />
      <Path d="M3.51 13C4.02 16.89 7.3 19.9 11.35 19.99C15.63 20.08 19.21 16.79 19.48 12.51C19.76 8.24 16.6 4.54 12.34 4.09C10.44 3.89 8.52 4.41 6.94 5.52L3 8" />
    </G>
  ),
  'clock.arrow.circlepath': ({ color, strokeWidth }) => (
    <G fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 3V8H8" />
      <Path d="M3.5 13C4 17 7.5 20 12 20C16.4 20 20 16.4 20 12C20 7.6 16.4 4 12 4C9.5 4 7.2 5.2 5.8 7L3 8" />
      <Path d="M12 7V12L15 14" />
    </G>
  ),

  // Apple Health Weight Scale (scalemass.fill)
  'scalemass.fill': ({ color }) => (
    <G fill={color}>
      <Rect x="3" y="3" width="18" height="18" rx="4.5" />
      <Circle cx="12" cy="8.5" r="3.2" fill="#000000" />
      <Path d="M12 6.5V8.5L13.5 8.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" fill="none" />
    </G>
  ),

  // Apple Barcode Viewfinder (barcode.viewfinder)
  'barcode.viewfinder': ({ color, strokeWidth }) => (
    <G fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {/* Brackets */}
      <Path d="M3 8V5C3 3.9 3.9 3 5 3H8" />
      <Path d="M16 3H19C20.1 3 21 3.9 21 5V8" />
      <Path d="M21 16V19C21 20.1 20.1 21 19 21H16" />
      <Path d="M8 21H5C3.9 21 3 20.1 3 19V16" />
      {/* Barcode lines */}
      <Path d="M7 8V16" strokeWidth={strokeWidth * 1.1} />
      <Path d="M10 8V16" strokeWidth={strokeWidth * 0.8} />
      <Path d="M13 8V16" strokeWidth={strokeWidth * 1.4} />
      <Path d="M17 8V16" strokeWidth={strokeWidth * 0.9} />
    </G>
  ),

  // Apple Sliders (slider.horizontal.3)
  'slider.horizontal.3': ({ color, strokeWidth }) => (
    <G fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 6H8M14 6H21" />
      <Circle cx="11" cy="6" r="2.5" fill={color} />
      <Path d="M3 12H13M19 12H21" />
      <Circle cx="16" cy="12" r="2.5" fill={color} />
      <Path d="M3 18H6M12 18H21" />
      <Circle cx="9" cy="18" r="2.5" fill={color} />
    </G>
  ),

  // Apple Leaf (leaf.fill)
  'leaf.fill': ({ color }) => (
    <Path
      d="M12 2C8 2 3 6 3 13C3 17 6.5 21 11 21C11.5 21 12 21 12 21C12 21 12 19 12 17C12 12 16 8 21 8C21 4 17 2 12 2ZM12 17C10.5 17 9.5 15.5 9.5 14C9.5 11 12 8.5 15 8.5C14.5 11 13.5 14 12 17Z"
      fill={color}
    />
  ),

  // Apple Tips Lightbulb (lightbulb.fill)
  'lightbulb.fill': ({ color }) => (
    <G fill={color}>
      <Path d="M12 2C7.86 2 4.5 5.36 4.5 9.5C4.5 12.4 6.1 14.9 8.5 16.1V18C8.5 18.6 8.9 19 9.5 19H14.5C15.1 19 15.5 18.6 15.5 18V16.1C17.9 14.9 19.5 12.4 19.5 9.5C19.5 5.36 16.14 2 12 2Z" />
      <Path d="M10 20H14V21C14 21.6 13.6 22 13 22H11C10.4 22 10 21.6 10 21V20Z" />
    </G>
  ),

  // Apple Wifi Slash (wifi.slash)
  'wifi.slash': ({ color, strokeWidth }) => (
    <G fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 9C6.5 7.8 8.4 7.1 10.5 7M19 9C17.8 8 16.3 7.3 14.5 7" />
      <Path d="M8.5 13C9.5 12.4 10.7 12 12 12C13.3 12 14.5 12.4 15.5 13" />
      <Circle cx="12" cy="17.5" r="1.5" fill={color} stroke="none" />
      <Path d="M2 2L22 22" strokeWidth={strokeWidth * 1.1} />
    </G>
  ),

  // Apple Phone (phone.fill)
  'phone.fill': ({ color }) => (
    <Path
      d="M20.01 15.38C18.78 15.38 17.59 15.18 16.48 14.82C16.13 14.7 15.74 14.79 15.47 15.06L13.9 17.03C11.07 15.68 8.42 13.13 7.01 10.2L8.96 8.54C9.23 8.26 9.31 7.87 9.2 7.52C8.83 6.41 8.64 5.22 8.64 3.99C8.64 3.45 8.19 3 7.65 3H4.19C3.65 3 3 3.24 3 3.99C3 13.28 10.73 21 20.01 21C20.72 21 21 20.37 21 19.82V16.37C21 15.83 20.55 15.38 20.01 15.38Z"
      fill={color}
    />
  ),

  // Apple Photos (photo.fill)
  'photo.fill': ({ color }) => (
    <G fill={color}>
      <Rect x="3" y="4" width="18" height="16" rx="3.5" />
      <Circle cx="8" cy="9" r="2" fill="#000000" />
      <Path d="M4 17L9 12L13 16L16 13L20 17H4Z" fill="#000000" />
    </G>
  ),
  'photo': ({ color, strokeWidth }) => (
    <G fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="4" width="18" height="16" rx="3.5" />
      <Circle cx="8" cy="9" r="1.8" />
      <Path d="M4 17L9 12L13 16L16 13L20 17" />
    </G>
  ),

  // Apple Document (doc.text.fill)
  'doc.text.fill': ({ color }) => (
    <G fill={color}>
      <Path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" />
      <Path d="M8 12H16M8 16H13" stroke="#000000" strokeWidth="1.8" strokeLinecap="round" />
    </G>
  ),

  // Apple Help / Questionmark (questionmark.circle.fill)
  'questionmark.circle.fill': ({ color }) => (
    <G fill={color}>
      <Circle cx="12" cy="12" r="10" />
      <Path
        d="M10 9C10 7.9 10.9 7 12 7C13.1 7 14 7.9 14 9C14 10.5 12 11 12 13"
        stroke="#000000"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx="12" cy="16.5" r="1.2" fill="#000000" />
    </G>
  ),

  // Apple Alert / Exclamationmark (exclamationmark.circle.fill)
  'exclamationmark.circle.fill': ({ color }) => (
    <G fill={color}>
      <Circle cx="12" cy="12" r="10" />
      <Path d="M12 7V13" stroke="#000000" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <Circle cx="12" cy="16.5" r="1.2" fill="#000000" />
    </G>
  ),
  'exclamationmark.circle': ({ color, strokeWidth }) => (
    <G fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="9.5" />
      <Path d="M12 7V13" strokeWidth={strokeWidth * 1.1} />
      <Circle cx="12" cy="16.5" r="1" fill={color} stroke="none" />
    </G>
  ),

  // Apple Sign Out / Door (rectangle.portrait.and.arrow.right)
  'rectangle.portrait.and.arrow.right': ({ color, strokeWidth }) => (
    <G fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 21H5C3.9 21 3 20.1 3 19V5C3 3.9 3.9 3 5 3H9" />
      <Path d="M16 17L21 12L16 7" />
      <Path d="M21 12H9" />
    </G>
  ),

  // Apple Media Play (play.fill)
  'play.fill': ({ color }) => (
    <Path d="M6 4.5L19 12L6 19.5V4.5Z" fill={color} />
  ),

  // Apple Target
  'target': ({ color, strokeWidth }) => (
    <G fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="9.5" />
      <Circle cx="12" cy="12" r="5.5" />
      <Circle cx="12" cy="12" r="1.8" fill={color} stroke="none" />
    </G>
  ),

  // Apple Bookmark (bookmark.fill)
  'bookmark.fill': ({ color }) => (
    <Path d="M5 3H19C19.6 3 20 3.4 20 4V21L12 17L4 21V4C4 3.4 4.4 3 5 3Z" fill={color} />
  ),

  // Apple Bullet List (list.bullet)
  'list.bullet': ({ color, strokeWidth }) => (
    <G fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
      <Circle cx="5" cy="6" r="1.5" fill={color} stroke="none" />
      <Path d="M9 6H20" />
      <Circle cx="5" cy="12" r="1.5" fill={color} stroke="none" />
      <Path d="M9 12H20" />
      <Circle cx="5" cy="18" r="1.5" fill={color} stroke="none" />
      <Path d="M9 18H20" />
    </G>
  ),

  // Code Symbol
  'chevron.left.forwardslash.chevron.right': ({ color, strokeWidth }) => (
    <G fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M7 8L3 12L7 16" />
      <Path d="M17 8L21 12L17 16" />
      <Path d="M14 4L10 20" />
    </G>
  ),

  // Apple Archive Box (archivebox.fill & archivebox)
  'archivebox.fill': ({ color }) => (
    <G fill={color}>
      <Rect x="3" y="3.5" width="18" height="4.5" rx="1.5" />
      <Path d="M4 9.5V18.5C4 19.88 5.12 21 6.5 21H17.5C18.88 21 20 19.88 20 18.5V9.5H4ZM15 13.5H9C8.45 13.5 8 13.05 8 12.5C8 11.95 8.45 11.5 9 11.5H15C15.55 11.5 16 11.95 16 12.5C16 13.05 15.55 13.5 15 13.5Z" />
    </G>
  ),
  'archivebox': ({ color, strokeWidth }) => (
    <G fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="4" width="18" height="4" rx="1.5" />
      <Path d="M4 8V18.5C4 19.88 5.12 21 6.5 21H17.5C18.88 21 20 19.88 20 18.5V8" />
      <Path d="M9.5 12.5C9.5 13.88 10.62 15 12 15C13.38 15 14.5 13.88 14.5 12.5" />
    </G>
  ),

  // Apple Spiral Notepad / Note (note.text)
  'note.text': ({ color, strokeWidth }) => (
    <G fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="4" y="4.5" width="16" height="16.5" rx="3.5" />
      <Path d="M8 2.5V5M12 2.5V5M16 2.5V5" />
      <Path d="M8 10.5H16M8 14.5H13" />
    </G>
  ),
};

