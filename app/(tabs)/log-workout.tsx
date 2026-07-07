import React, { useState, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Modal,
  TouchableOpacity, Alert, TextInput, Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { WORKOUTS, calcHeartsFromDuration } from '@/constants/workouts';
import { calcHeartsGained } from '@/constants/hearts';
import { WorkoutId, WorkoutDefinition } from '@/types';
import PostLogModal from '@/components/PostLogModal';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeColors } from '@/constants/Colors';

const QUICK: WorkoutId[] = ['corsa', 'camminata', 'palestra'];
const EXTRA = WORKOUTS
  .filter((w) => !QUICK.includes(w.id as WorkoutId))
  .sort((a, b) => a.name.localeCompare(b.name, 'it'));
const PRESETS = [30, 60, 90, 120, 150];
const presetLabel = (m: number) =>
  m < 60 ? `${m}m` : m % 60 === 0 ? `${m / 60}h` : `${Math.floor(m / 60)}h${m % 60}`;

export default function LogWorkoutScreen() {
  const { state, logWorkout } = useApp();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [logging, setLogging] = useState(false);
  const [postLogId, setPostLogId] = useState<string | null>(null);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutId | null>(null);
  const [duration, setDuration] = useState(60);
  const [km, setKm] = useState('');
  const [elevation, setElevation] = useState('');
  const [daysAgo, setDaysAgo] = useState(0);
  const [showDateModal, setShowDateModal] = useState(false);
  const [dateInput, setDateInput] = useState('');
  const [extraOpen, setExtraOpen] = useState(false);

  const selected = WORKOUTS.find((w) => w.id === selectedWorkout);
  const selectedIsExtra = selectedWorkout != null && !QUICK.includes(selectedWorkout);

  function calcPreview(): number {
    if (!selected) return 0;
    if (selected.inputType === 'duration') return calcHeartsFromDuration(duration, selected.heartsPerHour ?? 3);
    if (selected.inputType === 'km') {
      const k = parseFloat(km) || 0;
      return calcHeartsGained(Math.round((selected.calPerKm ?? 60) * k), selected.id);
    }
    if (selected.inputType === 'km_elevation') {
      const k = parseFloat(km) || 0;
      const e = parseInt(elevation) || 0;
      return k > 0 ? Math.floor((k + e * 0.03) / 6) : 0;
    }
    return 0;
  }

  const previewHearts = calcPreview();

  function isReadyToLog(): boolean {
    if (!selected) return false;
    if (selected.inputType === 'duration') return true;
    const k = parseFloat(km);
    return !isNaN(k) && k > 0;
  }

  const activityDate = (() => {
    const d = new Date(); d.setDate(d.getDate() - daysAgo); d.setHours(0, 0, 0, 0); return d;
  })();
  const activityDateLocal = `${activityDate.getFullYear()}-${String(activityDate.getMonth()+1).padStart(2,'0')}-${String(activityDate.getDate()).padStart(2,'0')}`;
  const dateLabel = daysAgo === 0 ? 'Oggi' : daysAgo === 1 ? 'Ieri'
    : activityDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });

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

  function handleSelectWorkout(id: WorkoutId) {
    setSelectedWorkout(id);
    setKm('');
    setElevation('');
    setExtraOpen(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
  }

  async function handleLog() {
    if (!selectedWorkout || !selected || logging) return;
    const k = parseFloat(km) || undefined;
    const e = parseInt(elevation) || undefined;
    setLogging(true);
    try {
      const logId = await logWorkout({
        workoutId: selectedWorkout,
        durationMinutes: selected.inputType === 'duration' ? duration : undefined,
        km: selected.inputType !== 'duration' ? k : undefined,
        elevationMeters: selected.inputType === 'km_elevation' ? e : undefined,
        activityDate: activityDateLocal,
      });
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPostLogId(logId);
    } catch (err: any) {
      Alert.alert('Errore', err.message);
    } finally {
      setLogging(false);
    }
  }

  function SportRow({ w, indent }: { w: WorkoutDefinition; indent?: boolean }) {
    const isSel = selectedWorkout === w.id;
    return (
      <TouchableOpacity
        style={[styles.sportRow, indent && styles.sportRowIndent, isSel && styles.sportRowSel]}
        onPress={() => handleSelectWorkout(w.id as WorkoutId)}
        activeOpacity={0.7}
      >
        <View style={[styles.sportIconWrap, isSel && styles.sportIconWrapSel]}>
          <Text style={styles.sportIcon}>{w.icon}</Text>
        </View>
        <Text style={[styles.sportName, isSel && styles.sportNameSel]}>{w.name}</Text>
        {isSel && <View style={styles.sportCheck}><Text style={styles.sportCheckText}>✓</Text></View>}
      </TouchableOpacity>
    );
  }

  const durationText = duration < 60
    ? `${duration} min`
    : duration % 60 === 0
      ? `${duration / 60}h`
      : `${Math.floor(duration / 60)}h ${duration % 60}m`;

  return (
    <>
      <PostLogModal
        visible={postLogId !== null}
        logId={postLogId}
        onDone={() => { setPostLogId(null); router.replace('/'); }}
      />

      <ScrollView ref={scrollRef} style={styles.container} contentContainerStyle={styles.content}>

        <Text style={styles.pageTitle}>Che sport hai fatto?</Text>

        {/* Card sport */}
        <View style={styles.card}>
          {QUICK.map((id) => {
            const w = WORKOUTS.find((x) => x.id === id)!;
            return <SportRow key={id} w={w} />;
          })}

          {/* Attività espandibile */}
          <TouchableOpacity
            style={[styles.sportRow, (extraOpen || selectedIsExtra) && styles.sportRowSel]}
            onPress={() => setExtraOpen((v) => !v)}
            activeOpacity={0.7}
          >
            <View style={[styles.sportIconWrap, (extraOpen || selectedIsExtra) && styles.sportIconWrapSel]}>
              <Text style={styles.sportIcon}>
                {selectedIsExtra && selected ? selected.icon : '⚡'}
              </Text>
            </View>
            <Text style={[styles.sportName, (extraOpen || selectedIsExtra) && styles.sportNameSel]}>
              {selectedIsExtra && selected ? selected.name : 'Altre attività'}
            </Text>
            <Text style={styles.sportChevron}>{extraOpen ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {extraOpen && (
            <View style={styles.extraList}>
              {EXTRA.map((w) => <SportRow key={w.id} w={w} indent />)}
            </View>
          )}
        </View>

        {/* Durata */}
        {selected?.inputType === 'duration' && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>DURATA</Text>
            <View style={styles.stepperRow}>
              <TouchableOpacity style={styles.stepBtn} onPress={() => setDuration(d => Math.max(5, d - 5))}>
                <Text style={styles.stepBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.stepValue}>{durationText}</Text>
              <TouchableOpacity style={styles.stepBtn} onPress={() => setDuration(d => d + 5)}>
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.presetRow}>
              {PRESETS.map((min) => (
                <TouchableOpacity
                  key={min}
                  style={[styles.presetBtn, duration === min && styles.presetBtnSel]}
                  onPress={() => setDuration(min)}
                >
                  <Text style={[styles.presetText, duration === min && styles.presetTextSel]}>
                    {presetLabel(min)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Km */}
        {selected?.inputType === 'km' && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>DISTANZA</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.numInput} value={km} onChangeText={setKm}
                keyboardType="decimal-pad" placeholder="0.0" placeholderTextColor="#ccc"
              />
              <Text style={styles.inputUnit}>km</Text>
            </View>
          </View>
        )}

        {/* Km + dislivello */}
        {selected?.inputType === 'km_elevation' && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>DISTANZA E DISLIVELLO</Text>
            <View style={styles.twoInputs}>
              <View style={styles.inputGroup}>
                <TextInput
                  style={styles.numInput} value={km} onChangeText={setKm}
                  keyboardType="decimal-pad" placeholder="0.0" placeholderTextColor="#ccc"
                />
                <Text style={styles.inputUnit}>km</Text>
              </View>
              <View style={styles.inputGroup}>
                <TextInput
                  style={styles.numInput} value={elevation} onChangeText={setElevation}
                  keyboardType="number-pad" placeholder="0" placeholderTextColor="#ccc"
                />
                <Text style={styles.inputUnit}>m ↑</Text>
              </View>
            </View>
          </View>
        )}

        {/* Selettore data */}
        <View style={styles.dateCard}>
          <Text style={styles.cardLabel}>QUANDO</Text>
          <View style={styles.dateRow}>
            <TouchableOpacity style={styles.dateArrow} onPress={() => setDaysAgo(d => d + 1)}>
              <Text style={styles.dateArrowText}>‹</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.datePill}
              onPress={() => setDaysAgo(0)}
              disabled={daysAgo === 0}
            >
              <Text style={styles.datePillText}>{dateLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dateArrow, daysAgo === 0 && styles.dateArrowDim]}
              onPress={() => setDaysAgo(d => Math.max(0, d - 1))}
              disabled={daysAgo === 0}
            >
              <Text style={styles.dateArrowText}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.calBtn} onPress={() => { setDateInput(''); setShowDateModal(true); }}>
              <Text style={styles.calBtnText}>📅</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottone log */}
        <TouchableOpacity
          style={[styles.logBtn, (!isReadyToLog() || logging) && styles.logBtnDisabled]}
          onPress={handleLog}
          disabled={!isReadyToLog() || logging}
          activeOpacity={0.8}
        >
          <Text style={styles.logBtnText}>
            {logging ? 'Salvataggio…' : 'Log Sport 💪'}
          </Text>
          {isReadyToLog() && !logging && (
            <View style={styles.logBtnBadge}>
              <Text style={styles.logBtnBadgeText}>+{previewHearts} ❤️</Text>
            </View>
          )}
        </TouchableOpacity>

      </ScrollView>

      {/* Modal data manuale */}
      <Modal visible={showDateModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Inserisci la data</Text>
            <TextInput
              style={styles.modalInput}
              value={dateInput}
              onChangeText={setDateInput}
              placeholder="GG/MM o GG/MM/AAAA"
              placeholderTextColor="#bbb"
              keyboardType="numbers-and-punctuation"
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowDateModal(false)}>
                <Text style={styles.modalCancelText}>Annulla</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={confirmDateInput}>
                <Text style={styles.modalConfirmText}>Conferma</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const BLUE = '#2196F3';

