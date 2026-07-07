import React from 'react';
import { View, Image } from 'react-native';
import { SHOP_SKINS, SKIN_VARIANT_IMAGES, SkinVariant } from '@/constants/shop';
import { useTheme } from '@/context/ThemeContext';

const SPRITES = {
  1: require('@/assets/skin maiali/pig-skins.png'),
  2: require('@/assets/skin maiali/pig-skins2.png'),
} as const;

interface Props {
  skinId: number;
  variant?: SkinVariant;
  size: number;
  silhouette?: boolean; // mostra come ombra scura
  opacity?: number;
}

export function PigSkin({ skinId, variant = 'base', size, silhouette, opacity }: Props) {
  const { isDark } = useTheme();
  const silhouetteColor = isDark ? '#e8e8e8' : '#1a1a1a';
  const skin = SHOP_SKINS.find(s => s.id === skinId) ?? SHOP_SKINS[0];

  // Varianti PNG per skin classiche (1-9)
  if (variant !== 'base' && SKIN_VARIANT_IMAGES[skinId]) {
    const src = SKIN_VARIANT_IMAGES[skinId][variant];
    if (src) {
      return (
        <Image
          source={src}
          style={{
            width: size,
            height: size,
            opacity: opacity ?? 1,
            tintColor: silhouette ? silhouetteColor : undefined,
          }}
          resizeMode="contain"
        />
      );
    }
  }

  // Sprite sheet (base skin)
  const col = skin.spriteCell % 3;
  const row = Math.floor(skin.spriteCell / 3);

  return (
    <View style={{ width: size, height: size, overflow: 'hidden', opacity: opacity ?? 1 }}>
      <Image
        source={SPRITES[skin.sprite]}
        style={{
          width: size * 3,
          height: size * 3,
          position: 'absolute',
          left: -col * size,
          top: -row * size,
          tintColor: silhouette ? silhouetteColor : undefined,
        }}
        resizeMode="stretch"
      />
    </View>
  );
}
