import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { SFSymbolProps, SFSymbolName } from './types';
import { SF_SYMBOLS_VECTORS } from './sfSymbolsData';

export const SFSymbol: React.FC<SFSymbolProps> = ({
  name = 'sparkles',
  size = 24,
  color = '#FFFFFF',
  fill,
  strokeWidth = 2,
  style,
}) => {
  const renderColor = fill || color;
  const symbolName = String(name);
  const renderer = SF_SYMBOLS_VECTORS[symbolName] || SF_SYMBOLS_VECTORS[symbolName.replace(/\.fill$/, '')];

  if (!renderer) {
    // Subtle fallback for unknown symbol
    return (
      <View style={style}>
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="12" cy="12" r="7" stroke={renderColor} strokeWidth={strokeWidth} fill="none" />
        </Svg>
      </View>
    );
  }

  return (
    <View style={style}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        {renderer({ color: renderColor, strokeWidth })}
      </Svg>
    </View>
  );
};

export const createSFSymbol = (defaultSymbol: SFSymbolName) => {
  const Component: React.FC<SFSymbolProps> = (props) => {
    return <SFSymbol name={props.name || defaultSymbol} {...props} />;
  };
  Component.displayName = `SFSymbol(${defaultSymbol})`;
  return Component;
};
