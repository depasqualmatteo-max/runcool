import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Text, Platform, TouchableOpacity, View, StyleSheet, ActivityIndicator } from 'react-native';
import { UserAvatar } from '@/components/UserAvatar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
// Inline type — evita dipendenza da @react-navigation/bottom-tabs
type BottomTabBarButtonProps = {
  onPress?: (e: any) => void;
  accessibilityState?: { selected?: boolean };
  style?: any;
  children?: React.ReactNode;
};

function TabIcon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}

function HomeTabButton(props: BottomTabBarButtonProps) {
  return (
    <TouchableOpacity
      {...props}
      style={styles.homeButtonWrapper}
      onPress={props.onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.homeButton, props.accessibilityState?.selected && styles.homeButtonActive]}>
        <Text style={styles.homeButtonEmoji}>🍺</Text>
      </View>
    </TouchableOpacity>
  );
}

function ProfileButton() {
  const { user } = useAuth();
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => router.push('/profilo' as any)}
      style={{ marginRight: 14, borderRadius: 19, borderWidth: 2, borderColor: '#FFD700', overflow: 'hidden' }}
    >
      <UserAvatar avatarUrl={user?.avatarUrl} isMe size={34} />
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  const { user, isLoading } = useAuth();
  const insets = useSafeAreaInsets();

  if (isLoading) return <View style={{ flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color="#FFD700" /></View>;
  if (!user) return <Redirect href="/(auth)/login" />;

  const tabBarHeight = 60 + insets.bottom;

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
          paddingBottom: insets.bottom + 2,
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
        headerStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { fontWeight: '700', color: '#1a1a1a' },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="clan"
        options={{
          title: 'Il Clan',
          tabBarLabel: 'Clan',
          tabBarIcon: () => <TabIcon emoji="🏆" />,
        }}
      />
      <Tabs.Screen
        name="tandem"
        options={{
          title: 'Tandem',
          tabBarLabel: 'Tandem',
          tabBarIcon: () => <TabIcon emoji="👥" />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'RunCool',
          tabBarLabel: '',
          tabBarButton: (props) => <HomeTabButton {...props} />,
          headerRight: () => <ProfileButton />,
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
      <Tabs.Screen
        name="classifiche"
        options={{
          title: 'Classifiche',
          tabBarLabel: 'Classifiche',
          tabBarIcon: () => <TabIcon emoji="📊" />,
        }}
      />
      {/* Schermate nascoste */}
      <Tabs.Screen name="two" options={{ href: null }} />
      <Tabs.Screen name="log-workout" options={{ href: null }} />
      <Tabs.Screen name="sfide" options={{ href: null }} />
      <Tabs.Screen name="chat" options={{ href: null }} />
      <Tabs.Screen name="history" options={{ href: null }} />
      <Tabs.Screen name="aggiungi" options={{ href: null }} />
      <Tabs.Screen name="health-import" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  homeButtonWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 6,
  },
  homeButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  homeButtonActive: {
    backgroundColor: '#FFC000',
    shadowOpacity: 0.7,
  },
  homeButtonEmoji: {
    fontSize: 26,
  },
});
