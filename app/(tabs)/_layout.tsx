import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Text, Platform, TouchableOpacity, Image, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';

function TabIcon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: Platform.OS === 'web' ? 24 : 20 }}>{emoji}</Text>;
}

function ProfileButton() {
  const { user } = useAuth();
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => router.push('/profilo' as any)}
      style={{ marginRight: 14, width: 34, height: 34, borderRadius: 17, overflow: 'hidden', borderWidth: 2, borderColor: '#FFD700' }}
    >
      {user?.avatarUrl ? (
        <Image source={{ uri: user.avatarUrl }} style={{ width: 30, height: 30 }} />
      ) : (
        <View style={{ width: 30, height: 30, backgroundColor: '#FFD700', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 16 }}>🐷</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  const { user, isLoading } = useAuth();
  const insets = useSafeAreaInsets();

  if (isLoading) return null;
  if (!user) return <Redirect href="/(auth)/login" />;

  const tabBarHeight = Platform.OS === 'web' ? 80 : 55 + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#E8445A',
        tabBarInactiveTintColor: '#aaa',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#dddddd',
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingBottom: Platform.OS === 'web' ? 12 : insets.bottom + 2,
          paddingTop: 6,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '600' as const,
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
        headerStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { fontWeight: '700', color: '#1a1a1a' },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Corri Birresponsabilmente',
          tabBarLabel: 'Home',
          tabBarIcon: () => <TabIcon emoji="🍺" />,
          headerRight: () => <ProfileButton />,
        }}
      />
      <Tabs.Screen
        name="aggiungi"
        options={{
          title: 'Aggiungi',
          tabBarLabel: 'Aggiungi',
          tabBarIcon: () => <TabIcon emoji="➕" />,
        }}
      />
      <Tabs.Screen
        name="clan"
        options={{
          title: 'Il Clan',
          tabBarLabel: 'Clan',
          tabBarIcon: () => <TabIcon emoji="🏆" />,
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          title: 'Social',
          tabBarLabel: 'Social',
          tabBarIcon: () => <TabIcon emoji="💬" />,
        }}
      />
      {/* Schermate nascoste dalla tab bar */}
      <Tabs.Screen name="two" options={{ href: null }} />
      <Tabs.Screen name="log-workout" options={{ href: null }} />
      <Tabs.Screen name="classifiche" options={{ href: null }} />
      <Tabs.Screen name="chat" options={{ href: null }} />
      <Tabs.Screen name="history" options={{ href: null }} />
    </Tabs>
  );
}
