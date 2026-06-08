import React, { useState } from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Text, Platform, TouchableOpacity, View, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import { UserAvatar } from '@/components/UserAvatar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth, NotifPref } from '@/context/AuthContext';
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

const NOTIF_OPTIONS: { value: NotifPref; label: string; desc: string }[] = [
  { value: 'none', label: 'Nessuna notifica', desc: 'Non ricevi alcuna notifica' },
  { value: 'important', label: 'Solo notifiche importanti', desc: 'Es. sorpassi in classifica' },
  { value: 'evening_recap', label: 'Recap serale', desc: 'Ogni sera il riepilogo delle attività di tutti' },
  { value: 'every_activity', label: 'Notifica per ogni attività', desc: 'Ogni volta che qualcuno logga uno sport o un drink' },
];

function ProfileButton() {
  const { user, updateNotifPref } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function selectPref(pref: NotifPref) {
    if (saving || pref === user?.notifPref) return;
    setSaving(true);
    try {
      await updateNotifPref(pref);
    } catch (e) {
      // silenzioso: se fallisce, lo stato locale si aggiorna comunque
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <TouchableOpacity
        onPress={() => setMenuOpen(true)}
        style={{ marginRight: 14, borderRadius: 19, borderWidth: 2, borderColor: '#FFD700', overflow: 'hidden' }}
      >
        <UserAvatar avatarUrl={user?.avatarUrl} isMe size={34} />
      </TouchableOpacity>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <TouchableOpacity style={menuStyles.overlay} activeOpacity={1} onPress={() => setMenuOpen(false)}>
          <View style={menuStyles.dropdown}>
            {/* Sezione Profilo */}
            <Text style={menuStyles.sectionTitle}>👤 Profilo</Text>
            <TouchableOpacity
              style={menuStyles.profileRow}
              onPress={() => { setMenuOpen(false); router.push('/profilo' as any); }}
            >
              <UserAvatar avatarUrl={user?.avatarUrl} isMe size={36} />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={menuStyles.username}>{user?.username}</Text>
                <Text style={menuStyles.viewProfile}>Vai al profilo →</Text>
              </View>
            </TouchableOpacity>

            <View style={menuStyles.divider} />

            {/* Sezione Notifiche */}
            <Text style={menuStyles.sectionTitle}>🔔 Notifiche</Text>
            {NOTIF_OPTIONS.map((opt) => {
              const selected = user?.notifPref === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={menuStyles.optionRow}
                  onPress={() => selectPref(opt.value)}
                  disabled={saving}
                >
                  <View style={[menuStyles.radio, selected && menuStyles.radioSelected]}>
                    {selected && <View style={menuStyles.radioDot} />}
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={menuStyles.optionLabel}>{opt.label}</Text>
                    <Text style={menuStyles.optionDesc}>{opt.desc}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const menuStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'flex-end',
  },
  dropdown: {
    marginTop: Platform.OS === 'ios' ? 96 : 70,
    marginRight: 12,
    width: 290,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
  },
  sectionTitle: {
    fontSize: 12, fontWeight: '800', color: '#aaa',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10,
  },
  profileRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFBEA', borderRadius: 14, padding: 10, marginBottom: 4,
  },
  username: { fontSize: 15, fontWeight: '800', color: '#1a1a1a' },
  viewProfile: { fontSize: 12, color: '#999', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 14 },
  optionRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: 8,
  },
  radio: {
    width: 20, height: 20, borderRadius: 10, marginTop: 1,
    borderWidth: 2, borderColor: '#ccc',
    alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { borderColor: '#FFD700' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFD700' },
  optionLabel: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  optionDesc: { fontSize: 12, color: '#999', marginTop: 2, lineHeight: 16 },
});

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
