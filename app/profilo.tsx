import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Image, ActivityIndicator, Alert, Platform, ScrollView,
  Modal, Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getMentalityState } from '@/lib/mentality';
import { WORKOUT_MAP } from '@/constants/workouts';
import { DRINK_MAP } from '@/constants/drinks';

const SCREEN_W = Dimensions.get('window').width;

// ─── Medaglie ────────────────────────────────────────────────────────────

interface Medal {
  id: string;
  icon: string;
  name: string;
  desc: string;
  earned: boolean;
}

// Conteggi ori/argenti/bronzi per categoria (singoli/tandem/clan)
// gs=gold singoli, gt=gold tandem, gc=gold clan, ss=silver singoli, ecc.
interface RankCounts {
  gs: number; gt: number; gc: number;
  ss: number; st: number; sc: number;
  bs: number; bt: number; bc: number;
}

function computeMedals(logs: any[], hearts: number, rankCounts?: RankCounts): Medal[] {
  const drinks = logs.filter(l => l.type === 'drink');
  const workouts = logs.filter(l => l.type === 'workout');
  const totalKm = workouts.reduce((s, l) => s + (l.km ?? 0), 0);
  const totalElev = workouts.reduce((s, l) => s + (l.elevationMeters ?? 0), 0);

  // Giorni consecutivi con almeno 1 workout
  const workoutDays = new Set(workouts.map(w => w.timestamp.slice(0, 10)));
  const now = new Date();
  let streak = 0, maxStreak = 0;
  for (let i = 0; i < 90; i++) {
    const d = new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10);
    if (workoutDays.has(d)) { streak++; maxStreak = Math.max(maxStreak, streak); }
    else { streak = 0; }
  }

  // Rank counts (oro/argento/bronzo per categoria)
  const rc = rankCounts ?? { gs: 0, gt: 0, gc: 0, ss: 0, st: 0, sc: 0, bs: 0, bt: 0, bc: 0 };
  const totalGold = rc.gs + rc.gt + rc.gc;
  const totalSilver = rc.ss + rc.st + rc.sc;
  const totalBronze = rc.bs + rc.bt + rc.bc;

  return [
    // ─── Attività ───
    { id: 'first_drink',    icon: '🍺', name: 'Prima Birra',    desc: 'Logga il tuo primo drink',             earned: drinks.length >= 1 },
    { id: 'first_workout',  icon: '👟', name: 'Primo Passo',    desc: 'Logga il tuo primo allenamento',       earned: workouts.length >= 1 },
    { id: 'maialino_doc',   icon: '🐷', name: 'Maialino DOC',   desc: '20 drink loggati in totale',           earned: drinks.length >= 20 },
    { id: 'atleta',         icon: '💪', name: 'Atleta',          desc: '20 sport loggati in totale',           earned: workouts.length >= 20 },
    { id: 'social_drinker', icon: '🥂', name: 'Social Drinker',  desc: '50 drink loggati',                    earned: drinks.length >= 50 },
    { id: 'iron_man',       icon: '🦾', name: 'Iron Man',        desc: '50 allenamenti loggati',              earned: workouts.length >= 50 },
    { id: 'centurione',     icon: '🏛️', name: 'Centurione',     desc: '100 attività totali',                  earned: (drinks.length + workouts.length) >= 100 },
    { id: 'costante',       icon: '📅', name: 'Costante',        desc: '7 giorni consecutivi di sport',        earned: maxStreak >= 7 },
    { id: 'maratoneta',     icon: '🏅', name: 'Maratoneta',      desc: '42 km totali corsi',                  earned: totalKm >= 42 },
    { id: 'scalatore',      icon: '🏔️', name: 'Scalatore',      desc: '500m di dislivello totali',            earned: totalElev >= 500 },
    { id: 'virtuoso',       icon: '🌟', name: 'Virtuoso',        desc: 'Punteggio superiore a +15',           earned: hearts >= 15 },
    { id: 'leggenda',       icon: '👑', name: 'Leggenda',        desc: 'Punteggio superiore a +50',           earned: hearts >= 50 },
    { id: 'debiti',         icon: '💸', name: 'Troppo Bere',     desc: 'Punteggio sceso sotto -10',           earned: hearts <= -10 },

    // ─── Oro 🥇 ───
    { id: 'g_sing_1',  icon: '🥇', name: 'Campione',           desc: '1° nei singoli a fine mese',            earned: rc.gs >= 1 },
    { id: 'g_tand_1',  icon: '🥇', name: 'Coppia d\'Oro',      desc: '1° nel tandem a fine mese',             earned: rc.gt >= 1 },
    { id: 'g_clan_1',  icon: '🥇', name: 'Branco Alpha',       desc: '1° nel clan a fine mese',               earned: rc.gc >= 1 },
    { id: 'g_sing_6',  icon: '🏆', name: 'Semestre d\'Oro',      desc: '6 volte 1° singoli',                   earned: rc.gs >= 6 },
    { id: 'g_tand_6',  icon: '🏆', name: 'Tandem Invincibile',  desc: '6 volte 1° tandem',                   earned: rc.gt >= 6 },
    { id: 'g_clan_6',  icon: '🏆', name: 'Clan Imbattibile',    desc: '6 volte 1° clan',                     earned: rc.gc >= 6 },
    { id: 'g_12',      icon: '✨', name: 'Anno d\'Oro',         desc: '12 ori totali (qualsiasi categoria)',   earned: totalGold >= 12 },
    { id: 'g_24',      icon: '💎', name: 'Biennio d\'Oro',      desc: '24 ori totali (qualsiasi categoria)',   earned: totalGold >= 24 },

    // ─── Argento 🥈 ───
    { id: 's_sing_1',  icon: '🥈', name: 'Vice Campione',       desc: '2° nei singoli a fine mese',           earned: rc.ss >= 1 },
    { id: 's_tand_1',  icon: '🥈', name: 'Coppia d\'Argento',   desc: '2° nel tandem a fine mese',            earned: rc.st >= 1 },
    { id: 's_clan_1',  icon: '🥈', name: 'Branco Beta',         desc: '2° nel clan a fine mese',              earned: rc.sc >= 1 },
    { id: 's_sing_6',  icon: '🪙', name: 'Semestre d\'Argento',  desc: '6 volte 2° singoli',                  earned: rc.ss >= 6 },
    { id: 's_tand_6',  icon: '🪙', name: 'Tandem d\'Argento',   desc: '6 volte 2° tandem',                   earned: rc.st >= 6 },
    { id: 's_clan_6',  icon: '🪙', name: 'Clan d\'Argento',     desc: '6 volte 2° clan',                     earned: rc.sc >= 6 },
    { id: 's_12',      icon: '🌙', name: 'Anno d\'Argento',     desc: '12 argenti totali',                    earned: totalSilver >= 12 },
    { id: 's_24',      icon: '⚪', name: 'Biennio d\'Argento',  desc: '24 argenti totali',                    earned: totalSilver >= 24 },

    // ─── Bronzo 🥉 ───
    { id: 'b_sing_1',  icon: '🥉', name: 'Sul Podio',           desc: '3° nei singoli a fine mese',           earned: rc.bs >= 1 },
    { id: 'b_tand_1',  icon: '🥉', name: 'Coppia di Bronzo',    desc: '3° nel tandem a fine mese',            earned: rc.bt >= 1 },
    { id: 'b_clan_1',  icon: '🥉', name: 'Branco Gamma',        desc: '3° nel clan a fine mese',              earned: rc.bc >= 1 },
    { id: 'b_sing_6',  icon: '🔶', name: 'Semestre di Bronzo',   desc: '6 volte 3° singoli',                  earned: rc.bs >= 6 },
    { id: 'b_tand_6',  icon: '🔶', name: 'Veterano Tandem',     desc: '6 volte 3° tandem',                   earned: rc.bt >= 6 },
    { id: 'b_clan_6',  icon: '🔶', name: 'Veterano Clan',       desc: '6 volte 3° clan',                     earned: rc.bc >= 6 },
    { id: 'b_12',      icon: '🟤', name: 'Anno di Bronzo',      desc: '12 bronzi totali',                     earned: totalBronze >= 12 },
    { id: 'b_24',      icon: '🗿', name: 'Biennio di Bronzo',   desc: '24 bronzi totali',                     earned: totalBronze >= 24 },
  ];
}

