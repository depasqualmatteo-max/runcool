import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { isHealthAvailable } from '@/lib/health';

function getMotivationalPhrase(hearts: number): string {
  if (hearts <= -50) return 'Situazione critica... il fegato chiede pietà';
  if (hearts <= -25) return 'Il divano ti sta vincendo... reagisci!';
  if (hearts <= -10) return 'Hai un bel debito da ripagare — corri!';
  if (hearts < 0) return 'Sei in rosso — una corsetta e torni in pari';
  if (hearts === 0) return 'Parti da zero — fai sport!';
  if (hearts < 10) return 'Buon inizio, continua così!';
  if (hearts < 25) return 'Sei in forma — il maialino è fiero di te';
  if (hearts < 50) return 'Macchina da guerra! Inarrestabile';
  if (hearts < 100) return 'Leggenda vivente — sei un esempio per tutti';
  return 'SEI UN DIO DEL RUNNING! Nessuno ti ferma!';
}

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = ['#E8445A', '#FF9800', '#9C27B0', '#2196F3', '#4CAF50', '#FF5722', '#607D8B', '#795548'];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function DashboardScreen() {
  const { state } = useApp();
  const { user, clan } = useAuth();
  const router = useRouter();
  const [tandem, setTandem] = useState<{ name: string; members: { username: string; hearts: number }[] } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('tandem_id').eq('id', user.id).single().then(async ({ data }) => {
      if (!data?.tandem_id) return;
      const { data: t } = await supabase.from('tandems').select('name').eq('id', data.tandem_id).single();
      const { data: members } = await supabase.from('profiles').select('username, hearts').eq('tandem_id', data.tandem_id);
      if (t) setTandem({ name: t.name, members: members ?? [] });
    });
  }, [user]);

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayLogs = state.logs.filter((l) => l.timestamp.startsWith(today));
  const todayDrinks = todayLogs.filter((l) => l.type === 'drink');
  const todayWorkouts = todayLogs.filter((l) => l.type === 'workout');
  const todayDrinkHearts = todayDrinks.reduce((s, l) => s + (l.type === 'drink' ? l.heartsLost : 0), 0);
  const todayWorkoutHearts = todayWorkouts.reduce((s, l) => s + (l.type === 'workout' ? l.heartsGained : 0), 0);
  const scoreColor = state.hearts > 0 ? '#E8445A' : state.hearts < 0 ? '#ff3b30' : '#aaa';

  const clanScore = clan ? clan.members.reduce((sum, m) => sum + Math.round(m.hearts), 0) : null;
  const tandemScore = tandem ? tandem.members.reduce((s, m) => s + Math.round(m.hearts), 0) : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 1. Score card — compatta */}
      <View style={styles.heroCard}>
        <Text style={styles.hello}>Ciao, {user?.username} 🐷</Text>
        <View style={styles.scoreRow}>
          <Text style={styles.heartBig}>{state.hearts >= 0 ? '❤️' : '💔'}</Text>
          <Text style={[styles.heartsNumber, { color: scoreColor }]}>
            {state.hearts > 0 ? `+${Math.round(state.hearts)}` : Math.round(state.hearts)}
          </Text>
        </View>
        <Text style={styles.motivational}>{getMotivationalPhrase(state.hearts)}</Text>
      </View>

      {/* 2. CTA + contatori oggi */}
      <View style={styles.ctaRow}>
        <TouchableOpacity
          style={[styles.ctaButton, { backgroundColor: '#FF9800' }]}
          onPress={() => router.push('/(tabs)/two')}
        >
          <Text style={styles.ctaIcon}>🐷</Text>
          <Text style={styles.ctaText}>Hai bevuto?</Text>
          <View style={styles.ctaBadge}>
            <Text style={styles.ctaBadgeText}>
              {todayDrinks.length > 0 ? `${todayDrinks.length} oggi  -${todayDrinkHearts} ❤️` : 'Nessuno oggi'}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.ctaButton, { backgroundColor: '#2196F3' }]}
          onPress={() => router.push('/(tabs)/log-workout')}
        >
          <Text style={styles.ctaIcon}>🏃</Text>
          <Text style={styles.ctaText}>Hai corso?</Text>
          <View style={styles.ctaBadge}>
            <Text style={styles.ctaBadgeText}>
              {todayWorkouts.length > 0 ? `${todayWorkouts.length} oggi  +${todayWorkoutHearts} ❤️` : 'Nessuno oggi'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Importa da Health */}
      {isHealthAvailable() && (
        <TouchableOpacity
          style={styles.healthBtn}
          onPress={() => router.push('/(tabs)/health-import')}
        >
          <Text style={styles.healthBtnIcon}>{Platform.OS === 'ios' ? '🍎' : '💚'}</Text>
          <Text style={styles.healthBtnText}>
            Importa da {Platform.OS === 'ios' ? 'Apple Health' : 'Google Fit'}
          </Text>
        </TouchableOpacity>
      )}

      {/* 3. Tandem card — diagonale */}
      {tandem && tandem.members.length >= 2 && (
        <>
          <Text style={styles.sectionTitle}>Il tuo tandem</Text>
          <View style={styles.tandemCard}>
            {/* Punteggio totale tandem */}
            <View style={styles.tandemHeader}>
              <Text style={styles.tandemName}>👥 {tandem.name}</Text>
              <Text style={[styles.tandemTotal, { color: tandemScore >= 0 ? '#9C27B0' : '#ff3b30' }]}>
                {tandemScore > 0 ? '+' : ''}{tandemScore} ❤️
              </Text>
            </View>
            {/* Due metà con diagonale */}
            <View style={styles.tandemBody}>
              {/* Membro sinistro */}
              <View style={styles.tandemHalf}>
                <View style={[styles.tandemAvatar, { backgroundColor: avatarColor(tandem.members[0].username) }]}>
                  <Text style={styles.tandemAvatarText}>{getInitials(tandem.members[0].username)}</Text>
                </View>
                <Text style={styles.tandemMemberName} numberOfLines={1}>{tandem.members[0].username}</Text>
                <Text style={[styles.tandemMemberScore, { color: tandem.members[0].hearts >= 0 ? '#9C27B0' : '#ff3b30' }]}>
                  {tandem.members[0].hearts > 0 ? '+' : ''}{Math.round(tandem.members[0].hearts)}
                </Text>
              </View>
              {/* Separatore diagonale */}
              <View style={styles.tandemDiagonalContainer}>
                <View style={styles.tandemDiagonal} />
              </View>
              {/* Membro destro */}
              <View style={styles.tandemHalf}>
                <View style={[styles.tandemAvatar, { backgroundColor: avatarColor(tandem.members[1].username) }]}>
                  <Text style={styles.tandemAvatarText}>{getInitials(tandem.members[1].username)}</Text>
                </View>
                <Text style={styles.tandemMemberName} numberOfLines={1}>{tandem.members[1].username}</Text>
                <Text style={[styles.tandemMemberScore, { color: tandem.members[1].hearts >= 0 ? '#9C27B0' : '#ff3b30' }]}>
                  {tandem.members[1].hearts > 0 ? '+' : ''}{Math.round(tandem.members[1].hearts)}
                </Text>
              </View>
            </View>
          </View>
        </>
      )}

      {/* 4. Clan card — avatar circolari */}
      {clan && (
        <>
          <Text style={styles.sectionTitle}>Il tuo clan</Text>
          <View style={styles.clanCard}>
            <View style={styles.clanHeader}>
              <Text style={styles.clanName}>🏆 {clan.name}</Text>
              <Text style={styles.clanCode}>#{clan.code}</Text>
            </View>
            <Text style={[styles.clanTotal, { color: clanScore! >= 0 ? '#E8445A' : '#ff3b30' }]}>
              {clanScore! > 0 ? '+' : ''}{clanScore} ❤️
            </Text>
            <View style={styles.clanMembersGrid}>
              {clan.members.map((m) => (
                <View key={m.id} style={styles.clanMemberItem}>
                  <View style={[styles.clanAvatar, { backgroundColor: avatarColor(m.username) }]}>
                    <Text style={styles.clanAvatarText}>{getInitials(m.username)}</Text>
                  </View>
                  <Text style={styles.clanMemberName} numberOfLines={1}>{m.username}</Text>
                  <Text style={[styles.clanMemberScore, { color: m.hearts >= 0 ? '#E8445A' : '#ff3b30' }]}>
                    {m.hearts > 0 ? '+' : ''}{Math.round(m.hearts)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </>
      )}

      {/* 5. Log recenti — invariato */}
      {state.logs.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Ultimi log</Text>
          {state.logs.slice(0, 5).map((log) => {
            const isWorkout = log.type === 'workout';
            return (
              <View key={log.id} style={styles.recentCard}>
                <Text style={styles.recentIcon}>{isWorkout ? '🏃' : '🐷'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recentName}>
                    {isWorkout
                      ? log.workoutName
                      : `${log.drinkName}${log.quantity > 1 ? ` x${log.quantity}` : ''}`}
                  </Text>
                  <Text style={styles.recentTime}>
                    {format(new Date(log.timestamp), 'HH:mm', { locale: it })}
                  </Text>
                </View>
                <Text style={[styles.recentDelta, { color: isWorkout ? '#2196F3' : '#E8445A' }]}>
                  {isWorkout ? `+${log.heartsGained}` : `-${log.heartsLost}`} ❤️
                </Text>
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f7' },
  content: { padding: 20, paddingBottom: 40 },

  // 1. Hero score — compatta
  heroCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    alignItems: 'center', marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  hello: { fontSize: 13, color: '#aaa', marginBottom: 6 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heartBig: { fontSize: 40 },
  heartsNumber: { fontSize: 56, fontWeight: '900', lineHeight: 64 },
  motivational: { fontSize: 13, color: '#888', marginTop: 6, textAlign: 'center' },

  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: '#aaa',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, marginTop: 8,
  },

  // 2. CTA + contatori
  ctaRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  ctaButton: {
    flex: 1, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 12,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
  },
  ctaIcon: { fontSize: 28, marginBottom: 4 },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 15, marginBottom: 6 },
  ctaBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  ctaBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },

  // Health
  healthBtn: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, gap: 10,
    borderWidth: 2, borderColor: '#4CAF50',
  },
  healthBtnIcon: { fontSize: 20 },
  healthBtnText: { fontSize: 14, fontWeight: '700', color: '#2e7d32' },

  // 3. Tandem — diagonale
  tandemCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 20,
    borderWidth: 2, borderColor: '#9C27B0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    overflow: 'hidden',
  },
  tandemHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16,
  },
  tandemName: { fontSize: 16, fontWeight: '800', color: '#1a1a1a' },
  tandemTotal: { fontSize: 20, fontWeight: '900' },
  tandemBody: {
    flexDirection: 'row', alignItems: 'center',
  },
  tandemHalf: {
    flex: 1, alignItems: 'center', paddingVertical: 8,
  },
  tandemAvatar: {
    width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
  },
  tandemAvatarText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  tandemMemberName: { fontSize: 13, fontWeight: '700', color: '#333', maxWidth: 100, textAlign: 'center' },
  tandemMemberScore: { fontSize: 22, fontWeight: '900', marginTop: 2 },
  tandemDiagonalContainer: {
    width: 24, height: 100, alignItems: 'center', justifyContent: 'center',
  },
  tandemDiagonal: {
    width: 2, height: 120, backgroundColor: '#E0C0E8',
    transform: [{ rotate: '20deg' }],
  },

  // 4. Clan — avatar circolari
  clanCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 20,
    borderWidth: 2, borderColor: '#FFD700',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  clanHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  clanName: { fontSize: 16, fontWeight: '800', color: '#1a1a1a' },
  clanCode: { fontSize: 12, color: '#aaa', fontWeight: '600' },
  clanTotal: { fontSize: 28, fontWeight: '900', marginBottom: 14, textAlign: 'center' },
  clanMembersGrid: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16,
  },
  clanMemberItem: { alignItems: 'center', width: 64 },
  clanAvatar: {
    width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12, shadowRadius: 3, elevation: 2,
  },
  clanAvatarText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  clanMemberName: { fontSize: 11, fontWeight: '600', color: '#555', textAlign: 'center', maxWidth: 64 },
  clanMemberScore: { fontSize: 13, fontWeight: '800', marginTop: 1 },

  // 5. Recent logs
  recentCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  recentIcon: { fontSize: 22, marginRight: 12 },
  recentName: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  recentTime: { fontSize: 12, color: '#aaa', marginTop: 2 },
  recentDelta: { fontSize: 14, fontWeight: '700' },
});
