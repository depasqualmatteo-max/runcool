import React, { useState } from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';

interface Props {
  avatarUrl?: string | null;
  isMe?: boolean;
  size?: number;
  emoji?: string;
}

export function UserAvatar({ avatarUrl, isMe, size = 36, emoji }: Props) {
  const fallbackEmoji = emoji ?? (isMe ? '🐷' : '👤');
  const radius = size / 2;
  const [failed, setFailed] = useState(false);

  if (avatarUrl && !failed) {
    return (
      <Image
        key={avatarUrl}
        source={{ uri: avatarUrl }}
        style={[styles.img, { width: size, height: size, borderRadius: radius }]}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <View style={[styles.placeholder, { width: size, height: size, borderRadius: radius }]}>
      <Text style={{ fontSize: size * 0.55 }}>{fallbackEmoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  img: {
    backgroundColor: '#f0f0f0',
  },
  placeholder: {
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
