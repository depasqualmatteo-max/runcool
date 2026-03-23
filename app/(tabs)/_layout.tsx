import React from 'react';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';

function TabIcon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 22 }}>{emoji}</Text>;
}

export default function TabLayout() {
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
          title: 'RunCool',
          tabBarLabel: 'Home',
          tabBarIcon: () => <TabIcon emoji="❤️" />,
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: 'Log Drink',
          tabBarLabel: 'Drink',
          tabBarIcon: () => <TabIcon emoji="🍺" />,
        }}
      />
      <Tabs.Screen
        name="log-workout"
        options={{
          title: 'Log Workout',
          tabBarLabel: 'Sport',
          tabBarIcon: () => <TabIcon emoji="🏃" />,
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
