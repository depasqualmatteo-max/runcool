import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '@/context/AppContext';
import { initHealth, fetchRecentWorkouts, isHealthAvailable, getLastHealthError, ImportedWorkout } from '@/lib/health';
import { calcHeartsGained } from '@/constants/hearts';
import { WORKOUT_MAP, calcWalkingCalories } from '@/constants/workouts';
import { WorkoutId } from '@/types';

const IMPORTED_KEY = 'health_imported_ids';

const VALID_WORKOUT_IDS: string[] = [
  'corsa', 'camminata', 'hiit', 'palestra', 'tennis',
  'padel', 'calcetto', 'pilates', 'nuoto', 'ciclismo', 'boxe', 'danza',
];

// Calcola cuori direttamente usando le regole RunCool
// Corsa: cuori = floor(km × 0.6) — diretto da km, senza calorie
// Camminata: cuori via calorie (35×km + 0.2×dislivello)
// Sport a durata: cuori via calorie (calPerMin × minuti)
function calcRunCoolHearts(workout: ImportedWorkout): { hearts: number; calories: number; directKm: boolean } {
  const wId = workout.mappedWorkoutId;
  if (!wId || !VALID_WORKOUT_IDS.includes(wId)) return { hearts: 0, calories: 0, directKm: false };
  const def = WORKOUT_MAP[wId as WorkoutId];
  if (!def) return { hearts: 0, calories: 0, directKm: false };

  const isKmSport = def.inputType === 'km' || def.inputType === 'km_elevation';

  // 1) Corsa con directHeartsPerKm: cuori direttamente da km
  if (def.directHeartsPerKm && workout.distanceKm && workout.distanceKm > 0) {
    const hearts = Math.max(1, Math.floor(workout.distanceKm * def.directHeartsPerKm));
    return { hearts, calories: Math.round((def.calPerKm ?? 60) * workout.distanceKm), directKm: true };
  }

  // 2) Camminata/escursione: km + dislivello → calorie → cuori
  if (isKmSport && workout.distanceKm && workout.distanceKm > 0) {
    if (def.inputType === 'km_elevation') {
      const cal = Math.round(calcWalkingCalories(workout.distanceKm, workout.elevationMeters ?? 0));
      return { hearts: calcHeartsGained(cal), calories: cal, directKm: true };
    }
    const cal = Math.round((def.calPerKm ?? 60) * workout.distanceKm);
    return { hearts: calcHeartsGained(cal), calories: cal, directKm: true };
  }

  // 3) Sport a durata
  if (workout.durationMinutes > 0) {
    const cpm = def.calPerMin ?? 7;
    const cal = Math.round(cpm * workout.durationMinutes);
    return { hearts: calcHeartsGained(cal), calories: cal, directKm: false };
  }

  // 4) Fallback: calorie da Health
  const cal = Math.round(workout.caloriesBurned);
  return { hearts: calcHeartsGained(cal), calories: cal, directKm: false };
}

