import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, Alert, Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { DRINKS } from '@/constants/drinks';
import { calcHeartsLost } from '@/constants/hearts';
import { DrinkId } from '@/types';

export default function LogDrinkScreen() {
  const { state, logDrink } = useApp();
  const router = useRouter();
  const [logging, setLogging] = useState(false);
  const [selectedDrink, setSelectedDrink] = useState<DrinkId | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [bottModal, setBottModal] = useState(false);
  const [bottQty, setBottQty] = useState(1);
  const [bottPeople, setBottPeople] = useState(1);

  const selected = DRINKS.find((d) => d.id === selectedDrink);
  const previewCalories = selected ? selected.calories * quantity : 0;
  const previewHearts = selected ? calcHeartsLost(previewCalories) : 0;

  function handleSelectDrink(id: DrinkId) {
    const drink = DRINKS.find((d) => d.id === id)!;
    if (drink.hasQuantityPrompt) {
      setBottQty(1);
      setBottModal(true);
    } else {
      setSelectedDrink(id);
      setQuantity(1);
    }
  }

  function confirmBott() {
    // quota per persona: bottiglie / maialini (può essere frazionaria)
    const shareRatio = bottQty / bottPeople;
    setSelectedDrink('bottiglia_vino');
    setQuantity(shareRatio);
    setBottModal(false);
  }

  async function handleLog() {
    if (!selectedDrink || logging) return;
    setLogging(true);
    try {
      await logDrink(selectedDrink, quantity);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      if (Platform.OS === 'web') {
        alert(`Trincato loggato 🐷\n-${previewHearts} ❤️ (${previewCalories} kcal)`);
        router.push('/');
      } else {
        Alert.alert(
          'Trincato loggato 🐷',
          `-${previewHearts} ❤️  (${previewCalories} kcal)\nBirresponsabilità: ${state.hearts} → ${state.hearts - previewHearts}`,
          [{ text: 'Vergogna!', onPress: () => router.push('/') }]
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
      <Text style={styles.bigQuestion}>Cosa ti sei trincato, maialino? 🐷</Text>

      <View style={styles.grid}>
        {DRINKS.map((drink) => {
          const hearts = calcHeartsLost(drink.calories);
          const isSelected = selectedDrink === drink.id;
          return (
            <TouchableOpacity
              key={drink.id}
              style={[styles.drinkCard, isSelected && styles.drinkCardSelected]}
              onPress={() => handleSelectDrink(drink.id)}
            >
              <Text style={styles.drinkIcon}>{drink.icon}</Text>
              <Text style={styles.drinkName}>{drink.name}</Text>
              <Text style={styles.drinkCal}>{drink.calories} kcal</Text>
              <Text style={styles.drinkHearts}>-{hearts} ❤️</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {selected && !selected.hasQuantityPrompt && (
        <View style={styles.quantitySection}>
          <Text style={styles.sectionTitle}>Quanti, maialino? 🐷</Text>
          <View style={styles.quantityRow}>
            <TouchableOpacity style={styles.qBtn} onPress={() => setQuantity((q) => Math.max(1, q - 1))}>
              <Text style={styles.qBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.quantityNumber}>{quantity}</Text>
            <TouchableOpacity style={styles.qBtn} onPress={() => setQuantity((q) => q + 1)}>
              <Text style={styles.qBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {selected && (
        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>Riepilogo, maialino</Text>
          <Text style={styles.previewLine}>{selected.icon} {selected.name} × {quantity}</Text>
          <Text style={styles.previewLine}>🔥 {previewCalories} kcal totali</Text>
          <Text style={styles.previewHearts}>
            -{previewHearts} ❤️  ({state.hearts} → {state.hearts - previewHearts})
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.logButton, (!selectedDrink || logging) && styles.logButtonDisabled]}
        onPress={handleLog}
        disabled={!selectedDrink || logging}
      >
        <Text style={styles.logButtonText}>Ho trincato! 🐷</Text>
      </TouchableOpacity>

      {/* Modal for bottiglia di vino */}
      <Modal visible={bottModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🍾 Bottiglia di Vino</Text>

            <Text style={styles.modalSectionLabel}>Quante bottiglie?</Text>
            <View style={styles.quantityRow}>
              <TouchableOpacity style={styles.qBtn} onPress={() => setBottQty((q) => Math.max(1, q - 1))}>
                <Text style={styles.qBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.quantityNumber}>{bottQty}</Text>
              <TouchableOpacity style={styles.qBtn} onPress={() => setBottQty((q) => q + 1)}>
                <Text style={styles.qBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSectionLabel}>Quanti maialini? 🐷</Text>
            <Text style={styles.modalSectionSub}>(compreso te)</Text>
            <View style={styles.quantityRow}>
              <TouchableOpacity style={styles.qBtn} onPress={() => setBottPeople((q) => Math.max(1, q - 1))}>
                <Text style={styles.qBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.quantityNumber}>{bottPeople}</Text>
              <TouchableOpacity style={styles.qBtn} onPress={() => setBottPeople((q) => q + 1)}>
                <Text style={styles.qBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalCalcBox}>
              <Text style={styles.modalCalcText}>
                {bottQty} bott. × 600 kcal ÷ {bottPeople} 🐷 ={' '}
                <Text style={{ fontWeight: '800', color: '#E8445A' }}>
                  {Math.round((bottQty * 600) / bottPeople)} kcal
                </Text>
              </Text>
              <Text style={styles.modalCalcSub}>
                -{calcHeartsLost(Math.round((bottQty * 600) / bottPeople))} ❤️ a testa
              </Text>
            </View>

            <TouchableOpacity style={styles.modalConfirm} onPress={confirmBott}>
              <Text style={styles.modalConfirmText}>Conferma</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setBottModal(false)}>
              <Text style={styles.modalCancelText}>Annulla</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f7' },
  content: { padding: 20, paddingBottom: 40 },

  bigQuestion: { fontSize: 20, fontWeight: '800', color: '#1a1a1a', marginBottom: 20, textAlign: 'center' },
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
    backgroundColor: '#FF9800', borderRadius: 16, padding: 18, alignItems: 'center',
    shadowColor: '#FF9800', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  logButtonDisabled: { backgroundColor: '#ddd', shadowOpacity: 0 },
  logButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  modalCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 32,
    width: '100%', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 20, elevation: 10,
  },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#1a1a1a', marginBottom: 16 },
  modalSub: { fontSize: 14, color: '#aaa', marginBottom: 24 },
  modalSectionLabel: { fontSize: 13, fontWeight: '700', color: '#555', letterSpacing: 0.5, marginTop: 8, marginBottom: 4, alignSelf: 'flex-start' },
  modalSectionSub: { fontSize: 11, color: '#aaa', alignSelf: 'flex-start', marginBottom: 8 },
  modalCalcBox: {
    backgroundColor: '#FFF8F0', borderRadius: 12, padding: 14,
    width: '100%', alignItems: 'center', marginTop: 16, marginBottom: 4,
    borderWidth: 1, borderColor: '#FFE0B2',
  },
  modalCalcText: { fontSize: 14, color: '#555' },
  modalCalcSub: { fontSize: 16, fontWeight: '700', color: '#E8445A', marginTop: 4 },
  modalConfirm: {
    backgroundColor: '#E8445A', borderRadius: 14, padding: 16,
    width: '100%', alignItems: 'center', marginTop: 24, marginBottom: 10,
  },
  modalConfirmText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalCancel: { padding: 10 },
  modalCancelText: { color: '#aaa', fontSize: 14 },
});
