import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Text } from 'react-native';
import { useAuth } from '@/context/AuthContext';

function TabIcon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 22 }}>{emoji}</Text>;
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
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#eee' },
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