// ─── Placeholder maialino layers ─────────────────────────────────────────

const PIG_BACKGROUNDS = ['#FFEAA7', '#DFE6E9', '#FAB1A0', '#81ECEC', '#A29BFE'];
const PIG_FRAMES = ['#FFD700', '#C0C0C0', '#CD7F32', '#E84393', '#00CEC9'];
const PIG_SKINS = ['🐷', '🐽', '🐖', '🐗', '🐾'];

// ─── Cervelli a 4 spicchi (emoji) ───────────────────────────────────────
function HeartQuarters({ quarters }: { quarters: number }) {
  return (
    <View style={{ width: 64, height: 64 }}>
      <View style={{ flexDirection: 'row' }}>
        {[1, 2, 3, 4].slice(0, 2).map(n => (
          <Text key={n} style={{ fontSize: 28, lineHeight: 32, opacity: quarters >= n ? 1 : 0.2 }}>🧠</Text>
        ))}
      </View>
      <View style={{ flexDirection: 'row' }}>
        {[3, 4].map(n => (
          <Text key={n} style={{ fontSize: 28, lineHeight: 32, opacity: quarters >= n ? 1 : 0.2 }}>🧠</Text>
        ))}
      </View>
    </View>
  );
}

// ─── Stats ────────────────────────────────────────────────────────────────────

