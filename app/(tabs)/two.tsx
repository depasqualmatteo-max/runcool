import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { DRINKS } from '@/constants/drinks';
import { calcHeartsLost } from '@/constants/hearts';
import { DrinkId } from '@/types';

export default function LogDrinkScreen() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const [selectedDrink, setSelectedDrink] = useState<DrinkId | null>(null);
  const [quantity, setQuantity] = useState(1);

  const selected = DRINKS.find((d) => d.id === selectedDrink);
  const previewCalories = selected ? selected.calories * quantity : 0;
  const previewHearts = selected ? calcHeartsLost(previewCalories) : 0;

  function handleLog() {
    if (!selectedDrink) return;
    dispatch({ type: 'LOG_DRINK', payload: { drinkId: selectedDrink, quantity } });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Drink loggato 🍺',
      `-${previewHearts} ❤️  (${previewCalories} kcal)\nCuori attuali: ${state.hearts - previewHearts}`,
      [{ text: 'OK', onPress: () => router.push('/') }]
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Cosa hai bevuto?</Text>

      <View style={styles.grid}>
        {DRINKS.map((drink) => {
          const hearts = calcHeartsLost(drink.calories);
          const isSelected = selectedDrink === drink.id;
          return (
            <TouchableOpacity
              key={drink.id}
              style={[styles.drinkCard, isSelected && styles.drinkCardSelected]}
              onPress={() => { setSelectedDrink(drink.id); setQuantity(1); }}
            >
              <Text style={styles.drinkIcon}>{drink.icon}</Text>
              <Text style={styles.drinkName}>{drink.name}</Text>
              <Text style={styles.drinkCal}>{drink.calories} kcal</Text>
              <Text style={styles.drinkHearts}>-{hearts} ❤️</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {selected && (
        <View style={styles.quantitySection}>
          <Text style={styles.sectionTitle}>Quanti?</Text>
          <View style={styles.quantityRow}>
            <TouchableOpacity
              style={styles.qBtn}
              onPress={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              <Text style={styles.qBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.quantityNumber}>{quantity}</Text>
            <TouchableOpacity
              style={styles.qBtn}
              onPress={() => setQuantity((q) => q + 1)}
            >
              <Text style={styles.qBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {selected && (
        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>Riepilogo</Text>
          <Text style={styles.previewLine}>
            {selected.icon} {selected.name} × {quantity}
          </Text>
          <Text style={styles.previewLine}>🔥 {previewCalories} kcal totali</Text>
          <Text style={[styles.previewHearts]}>
            -{previewHearts} ❤️  (cuori: {state.hearts} → {state.hearts - previewHearts})
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.logButton, !selectedDrink && styles.logButtonDisabled]}
        onPress={handleLog}
        disabled={!selectedDrink}
      >
        <Text style={styles.logButtonText}>Log Drink</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f7' },
  content: { padding: 20, paddingBottom: 40 },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#aaa', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  drinkCard: {
    width: '47%', backgroundColor: '#fff', borderRadius: 14, padding: 14,
    alignItems: 'center', borderWidth: 2, borderColor: 'transparent',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  drinkCardSelected: { borderColor: '#FF9800', backgroundColor: '#FFF8F0' },
  drinkIcon: { fontSize: 32, marginBottom: 6 },
  drinkName: { fontSize: 13, fontWeight: '600', color: '#1a1a1a', textAlign: 'center', marginBottom: 2 },
  drinkCal: { fontSize: 12, color: '#aaa' },
  drinkHearts: { fontSize: 13, color: '#E8445A', fontWeight: '700', marginTop: 4 },

  quantitySection: { marginBottom: 20 },
  quantityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
  qBtn: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#FF9800',
    alignItems: 'center', justifyContent: 'center',
  },
  qBtnText: { fontSize: 24, color: '#fff', fontWeight: '700', lineHeight: 28 },
  quantityNumber: { fontSize: 40, fontWeight: '800', color: '#1a1a1a', minWidth: 48, textAlign: 'center' },

  previewCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 24,
    borderLeftWidth: 4, borderLeftColor: '#E8445A',
  },
  previewTitle: { fontSize: 13, fontWeight: '700', color: '#aaa', marginBottom: 8, textTransform: 'uppercase' },
  previewLine: { fontSize: 15, color: '#1a1a1a', marginBottom: 4 },
  previewHearts: { fontSize: 18, fontWeight: '800', color: '#E8445A', marginTop: 8 },

  logButton: {
    backgroundColor: '#FF9800', borderRadius: 16, padding: 18,
    alignItems: 'center',
    shadowColor: '#FF9800', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  logButtonDisabled: { backgroundColor: '#ddd', shadowOpacity: 0 },
  logButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