export default function HealthImportScreen() {
  const { logWorkout } = useApp();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [workouts, setWorkouts] = useState<ImportedWorkout[]>([]);
  const [importing, setImporting] = useState<string | null>(null);
  const [imported, setImported] = useState<Set<string>>(new Set());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const platformName = Platform.OS === 'ios' ? 'Apple Health' : 'Google Fit';

  useEffect(() => {
    loadImported().then(() => connect());
  }, []);

  async function loadImported() {
    try {
      const raw = await AsyncStorage.getItem(IMPORTED_KEY);
      if (raw) setImported(new Set(JSON.parse(raw)));
    } catch (_) {}
  }

  async function saveImported(newSet: Set<string>) {
    setImported(newSet);
    try {
      await AsyncStorage.setItem(IMPORTED_KEY, JSON.stringify([...newSet]));
    } catch (_) {}
  }

  async function connect() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const ok = await initHealth();
      setConnected(ok);
      if (ok) {
        const w = await fetchRecentWorkouts(7);
        w.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
        setWorkouts(w);
      } else {
        setErrorMsg(getLastHealthError());
      }
    } catch (e: any) {
      setErrorMsg(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function importWorkout(workout: ImportedWorkout) {
    if (!workout.mappedWorkoutId || !VALID_WORKOUT_IDS.includes(workout.mappedWorkoutId)) {
      Alert.alert(
        'Non mappabile',
        `"${workout.name}" non corrisponde a nessun sport in RunCool. Puoi loggarlo manualmente.`,
      );
      return;
    }

    const { hearts, calories: rcCalories, directKm } = calcRunCoolHearts(workout);
    const def = WORKOUT_MAP[workout.mappedWorkoutId as WorkoutId];

    const detailLines = [
      `${workout.name} — ${workout.durationMinutes} min`,
      directKm && workout.distanceKm ? `Distanza: ${workout.distanceKm} km` : null,
      workout.elevationMeters ? `Dislivello: ${workout.elevationMeters} m` : null,
      def?.directHeartsPerKm && directKm
        ? `${workout.distanceKm} km → +${hearts} ❤️`
        : `${rcCalories} kcal → +${hearts} ❤️`,
      directKm ? '(calcolato sui km)' : '(calcolato sulla durata)',
    ].filter(Boolean).join('\n');

    Alert.alert(
      'Importa allenamento',
      `${detailLines}\n\nImportare?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Importa',
          onPress: async () => {
            setImporting(workout.id);
            try {
              await logWorkout({
                workoutId: workout.mappedWorkoutId as WorkoutId,
                durationMinutes: workout.durationMinutes,
                km: workout.distanceKm,
                elevationMeters: workout.elevationMeters,
                overrideCalories: rcCalories,
                overrideHearts: hearts,
              });
              const newSet = new Set(imported).add(workout.id);
              await saveImported(newSet);
              Alert.alert('Importato! 💪', `+${hearts} ❤️ aggiunti`);
            } catch (e: any) {
              Alert.alert('Errore', e.message);
            } finally {
              setImporting(null);
            }
          },
        },
      ],
    );
  }

  function formatDate(d: Date): string {
    const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${days[d.getDay()]} ${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  if (!isHealthAvailable()) {
    return (
      <View style={styles.center}>
        <Text style={styles.emoji}>🏥</Text>
        <Text style={styles.unavailableTitle}>Non disponibile</Text>
        <Text style={styles.unavailableSub}>
          L'integrazione Health è disponibile solo su iOS (Apple Health) e Android (Google Health Connect)
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.connectingText}>Connessione a {platformName}...</Text>
      </View>
    );
  }

  if (!connected) {
    return (
      <View style={styles.center}>
        <Text style={styles.emoji}>🏥</Text>
        <Text style={styles.unavailableTitle}>Collegamento non riuscito</Text>
        <Text style={styles.unavailableSub}>
          {Platform.OS === 'ios'
            ? 'Assicurati di aver autorizzato RunCool nelle impostazioni di Apple Health (Impostazioni → Salute → Accesso dati)'
            : 'Assicurati di avere Google Health Connect installato e di aver autorizzato RunCool'}
        </Text>
        {errorMsg && (
          <Text style={styles.errorDetail}>Dettaglio: {errorMsg}</Text>
        )}
        <TouchableOpacity style={styles.retryBtn} onPress={connect}>
          <Text style={styles.retryBtnText}>Riprova</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Text style={styles.headerEmoji}>{Platform.OS === 'ios' ? '🍎' : '💚'}</Text>
        <Text style={styles.headerTitle}>Collegato a {platformName}</Text>
        <Text style={styles.headerSub}>Allenamenti degli ultimi 7 giorni</Text>
      </View>

      {workouts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>🤷</Text>
          <Text style={styles.emptyText}>Nessun allenamento trovato negli ultimi 7 giorni</Text>
          <Text style={styles.emptySub}>Gli allenamenti registrati in {platformName} appariranno qui</Text>
        </View>
      ) : (
        workouts.map((w) => {
          const isImported = imported.has(w.id);
          const isImporting = importing === w.id;
          const { hearts, calories: rcCalories, directKm } = calcRunCoolHearts(w);
          const isMappable = w.mappedWorkoutId && VALID_WORKOUT_IDS.includes(w.mappedWorkoutId);

          return (
            <View key={w.id} style={[styles.workoutCard, isImported && styles.workoutCardImported]}>
              <View style={styles.workoutHeader}>
                <Text style={styles.workoutName}>{w.name}</Text>
                <Text style={styles.workoutDate}>{formatDate(w.startDate)}</Text>
              </View>
              <View style={styles.workoutStats}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{w.durationMinutes}</Text>
                  <Text style={styles.statLabel}>min</Text>
                </View>
                {w.distanceKm != null && (
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{w.distanceKm}</Text>
                    <Text style={styles.statLabel}>km</Text>
                  </View>
                )}
                {w.elevationMeters != null && w.elevationMeters > 0 && (
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{w.elevationMeters}</Text>
                    <Text style={styles.statLabel}>m ↑</Text>
                  </View>
                )}
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{rcCalories}</Text>
                  <Text style={styles.statLabel}>kcal RC</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: '#E8445A' }]}>+{hearts}</Text>
                  <Text style={styles.statLabel}>❤️</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { fontSize: 11 }]}>{directKm ? '📍 km' : '⏱ dur'}</Text>
                  <Text style={styles.statLabel}>metodo</Text>
                </View>
              </View>

              {isImported ? (
                <View style={styles.importedBadge}>
                  <Text style={styles.importedText}>✅ Importato</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.importBtn, !isMappable && styles.importBtnDisabled]}
                  onPress={() => importWorkout(w)}
                  disabled={isImporting || !isMappable}
                >
                  {isImporting ? (
                    <ActivityIndicator color="#1a1a1a" />
                  ) : (
                    <Text style={styles.importBtnText}>
                      {isMappable ? 'Importa in RunCool' : 'Non mappabile'}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          );
        })
      )}

      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backBtnText}>Torna indietro</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f7' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },

  emoji: { fontSize: 48, marginBottom: 16 },
  connectingText: { marginTop: 16, fontSize: 14, color: '#888' },
  unavailableTitle: { fontSize: 20, fontWeight: '800', color: '#1a1a1a', marginBottom: 8 },
  unavailableSub: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20 },
  errorDetail: { marginTop: 16, fontSize: 11, color: '#E8445A', textAlign: 'center', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  retryBtn: { marginTop: 24, backgroundColor: '#FFD700', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  retryBtnText: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },

  headerCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center',
    marginBottom: 16, borderWidth: 2, borderColor: '#4CAF50',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  headerEmoji: { fontSize: 36, marginBottom: 8 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a', marginBottom: 4 },
  headerSub: { fontSize: 13, color: '#888' },

  emptyCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center',
    marginBottom: 16,
  },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#888', textAlign: 'center', marginBottom: 6 },
  emptySub: { fontSize: 12, color: '#bbb', textAlign: 'center', lineHeight: 18 },

  workoutCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  workoutCardImported: { borderWidth: 2, borderColor: '#4CAF50', backgroundColor: '#f0fff0' },
  workoutHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  workoutName: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  workoutDate: { fontSize: 12, color: '#aaa', fontWeight: '600' },
  workoutStats: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
  statLabel: { fontSize: 11, color: '#aaa', marginTop: 2 },

  importBtn: {
    backgroundColor: '#FFD700', borderRadius: 10, padding: 12, alignItems: 'center',
  },
  importBtnDisabled: { backgroundColor: '#eee' },
  importBtnText: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  importedBadge: { backgroundColor: '#e8f5e9', borderRadius: 10, padding: 12, alignItems: 'center' },
  importedText: { fontSize: 14, fontWeight: '700', color: '#2e7d32' },

  backBtn: { alignSelf: 'center', marginTop: 8, paddingVertical: 12, paddingHorizontal: 24 },
  backBtnText: { fontSize: 14, fontWeight: '600', color: '#888' },
});