interface ActivityStat {
  id: string;
  icon: string;
  label: string;
  value: string;
}

function formatHours(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function computeStats(logs: any[]): ActivityStat[] {
  const workouts = logs.filter(l => l.type === 'workout');

  const kmCorsi = workouts
    .filter(l => l.workoutId === 'corsa')
    .reduce((s, l) => s + (l.km ?? 0), 0);

  const dislivello = workouts
    .filter(l => l.workoutId === 'camminata')
    .reduce((s, l) => s + (l.elevationMeters ?? 0), 0);

  const fixed: ActivityStat[] = [
    { id: 'corsa',      icon: '🏃', label: 'Km corsi',   value: `${kmCorsi.toFixed(1)} km` },
    { id: 'dislivello', icon: '⛰️', label: 'Dislivello', value: `${Math.round(dislivello)} m` },
  ];

  const excluded = new Set(['corsa', 'camminata']);
  const byActivity: Record<string, number> = {};
  workouts.forEach(l => {
    if (!excluded.has(l.workoutId)) {
      byActivity[l.workoutId] = (byActivity[l.workoutId] ?? 0) + (l.durationMinutes ?? 0);
    }
  });

  const dynamic: ActivityStat[] = Object.entries(byActivity)
    .filter(([, mins]) => mins > 0)
    .map(([id, mins]) => {
      const def = WORKOUT_MAP[id as keyof typeof WORKOUT_MAP];
      return {
        id,
        icon: def?.icon ?? '🏋️',
        label: def?.name ?? id,
        value: formatHours(mins),
      };
    });

  // Alcolici dinamici: ogni drink loggato almeno una volta
  const drinks = logs.filter(l => l.type === 'drink');
  const byDrink: Record<string, number> = {};
  drinks.forEach(l => {
    const id = l.drinkId ?? l.workoutId ?? l.item_id;
    if (id) byDrink[id] = (byDrink[id] ?? 0) + (l.quantity ?? 1);
  });

  const dynamicDrinks: ActivityStat[] = Object.entries(byDrink)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => {
      const def = DRINK_MAP[id as keyof typeof DRINK_MAP];
      return {
        id: `drink_${id}`,
        icon: def?.icon ?? '🍺',
        label: def?.name ?? id,
        value: `×${Math.round(qty)}`,
      };
    });

  return [...fixed, ...dynamic, ...dynamicDrinks];
}

