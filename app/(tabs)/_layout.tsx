import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Text, Platform, TouchableOpacity, Image, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';

function TabIcon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: Platform.OS === 'web' ? 26 : 22 }}>{emoji}</Text>;
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

  if (isLoading) return null;
  if (!user) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#E8445A',
        tabBarInactiveTintColor: '#aaa',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#eee',
          height: Platform.OS === 'web' ? 80 : undefined,
          paddingBottom: Platform.OS === 'web' ? 12 : undefined,
          paddingTop: Platform.OS === 'web' ? 8 : undefined,
        },
        tabBarLabelStyle: {
          fontSize: Platform.OS === 'web' ? 12 : undefined,
          fontWeight: '600' as const,
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
        name="two"
        options={{
          title: 'Bevi, Maialino',
          tabBarLabel: 'Bevi',
          tabBarIcon: () => <TabIcon emoji="🐷" />,
        }}
      />
      <Tabs.Screen
        name="log-workout"
        options={{
          title: 'Fai Sport',
          tabBarLabel: 'Sport',
          tabBarIcon: () => <TabIcon emoji="🏃" />,
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
        name="classifiche"
        options={{
          title: 'Classifiche',
          tabBarLabel: 'Classifica',
          tabBarIcon: () => <TabIcon emoji="📊" />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarLabel: 'Chat',
          tabBarIcon: () => <TabIcon emoji="💬" />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Storico',
          tabBarLabel: 'Storico',
          tabBarIcon: () => <TabIcon emoji="📋" />,
        }}
      />
    </Tabs>
  );
}
