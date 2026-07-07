import React from 'react';
import { View, ImageBackground } from 'react-native';
import { SHOP_BGS } from '@/constants/shop';

interface Props {
  bgId: number;
  size?: number;
  width?: number;
  height?: number;
  square?: boolean;
  children?: React.ReactNode;
  style?: object;
}

export function PigBgView({ bgId, size, width, height, square, children, style }: Props) {
  const bg = SHOP_BGS.find(b => b.id === bgId);
  const radius = square ? 20 : size ? size / 2 : 0;
  const sizeStyle = width != null && height != null ? { width, height } : size ? { width: size, height: size } : {};
  const circleStyle = (size || (width != null && height != null)) ? { ...sizeStyle, borderRadius: radius } : {};

  const baseStyle: any = {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    overflow: 'hidden' as const,
    backgroundColor: bg?.color ?? '#FFEAA7',
    ...circleStyle,
  };

  if (bg?.image) {
    return (
      <ImageBackground
        source={bg.image}
        resizeMode="cover"
        style={[baseStyle, style]}
        imageStyle={(size || (width != null && height != null)) ? { borderRadius: radius } : undefined}
      >
        {children}
      </ImageBackground>
    );
  }

  return (
    <View style={[baseStyle, style]}>
      {children}
    </View>
  );
}
