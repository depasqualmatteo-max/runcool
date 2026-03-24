import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useApp } from '@/context/AppContext';
import { LogEntry } from '@/types';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

function LogCard({ log, onDelete }: { log: LogEntry; onDelete: () => void }) {
  const isWorkout = log.type === 'workout';
  const name = isWorkout ? log.workoutName : log.drinkName;
  const emoji = isWorkout ? '🏃' : '🐷';
  const delta = isWorkout ? `+${log.heartsGained} ❤️` : `-${log.heartsLost} ❤️`;
  const deltaColor = isWorkout ? '#2196F3' : '#E8445A';

  let subtitle = '';
  if (log.type === 'drink') {
    subtitle = `${log.quantity > 1 ? `x${log.quantity} — ` : ''}${log.calories} kcal`;
  } else {
    if (log.km !== undefined) {
      subtitle = `${log.km} km${log.elevationMeters ? ` +${log.elevationMeters}m` : ''} — ${log.calories} kcal`;
    } else {
      subtitle = `${log.durationMinutes} min — ${log.calories} kcal`;
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardEmoji}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardName}>{name}</Text>
        <Text style={styles.cardSub}>{subtitle}</Text>
        <Text style={styles.cardTime}>
          {format(new Date(log.timestamp), "d MMM 'alle' HH:mm", { locale: it })}
        </Text>
      </View>
      <View style={styles.cardRight}>
        <Text style={[styles.cardDelta, { color: deltaColor }]}>{delta}</Text>
        <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
          <Text style={styles.deleteBtnText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const { state, deleteLog } = useApp();

  function confirmDelete(id: string) {
    Alert.alert('Elimina log', 'Sei sicuro? La birresponsabilità verrà ripristinata.', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina', style: 'destructive',
        onPress: () => deleteLog(id),
      },
    ]);
  }

  if (state.logs.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>📋</Text>
        <Text style={styles.emptyTitle}>Nessun log ancora</Text>
        <Text style={styles.emptySub}>Inizia a loggare drink e sport, maialino!</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={state.logs}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <LogCard log={item} onDelete={() => confirmDelete(item.id)} />
      )}
      ListHeaderComponent={
        <Text style={styles.sectionTitle}>{state.logs.length} log totali</Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f7' },
  content: { padding: 20, paddingBottom: 40 },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#aaa', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },

  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardEmoji: { fontSize: 28, marginRight: 14 },
  cardName: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  cardSub: { fontSize: 13, color: '#888', marginTop: 2 },
  cardTime: { fontSize: 12, color: '#bbb', marginTop: 3 },
  cardRight: { alignItems: 'flex-end', gap: 8 },
  cardDelta: { fontSize: 15, fontWeight: '800' },
  deleteBtn: { padding: 4 },
  deleteBtnText: { fontSize: 14, color: '#ccc', fontWeight: '700' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  emptySub: { fontSize: 15, color: '#aaa', textAlign: 'center' },
});
