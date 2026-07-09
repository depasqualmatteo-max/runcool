import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Image, ActivityIndicator, Alert, Platform, ScrollView,
  Modal, Dimensions, RefreshControl,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { getMentalityState } from '@/lib/mentality';
import { WORKOUT_MAP } from '@/constants/workouts';
import { DRINK_MAP } from '@/constants/drinks';
import { PigSkin } from '@/components/PigSkin';
import { PigBgView } from '@/components/PigBgView';
import { SHOP_BGS } from '@/constants/shop';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeColors } from '@/constants/Colors';
import { sendPushNotification } from '@/lib/notifications';

const SCREEN_W = Dimensions.get('window').width;

// ─── Grafico attività ────────────────────────────────────────────────────

type ChartPeriod = 'week' | 'month';
const IT_DAYS = ['D', 'L', 'M', 'M', 'G', 'V', 'S'];
const CHART_W = SCREEN_W - 48 - 32;
const CHART_H = 100;
const ZERO_Y = CHART_H / 2;

function StatsChart({ logs, currentHearts }: { logs: any[], currentHearts: number }) {
  const [period, setPeriod] = useState<ChartPeriod>('week');
  const { colors, isDark } = useTheme();
  const chartStyles = useMemo(() => makeChartStyles(colors, isDark), [colors, isDark]);

  const days = useMemo(() => {
    const n = period === 'week' ? 7 : 30;
    const now = new Date();
    return Array.from({ length: n }, (_, i) => {
      const d = new Date(now.getTime() - (n - 1 - i) * 86400000);
      const dateStr = d.toISOString().slice(0, 10);
      const dayEnd = dateStr + 'T23:59:59.999Z';
      // Punteggio a fine giornata = cuori attuali meno tutto quello che è successo dopo
      const deltaAfter = logs
        .filter(l => l.timestamp > dayEnd)
        .reduce((s: number, l: any) => s + (l.type === 'workout' ? (l.heartsGained ?? 0) : -(l.heartsLost ?? 0)), 0);
      const score = currentHearts - deltaAfter;
      const dayLogs = logs.filter(l => l.timestamp?.slice(0, 10) === dateStr);
      const gained = dayLogs.filter((l: any) => l.type === 'workout').reduce((s: number, l: any) => s + (l.heartsGained ?? 0), 0);
      const lost = dayLogs.filter((l: any) => l.type === 'drink').reduce((s: number, l: any) => s + (l.heartsLost ?? 0), 0);
      return { dateStr, label: IT_DAYS[d.getDay()], date: d.getDate(), score, gained, lost, isToday: i === n - 1 };
    });
  }, [logs, period, currentHearts]);

  const scores = days.map(d => d.score);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const pad = 8;
  const range = Math.max(maxScore - minScore, 1);
  const toY = (v: number) => CHART_H - pad - ((v - minScore) / range) * (CHART_H - 2 * pad);
  // Linea dello zero cuori (se visibile nel range)
  const zeroY = minScore <= 0 && maxScore >= 0 ? toY(0) : null;

  const n = days.length;
  const xOf = (i: number) => n <= 1 ? CHART_W / 2 : (i / (n - 1)) * CHART_W;

  const netPoints = days.map((d, i) => ({ x: xOf(i), y: toY(d.score) }));

  const totalGained = days.reduce((s, d) => s + d.gained, 0);
  const totalLost = days.reduce((s, d) => s + d.lost, 0);
  const net = totalGained - totalLost;

  // Label sull'asse X: settimana ogni giorno, mese ogni 5 giorni
  const xLabels = days.filter((_, i) =>
    period === 'week' ? true : (i % 5 === 0 || i === days.length - 1)
  );

  return (
    <View style={chartStyles.card}>
      <View style={chartStyles.selector}>
        {(['week', 'month'] as ChartPeriod[]).map(p => (
          <TouchableOpacity
            key={p}
            style={[chartStyles.selectorBtn, period === p && chartStyles.selectorBtnActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[chartStyles.selectorText, period === p && chartStyles.selectorTextActive]}>
              {p === 'week' ? 'Settimana' : 'Mese'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ width: CHART_W, height: CHART_H + 20, overflow: 'hidden' }}>
        {/* Baseline zero cuori (solo se 0 è nel range visibile) */}
        {zeroY !== null && (
          <View style={{ position: 'absolute', left: 0, right: 0, top: zeroY, height: 1, backgroundColor: colors.border }} />
        )}

        {/* Tick giornalieri: verde se guadagnato, rosso se perso */}
        {days.map((d, i) => {
          const barW = Math.max(2, CHART_W / days.length - 2);
          const cx = xOf(i);
          const maxDay = Math.max(...days.map(x => Math.max(x.gained, x.lost)), 1);
          const tickMaxH = 14;
          const gainedH = d.gained > 0 ? Math.max(3, Math.round((d.gained / maxDay) * tickMaxH)) : 0;
          const lostH = d.lost > 0 ? Math.max(3, Math.round((d.lost / maxDay) * tickMaxH)) : 0;
          return (
            <React.Fragment key={`fill${i}`}>
              {gainedH > 0 && (
                <View style={{
                  position: 'absolute',
                  left: cx - barW / 2,
                  top: CHART_H - gainedH,
                  width: barW,
                  height: gainedH,
                  backgroundColor: '#4CAF50',
                  opacity: 0.5,
                  borderRadius: 2,
                }} />
              )}
              {lostH > 0 && (
                <View style={{
                  position: 'absolute',
                  left: cx - barW / 2,
                  top: CHART_H - gainedH - lostH - (gainedH > 0 ? 2 : 0),
                  width: barW,
                  height: lostH,
                  backgroundColor: '#E8445A',
                  opacity: 0.5,
                  borderRadius: 2,
                }} />
              )}
            </React.Fragment>
          );
        })}

        {/* Segmenti linea */}
        {netPoints.slice(0, -1).map((p, i) => {
          const q = netPoints[i + 1];
          const dx = q.x - p.x;
          const dy = q.y - p.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * 180 / Math.PI;
          return (
            <View key={`seg${i}`} style={{
              position: 'absolute',
              width: length,
              height: 2.5,
              backgroundColor: '#2196F3',
              borderRadius: 1.5,
              left: (p.x + q.x) / 2 - length / 2,
              top: (p.y + q.y) / 2 - 1.25,
              transform: [{ rotate: `${angle}deg` }],
            }} />
          );
        })}

        {/* Punto oggi */}
        {netPoints.length > 0 && (() => {
          const last = netPoints[netPoints.length - 1];
          return (
            <View style={{
              position: 'absolute',
              width: 9, height: 9, borderRadius: 5,
              backgroundColor: '#2196F3',
              left: last.x - 4.5,
              top: last.y - 4.5,
            }} />
          );
        })()}

        {/* Label asse X */}
        {xLabels.map((d, i) => {
          const idx = days.indexOf(d);
          return (
            <Text key={i} style={{
              position: 'absolute',
              left: Math.max(0, Math.min(xOf(idx) - 8, CHART_W - 16)),
              top: CHART_H + 2,
              width: 16,
              textAlign: 'center',
              fontSize: 10,
              color: d.isToday ? '#2196F3' : colors.textFaint,
              fontWeight: d.isToday ? '800' : '600',
            }}>
              {period === 'week' ? d.label : d.date}
            </Text>
          );
        })}
      </View>

      <View style={chartStyles.summary}>
        <View style={chartStyles.summaryItem}>
          <Text style={[chartStyles.summaryVal, { color: '#4CAF50' }]}>+{totalGained}</Text>
          <Text style={chartStyles.summaryLbl}>attività ❤️</Text>
        </View>
        <View style={chartStyles.summaryDivider} />
        <View style={chartStyles.summaryItem}>
          <Text style={[chartStyles.summaryVal, { color: '#E8445A' }]}>-{totalLost}</Text>
          <Text style={chartStyles.summaryLbl}>drink 💔</Text>
        </View>
        <View style={chartStyles.summaryDivider} />
        <View style={chartStyles.summaryItem}>
          <Text style={[chartStyles.summaryVal, { color: net >= 0 ? '#4CAF50' : '#E8445A' }]}>
            {net >= 0 ? '+' : ''}{net}
          </Text>
          <Text style={chartStyles.summaryLbl}>netto 📈</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Medaglie ────────────────────────────────────────────────────────────

interface Medal {
  id: string;
  icon: string;
  name: string;
  desc: string;
  earned: boolean;
  current: number;
  target: number;
  unit?: string;
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

  const m = (id: string, icon: string, name: string, desc: string, current: number, target: number, unit?: string): Medal => ({
    id, icon, name, desc, earned: current >= target,
    current: Math.min(current, target), target, unit,
  });

  return [
    // ─── Attività ───
    m('first_drink',    '🍺', 'Prima Birra',          'Logga il tuo primo drink',           drinks.length, 1, 'drink'),
    m('first_workout',  '👟', 'Primo Passo',           'Logga il tuo primo allenamento',      workouts.length, 1, 'allenamento'),
    m('maialino_doc',   '🐷', 'Maialino DOC',          '20 drink loggati in totale',          drinks.length, 20, 'drink'),
    m('atleta',         '💪', 'Atleta',                '20 attività loggate in totale',       workouts.length, 20, 'attività'),
    m('social_drinker', '🥂', 'Social Drinker',        '50 drink loggati',                    drinks.length, 50, 'drink'),
    m('iron_man',       '🦾', 'Iron Man',              '50 allenamenti loggati',              workouts.length, 50, 'attività'),
    m('alcolizzato',    '🍻', 'Alcolizzato',           '100 drink loggati — sblocca Ubriaco', drinks.length, 100, 'drink'),
    m('centurione',     '🏛️', 'Centurione',           '100 attività totali — sblocca Palestrato', drinks.length + workouts.length, 100, 'attività'),
    m('costante',       '📅', 'Costante',              '7 giorni consecutivi di attività',     maxStreak, 7, 'giorni'),
    m('maratoneta',     '🏅', 'Maratoneta',            '42 km totali corsi',                  Math.round(totalKm * 10) / 10, 42, 'km'),
    m('scalatore',      '🏔️', 'Scalatore',            '500m di dislivello totali',            Math.round(totalElev), 500, 'm'),
    m('virtuoso',       '🌟', 'Virtuoso',              'Punteggio superiore a +15',           Math.max(0, hearts), 15, '❤️'),
    m('leggenda',       '👑', 'Leggenda',              'Punteggio superiore a +50',           Math.max(0, hearts), 50, '❤️'),
    m('debiti',         '💸', 'Troppo Bere',           'Punteggio sceso sotto -10',           Math.max(0, -hearts), 10, '💔'),

    // ─── Oro 🥇 ───
    m('g_sing_1',  '🥇', 'Campione',            '1° nei singoli a fine mese',          rc.gs, 1, 'volta'),
    m('g_tand_1',  '🥇', 'Coppia d\'Oro',       '1° nel tandem a fine mese',           rc.gt, 1, 'volta'),
    m('g_clan_1',  '🥇', 'Branco Alpha',        '1° nel clan a fine mese',             rc.gc, 1, 'volta'),
    m('g_sing_6',  '🏆', 'Semestre d\'Oro',     '6 volte 1° singoli',                  rc.gs, 6, 'volte'),
    m('g_tand_6',  '🏆', 'Tandem Invincibile',  '6 volte 1° tandem',                  rc.gt, 6, 'volte'),
    m('g_clan_6',  '🏆', 'Clan Imbattibile',    '6 volte 1° clan',                    rc.gc, 6, 'volte'),
    m('g_12',      '✨', 'Anno d\'Oro',          '12 ori totali (qualsiasi categoria)', totalGold, 12, 'ori'),
    m('g_24',      '💎', 'Biennio d\'Oro',       '24 ori totali (qualsiasi categoria)', totalGold, 24, 'ori'),

    // ─── Argento 🥈 ───
    m('s_sing_1',  '🥈', 'Vice Campione',        '2° nei singoli a fine mese',          rc.ss, 1, 'volta'),
    m('s_tand_1',  '🥈', 'Coppia d\'Argento',    '2° nel tandem a fine mese',           rc.st, 1, 'volta'),
    m('s_clan_1',  '🥈', 'Branco Beta',          '2° nel clan a fine mese',             rc.sc, 1, 'volta'),
    m('s_sing_6',  '🪙', 'Semestre d\'Argento',  '6 volte 2° singoli',                  rc.ss, 6, 'volte'),
    m('s_tand_6',  '🪙', 'Tandem d\'Argento',    '6 volte 2° tandem',                  rc.st, 6, 'volte'),
    m('s_clan_6',  '🪙', 'Clan d\'Argento',      '6 volte 2° clan',                    rc.sc, 6, 'volte'),
    m('s_12',      '🌙', 'Anno d\'Argento',      '12 argenti totali',                   totalSilver, 12, 'argenti'),
    m('s_24',      '⚪', 'Biennio d\'Argento',   '24 argenti totali',                   totalSilver, 24, 'argenti'),

    // ─── Bronzo 🥉 ───
    m('b_sing_1',  '🥉', 'Sul Podio',            '3° nei singoli a fine mese',          rc.bs, 1, 'volta'),
    m('b_tand_1',  '🥉', 'Coppia di Bronzo',     '3° nel tandem a fine mese',           rc.bt, 1, 'volta'),
    m('b_clan_1',  '🥉', 'Branco Gamma',         '3° nel clan a fine mese',             rc.bc, 1, 'volta'),
    m('b_sing_6',  '🔶', 'Semestre di Bronzo',   '6 volte 3° singoli',                  rc.bs, 6, 'volte'),
    m('b_tand_6',  '🔶', 'Veterano Tandem',      '6 volte 3° tandem',                  rc.bt, 6, 'volte'),
    m('b_clan_6',  '🔶', 'Veterano Clan',        '6 volte 3° clan',                    rc.bc, 6, 'volte'),
    m('b_12',      '🟤', 'Anno di Bronzo',       '12 bronzi totali',                    totalBronze, 12, 'bronzi'),
    m('b_24',      '🗿', 'Biennio di Bronzo',    '24 bronzi totali',                    totalBronze, 24, 'bronzi'),
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
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const actionStyles = useMemo(() => makeActionStyles(colors, isDark), [colors, isDark]);
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
  const [missionStats, setMissionStats] = useState({ currentMission: 1, dailyDone: 0, tandemDone: 0, clanDone: 0 });
  const [injuryInfo, setInjuryInfo] = useState<{ mode: boolean; since: string | null }>({ mode: false, since: null });
  const [statsRefreshing, setStatsRefreshing] = useState(false);
  const [pigSkinId, setPigSkinId] = useState(0);
  const [pigSkinVariant, setPigSkinVariant] = useState<string>('base');
  const [pigBgId, setPigBgId] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followCounts, setFollowCounts] = useState({ following: 0, followers: 0 });
  const [followModal, setFollowModal] = useState<null | 'following' | 'followers'>(null);
  const [followList, setFollowList] = useState<{ id: string; username: string; avatar_url: string | null }[]>([]);

  useEffect(() => {
    if (isOwner || !user || !params.userId) return;
    supabase.from('follows')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('following_id', params.userId)
      .maybeSingle()
      .then(({ data }) => setIsFollowing(!!data));
  }, [params.userId, user?.id, isOwner]);

  useEffect(() => {
    const uid = isOwner ? user?.id : params.userId;
    if (!uid) return;
    Promise.all([
      supabase.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', uid),
      supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', uid),
    ]).then(([following, followers]) => {
      setFollowCounts({ following: following.count ?? 0, followers: followers.count ?? 0 });
    });
  }, [isOwner, user?.id, params.userId]);

  async function openFollowModal(tab: 'following' | 'followers') {
    const uid = isOwner ? user?.id : params.userId;
    if (!uid) return;
    setFollowModal(tab);
    setFollowList([]);
    if (tab === 'following') {
      const { data } = await supabase
        .from('follows')
        .select('profiles!follows_following_id_fkey(id, username, avatar_url)')
        .eq('follower_id', uid);
      setFollowList((data ?? []).map((r: any) => r.profiles).filter(Boolean));
    } else {
      const { data } = await supabase
        .from('follows')
        .select('profiles!follows_follower_id_fkey(id, username, avatar_url)')
        .eq('following_id', uid);
      setFollowList((data ?? []).map((r: any) => r.profiles).filter(Boolean));
    }
  }

  async function toggleFollow() {
    if (!user || !params.userId || followLoading) return;
    setFollowLoading(true);
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', params.userId);
      setIsFollowing(false);
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: params.userId });
      setIsFollowing(true);
      const { data: target } = await supabase.from('profiles').select('push_token, notif_pref').eq('id', params.userId).single();
      if (target?.push_token && target.notif_pref !== 'none') {
        await sendPushNotification(target.push_token, '👥 Nuovo follower!', `${user.username} ha iniziato a seguirti`);
      }
    }
    setFollowLoading(false);
  }

  const fetchStats = useCallback(async () => {
    let uid: string | undefined;
    if (params.userId && params.userId !== user?.id) {
      uid = params.userId as string;
    } else {
      // Legge l'ID dalla sessione Supabase per evitare problemi di closure stale
      uid = user?.id ?? (await supabase.auth.getSession()).data.session?.user.id;
    }
    if (!uid) return;
    const { data } = await supabase.from('profiles')
      .select('current_mission, daily_missions_done, tandem_missions_done, clan_missions_done, injury_mode, injury_since, pig_skin, pig_skin_variant, pig_bg, rank_counts')
      .eq('id', uid).single();
    if (!data) return;
    setMissionStats({
      currentMission: data.current_mission ?? 1,
      dailyDone: data.daily_missions_done ?? 0,
      tandemDone: data.tandem_missions_done ?? 0,
      clanDone: data.clan_missions_done ?? 0,
    });
    setInjuryInfo({ mode: data.injury_mode ?? false, since: data.injury_since ?? null });
    setPigSkinId(data.pig_skin ?? 0);
    setPigSkinVariant(data.pig_skin_variant ?? 'base');
    setPigBgId(data.pig_bg ?? 0);
    const rc = data.rank_counts ?? {};
    setRankCounts({
      gs: rc.gs ?? 0, gt: rc.gt ?? 0, gc: rc.gc ?? 0,
      ss: rc.ss ?? 0, st: rc.st ?? 0, sc: rc.sc ?? 0,
      bs: rc.bs ?? 0, bt: rc.bt ?? 0, bc: rc.bc ?? 0,
    });
  }, [user?.id, params.userId]);

  useFocusEffect(useCallback(() => { fetchStats(); }, [fetchStats]));

  useEffect(() => { fetchStats(); }, [fetchStats]);

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
  const visibleTotal = visibleMedals.length;
  const stats = computeStats(displayLogs);

  const pigBg = SHOP_BGS.find(b => b.id === pigBgId)?.color ?? '#FFEAA7';
  const pigFrame = '#FFD700';

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

  async function handleRefresh() {
    setStatsRefreshing(true);
    await fetchStats();
    if (isOwner) getMentalityState().then(({ quarters }) => setMentalityQuarters(quarters));
    setStatsRefreshing(false);
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={statsRefreshing} onRefresh={handleRefresh} tintColor="#FFD700" />}
    >
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

        {isOwner && (
          <Text style={styles.photoDisclaimer}>Non caricare foto di terzi senza consenso</Text>
        )}


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
              {displayName}{injuryInfo.mode ? ' 🩹' : ''}{isOwner ? ' ✏️' : ''}
            </Text>
          </TouchableOpacity>
        )}

        {isOwner && <Text style={styles.email}>{user?.email}</Text>}

        <View style={styles.scoreChip}>
          <Text style={styles.scoreChipText}>
            {displayHearts >= 0 ? '❤️' : '💔'} {displayHearts > 0 ? '+' : ''}{Math.round(displayHearts)}
          </Text>
        </View>

        <View style={styles.followCountsRow}>
          <TouchableOpacity onPress={() => openFollowModal('following')} style={styles.followCountBtn}>
            <Text style={styles.followCountNum}>{followCounts.following}</Text>
            <Text style={styles.followCountLabel}>seguiti</Text>
          </TouchableOpacity>
          <View style={styles.followCountDivider} />
          <TouchableOpacity onPress={() => openFollowModal('followers')} style={styles.followCountBtn}>
            <Text style={styles.followCountNum}>{followCounts.followers}</Text>
            <Text style={styles.followCountLabel}>follower</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Modal seguiti / follower ─── */}
      <Modal visible={!!followModal} transparent animationType="slide" onRequestClose={() => setFollowModal(null)}>
        <TouchableOpacity style={styles.followModalOverlay} activeOpacity={1} onPress={() => setFollowModal(null)}>
          <View style={styles.followModalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.followModalTabs}>
              <TouchableOpacity
                style={[styles.followModalTab, followModal === 'following' && styles.followModalTabActive]}
                onPress={() => openFollowModal('following')}
              >
                <Text style={[styles.followModalTabText, followModal === 'following' && styles.followModalTabTextActive]}>
                  👥 Seguiti ({followCounts.following})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.followModalTab, followModal === 'followers' && styles.followModalTabActive]}
                onPress={() => openFollowModal('followers')}
              >
                <Text style={[styles.followModalTabText, followModal === 'followers' && styles.followModalTabTextActive]}>
                  ❤️ Follower ({followCounts.followers})
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {followList.length === 0 ? (
                <Text style={styles.followModalEmpty}>Nessuno ancora</Text>
              ) : followList.map((u) => (
                <TouchableOpacity
                  key={u.id}
                  style={styles.followModalRow}
                  onPress={() => {
                    setFollowModal(null);
                    if (u.id !== user?.id) router.push(`/profilo?userId=${u.id}` as any);
                  }}
                >
                  <View style={styles.followModalAvatar}>
                    {u.avatar_url
                      ? <Image source={{ uri: u.avatar_url }} style={styles.followModalAvatarImg} />
                      : <Text style={{ fontSize: 20 }}>👤</Text>}
                  </View>
                  <Text style={styles.followModalName}>{u.username}</Text>
                  <Text style={{ fontSize: 14, color: colors.textFaint }}>›</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.followModalClose} onPress={() => setFollowModal(null)}>
              <Text style={styles.followModalCloseText}>Chiudi</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

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

      {/* Segui */}
      {!isOwner && (
        <TouchableOpacity style={[styles.followBtn, isFollowing && styles.followBtnActive]} onPress={toggleFollow} disabled={followLoading}>
          <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
            {followLoading ? '...' : isFollowing ? '✓ Segui già' : '+ Segui'}
          </Text>
        </TouchableOpacity>
      )}

      {/* ─── Card Maialino Avatar ─── */}
      <Text style={styles.sectionTitle}>{isOwner ? 'Il tuo maialino' : 'Il suo maialino'}</Text>
      <View style={[styles.pigCard, { borderColor: pigFrame }]}>
        <PigBgView bgId={pigBgId} style={styles.pigBg}>
          <PigSkin skinId={pigSkinId} variant={pigSkinVariant as any} size={150} />
        </PigBgView>
        {isOwner && (
          <View style={styles.pigLayers}>
            <TouchableOpacity
              style={styles.pigLayerItem}
              onPress={() => router.push({ pathname: '/shop', params: { tab: 'skin' } } as any)}
              activeOpacity={0.7}
            >
              <PigSkin skinId={pigSkinId} variant={pigSkinVariant as any} size={34} />
              <Text style={styles.pigLayerLabel}>Maialino ›</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.pigLayerItem}
              onPress={() => router.push({ pathname: '/shop', params: { tab: 'sfondo' } } as any)}
              activeOpacity={0.7}
            >
              <PigBgView bgId={pigBgId} size={34} />
              <Text style={styles.pigLayerLabel}>Sfondo ›</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ─── Grafico attività ─── */}
      <Text style={styles.sectionTitle}>Andamento</Text>
      <StatsChart logs={displayLogs} currentHearts={displayHearts} />

      {/* ─── Medaglie ─── */}
      <Text style={styles.sectionTitle}>Medaglie — {earnedCount}/{visibleTotal}</Text>
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

            {/* Barra progresso */}
            {selectedMedal && (
              <View style={styles.modalProgressWrap}>
                <View style={styles.modalProgressBg}>
                  <View style={[styles.modalProgressFill, {
                    width: `${Math.min((selectedMedal.current / selectedMedal.target) * 100, 100)}%` as any,
                    backgroundColor: selectedMedal.earned ? '#4CAF50' : '#FFD700',
                  }]} />
                </View>
                <Text style={styles.modalProgressText}>
                  {selectedMedal.current} / {selectedMedal.target} {selectedMedal.unit}
                  {' · '}{Math.round((selectedMedal.current / selectedMedal.target) * 100)}%
                </Text>
              </View>
            )}

            <View style={[styles.modalStatus, { backgroundColor: selectedMedal?.earned ? (isDark ? '#1c3320' : '#e8f5e9') : (isDark ? '#33181c' : '#fce4ec') }]}>
              <Text style={[styles.modalStatusText, { color: selectedMedal?.earned ? (isDark ? '#7ed896' : '#2e7d32') : (isDark ? '#f0a0a0' : '#c62828') }]}>
                {selectedMedal?.earned ? 'Sbloccata! 🎉' : 'Non ancora sbloccata'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── Statistiche ─── */}
      <Text style={styles.sectionTitle}>📊 {isOwner ? 'Le tue statistiche' : 'Statistiche'}</Text>
      <View style={styles.statsGrid}>
        {/* Missioni — sempre prime */}
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🎯</Text>
          <Text style={styles.statValue}>#{missionStats.currentMission}</Text>
          <Text style={styles.statLabel}>Miss. vita</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>📅</Text>
          <Text style={styles.statValue}>{missionStats.dailyDone}</Text>
          <Text style={styles.statLabel}>Miss. giornaliere</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🤝</Text>
          <Text style={styles.statValue}>{missionStats.tandemDone}</Text>
          <Text style={styles.statLabel}>Miss. tandem</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🏰</Text>
          <Text style={styles.statValue}>{missionStats.clanDone}</Text>
          <Text style={styles.statLabel}>Miss. clan</Text>
        </View>
        {/* Attività sport e drink */}
        {stats.map(s => (
          <View key={s.id} style={styles.statCard}>
            <Text style={styles.statIcon}>{s.icon}</Text>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* ─── Infortunio ─── */}
      {injuryInfo.mode && injuryInfo.since && (() => {
        const days = Math.floor((Date.now() - new Date(injuryInfo.since).getTime()) / 86400000);
        return (
          <View style={styles.injuryBanner}>
            <Text style={styles.injuryBannerEmoji}>🩹</Text>
            <View>
              <Text style={styles.injuryBannerTitle}>Modalità Infortunio attiva</Text>
              <Text style={styles.injuryBannerSub}>Da {days === 0 ? 'oggi' : `${days} giorn${days === 1 ? 'o' : 'i'}`} · Missioni e cuori ridotti</Text>
            </View>
          </View>
        );
      })()}

      {/* ─── Azioni (solo personale) ─── */}
      {isOwner && (
        <>
          <TouchableOpacity style={actionStyles.logoutBtn} onPress={handleLogout}>
            <Text style={actionStyles.logoutText}>Esci dall'account</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────

const MEDAL_SIZE = (SCREEN_W - 48 - 4 * 12) / 5;

function makeStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
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
    photoDisclaimer: {
      fontSize: 11, color: colors.textFaint, textAlign: 'center',
      marginTop: 2, marginBottom: 8, maxWidth: 200,
    },
    followBtn: {
      marginTop: 10, paddingHorizontal: 24, paddingVertical: 8,
      borderRadius: 20, borderWidth: 1.5, borderColor: '#FFD700',
    },
    followBtnActive: { backgroundColor: '#FFD700' },
    followBtnText: { fontSize: 14, fontWeight: '700', color: '#FFD700' },
    followBtnTextActive: { color: '#1a1a1a' },
    editBadge: {
      position: 'absolute', bottom: 0, right: 0,
      backgroundColor: colors.card, borderRadius: 14, width: 28, height: 28,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0 : 0.2, shadowRadius: 3, elevation: isDark ? 0 : 3,
    },
    username: { fontSize: 22, fontWeight: '800', color: colors.text },
    email: { fontSize: 13, color: colors.textFaint, marginTop: 2 },
    nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
    nameInput: {
      fontSize: 18, fontWeight: '700', color: colors.text,
      borderBottomWidth: 2, borderBottomColor: '#FFD700',
      paddingVertical: 4, paddingHorizontal: 8, minWidth: 120, textAlign: 'center',
    },
    nameBtn: { padding: 4 },
    scoreChip: {
      marginTop: 10, backgroundColor: colors.card, borderRadius: 20,
      paddingHorizontal: 18, paddingVertical: 8,
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0 : 0.08, shadowRadius: 4, elevation: isDark ? 0 : 2,
    },
    scoreChipText: { fontSize: 18, fontWeight: '800', color: '#E8445A' },
    followCountsRow: {
      flexDirection: 'row', alignItems: 'center', marginTop: 12,
      backgroundColor: colors.card, borderRadius: 16,
      paddingHorizontal: 20, paddingVertical: 8,
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0 : 0.06, shadowRadius: 3, elevation: isDark ? 0 : 1,
    },
    followCountBtn: { alignItems: 'center', paddingHorizontal: 16 },
    followCountNum: { fontSize: 18, fontWeight: '900', color: colors.text },
    followCountLabel: { fontSize: 11, color: colors.textFaint, marginTop: 1 },
    followCountDivider: { width: 1, height: 28, backgroundColor: colors.border },
    followModalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    followModalContent: {
      backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 20, paddingBottom: 36,
    },
    followModalTabs: { flexDirection: 'row', marginBottom: 16, gap: 8 },
    followModalTab: {
      flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
      backgroundColor: colors.bgAlt,
    },
    followModalTabActive: { backgroundColor: '#FFD700' },
    followModalTabText: { fontSize: 13, fontWeight: '700', color: colors.textDim },
    followModalTabTextActive: { color: '#1a1a1a' },
    followModalRow: {
      flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12,
    },
    followModalAvatar: {
      width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgAlt,
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    },
    followModalAvatarImg: { width: 40, height: 40, borderRadius: 20 },
    followModalName: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
    followModalEmpty: { textAlign: 'center', color: colors.textFaint, paddingVertical: 32, fontSize: 14 },
    followModalClose: { marginTop: 16, alignSelf: 'center', paddingHorizontal: 24, paddingVertical: 10 },
    followModalCloseText: { fontSize: 14, fontWeight: '600', color: colors.textDim },

    sectionTitle: {
      fontSize: 14, fontWeight: '700', color: colors.text,
      marginBottom: 10, marginTop: 8,
    },

    // Mentality
    mentalityCard: {
      backgroundColor: colors.card, borderRadius: 18, padding: 20, marginBottom: 24,
      borderWidth: 2, borderColor: '#4CAF50',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0 : 0.06, shadowRadius: 6, elevation: isDark ? 0 : 2,
    },
    mentalityHeader: { marginBottom: 16 },
    mentalityTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
    mentalitySubtitle: { fontSize: 12, color: colors.textDim, marginTop: 2 },
    mentalityBody: { flexDirection: 'row', alignItems: 'center', gap: 20 },
    mentalityInfo: { flex: 1 },
    mentalityProgress: { fontSize: 28, fontWeight: '900', color: '#E8445A' },
    mentalityHint: { fontSize: 12, color: colors.textDim, marginTop: 2 },

    // Card Maialino
    pigCard: {
      backgroundColor: colors.card, borderRadius: 20, overflow: 'hidden',
      marginBottom: 24, borderWidth: 3,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0 : 0.08, shadowRadius: 6, elevation: isDark ? 0 : 3,
    },
    pigBg: {
      alignItems: 'center', justifyContent: 'center',
      height: 276,
    },
    pigSkin: { fontSize: 72 },
    pigLayers: {
      flexDirection: 'row', justifyContent: 'space-around',
      paddingVertical: 12, paddingHorizontal: 20,
      borderTopWidth: 1, borderTopColor: colors.border,
    },
    pigLayerItem: { alignItems: 'center', gap: 4 },
    pigLayerDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border },
    pigLayerLabel: { fontSize: 10, color: colors.textFaint, fontWeight: '600', textTransform: 'uppercase' },
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
      backgroundColor: isDark ? '#332a0d' : '#FFF8E1', borderWidth: 2, borderColor: '#FFD700',
      shadowColor: '#FFD700', shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0 : 0.3, shadowRadius: 4, elevation: isDark ? 0 : 2,
    },
    medalLocked: {
      backgroundColor: colors.bgAlt, borderWidth: 2, borderColor: colors.border,
    },
    medalIcon: { fontSize: MEDAL_SIZE * 0.45 },

    // Modal medaglia
    modalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center', justifyContent: 'center', padding: 40,
    },
    modalCard: {
      backgroundColor: colors.card, borderRadius: 24, padding: 32,
      alignItems: 'center', width: '100%', maxWidth: 300,
      shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0 : 0.2, shadowRadius: 20, elevation: isDark ? 0 : 10,
    },
    modalIcon: { fontSize: 56, marginBottom: 12 },
    modalName: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 8, textAlign: 'center' },
    modalDesc: { fontSize: 14, color: colors.textDim, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
    modalProgressWrap: { width: '100%', marginBottom: 16 },
    modalProgressBg: { height: 10, backgroundColor: colors.border, borderRadius: 5, overflow: 'hidden', marginBottom: 6 },
    modalProgressFill: { height: 10, borderRadius: 5 },
    modalProgressText: { fontSize: 13, color: colors.textDim, textAlign: 'center', fontWeight: '600' },
    modalStatus: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 },
    modalStatusText: { fontSize: 13, fontWeight: '700' },

    // Statistiche
    statsGrid: {
      flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20,
    },
    statCard: {
      backgroundColor: colors.card, borderRadius: 12, padding: 8,
      alignItems: 'center',
      width: (SCREEN_W - 48 - 3 * 8) / 4,
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0 : 0.06, shadowRadius: 4, elevation: isDark ? 0 : 2,
    },
    statIcon: { fontSize: 18, marginBottom: 3 },
    statValue: { fontSize: 12, fontWeight: '800', color: colors.text, marginBottom: 1, textAlign: 'center' },
    statLabel: { fontSize: 8.5, color: colors.textFaint, textAlign: 'center', lineHeight: 11 },

    // Infortunio
    injuryBanner: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: isDark ? '#301818' : '#FFF0F0', borderRadius: 14,
      padding: 14, marginTop: 12, gap: 12,
      borderWidth: 1, borderColor: isDark ? '#5a2a2a' : '#FFCCCC',
    },
    injuryBannerEmoji: { fontSize: 28 },
    injuryBannerTitle: { fontSize: 14, fontWeight: '800', color: isDark ? '#ff8a8a' : '#cc3333' },
    injuryBannerSub: { fontSize: 12, color: colors.textFaint, marginTop: 2 },

  });
}

function makeChartStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card, borderRadius: 18, padding: 16, marginBottom: 24,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0 : 0.06, shadowRadius: 6, elevation: isDark ? 0 : 2,
    },
    selector: {
      flexDirection: 'row', backgroundColor: colors.bgAlt,
      borderRadius: 10, padding: 3, marginBottom: 16,
    },
    selectorBtn: {
      flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center',
    },
    selectorBtnActive: { backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: isDark ? 0 : 0.08, shadowRadius: 3, elevation: isDark ? 0 : 2 },
    selectorText: { fontSize: 13, fontWeight: '600', color: colors.textFaint },
    selectorTextActive: { color: colors.text, fontWeight: '700' },

    summary: {
      flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12,
    },
    summaryItem: { flex: 1, alignItems: 'center' },
    summaryVal: { fontSize: 17, fontWeight: '900', color: colors.text },
    summaryLbl: { fontSize: 11, color: colors.textFaint, marginTop: 2 },
    summaryDivider: { width: 1, backgroundColor: colors.border, marginVertical: 4 },
  });
}

function makeActionStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    actionBtn: {
      backgroundColor: colors.card, borderRadius: 14, padding: 16,
      alignItems: 'center', marginBottom: 10,
      borderWidth: 1.5, borderColor: colors.border,
    },
    actionBtnText: { color: colors.text, fontWeight: '700', fontSize: 15 },
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
}