export default function ProfiloScreen() {
  const { user, logout, updateAvatar, updateUsername, refreshClan } = useAuth();
  const { state } = useApp();
  const router = useRouter();
  const params = useLocalSearchParams<{ userId?: string }>();

  const isOwner = !params.userId || params.userId === user?.id;

  const [profileData, setProfileData] = useState<{
    username: string; avatarUrl: string | null; hearts: number;
  } | null>(null);
  const [otherLogs, setOtherLogs] = useState<any[]>([]);

  const [uploading, setUploading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newUsername, setNewUsername] = useState(user?.username ?? '');
  const [selectedMedal, setSelectedMedal] = useState<Medal | null>(null);
  const [rankCounts, setRankCounts] = useState<RankCounts>({ gs: 0, gt: 0, gc: 0, ss: 0, st: 0, sc: 0, bs: 0, bt: 0, bc: 0 });
  const [mentalityQuarters, setMentalityQuarters] = useState(0);

  useEffect(() => {
    const uid = isOwner ? user?.id : params.userId;
    if (!uid) return;
    supabase.from('profiles').select('rank_medals').eq('id', uid).single().then(({ data }) => {
      if (data?.rank_medals) {
        try { setRankCounts({ gs: 0, gt: 0, gc: 0, ss: 0, st: 0, sc: 0, bs: 0, bt: 0, bc: 0, ...data.rank_medals }); }
        catch (_) {}
      }
    });
  }, [isOwner, params.userId]);

  useEffect(() => {
    if (!isOwner) return;
    getMentalityState().then(({ quarters }) => setMentalityQuarters(quarters));
  }, [isOwner]);

  useEffect(() => {
    if (isOwner) return;
    const uid = params.userId!;
    supabase.from('profiles').select('username, avatar_url, hearts')
      .eq('id', uid).single().then(({ data }) => {
        if (data) setProfileData({ username: data.username, avatarUrl: data.avatar_url, hearts: data.hearts });
      });
    supabase.from('logs')
      .select('type, hearts_delta, km, elevation_meters, created_at, item_id, quantity, duration_minutes')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setOtherLogs((data ?? []).map(l => ({
          type: l.type,
          drinkId: l.type === 'drink' ? l.item_id : undefined,
          workoutId: l.type === 'workout' ? l.item_id : undefined,
          heartsLost: l.type === 'drink' ? Math.abs(l.hearts_delta ?? 0) : 0,
          heartsGained: l.type === 'workout' ? (l.hearts_delta ?? 0) : 0,
          km: l.km ?? 0,
          elevationMeters: l.elevation_meters ?? 0,
          durationMinutes: l.duration_minutes ?? 0,
          timestamp: l.created_at,
          quantity: l.quantity ?? 1,
        })));
      });
  }, [params.userId]);

  const displayName = isOwner ? user?.username : profileData?.username;
  const displayAvatar = isOwner ? user?.avatarUrl : profileData?.avatarUrl;
  const displayHearts = isOwner ? state.hearts : (profileData?.hearts ?? 0);
  const displayLogs = isOwner ? state.logs : otherLogs;
  const medals = computeMedals(displayLogs, displayHearts, rankCounts);
  const earnedCount = medals.filter(m => m.earned).length;
  // Le medaglie di classifica (oro/argento/bronzo) appaiono solo se guadagnate
  const RANK_MEDAL_PREFIX = ['g_', 's_', 'b_'];
  const visibleMedals = medals.filter(m =>
    m.earned || !RANK_MEDAL_PREFIX.some(p => m.id.startsWith(p))
  );
  const stats = computeStats(displayLogs);

  const pigBg = PIG_BACKGROUNDS[0];
  const pigFrame = PIG_FRAMES[0];
  const pigSkin = PIG_SKINS[0];

  async function pickAndUpload() {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permesso negato', "Devi permettere l'accesso alla galleria.");
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true, aspect: [1, 1], quality: 0.7, base64: true,
      });
      if (result.canceled || !result.assets[0]) return;
      setUploading(true);
      const asset = result.assets[0];
      const base64 = asset.base64;
      const path = `${user!.id}.jpg`;
      if (!base64 || base64.length === 0) throw new Error('Foto non leggibile');
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
      const { error: uploadError } = await supabase.storage
        .from('avatars').upload(path, bytes.buffer, { contentType: 'image/jpeg', upsert: true });
      if (uploadError) throw uploadError;
      const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(path);
      let avatarUrl = publicData?.publicUrl;
      if (!avatarUrl) {
        const { data: signedData, error: signError } = await supabase.storage
          .from('avatars').createSignedUrl(path, 2147483647);
        if (signError || !signedData) throw signError ?? new Error('Signed URL error');
        avatarUrl = signedData.signedUrl;
      }
      avatarUrl = avatarUrl + '?t=' + Date.now();
      await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', user!.id);
      await updateAvatar(avatarUrl);
    } catch (e: any) {
      Alert.alert('Errore', e.message ?? 'Impossibile caricare la foto');
    } finally {
      setUploading(false);
    }
  }

  async function handleLogout() {
    await logout();
    router.replace('/(auth)/login' as any);
  }

  async function saveName() {
    const trimmed = newUsername.trim();
    if (!trimmed || trimmed.length < 2) { Alert.alert('Nome troppo corto'); return; }
    try {
      await supabase.from('profiles').update({ username: trimmed }).eq('id', user!.id);
      await updateUsername(trimmed);
      await refreshClan();
    } catch (e: any) { Alert.alert('Errore', e.message); }
    setEditingName(false);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ─── Header profilo ─── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={isOwner ? pickAndUpload : undefined}
          disabled={uploading || !isOwner}
          style={styles.avatarWrap}
          activeOpacity={isOwner ? 0.7 : 1}
        >
          {displayAvatar ? (
            <Image key={displayAvatar} source={{ uri: displayAvatar }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarEmoji}>🐷</Text>
            </View>
          )}
          {uploading && (
            <View style={styles.avatarOverlay}>
              <ActivityIndicator color="#fff" />
            </View>
          )}
          {isOwner && (
            <View style={styles.editBadge}>
              <Text style={{ fontSize: 13 }}>📷</Text>
            </View>
          )}
        </TouchableOpacity>

        {isOwner && editingName ? (
          <View style={styles.nameEditRow}>
            <TextInput
              style={styles.nameInput}
              value={newUsername}
              onChangeText={setNewUsername}
              autoFocus maxLength={20} autoCapitalize="none"
            />
            <TouchableOpacity onPress={saveName} style={styles.nameBtn}>
              <Text style={{ fontSize: 18, color: '#4CAF50' }}>✓</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setNewUsername(user?.username ?? ''); setEditingName(false); }} style={styles.nameBtn}>
              <Text style={{ fontSize: 18, color: '#E8445A' }}>✕</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={isOwner ? () => { setNewUsername(user?.username ?? ''); setEditingName(true); } : undefined}
            activeOpacity={isOwner ? 0.7 : 1}
          >
            <Text style={styles.username}>
              {displayName}{isOwner ? ' ✏️' : ''}
            </Text>
          </TouchableOpacity>
        )}

        {isOwner && <Text style={styles.email}>{user?.email}</Text>}

        <View style={styles.scoreChip}>
          <Text style={styles.scoreChipText}>
            {displayHearts >= 0 ? '❤️' : '💔'} {displayHearts > 0 ? '+' : ''}{Math.round(displayHearts)}
          </Text>
        </View>
      </View>

      {/* ─── Mentality (solo personale) ─── */}
      {isOwner && (
        <View style={styles.mentalityCard}>
          <View style={styles.mentalityHeader}>
            <Text style={styles.mentalityTitle}>Mentality</Text>
            <Text style={styles.mentalitySubtitle}>Apri l'app ogni giorno per guadagnare cuori</Text>
          </View>
          <View style={styles.mentalityBody}>
            <HeartQuarters quarters={mentalityQuarters} />
            <View style={styles.mentalityInfo}>
              <Text style={styles.mentalityProgress}>{mentalityQuarters}/4</Text>
              <Text style={styles.mentalityHint}>
                {mentalityQuarters === 0
                  ? 'Apri domani per iniziare!'
                  : mentalityQuarters < 3
                    ? `Ancora ${4 - mentalityQuarters} giorni per +1 ❤️`
                    : 'Ancora 1 giorno per +1 ❤️!'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* ─── Card Maialino Avatar ─── */}
      <Text style={styles.sectionTitle}>Il tuo maialino</Text>
      <View style={[styles.pigCard, { borderColor: pigFrame }]}>
        <View style={[styles.pigBg, { backgroundColor: pigBg }]}>
          <Text style={styles.pigSkin}>{pigSkin}</Text>
        </View>
        <View style={styles.pigLayers}>
          <View style={styles.pigLayerItem}>
            <View style={[styles.pigLayerDot, { backgroundColor: pigBg }]} />
            <Text style={styles.pigLayerLabel}>Sfondo</Text>
          </View>
          <View style={styles.pigLayerItem}>
            <View style={[styles.pigLayerDot, { backgroundColor: pigFrame }]} />
            <Text style={styles.pigLayerLabel}>Cornice</Text>
          </View>
          <View style={styles.pigLayerItem}>
            <Text style={{ fontSize: 18 }}>{pigSkin}</Text>
            <Text style={styles.pigLayerLabel}>Skin</Text>
          </View>
        </View>
        {isOwner && (
          <TouchableOpacity style={styles.pigCustomizeBtn} onPress={() => Alert.alert('Coming soon', 'La personalizzazione del maialino arriva presto!')}>
            <Text style={styles.pigCustomizeBtnText}>Personalizza</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ─── Medaglie ─── */}
      <Text style={styles.sectionTitle}>Medaglie — {earnedCount}/{medals.length}</Text>
      <View style={styles.medalGrid}>
        {visibleMedals.map(m => (
          <TouchableOpacity
            key={m.id}
            style={[styles.medalCircle, m.earned ? styles.medalEarned : styles.medalLocked]}
            onPress={() => setSelectedMedal(m)}
            activeOpacity={0.7}
          >
            <Text style={styles.medalIcon}>{m.earned ? m.icon : '🔒'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Popup medaglia */}
      <Modal visible={!!selectedMedal} transparent animationType="fade" onRequestClose={() => setSelectedMedal(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectedMedal(null)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalIcon}>{selectedMedal?.earned ? selectedMedal.icon : '🔒'}</Text>
            <Text style={styles.modalName}>{selectedMedal?.name}</Text>
            <Text style={styles.modalDesc}>{selectedMedal?.desc}</Text>
            <View style={[styles.modalStatus, { backgroundColor: selectedMedal?.earned ? '#e8f5e9' : '#fce4ec' }]}>
              <Text style={[styles.modalStatusText, { color: selectedMedal?.earned ? '#2e7d32' : '#c62828' }]}>
                {selectedMedal?.earned ? 'Sbloccata!' : 'Non ancora sbloccata'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── Statistiche ─── */}
      {stats.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>📊 {isOwner ? 'Le tue statistiche' : 'Statistiche'}</Text>
          <View style={styles.statsGrid}>
            {stats.map(s => (
              <View key={s.id} style={styles.statCard}>
                <Text style={styles.statIcon}>{s.icon}</Text>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* ─── Azioni (solo personale) ─── */}
      {isOwner && (
        <>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/regole' as any)}>
            <Text style={styles.actionBtnText}>📖 Regole del gioco</Text>
          </TouchableOpacity>

          {['de.pasqual.matteo@gmail.com', 'andreasperti@yahoo.it'].includes(user?.email ?? '') && (
            <TouchableOpacity style={styles.adminBtn} onPress={() => router.push('/admin' as any)}>
              <Text style={styles.adminText}>⚙️ Admin</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Esci dall'account</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────

const MEDAL_SIZE = (SCREEN_W - 48 - 4 * 12) / 5;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f7' },
  content: { padding: 24, paddingBottom: 48 },

  header: { alignItems: 'center', marginBottom: 24 },
  avatarWrap: { position: 'relative', marginBottom: 10 },
  avatarImg: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#FFD700' },
  avatarPlaceholder: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#FFD700', alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#FFD700',
  },
  avatarEmoji: { fontSize: 48 },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 50,
    alignItems: 'center', justifyContent: 'center',
  },
  editBadge: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: '#fff', borderRadius: 14, width: 28, height: 28,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2, shadowRadius: 3, elevation: 3,
  },
  username: { fontSize: 22, fontWeight: '800', color: '#1a1a1a' },
  email: { fontSize: 13, color: '#aaa', marginTop: 2 },
  nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  nameInput: {
    fontSize: 18, fontWeight: '700', color: '#1a1a1a',
    borderBottomWidth: 2, borderBottomColor: '#FFD700',
    paddingVertical: 4, paddingHorizontal: 8, minWidth: 120, textAlign: 'center',
  },
  nameBtn: { padding: 4 },
  scoreChip: {
    marginTop: 10, backgroundColor: '#fff', borderRadius: 20,
    paddingHorizontal: 18, paddingVertical: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  scoreChipText: { fontSize: 18, fontWeight: '800', color: '#E8445A' },

  sectionTitle: {
    fontSize: 14, fontWeight: '700', color: '#1a1a1a',
    marginBottom: 10, marginTop: 8,
  },

  // Mentality
  mentalityCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 20, marginBottom: 24,
    borderWidth: 2, borderColor: '#4CAF50',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  mentalityHeader: { marginBottom: 16 },
  mentalityTitle: { fontSize: 16, fontWeight: '800', color: '#1a1a1a' },
  mentalitySubtitle: { fontSize: 12, color: '#888', marginTop: 2 },
  mentalityBody: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  mentalityInfo: { flex: 1 },
  mentalityProgress: { fontSize: 28, fontWeight: '900', color: '#E8445A' },
  mentalityHint: { fontSize: 12, color: '#888', marginTop: 2 },

  // Card Maialino
  pigCard: {
    backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden',
    marginBottom: 24, borderWidth: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  pigBg: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 28,
  },
  pigSkin: { fontSize: 72 },
  pigLayers: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingVertical: 12, paddingHorizontal: 20,
    borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  pigLayerItem: { alignItems: 'center', gap: 4 },
  pigLayerDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#e0e0e0' },
  pigLayerLabel: { fontSize: 10, color: '#aaa', fontWeight: '600', textTransform: 'uppercase' },
  pigCustomizeBtn: {
    backgroundColor: '#FFD700', paddingVertical: 12, alignItems: 'center',
  },
  pigCustomizeBtnText: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },

  // Medaglie
  medalGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
    marginBottom: 24, justifyContent: 'flex-start',
  },
  medalCircle: {
    width: MEDAL_SIZE, height: MEDAL_SIZE, borderRadius: MEDAL_SIZE / 2,
    alignItems: 'center', justifyContent: 'center',
  },
  medalEarned: {
    backgroundColor: '#FFF8E1', borderWidth: 2, borderColor: '#FFD700',
    shadowColor: '#FFD700', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 2,
  },
  medalLocked: {
    backgroundColor: '#f0f0f0', borderWidth: 2, borderColor: '#e0e0e0',
  },
  medalIcon: { fontSize: MEDAL_SIZE * 0.45 },

  // Modal medaglia
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center', padding: 40,
  },
  modalCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 32,
    alignItems: 'center', width: '100%', maxWidth: 300,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 20, elevation: 10,
  },
  modalIcon: { fontSize: 56, marginBottom: 12 },
  modalName: { fontSize: 20, fontWeight: '800', color: '#1a1a1a', marginBottom: 8, textAlign: 'center' },
  modalDesc: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  modalStatus: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 },
  modalStatusText: { fontSize: 13, fontWeight: '700' },

  // Statistiche
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    alignItems: 'center', width: '47%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  statIcon: { fontSize: 28, marginBottom: 6 },
  statValue: { fontSize: 18, fontWeight: '800', color: '#1a1a1a', marginBottom: 2 },
  statLabel: { fontSize: 11, color: '#aaa', textAlign: 'center' },

  // Azioni
  actionBtn: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    alignItems: 'center', marginBottom: 10,
    borderWidth: 1.5, borderColor: '#e0e0e0',
  },
  actionBtnText: { color: '#1a1a1a', fontWeight: '700', fontSize: 15 },
  adminBtn: {
    backgroundColor: '#1a1a1a', borderRadius: 14, padding: 16,
    alignItems: 'center', marginBottom: 10,
  },
  adminText: { color: '#FFD700', fontWeight: '700', fontSize: 15 },
  logoutBtn: {
    backgroundColor: '#ff3b30', borderRadius: 14, padding: 16,
    alignItems: 'center', marginTop: 4,
  },
  logoutText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
