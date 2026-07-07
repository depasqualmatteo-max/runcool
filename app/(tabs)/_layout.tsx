import React, { useState, useEffect, useMemo } from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Text, Platform, TouchableOpacity, View, StyleSheet, ActivityIndicator, Modal, Alert } from 'react-native';
import { UserAvatar } from '@/components/UserAvatar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useTheme, ThemeMode } from '@/context/ThemeContext';
import type { ThemeColors } from '@/constants/Colors';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

const THEME_CYCLE: { mode: ThemeMode; label: string; emoji: string }[] = [
  { mode: 'dark', label: 'Scuro', emoji: '🌑' },
  { mode: 'light', label: 'Chiaro', emoji: '☀️' },
  { mode: 'system', label: 'Sistema', emoji: '⚙️' },
];
// Rimuovi Alert duplicato se importato due volte
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
  const { mode, setMode, colors, isDark } = useTheme();
  const menuStyles = useMemo(() => makeMenuStyles(colors, isDark), [colors, isDark]);
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [tokens, setTokens] = useState<number | null>(null);
  const [injuryMode, setInjuryMode] = useState(false);
  const [injurySaving, setInjurySaving] = useState(false);

  function cycleTheme() {
    const idx = THEME_CYCLE.findIndex(t => t.mode === mode);
    setMode(THEME_CYCLE[(idx + 1) % THEME_CYCLE.length].mode);
  }
  const currentTheme = THEME_CYCLE.find(t => t.mode === mode) ?? THEME_CYCLE[0];

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('tokens, injury_mode').eq('id', user.id).single()
      .then(({ data }) => { setTokens(data?.tokens ?? 0); setInjuryMode(data?.injury_mode ?? false); });
  }, [user?.id]);

  useEffect(() => {
    if (menuOpen && user) {
      supabase.from('profiles').select('tokens, injury_mode').eq('id', user.id).single()
        .then(({ data }) => { setTokens(data?.tokens ?? 0); setInjuryMode(data?.injury_mode ?? false); });
    }
  }, [menuOpen]);

  async function toggleInjury() {
    if (!user || injurySaving) return;
    setInjurySaving(true);
    const next = !injuryMode;
    await supabase.from('profiles').update({
      injury_mode: next,
      injury_since: next ? new Date().toISOString().slice(0, 10) : null,
    }).eq('id', user.id);
    setInjuryMode(next);
    setInjurySaving(false);
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

            {/* Profilo */}
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

            {/* Gettoni — tap apre lo shop */}
            <TouchableOpacity
              style={menuStyles.tokenRow}
              onPress={() => { setMenuOpen(false); router.push('/shop' as any); }}
              activeOpacity={0.75}
            >
              <Text style={menuStyles.tokenEmoji}>🎟</Text>
              <Text style={menuStyles.tokenLabel}>La Stalla</Text>
              <Text style={menuStyles.tokenValue}>{tokens ?? '…'}</Text>
              <Text style={{ fontSize: 12, color: '#bbb', marginLeft: 4 }}>›</Text>
            </TouchableOpacity>

            {/* Modalità Infortunio */}
            <TouchableOpacity style={menuStyles.injuryRow} onPress={toggleInjury} disabled={injurySaving}>
              <Text style={menuStyles.injuryEmoji}>🩹</Text>
              <View style={{ flex: 1 }}>
                <Text style={menuStyles.injuryLabel}>Modalità Infortunio</Text>
                <Text style={menuStyles.injuryDesc}>{injuryMode ? 'Attiva — target missioni ridotti, primo drink gratuito' : 'Disattiva'}</Text>
              </View>
              <View style={[menuStyles.injuryToggle, injuryMode && menuStyles.injuryToggleOn]}>
                <View style={[menuStyles.injuryKnob, injuryMode && menuStyles.injuryKnobOn]} />
              </View>
            </TouchableOpacity>

            <View style={menuStyles.divider} />

            {/* Notifiche — apre schermata dedicata */}
            <TouchableOpacity
              style={menuStyles.notifRow}
              onPress={() => { setMenuOpen(false); router.push('/notifiche' as any); }}
            >
              <Text style={menuStyles.notifEmoji}>🔔</Text>
              <View style={{ flex: 1 }}>
                <Text style={menuStyles.notifLabel}>Notifiche</Text>
                <Text style={menuStyles.notifDesc}>Storico e preferenze</Text>
              </View>
              <Text style={{ fontSize: 12, color: '#bbb', marginLeft: 4 }}>›</Text>
            </TouchableOpacity>

            {/* Tema — tap per ciclare Scuro/Chiaro/Sistema */}
            <TouchableOpacity style={menuStyles.notifRow} onPress={cycleTheme}>
              <Text style={menuStyles.notifEmoji}>{currentTheme.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={menuStyles.notifLabel}>Tema</Text>
                <Text style={menuStyles.notifDesc}>{currentTheme.label} — tocca per cambiare</Text>
              </View>
            </TouchableOpacity>

            {/* Regole del gioco */}
            <TouchableOpacity
              style={menuStyles.notifRow}
              onPress={() => { setMenuOpen(false); router.push('/regole' as any); }}
            >
              <Text style={menuStyles.notifEmoji}>📖</Text>
              <View style={{ flex: 1 }}>
                <Text style={menuStyles.notifLabel}>Regole del gioco</Text>
                <Text style={menuStyles.notifDesc}>Come funziona RunCool</Text>
              </View>
              <Text style={{ fontSize: 12, color: '#bbb', marginLeft: 4 }}>›</Text>
            </TouchableOpacity>

          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

function makeMenuStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.3)',
      alignItems: 'flex-end',
    },
    dropdown: {
      marginTop: Platform.OS === 'ios' ? 96 : 70,
      marginRight: 12,
      width: 290,
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDark ? 0 : 0.18,
      shadowRadius: 16,
      elevation: isDark ? 0 : 12,
    },
    sectionTitle: {
      fontSize: 12, fontWeight: '800', color: colors.textFaint,
      letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10,
    },
    profileRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: isDark ? '#332a0d' : '#FFFBEA', borderRadius: 14, padding: 10, marginBottom: 4,
    },
    username: { fontSize: 15, fontWeight: '800', color: colors.text },
    viewProfile: { fontSize: 12, color: colors.textFaint, marginTop: 2 },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 14 },
    tokenRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: isDark ? '#332a0d' : '#FFFBEA', borderRadius: 12,
      paddingHorizontal: 12, paddingVertical: 10, marginTop: 8,
    },
    tokenEmoji: { fontSize: 18, marginRight: 8 },
    tokenLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
    tokenValue: { fontSize: 20, fontWeight: '900', color: '#b8860b' },
    notifRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: isDark ? '#16213a' : '#F0F4FF', borderRadius: 12,
      paddingHorizontal: 12, paddingVertical: 10, marginTop: 8,
    },
    notifEmoji: { fontSize: 18, marginRight: 8 },
    notifLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
    notifDesc: { fontSize: 11, color: colors.textFaint, marginTop: 1 },
    injuryRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: isDark ? '#301818' : '#FFF5F5', borderRadius: 12,
      paddingHorizontal: 12, paddingVertical: 10, marginTop: 8,
    },
    injuryEmoji: { fontSize: 18, marginRight: 8 },
    injuryLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
    injuryDesc: { fontSize: 11, color: colors.textFaint, marginTop: 1 },
    injuryToggle: {
      width: 42, height: 24, borderRadius: 12,
      backgroundColor: colors.border, justifyContent: 'center', paddingHorizontal: 2,
    },
    injuryToggleOn: { backgroundColor: '#FF6B6B' },
    injuryKnob: {
      width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff',
      shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
    },
    injuryKnobOn: { alignSelf: 'flex-end' },
  });
}

