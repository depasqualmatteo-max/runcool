import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, TextInput, Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { WORKOUTS, DURATION_OPTIONS, calcWalkingCalories } from '@/constants/workouts';
import { calcHeartsGained } from '@/constants/hearts';
import { WorkoutId } from '@/types';

export default function LogWorkoutScreen() {
  const { state, logWorkout } = useApp();
  const router = useRouter();
  const [logging, setLogging] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutId | null>(null);
  const [duration, setDuration] = useState(30);
  const [km, setKm] = useState('');
  const [elevation, setElevation] = useState('');

  const selected = WORKOUTS.find((w) => w.id === selectedWorkout);

  function calcPreviewCalories(): number {
    if (!selected) return 0;
    if (selected.inputType === 'duration') {
      return (selected.calPerMin ?? 0) * duration;
    }
    if (selected.inputType === 'km') {
      const k = parseFloat(km) || 0;
      return Math.round((selected.calPerKm ?? 75) * k);
    }
    if (selected.inputType === 'km_elevation') {
      const k = parseFloat(km) || 0;
      const e = parseInt(elevation) || 0;
      return calcWalkingCalories(k, e);
    }
    return 0;
  }

  const previewCalories = calcPreviewCalories();
  const previewHearts = calcHeartsGained(previewCalories);

  function isReadyToLog(): boolean {
    if (!selected) return false;
    if (selected.inputType === 'duration') return true;
    const k = parseFloat(km);
    return !isNaN(k) && k > 0;
  }

  async function handleLog() {
    if (!selectedWorkout || !selected || logging) return;
    const k = parseFloat(km) || undefined;
    const e = parseInt(elevation) || undefined;
    setLogging(true);
    try {
      await logWorkout({
        workoutId: selectedWorkout,
        durationMinutes: selected.inputType === 'duration' ? duration : undefined,
        km: selected.inputType !== 'duration' ? k : undefined,
        elevationMeters: selected.inputType === 'km_elevation' ? e : undefined,
      });
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (Platform.OS === 'web') {
        alert(`Sport loggato 💪\n+${previewHearts} ❤️ (${previewCalories} kcal bruciate)`);
        router.push('/');
      } else {
        Alert.alert(
          'Sport loggato 💪',
          `+${previewHearts} ❤️  (${previewCalories} kcal bruciate)\nBirresponsabilità: ${state.hearts} → ${state.hearts + previewHearts}`,
          [{ text: 'Forza!', onPress: () => router.push('/') }]
        );
      }
    } catch (e: any) {
      Alert.alert('Errore', e.message);
    } finally {
      setLogging(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Che sport hai fatto?</Text>

      <View style={styles.grid}>
        {WORKOUTS.map((workout) => {
          const isSelected = selectedWorkout === workout.id;
          return (
            <TouchableOpacity
              key={workout.id}
              style={[styles.workoutCard, isSelected && styles.workoutCardSelected]}
              onPress={() => {
                setSelectedWorkout(workout.id);
                setKm('');
                setElevation('');
              }}
            >
              <Text style={styles.workoutIcon}>{workout.icon}</Text>
              <Text style={styles.workoutName}>{workout.name}</Text>
              <Text style={styles.workoutMeta}>
                {workout.inputType === 'duration'
                  ? `${workout.calPerMin} kcal/min`
                  : workout.inputType === 'km'
                  ? `${workout.calPerKm} kcal/km`
                  : 'km + dislivello'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Duration selector */}
      {selected?.inputType === 'duration' && (
        <>
          <Text style={styles.sectionTitle}>Durata</Text>
          <View style={styles.durationRow}>
            {DURATION_OPTIONS.map((min) => (
              <TouchableOpacity
                key={min}
                style={[styles.durationBtn, duration === min && styles.durationBtnSelected]}
                onPress={() => setDuration(min)}
              >
                <Text style={[styles.durationText, duration === min && styles.durationTextSelected]}>
                  {min < 60 ? `${min}m` : `${min / 60}h`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* Km input (corsa) */}
      {selected?.inputType === 'km' && (
        <>
          <Text style={styles.sectionTitle}>Distanza</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.numInput}
              value={km}
              onChangeText={setKm}
              keyboardType="decimal-pad"
              placeholder="0.0"
              placeholderTextColor="#bbb"
            />
            <Text style={styles.inputUnit}>km</Text>
          </View>
        </>
      )}

      {/* Km + elevation (camminata) */}
      {selected?.inputType === 'km_elevation' && (
        <>
          <Text style={styles.sectionTitle}>Distanza e dislivello</Text>
          <View style={styles.kmElevRow}>
            <View style={styles.inputGroup}>
              <TextInput
                style={styles.numInput}
                value={km}
                onChangeText={setKm}
                keyboardType="decimal-pad"
                placeholder="0.0"
                placeholderTextColor="#bbb"
              />
              <Text style={styles.inputUnit}>km</Text>
            </View>
            <View style={styles.inputGroup}>
              <TextInput
                style={styles.numInput}
                value={elevation}
                onChangeText={setElevation}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor="#bbb"
              />
              <Text style={styles.inputUnit}>m ↑</Text>
            </View>
          </View>
          <Text style={styles.formulaNote}>
            Formula: 60 kcal/km + 0.5 kcal/m di dislivello
          </Text>
        </>
      )}

      {selected && (
        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>Riepilogo</Text>
          <Text style={styles.previewLine}>
            {selected.icon} {selected.name}
            {selected.inputType === 'duration' && ` — ${duration} min`}
            {selected.inputType === 'km' && km ? ` — ${km} km` : ''}
            {selected.inputType === 'km_elevation' && km ? ` — ${km} km${elevation ? `, +${elevation}m` : ''}` : ''}
          </Text>
          <Text style={styles.previewLine}>🔥 {previewCalories} kcal bruciate</Text>
          <Text style={styles.previewHearts}>
            +{previewHearts} ❤️  ({state.hearts} → {state.hearts + previewHearts})
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.logButton, (!isReadyToLog() || logging) && styles.logButtonDisabled]}
        onPress={handleLog}
        disabled={!isReadyToLog() || logging}
      >
        <Text style={styles.logButtonText}>Log Sport 💪</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f7' },
  content: { padding: 20, paddingBottom: 40 },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#aaa', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  workoutCard: {
    width: '47%', backgroundColor: '#fff', borderRadius: 14, padding: 14,
    alignItems: 'center', borderWidth: 2, borderColor: 'transparent',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  workoutCardSelected: { borderColor: '#2196F3', backgroundColor: '#F0F7FF' },
  workoutIcon: { fontSize: 32, marginBottom: 6 },
  workoutName: { fontSize: 13, fontWeight: '600', color: '#1a1a1a', marginBottom: 2 },
  workoutMeta: { fontSize: 11, color: '#aaa' },

  durationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  durationBtn: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 2, borderColor: '#eee',
  },
  durationBtnSelected: { borderColor: '#2196F3', backgroundColor: '#F0F7FF' },
  durationText: { fontSize: 15, fontWeight: '600', color: '#888' },
  durationTextSelected: { color: '#2196F3' },

  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  kmElevRow: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  inputGroup: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  numInput: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16,
    fontSize: 24, fontWeight: '700', color: '#1a1a1a', textAlign: 'center',
    borderWidth: 2, borderColor: '#eee',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  inputUnit: { fontSize: 16, fontWeight: '700', color: '#2196F3' },
  formulaNote: { fontSize: 11, color: '#bbb', marginBottom: 24, fontStyle: 'italic' },

  previewCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 24,
    borderLeftWidth: 4, borderLeftColor: '#2196F3',
  },
  previewTitle: { fontSize: 13, fontWeight: '700', color: '#aaa', marginBottom: 8, textTransform: 'uppercase' },
  previewLine: { fontSize: 15, color: '#1a1a1a', marginBottom: 4 },
  previewHearts: { fontSize: 18, fontWeight: '800', color: '#2196F3', marginTop: 8 },

  logButton: {
    backgroundColor: '#2196F3', borderRadius: 16, padding: 18, alignItems: 'center',
    shadowColor: '#2196F3', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  logButtonDisabled: { backgroundColor: '#ddd', shadowOpacity: 0 },
  logButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
