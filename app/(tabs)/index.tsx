import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const HEART_DISPLAY_MAX = 10;

function HeartsRow({ hearts }: { hearts: number }) {
  if (hearts === 0) {
    return (
      <View style={styles.heartsRow}>
        <Text style={styles.heartEmpty}>🤍</Text>
      </View>
    );
  }
  if (hearts < 0) {
    const count = Math.min(Math.abs(hearts), HEART_DISPLAY_MAX);
    return (
      <View style={styles.heartsRow}>
        {Array.from({ length: count }).map((_, i) => (
          <Text key={i} style={styles.heartBroken}>💔</Text>
        ))}
        {Math.abs(hearts) > HEART_DISPLAY_MAX && (
          <Text style={styles.heartOverflow}>+{Math.abs(hearts) - HEART_DISPLAY_MAX}</Text>
        )}
      </View>
    );
  }
  const displayCount = Math.min(hearts, HEART_DISPLAY_MAX);
  return (
    <View style={styles.heartsRow}>
      {Array.from({ length: displayCount }).map((_, i) => (
        <Text key={i} style={styles.heartFull}>❤️</Text>
      ))}
      {hearts > HEART_DISPLAY_MAX && (
        <Text style={styles.heartOverflow}>+{hearts - HEART_DISPLAY_MAX}</Text>
      )}
    </View>
  );
}

export default function DashboardScreen() {
  const { state } = useApp();
  const router = useRouter();

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayLogs = state.logs.filter((l) => l.timestamp.startsWith(today));
  const todayDrinks = todayLogs.filter((l) => l.type === 'drink');
  const todayWorkouts = todayLogs.filter((l) => l.type === 'workout');

  const heartColor = state.hearts > 0 ? '#E8445A' : state.hearts < 0 ? '#ff3b30' : '#aaa';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.heartsLabel}>I tuoi cuori</Text>
        <Text style={[styles.heartsNumber, { color: heartColor }]}>
          {state.hearts > 0 ? `+${state.hearts}` : state.hearts}
        </Text>
        <HeartsRow hearts={state.hearts} />
        {state.hearts < 0 && (
          <Text style={styles.debtLabel}>Hai un debito da ripagare 😅</Text>
        )}
        {state.hearts === 0 && (
          <Text style={styles.debtLabel}>Parti da zero — fai sport!</Text>
        )}
      </View>

      <Text style={styles.sectionTitle}>Oggi</Text>
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderColor: '#FF9800' }]}>
          <Text style={styles.statIcon}>🍺</Text>
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
          <Text style={styles.statLabel}>Workout</Text>
          {todayWorkouts.length > 0 && (
            <Text style={styles.statSub}>
              +{todayWorkouts.reduce((s, l) => s + (l.type === 'workout' ? l.heartsGained : 0), 0)} ❤️
            </Text>
          )}
        </View>
      </View>

      <View style={styles.ctaRow}>
        <TouchableOpacity
          style={[styles.ctaButton, { backgroundColor: '#FF9800' }]}
          onPress={() => router.push('/(tabs)/two')}
        >
          <Text style={styles.ctaIcon}>🍺</Text>
          <Text style={styles.ctaText}>Log Drink</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.ctaButton, { backgroundColor: '#2196F3' }]}
          onPress={() => router.push('/(tabs)/log-workout')}
        >
          <Text style={styles.ctaIcon}>🏃</Text>
          <Text style={styles.ctaText}>Log Sport</Text>
        </TouchableOpacity>
      </View>

      {state.logs.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Ultimi log</Text>
          {state.logs.slice(0, 3).map((log) => {
            const isWorkout = log.type === 'workout';
            return (
              <View key={log.id} style={styles.recentCard}>
                <Text style={styles.recentIcon}>{isWorkout ? '🏃' : '🍺'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recentName}>
                    {isWorkout ? log.workoutName : `${log.drinkName}${log.type === 'drink' && log.quantity > 1 ? ` x${log.quantity}` : ''}`}
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
  heartsLabel: { fontSize: 14, color: '#aaa', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  heartsNumber: { fontSize: 72, fontWeight: '800', lineHeight: 80 },
  heartsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 8, gap: 2 },
  heartFull: { fontSize: 24 },
  heartBroken: { fontSize: 24 },
  heartEmpty: { fontSize: 24 },
  heartOverflow: { fontSize: 18, fontWeight: '700', color: '#E8445A', alignSelf: 'center', marginLeft: 4 },
  debtLabel: { fontSize: 13, color: '#aaa', marginTop: 8 },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#aaa', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },

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
