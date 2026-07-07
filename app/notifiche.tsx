import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth, NotifPref } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';

const ADMIN_EMAILS = ['de.pasqual.matteo@gmail.com', 'andreasperti@yahoo.it'];

const NOTIF_OPTIONS: { value: NotifPref; label: string; desc: string; emoji: string }[] = [
  { value: 'none',           label: 'Silenzio totale',  desc: 'Nessuna notifica',                           emoji: '🔕' },
  { value: 'important',      label: 'Solo importanti',  desc: 'Sorpassi in classifica e avvisi chiave',     emoji: '⚡' },
  { value: 'evening_recap',  label: 'Recap serale',     desc: 'Ogni sera + notifiche importanti',           emoji: '🌙' },
  { value: 'every_activity', label: 'Tutto',            desc: 'Sport in tempo reale + recap + importanti',  emoji: '📣' },
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Adesso';
  if (m < 60) return `${m} min fa`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ore fa`;
  const d = Math.floor(h / 24);
  return `${d} giorni fa`;
}

interface DbNotif {
  id: string;
  title: string;
  body: string;
  created_at: string;
  read: boolean;
}

export default function NotificheScreen() {
  const { user, updateNotifPref } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const router = useRouter();
  const isAdmin = ADMIN_EMAILS.includes(user?.email ?? '');
  const [history, setHistory] = useState<DbNotif[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('id, title, body, created_at, read')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) console.warn('[notifiche] load error:', error.message, error.code);
    setHistory(data ?? []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  async function selectPref(pref: NotifPref) {
    if (saving || pref === user?.notifPref) return;
    setSaving(true);
    try { await updateNotifPref(pref); } catch {}
    finally { setSaving(false); }
  }

  function confirmClear() {
    Alert.alert(
      'Svuota storico',
      'Cancellare tutte le notifiche ricevute?',
      [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Cancella', style: 'destructive', onPress: async () => {
          if (!user) return;
          await supabase.from('notifications').delete().eq('user_id', user.id);
          setHistory([]);
        }},
      ],
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* ── Storico ────────────────────────────────────────────── */}
      <View style={styles.historyHeader}>
        <Text style={styles.sectionTitle}>📬 Ricevute</Text>
        {history.length > 0 && (
          <TouchableOpacity onPress={confirmClear}>
            <Text style={styles.clearBtn}>Svuota</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color="#FFD700" style={{ marginTop: 24, marginBottom: 28 }} />
      ) : history.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>🔔</Text>
          <Text style={styles.emptyText}>Nessuna notifica ricevuta ancora</Text>
        </View>
      ) : (
        <View style={styles.card}>
          {history.map((n, i) => (
            <View key={n.id} style={[styles.notifRow, i > 0 && styles.notifDivider]}>
              <View style={[styles.notifDot, n.read && styles.notifDotRead]} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.notifTitle}>{n.title}</Text>
                <Text style={styles.notifBody}>{n.body}</Text>
                <Text style={styles.notifTime}>{timeAgo(n.created_at)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ── Admin ──────────────────────────────────────────────── */}
      {isAdmin && (
        <>
          <Text style={styles.sectionTitle}>⚙️ Admin</Text>
          <TouchableOpacity style={styles.adminRow} onPress={() => router.push('/admin' as any)}>
            <Text style={styles.adminEmoji}>📣</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.adminLabel}>Invia notifica</Text>
              <Text style={styles.adminDesc}>Manda push a tutti, clan o utenti specifici</Text>
            </View>
            <Text style={{ fontSize: 12, color: '#bbb' }}>›</Text>
          </TouchableOpacity>
        </>
      )}

      {/* ── Preferenze ─────────────────────────────────────────── */}
      <Text style={styles.sectionTitle}>🔔 Preferenze notifiche</Text>
      <View style={styles.card}>
        {NOTIF_OPTIONS.map((opt) => {
          const sel = user?.notifPref === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.optionRow, sel && styles.optionRowSelected]}
              onPress={() => selectPref(opt.value)}
              disabled={saving}
            >
              <Text style={styles.optionEmoji}>{opt.emoji}</Text>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.optionLabel, sel && styles.optionLabelSelected]}>{opt.label}</Text>
                <Text style={styles.optionDesc}>{opt.desc}</Text>
              </View>
              {sel && <Text style={styles.checkmark}>✓</Text>}
              {saving && sel && <ActivityIndicator size="small" color="#FFD700" style={{ marginLeft: 8 }} />}
            </TouchableOpacity>
          );
        })}
      </View>

    </ScrollView>
  );
}

function makeStyles(colors: import('@/constants/Colors').ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 20, paddingTop: 24, paddingBottom: 40 },
    sectionTitle: {
      fontSize: 12, fontWeight: '800', color: colors.textFaint,
      letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12,
    },
    card: {
      backgroundColor: colors.card, borderRadius: 16, overflow: 'hidden',
      shadowColor: '#000', shadowOpacity: isDark ? 0 : 0.06, shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 }, elevation: isDark ? 0 : 2, marginBottom: 28,
    },
    optionRow: {
      flexDirection: 'row', alignItems: 'center',
      padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    optionRowSelected: { backgroundColor: colors.cardAlt },
    optionEmoji: { fontSize: 20 },
    optionLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
    optionLabelSelected: { color: '#b8860b' },
    optionDesc: { fontSize: 12, color: colors.textFaint, marginTop: 2 },
    checkmark: { fontSize: 18, color: '#FFD700', fontWeight: '900' },
    historyHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
    },
    clearBtn: { fontSize: 13, fontWeight: '700', color: '#E74C3C' },
    emptyBox: { alignItems: 'center', paddingVertical: 48 },
    emptyEmoji: { fontSize: 40, marginBottom: 12, opacity: 0.3 },
    emptyText: { fontSize: 14, color: colors.textFaint, fontWeight: '600' },
    notifRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 16 },
    notifDivider: { borderTopWidth: 1, borderTopColor: colors.border },
    notifDot: {
      width: 8, height: 8, borderRadius: 4,
      backgroundColor: '#FFD700', marginTop: 5,
    },
    notifDotRead: { backgroundColor: colors.border },
    notifTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
    notifBody: { fontSize: 13, color: colors.textDim, marginTop: 2, lineHeight: 18 },
    notifTime: { fontSize: 11, color: colors.textFaint, marginTop: 4 },
    adminRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: '#1a1a1a', borderRadius: 14,
      paddingHorizontal: 16, paddingVertical: 14, marginBottom: 28,
    },
    adminEmoji: { fontSize: 20, marginRight: 12 },
    adminLabel: { fontSize: 15, fontWeight: '800', color: '#FFD700' },
    adminDesc: { fontSize: 12, color: '#aaa', marginTop: 2 },
  });
}
