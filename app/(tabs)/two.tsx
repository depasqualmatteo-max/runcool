import React, { useState, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, Alert, Platform, TextInput, LayoutAnimation, UIManager,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { DRINKS } from '@/constants/drinks';
import { DrinkId } from '@/types';
import PostLogModal from '@/components/PostLogModal';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeColors } from '@/constants/Colors';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Category = { id: string; label: string; icon: string; drinkIds: DrinkId[] };

const CATEGORIES: Category[] = [
  { id: 'birra', label: 'Birra', icon: '🍺', drinkIds: ['birra_piccola', 'birra_media'] },
  { id: 'vino',  label: 'Vino',  icon: '🍷', drinkIds: ['calice_vino', 'bottiglia_vino'] },
];

const DIRECT_DRINKS: DrinkId[] = ['cocktail', 'amaro'];

const EVENT_DRINK_IDS: DrinkId[] = ['evento_matrimonio', 'evento_barca'];

export default function LogDrinkScreen() {
  const { state, logDrink } = useApp();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [logging, setLogging] = useState(false);
  const [postLogId, setPostLogId] = useState<string | null>(null);
  const [selectedDrink, setSelectedDrink] = useState<DrinkId | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [bottModal, setBottModal] = useState(false);
  const [bottQty, setBottQty] = useState(1);
  const [bottPeople, setBottPeople] = useState(1);
  const [daysAgo, setDaysAgo] = useState(0);
  const [showDateModal, setShowDateModal] = useState(false);
  const [dateInput, setDateInput] = useState('');
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  const [eventsOpen, setEventsOpen] = useState(false);

  const selected = DRINKS.find((d) => d.id === selectedDrink);
  const previewHearts = selected ? Math.round(selected.heartsLost * quantity) : 0;

  function toggleCategory(id: string) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  function toggleEvents() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setEventsOpen(v => !v);
  }

  function handleSelectDrink(id: DrinkId) {
    const drink = DRINKS.find((d) => d.id === id)!;
    if (drink.hasQuantityPrompt) {
      setBottQty(1);
      setBottModal(true);
    } else {
      setSelectedDrink(id);
      setQuantity(1);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  function confirmBott() {
    const shareRatio = bottQty / bottPeople;
    setSelectedDrink('bottiglia_vino');
    setQuantity(shareRatio);
    setBottModal(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
  }

  const activityDate = (() => { const d = new Date(); d.setDate(d.getDate() - daysAgo); d.setHours(0,0,0,0); return d; })();
  const activityDateLocal = `${activityDate.getFullYear()}-${String(activityDate.getMonth()+1).padStart(2,'0')}-${String(activityDate.getDate()).padStart(2,'0')}`;
  const dateLabel = daysAgo === 0 ? 'Oggi' : daysAgo === 1 ? 'Ieri' : activityDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });

  function confirmDateInput() {
    const parts = dateInput.trim().split('/');
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const year = parts[2] ? parseInt(parts[2]) : new Date().getFullYear();
    const parsed = new Date(year, month, day);
    if (isNaN(parsed.getTime()) || parsed > new Date()) {
      Alert.alert('Data non valida', 'Inserisci la data nel formato GG/MM o GG/MM/AAAA');
      return;
    }
    const diff = Math.round((new Date().setHours(0,0,0,0) - parsed.setHours(0,0,0,0)) / 86400000);
    setDaysAgo(diff);
    setShowDateModal(false);
    setDateInput('');
  }

  async function handleLog() {
    if (!selectedDrink || logging) return;
    setLogging(true);
    try {
      const logId = await logDrink(selectedDrink, quantity, activityDateLocal);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setPostLogId(logId);
    } catch (e: any) {
      Alert.alert('Errore', e.message);
    } finally {
      setLogging(false);
    }
  }

  return (
    <>
    <ScrollView ref={scrollRef} style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.bigQuestion}>Cosa ti sei trincato, maialino? 🐷</Text>

      {CATEGORIES.map((cat) => {
        const isOpen = openCategories.has(cat.id);
        return (
          <View key={cat.id} style={styles.categoryWrap}>
            <TouchableOpacity style={styles.categoryRow} onPress={() => toggleCategory(cat.id)} activeOpacity={0.75}>
              <Text style={styles.categoryIcon}>{cat.icon}</Text>
              <Text style={styles.categoryLabel}>{cat.label}</Text>
              <Text style={[styles.categoryChevron, isOpen && styles.categoryChevronOpen]}>›</Text>
            </TouchableOpacity>
            {isOpen && (
              <View style={styles.drinkList}>
                {cat.drinkIds.map((id) => {
                  const drink = DRINKS.find((d) => d.id === id)!;
                  const isSelected = selectedDrink === id;
                  return (
                    <TouchableOpacity
                      key={id}
                      style={[styles.drinkRow, isSelected && styles.drinkRowSelected]}
                      onPress={() => handleSelectDrink(id)}
                    >
                      <Text style={styles.drinkRowIcon}>{drink.icon}</Text>
                      <Text style={styles.drinkRowName}>{drink.name}</Text>
                      <Text style={styles.drinkRowHearts}>-{drink.heartsLost} ❤️</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}

      {DIRECT_DRINKS.map((id) => {
        const drink = DRINKS.find((d) => d.id === id)!;
        const isSelected = selectedDrink === id;
        return (
          <TouchableOpacity
            key={id}
            style={[styles.categoryWrap, styles.directRow, isSelected && styles.directRowSelected]}
            onPress={() => handleSelectDrink(id)}
            activeOpacity={0.75}
          >
            <Text style={styles.categoryIcon}>{drink.icon}</Text>
            <Text style={styles.categoryLabel}>{drink.name}</Text>
            <Text style={styles.drinkRowHearts}>-{drink.heartsLost} ❤️</Text>
          </TouchableOpacity>
        );
      })}

      <View style={[styles.categoryWrap, styles.eventsWrap]}>
        <TouchableOpacity style={styles.categoryRow} onPress={toggleEvents} activeOpacity={0.75}>
          <Text style={styles.categoryIcon}>🎉</Text>
          <Text style={styles.categoryLabel}>Eventi</Text>
          <Text style={[styles.categoryChevron, eventsOpen && styles.categoryChevronOpen]}>›</Text>
        </TouchableOpacity>
        {eventsOpen && (
          <View style={styles.drinkList}>
            {EVENT_DRINK_IDS.map((id) => {
              const drink = DRINKS.find((d) => d.id === id)!;
              const isSelected = selectedDrink === id;
              return (
                <TouchableOpacity
                  key={id}
                  style={[styles.drinkRow, isSelected && styles.drinkRowSelected]}
                  onPress={() => handleSelectDrink(id)}
                >
                  <Text style={styles.drinkRowIcon}>{drink.icon}</Text>
                  <Text style={styles.drinkRowName}>{drink.name}</Text>
                  <Text style={styles.drinkRowHearts}>-{drink.heartsLost} ❤️</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {selected && !selected.hasQuantityPrompt && !selected.id.startsWith('evento_') && (
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
          <Text style={styles.previewLine}>{selected.icon} {selected.name}{!selected.id.startsWith('evento_') ? ` × ${quantity}` : ''}</Text>
          <Text style={styles.previewHearts}>
            -{previewHearts} ❤️  ({state.hearts} → {state.hearts - previewHearts})
          </Text>
        </View>
      )}

      {/* Selettore data */}
      <View style={styles.dateRow}>
        <TouchableOpacity style={styles.dateArrow} onPress={() => setDaysAgo(d => d + 1)}>
          <Text style={styles.dateArrowText}>‹</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dateLabelWrap} onPress={() => setDaysAgo(0)} disabled={daysAgo === 0}>
          <Text style={styles.dateLabelText}>{dateLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.dateArrow, daysAgo === 0 && styles.dateArrowDisabled]} onPress={() => setDaysAgo(d => Math.max(0, d - 1))} disabled={daysAgo === 0}>
          <Text style={styles.dateArrowText}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dateCalBtn} onPress={() => { setDateInput(''); setShowDateModal(true); }}>
          <Text style={styles.dateCalText}>📅</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showDateModal} transparent animationType="fade">
        <View style={styles.dateModalOverlay}>
          <View style={styles.dateModalBox}>
            <Text style={styles.dateModalTitle}>Inserisci la data</Text>
            <TextInput
              style={styles.dateModalInput}
              value={dateInput}
              onChangeText={setDateInput}
              placeholder="GG/MM o GG/MM/AAAA"
              placeholderTextColor="#bbb"
              keyboardType="numbers-and-punctuation"
              autoFocus
            />
            <View style={styles.dateModalBtns}>
              <TouchableOpacity style={styles.dateModalCancel} onPress={() => setShowDateModal(false)}>
                <Text style={{ color: colors.textDim, fontWeight: '700' }}>Annulla</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dateModalConfirm} onPress={confirmDateInput}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Conferma</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
                {bottQty} bott. × 720 kcal ÷ {bottPeople} 🐷 ={' '}
                <Text style={{ fontWeight: '800', color: '#E8445A' }}>
                  {Math.round((bottQty * 720) / bottPeople)} kcal
                </Text>
              </Text>
              <Text style={styles.modalCalcSub}>
                -{Math.max(1, Math.round((bottQty * 6) / bottPeople))} ❤️ a testa
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
    <PostLogModal
      visible={postLogId !== null}
      logId={postLogId}
      onDone={() => { setPostLogId(null); router.replace('/'); }}
    />
    </>
  );
}

function makeStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 20, paddingBottom: 40 },

    bigQuestion: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 20, textAlign: 'center' },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textFaint, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },

    categoryWrap: {
      backgroundColor: colors.card, borderRadius: 16, marginBottom: 10, overflow: 'hidden',
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0 : 0.05, shadowRadius: 4, elevation: isDark ? 0 : 2,
    },
    directRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
    directRowSelected: { borderWidth: 2, borderColor: '#FF9800', backgroundColor: isDark ? '#332313' : '#FFF8F0' },
    eventsWrap: { marginTop: 8, borderWidth: 1.5, borderColor: isDark ? '#3a2c1a' : '#FFE0B2' },
    categoryRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
    categoryIcon: { fontSize: 26 },
    categoryLabel: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.text },
    categoryChevron: { fontSize: 24, color: colors.textFaint, fontWeight: '300' },
    categoryChevronOpen: { color: '#FF9800' },
    drinkList: { borderTopWidth: 1, borderTopColor: colors.border },
    drinkRow: {
      flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16, gap: 12,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
    },
    drinkRowSelected: { backgroundColor: isDark ? '#332313' : '#FFF8F0' },
    drinkRowIcon: { fontSize: 22, width: 30, textAlign: 'center' },
    drinkRowName: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
    drinkRowHearts: { fontSize: 14, color: '#E8445A', fontWeight: '700' },

    quantitySection: { marginBottom: 20, marginTop: 4 },
    quantityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
    qBtn: {
      width: 48, height: 48, borderRadius: 24, backgroundColor: '#FF9800',
      alignItems: 'center', justifyContent: 'center',
    },
    qBtnText: { fontSize: 24, color: '#fff', fontWeight: '700', lineHeight: 28 },
    quantityNumber: { fontSize: 40, fontWeight: '800', color: colors.text, minWidth: 48, textAlign: 'center' },

    previewCard: {
      backgroundColor: colors.card, borderRadius: 16, padding: 20, marginBottom: 24, marginTop: 8,
      borderLeftWidth: 4, borderLeftColor: '#E8445A',
    },
    previewTitle: { fontSize: 13, fontWeight: '700', color: colors.textFaint, marginBottom: 8, textTransform: 'uppercase' },
    previewLine: { fontSize: 15, color: colors.text, marginBottom: 4 },
    previewHearts: { fontSize: 18, fontWeight: '800', color: '#E8445A', marginTop: 8 },

    logButton: {
      backgroundColor: '#FF9800', borderRadius: 16, padding: 18, alignItems: 'center',
      shadowColor: '#FF9800', shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.15 : 0.3, shadowRadius: 8, elevation: isDark ? 0 : 6,
    },
    logButtonDisabled: { backgroundColor: isDark ? '#3a3a3a' : '#ddd', shadowOpacity: 0 },
    logButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },

    dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 16 },
    dateArrow: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FF9800', alignItems: 'center', justifyContent: 'center' },
    dateArrowDisabled: { backgroundColor: isDark ? '#3a3a3a' : '#ddd' },
    dateArrowText: { fontSize: 24, color: '#fff', fontWeight: '300', lineHeight: 28 },
    dateLabelWrap: { minWidth: 100, alignItems: 'center' },
    dateLabelText: { fontSize: 16, fontWeight: '700', color: colors.text },
    dateCalBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.bgAlt, alignItems: 'center', justifyContent: 'center' },
    dateCalText: { fontSize: 18 },

    dateModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 32 },
    dateModalBox: { backgroundColor: colors.card, borderRadius: 20, padding: 24 },
    dateModalTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 16, textAlign: 'center' },
    dateModalInput: {
      borderWidth: 2, borderColor: colors.border, borderRadius: 12,
      padding: 14, fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 16,
    },
    dateModalBtns: { flexDirection: 'row', gap: 10 },
    dateModalCancel: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: colors.bgAlt, alignItems: 'center' },
    dateModalConfirm: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#FF9800', alignItems: 'center' },

    modalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center', justifyContent: 'center', padding: 32,
    },
    modalCard: {
      backgroundColor: colors.card, borderRadius: 24, padding: 32,
      width: '100%', alignItems: 'center',
      shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0 : 0.2, shadowRadius: 20, elevation: isDark ? 0 : 10,
    },
    modalTitle: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 16 },
    modalSub: { fontSize: 14, color: colors.textFaint, marginBottom: 24 },
    modalSectionLabel: { fontSize: 13, fontWeight: '700', color: colors.textDim, letterSpacing: 0.5, marginTop: 8, marginBottom: 4, alignSelf: 'flex-start' },
    modalSectionSub: { fontSize: 11, color: colors.textFaint, alignSelf: 'flex-start', marginBottom: 8 },
    modalCalcBox: {
      backgroundColor: isDark ? '#332313' : '#FFF8F0', borderRadius: 12, padding: 14,
      width: '100%', alignItems: 'center', marginTop: 16, marginBottom: 4,
      borderWidth: 1, borderColor: isDark ? '#5a4422' : '#FFE0B2',
    },
    modalCalcText: { fontSize: 14, color: colors.textDim },
    modalCalcSub: { fontSize: 16, fontWeight: '700', color: '#E8445A', marginTop: 4 },
    modalConfirm: {
      backgroundColor: '#E8445A', borderRadius: 14, padding: 16,
      width: '100%', alignItems: 'center', marginTop: 24, marginBottom: 10,
    },
    modalConfirmText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    modalCancel: { padding: 10 },
    modalCancelText: { color: colors.textFaint, fontSize: 14 },
  });
}
