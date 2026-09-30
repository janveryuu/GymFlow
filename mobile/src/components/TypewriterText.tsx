import React, { useState, useEffect, useRef } from 'react';
import { Text, TextStyle, TouchableOpacity } from 'react-native';

export interface TypewriterTextProps {
  text: string;
  speed?: number; // ms per chunk
  chunkSize?: number; // characters per step
  onComplete?: () => void;
  onUpdate?: () => void;
  style?: TextStyle | TextStyle[];
  hideCursor?: boolean;
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  speed = 15,
  chunkSize = 2,
  onComplete,
  onUpdate,
  style,
  hideCursor = false,
}) => {
  const [displayedLength, setDisplayedLength] = useState(0);
  const isFinished = displayedLength >= text.length;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (displayedLength >= text.length) {
      onCompleteRef.current?.();
      return;
    }

    const timer = setTimeout(() => {
      setDisplayedLength((prev) => {
        const next = Math.min(text.length, prev + chunkSize);
        onUpdateRef.current?.();
        return next;
      });
    }, speed);

    return () => clearTimeout(timer);
  }, [displayedLength, text.length, speed, chunkSize]);

  // Tap to instantly reveal the full text
  const handleFastForward = () => {
    if (!isFinished) {
      setDisplayedLength(text.length);
      onCompleteRef.current?.();
      onUpdateRef.current?.();
    }
  };

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={handleFastForward}>
      <Text style={style}>
        {text.slice(0, displayedLength)}
        {!isFinished && !hideCursor && <Text style={{ opacity: 0.65 }}>▌</Text>}
      </Text>
    </TouchableOpacity>
  );
};
