import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { WORKOUTS, DURATION_OPTIONS } from '@/constants/workouts';
import { calcHeartsGained } from '@/constants/hearts';
import { WorkoutId } from '@/types';

export default function LogWorkoutScreen() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutId | null>(null);
  const [duration, setDuration] = useState(30);

  const selected = WORKOUTS.find((w) => w.id === selectedWorkout);
  const previewCalories = selected ? selected.calPerMin * duration : 0;
  const previewHearts = selected ? calcHeartsGained(previewCalories) : 0;

  function handleLog() {
    if (!selectedWorkout) return;
    dispatch({ type: 'LOG_WORKOUT', payload: { workoutId: selectedWorkout, durationMinutes: duration } });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      'Workout loggato 💪',
      `+${previewHearts} ❤️  (${previewCalories} kcal bruciate)\nCuori attuali: ${state.hearts + previewHearts}`,
      [{ text: 'OK', onPress: () => router.push('/') }]
    );
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
              onPress={() => setSelectedWorkout(workout.id)}
            >
              <Text style={styles.workoutIcon}>{workout.icon}</Text>
              <Text style={styles.workoutName}>{workout.name}</Text>
              <Text style={styles.workoutCal}>{workout.calPerMin} kcal/min</Text>
            </TouchableOpacity>
          );
        })}
      </View>

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

      {selected && (
        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>Riepilogo</Text>
          <Text style={styles.previewLine}>
            {selected.icon} {selected.name} — {duration} min
          </Text>
          <Text style={styles.previewLine}>🔥 {previewCalories} kcal bruciate</Text>
          <Text style={styles.previewHearts}>
            +{previewHearts} ❤️  (cuori: {state.hearts} → {state.hearts + previewHearts})
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.logButton, !selectedWorkout && styles.logButtonDisabled]}
        onPress={handleLog}
        disabled={!selectedWorkout}
      >
        <Text style={styles.logButtonText}>Log Sport</Text>
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
  workoutCal: { fontSize: 12, color: '#aaa' },

  durationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  durationBtn: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 2, borderColor: '#eee',
  },
  durationBtnSelected: { borderColor: '#2196F3', backgroundColor: '#F0F7FF' },
  durationText: { fontSize: 15, fontWeight: '600', color: '#888' },
  durationTextSelected: { color: '#2196F3' },

  previewCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 24,
    borderLeftWidth: 4, borderLeftColor: '#2196F3',
  },
  previewTitle: { fontSize: 13, fontWeight: '700', color: '#aaa', marginBottom: 8, textTransform: 'uppercase' },
  previewLine: { fontSize: 15, color: '#1a1a1a', marginBottom: 4 },
  previewHearts: { fontSize: 18, fontWeight: '800', color: '#2196F3', marginTop: 8 },

  logButton: {
    backgroundColor: '#2196F3', borderRadius: 16, padding: 18,
    alignItems: 'center',
    shadowColor: '#2196F3', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  logButtonDisabled: { backgroundColor: '#ddd', shadowOpacity: 0 },
  logButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