function makeStyles(colors: ThemeColors, isDark: boolean) {
  const BLUE_LIGHT = isDark ? '#16273a' : '#E8F4FD';
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 18, paddingBottom: 48 },

    pageTitle: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 16 },

    // Card generica
    card: {
      backgroundColor: colors.card, borderRadius: 20, padding: 16, marginBottom: 14,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0 : 0.06, shadowRadius: 8, elevation: isDark ? 0 : 3,
    },
    cardLabel: {
      fontSize: 11, fontWeight: '800', color: colors.textFaint,
      letterSpacing: 1.5, marginBottom: 12,
    },

    // Righe sport
    sportRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingVertical: 13, paddingHorizontal: 4,
      borderRadius: 14, marginBottom: 2,
    },
    sportRowSel: { backgroundColor: BLUE_LIGHT },
    sportRowIndent: { paddingLeft: 16 },
    sportIconWrap: {
      width: 44, height: 44, borderRadius: 14,
      backgroundColor: colors.bgAlt, alignItems: 'center', justifyContent: 'center',
    },
    sportIconWrapSel: { backgroundColor: BLUE + '22' },
    sportIcon: { fontSize: 24 },
    sportName: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.text },
    sportNameSel: { color: BLUE },
    sportCheck: {
      width: 24, height: 24, borderRadius: 12,
      backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center',
    },
    sportCheckText: { color: '#fff', fontSize: 13, fontWeight: '800' },
    sportChevron: { fontSize: 11, color: colors.textFaint, fontWeight: '700' },
    extraList: {
      borderTopWidth: 1, borderTopColor: colors.border, marginTop: 4, paddingTop: 4,
    },

    // Stepper durata
    stepperRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 20, marginBottom: 14,
    },
    stepBtn: {
      width: 48, height: 48, borderRadius: 24,
      backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center',
      shadowColor: BLUE, shadowOffset: { width: 0, height: 3 }, shadowOpacity: isDark ? 0.15 : 0.35, shadowRadius: 6, elevation: isDark ? 0 : 4,
    },
    stepBtnText: { fontSize: 28, color: '#fff', fontWeight: '300', lineHeight: 32 },
    stepValue: { fontSize: 30, fontWeight: '900', color: colors.text, minWidth: 120, textAlign: 'center' },

    presetRow: { flexDirection: 'row', gap: 6 },
    presetBtn: {
      flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
      backgroundColor: colors.bgAlt,
    },
    presetBtnSel: { backgroundColor: BLUE },
    presetText: { fontSize: 13, fontWeight: '700', color: colors.textFaint },
    presetTextSel: { color: '#fff' },

    // Input km
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    twoInputs: { flexDirection: 'row', gap: 14 },
    inputGroup: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
    numInput: {
      flex: 1, backgroundColor: colors.bgAlt, borderRadius: 14, padding: 16,
      fontSize: 26, fontWeight: '800', color: colors.text, textAlign: 'center',
    },
    inputUnit: { fontSize: 15, fontWeight: '700', color: BLUE },

    // Data
    dateCard: {
      backgroundColor: colors.card, borderRadius: 20, padding: 16, marginBottom: 18,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0 : 0.06, shadowRadius: 8, elevation: isDark ? 0 : 3,
    },
    dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    dateArrow: {
      width: 36, height: 36, borderRadius: 18, backgroundColor: BLUE,
      alignItems: 'center', justifyContent: 'center',
    },
    dateArrowDim: { backgroundColor: colors.border },
    dateArrowText: { fontSize: 22, color: '#fff', fontWeight: '300', lineHeight: 26 },
    datePill: {
      flex: 1, backgroundColor: colors.bgAlt, borderRadius: 12,
      paddingVertical: 10, alignItems: 'center',
    },
    datePillText: { fontSize: 16, fontWeight: '800', color: colors.text },
    calBtn: {
      width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bgAlt,
      alignItems: 'center', justifyContent: 'center',
    },
    calBtnText: { fontSize: 18 },

    // Bottone log
    logBtn: {
      backgroundColor: BLUE, borderRadius: 20, padding: 20,
      alignItems: 'center', gap: 6,
      shadowColor: BLUE, shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDark ? 0.15 : 0.4, shadowRadius: 12, elevation: isDark ? 0 : 8,
    },
    logBtnDisabled: { backgroundColor: isDark ? '#3a3a3a' : '#dde0e8', shadowOpacity: 0 },
    logBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
    logBtnBadge: {
      backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 4,
    },
    logBtnBadgeText: { color: '#fff', fontSize: 13, fontWeight: '700' },

    // Modal data
    modalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center', padding: 32,
    },
    modalBox: { backgroundColor: colors.card, borderRadius: 24, padding: 24 },
    modalTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 16, textAlign: 'center' },
    modalInput: {
      backgroundColor: colors.bgAlt, borderRadius: 14, padding: 16,
      fontSize: 22, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 16,
    },
    modalBtns: { flexDirection: 'row', gap: 10 },
    modalCancel: { flex: 1, padding: 14, borderRadius: 14, backgroundColor: colors.bgAlt, alignItems: 'center' },
    modalCancelText: { color: colors.textDim, fontWeight: '700' },
    modalConfirm: { flex: 1, padding: 14, borderRadius: 14, backgroundColor: BLUE, alignItems: 'center' },
    modalConfirmText: { color: '#fff', fontWeight: '800' },
  });
}
