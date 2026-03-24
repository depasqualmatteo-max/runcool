import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const HEART_DISPLAY_MAX = 10;

function ScoreRow({ score }: { score: number }) {
  if (score === 0) {
    return <View style={styles.heartsRow}><Text style={styles.heartEmpty}>🤍</Text></View>;
  }
  if (score < 0) {
    const count = Math.min(Math.abs(score), HEART_DISPLAY_MAX);
    return (
      <View style={styles.heartsRow}>
        {Array.from({ length: count }).map((_, i) => <Text key={i} style={styles.heartBroken}>💔</Text>)}
        {Math.abs(score) > HEART_DISPLAY_MAX && (
          <Text style={styles.heartOverflow}>+{Math.abs(score) - HEART_DISPLAY_MAX}</Text>
        )}
      </View>
    );
  }
  const count = Math.min(score, HEART_DISPLAY_MAX);
  return (
    <View style={styles.heartsRow}>
      {Array.from({ length: count }).map((_, i) => <Text key={i} style={styles.heartFull}>❤️</Text>)}
      {score > HEART_DISPLAY_MAX && (
        <Text style={styles.heartOverflow}>+{score - HEART_DISPLAY_MAX}</Text>
      )}
    </View>
  );
}

export default function DashboardScreen() {
  const { state } = useApp();
  const { user, clan } = useAuth();
  const router = useRouter();

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayLogs = state.logs.filter((l) => l.timestamp.startsWith(today));
  const todayDrinks = todayLogs.filter((l) => l.type === 'drink');
  const todayWorkouts = todayLogs.filter((l) => l.type === 'workout');
  const scoreColor = state.hearts > 0 ? '#E8445A' : state.hearts < 0 ? '#ff3b30' : '#aaa';

  const clanScore = clan
    ? clan.members.reduce((sum, m) => sum + m.hearts, 0)
    : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero score */}
      <View style={styles.heroCard}>
        <Text style={styles.hello}>Ciao, {user?.username} 🐷</Text>
        <Text style={styles.heartsLabel}>La tua birresponsabilità</Text>
        <Text style={[styles.heartsNumber, { color: scoreColor }]}>
          {state.hearts > 0 ? `+${state.hearts}` : state.hearts}
        </Text>
        <ScoreRow score={state.hearts} />
        {state.hearts < 0 && <Text style={styles.debtLabel}>Hai un debito da ripagare — corri! 😅</Text>}
        {state.hearts === 0 && <Text style={styles.debtLabel}>Parti da zero — fai sport!</Text>}
        {state.hearts > 0 && <Text style={styles.debtLabel}>Sei virtualmente sobrio 💪</Text>}
      </View>

      {/* Clan score */}
      {clan && (
        <>
          <Text style={styles.sectionTitle}>Il tuo clan</Text>
          <View style={styles.clanCard}>
            <View style={styles.clanHeader}>
              <Text style={styles.clanName}>🏆 {clan.name}</Text>
              <Text style={styles.clanCode}>#{clan.code}</Text>
            </View>
            <Text style={styles.clanScoreLabel}>Punteggio clan</Text>
            <Text style={[styles.clanScore, { color: clanScore! >= 0 ? '#E8445A' : '#ff3b30' }]}>
              {clanScore! > 0 ? `+${clanScore}` : clanScore}
            </Text>
            <View style={styles.membersRow}>
              {clan.members.map((m) => (
                <View key={m.id} style={styles.memberBadge}>
                  <Text style={styles.memberEmoji}>{m.id === user?.id ? '🐷' : '👤'}</Text>
                  <Text style={styles.memberName}>{m.username}</Text>
                  <Text style={[styles.memberScore, { color: m.hearts >= 0 ? '#E8445A' : '#ff3b30' }]}>
                    {m.hearts > 0 ? `+${m.hearts}` : m.hearts}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </>
      )}

      {/* Today stats */}
      <Text style={styles.sectionTitle}>Oggi</Text>
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderColor: '#FF9800' }]}>
          <Text style={styles.statIcon}>🐷</Text>
          <Text style={styles.statValue}>{todayDrinks.length}</Text>
          <Text style={styles.statLabel}>Drink</Text>
          {todayDrinks.length > 0 && (
            <Text style={styles.statSub}>
              -{todayDrinks.reduce((s, l) => s + (l.type === 'drink' ? l.heartsLost : 0), 0)} ❤️
            </Text>
          )}
        </View>
        <View style={[styles.statCard, { borderColor: '#2196F3' }]}>
          <Text style={styles.statIcon}>🏃</Text>
          <Text style={styles.statValue}>{todayWorkouts.length}</Text>
          <Text style={styles.statLabel}>Sport</Text>
          {todayWorkouts.length > 0 && (
            <Text style={styles.statSub}>
              +{todayWorkouts.reduce((s, l) => s + (l.type === 'workout' ? l.heartsGained : 0), 0)} ❤️
            </Text>
          )}
        </View>
      </View>

      {/* CTA */}
      <View style={styles.ctaRow}>
        <TouchableOpacity
          style={[styles.ctaButton, { backgroundColor: '#FF9800' }]}
          onPress={() => router.push('/(tabs)/two')}
        >
          <Text style={styles.ctaIcon}>🐷</Text>
          <Text style={styles.ctaText}>Hai bevuto?</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.ctaButton, { backgroundColor: '#2196F3' }]}
          onPress={() => router.push('/(tabs)/log-workout')}
        >
          <Text style={styles.ctaIcon}>🏃</Text>
          <Text style={styles.ctaText}>Hai corso?</Text>
        </TouchableOpacity>
      </View>

      {/* Recent */}
      {state.logs.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Ultimi log</Text>
          {state.logs.slice(0, 3).map((log) => {
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

  heroCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 28,
    alignItems: 'center', marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  hello: { fontSize: 14, color: '#aaa', marginBottom: 8 },
  heartsLabel: { fontSize: 13, color: '#aaa', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  heartsNumber: { fontSize: 72, fontWeight: '800', lineHeight: 80 },
  heartsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 8, gap: 2 },
  heartFull: { fontSize: 24 },
  heartBroken: { fontSize: 24 },
  heartEmpty: { fontSize: 24 },
  heartOverflow: { fontSize: 18, fontWeight: '700', color: '#E8445A', alignSelf: 'center', marginLeft: 4 },
  debtLabel: { fontSize: 13, color: '#aaa', marginTop: 8 },

  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: '#aaa',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10,
  },

  clanCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 24,
    borderWidth: 2, borderColor: '#FFD700',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  clanHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  clanName: { fontSize: 17, fontWeight: '800', color: '#1a1a1a' },
  clanCode: { fontSize: 12, color: '#aaa', fontWeight: '600' },
  clanScoreLabel: { fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  clanScore: { fontSize: 40, fontWeight: '800', marginBottom: 12 },
  membersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  memberBadge: {
    backgroundColor: '#f7f7f7', borderRadius: 10, padding: 10,
    alignItems: 'center', minWidth: 80,
  },
  memberEmoji: { fontSize: 20, marginBottom: 2 },
  memberName: { fontSize: 11, color: '#555', fontWeight: '600', marginBottom: 2 },
  memberScore: { fontSize: 14, fontWeight: '800' },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16,
    alignItems: 'center', borderWidth: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statIcon: { fontSize: 28, marginBottom: 4 },
  statValue: { fontSize: 32, fontWeight: '800', color: '#1a1a1a' },
  statLabel: { fontSize: 12, color: '#aaa', marginTop: 2 },
  statSub: { fontSize: 12, color: '#888', marginTop: 4 },

  ctaRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  ctaButton: {
    flex: 1, borderRadius: 16, padding: 18,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
  },
  ctaIcon: { fontSize: 28, marginBottom: 6 },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 15 },

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