export default function TabLayout() {
  const { user, isLoading } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  if (isLoading) return <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color="#FFD700" /></View>;
  if (!user) return <Redirect href="/(auth)/login" />;

  const tabBarHeight = 60 + insets.bottom;

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        tabBarActiveTintColor: '#E8445A',
        tabBarInactiveTintColor: isDark ? '#777' : '#aaa',
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingBottom: insets.bottom + 2,
          paddingTop: 6,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDark ? 0 : 0.1,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '600' as const,
        },
        headerStyle: { backgroundColor: colors.card },
        headerTitleStyle: { fontWeight: '700', color: colors.text },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="clan"
        options={{
          title: 'Il Clan',
          tabBarLabel: 'Clan',
          tabBarIcon: () => <TabIcon emoji="🏆" />,
          headerRight: () => <ProfileButton />,
        }}
      />
      <Tabs.Screen
        name="tandem"
        options={{
          title: 'Tandem',
          tabBarLabel: 'Tandem',
          tabBarIcon: () => <TabIcon emoji="👥" />,
          headerRight: () => <ProfileButton />,
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
          headerRight: () => <ProfileButton />,
        }}
      />
      <Tabs.Screen
        name="classifiche"
        options={{
          title: 'Classifiche',
          tabBarLabel: 'Classifiche',
          tabBarIcon: () => <TabIcon emoji="📊" />,
          headerRight: () => <ProfileButton />,
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
