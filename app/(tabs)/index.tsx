import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Animated, RefreshControl, Alert, Modal, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeColors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { isHealthAvailable } from '@/lib/health';
import { UserAvatar } from '@/components/UserAvatar';
import { checkAndAwardMentality } from '@/lib/mentality';
import {
  getTodayDailyMissions, getDailyProgress, SEQ_MISSIONS, calcSeqProgress,
  advanceSeqMission, claimDailyMission, getDailyClaimedMask,
  type DailyProgress, type SeqProgress,
} from '@/lib/personalMissions';
import { LogCard, makeLogCardStyles, type LogRow, type ReactionSummary, type Reactor } from '@/components/LogCard';
import { sendPushNotification } from '@/lib/notifications';

function getMotivationalPhrase(hearts: number): string {
  if (hearts <= -50) return 'Situazione critica... il fegato chiede pietà';
  if (hearts <= -25) return 'Il divano ti sta vincendo... reagisci!';
  if (hearts <= -10) return 'Hai un bel debito da ripagare — corri!';
  if (hearts < 0) return 'Sei in rosso — una corsetta e torni in pari';
  if (hearts === 0) return 'Parti da zero — fai sport!';
  if (hearts < 10) return 'Buon inizio, continua così!';
  if (hearts < 25) return 'Sei in forma — il maialino è fiero di te';
  if (hearts < 50) return 'Macchina da guerra! Inarrestabile';
  if (hearts < 100) return 'Leggenda vivente — sei un esempio per tutti';
  return 'SEI UN DIO DEL RUNNING! Nessuno ti ferma!';
}

export default function DashboardScreen() {
  const { state } = useApp();
  const { user, clan, refreshClan } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const mStyles = useMemo(() => makeMStyles(colors, isDark), [colors, isDark]);
  const router = useRouter();
  const [tandem, setTandem] = useState<{ name: string; members: { id: string; username: string; hearts: number; avatarUrl: string | null }[] } | null>(null);

  const loadTandem = async (uid: string) => {
    const { data } = await supabase.from('profiles').select('tandem_id').eq('id', uid).single();
    if (!data?.tandem_id) return;
    const [{ data: t }, { data: members }] = await Promise.all([
      supabase.from('tandems').select('name').eq('id', data.tandem_id).single(),
      supabase.from('profiles').select('id, username, hearts, avatar_url').eq('tandem_id', data.tandem_id),
    ]);
    if (t) setTandem({ name: t.name, members: (members ?? []).map(m => ({ id: m.id, username: m.username, hearts: m.hearts, avatarUrl: m.avatar_url ?? null })) });
  };

  useEffect(() => {
    if (!user) return;
    loadTandem(user.id);
  }, [user?.id]);

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayLogs = state.logs.filter((l) => l.timestamp.startsWith(today));
  const todayDrinks = todayLogs.filter((l) => l.type === 'drink');
  const todayWorkouts = todayLogs.filter((l) => l.type === 'workout');
  const todayDrinkHearts = todayDrinks.reduce((s, l) => s + (l.type === 'drink' ? l.heartsLost : 0), 0);
  const todayWorkoutHearts = todayWorkouts.reduce((s, l) => s + (l.type === 'workout' ? l.heartsGained : 0), 0);
  const scoreColor = state.hearts > 0 ? '#E8445A' : state.hearts < 0 ? '#ff3b30' : '#aaa';

  const clanScore = clan ? clan.members.reduce((sum, m) => sum + Math.round(m.hearts), 0) : null;
  const tandemScore = tandem ? tandem.members.reduce((s, m) => s + Math.round(m.hearts), 0) : 0;

  // ─── Missioni personali ───
  const dailyMissionsDef = getTodayDailyMissions();
  const [dailyProgress, setDailyProgress] = useState<DailyProgress | null>(null);
  const [claimedMask, setClaimedMask] = useState(0); // bitmask: 1=run, 2=activity, 4=nodrink
  const [currentMission, setCurrentMission] = useState(1);
  const [missionStartedAt, setMissionStartedAt] = useState<string>(new Date().toISOString());
  const [seqProgress, setSeqProgress] = useState<SeqProgress | null>(null);
  const [seqLoading, setSeqLoading] = useState(true);
  const [advancingSeq, setAdvancingSeq] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [myFeedLogs, setMyFeedLogs] = useState<LogRow[]>([]);
  const [showAllFeed, setShowAllFeed] = useState(false);
  const [reactionsByLog, setReactionsByLog] = useState<Record<string, ReactionSummary[]>>({});
  const [reactorsByLog, setReactorsByLog] = useState<Record<string, Reactor[]>>({});
  const [reactorsModal, setReactorsModal] = useState<{ logId: string } | null>(null);
  const FEED_LIMIT = 15;

  const loadSeqMission = async (uid: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('current_mission, mission_started_at')
      .eq('id', uid)
      .single();
    const n = data?.current_mission ?? 1;
    const since = data?.mission_started_at ?? new Date().toISOString();
    setCurrentMission(n);
    setMissionStartedAt(since);
    const mission = SEQ_MISSIONS[n - 1];
    if (mission) {
      const p = await calcSeqProgress(mission, uid, since);
      setSeqProgress(p);
      setSeqLoading(false);
    } else {
      setSeqLoading(false);
    }
  };

  const handleAdvanceSeq = async () => {
    if (!user || advancingSeq) return;
    setAdvancingSeq(true);
    await advanceSeqMission(user.id, currentMission);
    await loadSeqMission(user.id);
    setAdvancingSeq(false);
  };

  const handleClaimDaily = async (bit: 1 | 2 | 4) => {
    if (!user) return;
    if (bit === 4) {
      const uid = user.id;
      Alert.alert(
        'Conferma no drink 🍺',
        'Sicuro di non aver bevuto ieri? Se aggiungi alcol retroattivo dopo aver riscosso, i punti non vengono tolti.',
        [
          { text: 'Aspetta', style: 'cancel' },
          { text: 'Sì, riscuoti', onPress: async () => {
            try {
              const ok = await claimDailyMission(uid, bit);
              setClaimedMask(m => m | bit); // aggiorna sempre, sia ok che già riscosso
              if (!ok) Alert.alert('Già riscosso', 'Hai già riscosso questa missione oggi.');
            } catch (e: any) {
              Alert.alert('Errore', e.message);
            }
          }},
        ]
      );
      return;
    }
    const ok = await claimDailyMission(user.id, bit);
    if (ok) setClaimedMask(m => m | bit);
  };

  const fetchFeedReactions = useCallback(async (logIds: string[]) => {
    if (!user || logIds.length === 0) return;
    const { data } = await supabase
      .from('log_reactions')
      .select('log_id, user_id, emoji, profiles(username, avatar_url)')
      .in('log_id', logIds);
    const grouped: Record<string, Record<string, { count: number; mine: boolean }>> = {};
    const reactors: Record<string, Reactor[]> = {};
    (data ?? []).forEach((r: any) => {
      if (!grouped[r.log_id]) grouped[r.log_id] = {};
      if (!grouped[r.log_id][r.emoji]) grouped[r.log_id][r.emoji] = { count: 0, mine: false };
      grouped[r.log_id][r.emoji].count++;
      if (r.user_id === user.id) grouped[r.log_id][r.emoji].mine = true;
      if (!reactors[r.log_id]) reactors[r.log_id] = [];
      reactors[r.log_id].push({ userId: r.user_id, username: r.profiles?.username ?? '?', avatarUrl: r.profiles?.avatar_url ?? null, emoji: r.emoji });
    });
    const result: Record<string, ReactionSummary[]> = {};
    Object.entries(grouped).forEach(([logId, emojis]) => {
      result[logId] = Object.entries(emojis).map(([emoji, v]) => ({ emoji, count: v.count, mine: v.mine }));
    });
    setReactionsByLog(result);
    setReactorsByLog(reactors);
  }, [user]);

  const fetchMyFeed = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from('logs')
      .select('id, user_id, type, item_id, item_name, hearts_delta, calories, quantity, km, elevation_meters, duration_minutes, description, photo_url, activity_date, created_at, profiles(username, avatar_url, pig_skin, pig_bg)')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) {
      const rows: LogRow[] = data.map((r: any, i: number) => ({
        id: r.id,
        user_id: r.user_id,
        username: r.profiles?.username ?? 'Maialino',
        avatar_url: r.profiles?.avatar_url ?? null,
        pig_skin: r.profiles?.pig_skin ?? 0,
        pig_bg: r.profiles?.pig_bg ?? 0,
        index: i,
        type: r.type,
        item_id: r.item_id ?? '',
        item_name: r.item_name,
        hearts_delta: r.hearts_delta,
        calories: r.calories,
        quantity: r.quantity,
        km: r.km,
        elevation_meters: r.elevation_meters,
        duration_minutes: r.duration_minutes,
        description: r.description ?? null,
        photo_url: r.photo_url ?? null,
        activity_date: r.activity_date ?? r.created_at?.slice(0, 10),
        timestamp: r.created_at,
        is_mine: true,
      }));
      setMyFeedLogs(rows);
      fetchFeedReactions(rows.map((r) => r.id));
    }
  }, [fetchFeedReactions]);

  const toggleFeedReaction = async (logId: string, emoji: string) => {
    if (!user) return;
    const current = reactionsByLog[logId] ?? [];
    const myExisting = current.find((r) => r.mine);
    const removingMine = myExisting?.emoji === emoji;
    const withoutMine = current
      .map((r) => r.mine ? { ...r, count: r.count - 1, mine: false } : r)
      .filter((r) => r.count > 0);
    if (removingMine) {
      setReactionsByLog((prev) => ({ ...prev, [logId]: withoutMine }));
      await supabase.from('log_reactions').delete().eq('log_id', logId).eq('user_id', user.id);
    } else {
      const existingTarget = withoutMine.find((r) => r.emoji === emoji);
      const next = existingTarget
        ? withoutMine.map((r) => r.emoji === emoji ? { ...r, count: r.count + 1, mine: true } : r)
        : [...withoutMine, { emoji, count: 1, mine: true }];
      setReactionsByLog((prev) => ({ ...prev, [logId]: next }));
      await supabase.from('log_reactions').upsert({ log_id: logId, user_id: user.id, emoji }, { onConflict: 'log_id,user_id' });
    }
  };

  const refreshAll = async (uid: string) => {
    await Promise.all([
      refreshClan(),
      getDailyProgress(uid).then(setDailyProgress),
      getDailyClaimedMask(uid).then(setClaimedMask),
      loadSeqMission(uid),
      loadTandem(uid),
    ]);
  };

  useEffect(() => {
    if (!user) return;
    refreshAll(user.id);
  }, [user?.id]);

  // Aggiorna missioni ogni volta che si torna sulla home (es. dopo aver loggato un drink)
  useFocusEffect(useCallback(() => {
    if (!user) return;
    getDailyProgress(user.id).then(setDailyProgress);
    getDailyClaimedMask(user.id).then(setClaimedMask);
    fetchMyFeed(user.id);
  }, [user?.id, fetchMyFeed]));

  // Auto-aggiorna progresso missioni quando cambia il numero di log
  useEffect(() => {
    if (!user) return;
    getDailyProgress(user.id).then(setDailyProgress);
    loadSeqMission(user.id);
  }, [state.logs.length]);

  const onRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    await refreshAll(user.id);
    setRefreshing(false);
  };

  // ─── Mentality daily reward ───
  const [mentalityBanner, setMentalityBanner] = useState<string | null>(null);
  const bannerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!user) return;
    checkAndAwardMentality(user.id).then(async ({ awarded, newQuarters, fullHeart }) => {
      if (!awarded) return;
      if (fullHeart) {
        // +1 cuore intero → aggiorna DB
        const { data: prof } = await supabase.from('profiles').select('hearts').eq('id', user.id).single();
        if (prof) {
          const newH = Math.round(prof.hearts) + 1;
          await supabase.from('profiles').update({ hearts: newH }).eq('id', user.id);
        }
        setMentalityBanner('Mentality 🧠 +1 ❤️ completo!');
      } else {
        setMentalityBanner(`Mentality 🧠 +¼ ❤️  (${newQuarters}/4)`);
      }
      // Animazione banner
      Animated.sequence([
        Animated.timing(bannerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.delay(2500),
        Animated.timing(bannerOpacity, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start(() => setMentalityBanner(null));
    }).catch(() => {});
  }, [user?.id]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFD700" />}>
      {/* Mentality banner */}
      {mentalityBanner && (
        <Animated.View style={[styles.mentalityBanner, { opacity: bannerOpacity }]}>
          <Text style={styles.mentalityBannerText}>{mentalityBanner}</Text>
        </Animated.View>
      )}

      {/* 1. Score card — compatta */}
      <View style={styles.heroCard}>
        <Text style={styles.hello}>Ciao, {user?.username} 🐷</Text>
        <View style={styles.scoreRow}>
          <Text style={styles.heartBig}>{state.hearts >= 0 ? '❤️' : '💔'}</Text>
          <Text style={[styles.heartsNumber, { color: scoreColor }]}>
            {state.hearts > 0 ? `+${Math.round(state.hearts)}` : Math.round(state.hearts)}
          </Text>
        </View>
        <Text style={styles.motivational}>{getMotivationalPhrase(state.hearts)}</Text>
      </View>

      {/* 2. CTA + contatori oggi */}
      <View style={styles.ctaRow}>
        <TouchableOpacity
          style={[styles.ctaButton, { backgroundColor: '#FF9800' }]}
          onPress={() => router.push('/(tabs)/two')}
        >
          <Text style={styles.ctaIcon}>🐷</Text>
          <Text style={styles.ctaText}>Hai bevuto?</Text>
          <View style={styles.ctaBadge}>
            <Text style={styles.ctaBadgeText}>
              {todayDrinks.length > 0 ? `${todayDrinks.length} oggi  -${todayDrinkHearts} ❤️` : 'Nessuno oggi'}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.ctaButton, { backgroundColor: '#2196F3' }]}
          onPress={() => router.push('/(tabs)/log-workout')}
        >
          <Text style={styles.ctaIcon}>🏃</Text>
          <Text style={styles.ctaText}>Hai corso?</Text>
          <View style={styles.ctaBadge}>
            <Text style={styles.ctaBadgeText}>
              {todayWorkouts.length > 0 ? `${todayWorkouts.length} oggi  +${todayWorkoutHearts} ❤️` : 'Nessuno oggi'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Importa da Health */}
      {isHealthAvailable() && (
        <TouchableOpacity
          style={styles.healthBtn}
          onPress={() => router.push('/(tabs)/health-import')}
        >
          <Text style={styles.healthBtnIcon}>{Platform.OS === 'ios' ? '🍎' : '💚'}</Text>
          <Text style={styles.healthBtnText}>
            Importa da {Platform.OS === 'ios' ? 'Apple Health' : 'Google Fit'}
          </Text>
        </TouchableOpacity>
      )}

      {/* ── MISSIONI PERSONALI ── */}
      <Text style={styles.sectionTitle}>Missioni di oggi</Text>

      {/* 3 card giornaliere affiancate */}
      <View style={mStyles.dailyRow}>
        {/* Corsa */}
        {(() => {
          const done = dailyProgress ? dailyProgress.runKm >= dailyMissionsDef.runKm : false;
          const pct = dailyProgress ? Math.min(dailyProgress.runKm / dailyMissionsDef.runKm, 1) : 0;
          const claimed = !!(claimedMask & 1);
          return (
            <View style={[mStyles.dailyCard, done && mStyles.dailyCardDone, claimed && mStyles.dailyCardClaimed]}>
              <Text style={mStyles.dailyEmoji}>🏃</Text>
              <Text style={mStyles.dailyTarget}>{dailyMissionsDef.runKm} km</Text>
              <Text style={mStyles.dailyLabel}>Corsa</Text>
              <View style={mStyles.miniBarBg}>
                <View style={[mStyles.miniBarFill, { width: `${Math.round(pct * 100)}%` as any, backgroundColor: done ? '#4CAF50' : '#2196F3' }]} />
              </View>
              {claimed ? (
                <Text style={mStyles.claimedText}>🎟 Riscosso</Text>
              ) : done ? (
                <TouchableOpacity style={mStyles.claimBtn} onPress={() => handleClaimDaily(1)}>
                  <Text style={mStyles.claimBtnText}>Riscuoti 🎟</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          );
        })()}

        {/* Attività */}
        {(() => {
          const done = dailyProgress ? dailyProgress.activityMin >= dailyMissionsDef.activityMin : false;
          const pct = dailyProgress ? Math.min(dailyProgress.activityMin / dailyMissionsDef.activityMin, 1) : 0;
          const label = dailyMissionsDef.activityMin >= 60
            ? `${dailyMissionsDef.activityMin / 60}h`
            : `${dailyMissionsDef.activityMin} min`;
          const claimed = !!(claimedMask & 2);
          return (
            <View style={[mStyles.dailyCard, done && mStyles.dailyCardDone, claimed && mStyles.dailyCardClaimed]}>
              <Text style={mStyles.dailyEmoji}>⏱️</Text>
              <Text style={mStyles.dailyTarget}>{label}</Text>
              <Text style={mStyles.dailyLabel}>Attività</Text>
              <View style={mStyles.miniBarBg}>
                <View style={[mStyles.miniBarFill, { width: `${Math.round(pct * 100)}%` as any, backgroundColor: done ? '#4CAF50' : '#FF9800' }]} />
              </View>
              {claimed ? (
                <Text style={mStyles.claimedText}>🎟 Riscosso</Text>
              ) : done ? (
                <TouchableOpacity style={mStyles.claimBtn} onPress={() => handleClaimDaily(2)}>
                  <Text style={mStyles.claimBtnText}>Riscuoti 🎟</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          );
        })()}

        {/* No drink */}
        {(() => {
          const done = dailyProgress?.noDrink ?? false;
          const drankYest = dailyProgress?.drankYesterday ?? false;
          const claimed = !!(claimedMask & 4);
          return (
            <View style={[mStyles.dailyCard, done && mStyles.dailyCardDone, claimed && mStyles.dailyCardClaimed, drankYest && mStyles.dailyCardFail]}>
              <Text style={mStyles.dailyEmoji}>{claimed ? '✅' : done ? '✅' : drankYest ? '🐷' : '🍺'}</Text>
              <Text style={mStyles.dailyTarget}>{done ? 'Fatto!' : drankYest ? 'Oink!' : 'Ieri'}</Text>
              <Text style={mStyles.dailyLabel}>No drink</Text>
              <View style={mStyles.miniBarBg}>
                <View style={[mStyles.miniBarFill, { width: done ? '100%' : '0%', backgroundColor: drankYest ? '#E8445A' : '#4CAF50' }]} />
              </View>
              {claimed ? (
                <Text style={mStyles.claimedText}>🎟 Riscosso</Text>
              ) : done ? (
                <TouchableOpacity style={mStyles.claimBtn} onPress={() => handleClaimDaily(4)}>
                  <Text style={mStyles.claimBtnText}>Riscuoti 🎟</Text>
                </TouchableOpacity>
              ) : drankYest ? (
                <Text style={mStyles.failText}>Hai bevuto 🍺</Text>
              ) : null}
            </View>
          );
        })()}
      </View>

      {/* Missione sequenziale */}
      <Text style={styles.sectionTitle}>Missioni di vita</Text>
      {seqLoading ? (
        <View style={mStyles.seqCard}><Text style={{ color: colors.textFaint, textAlign: 'center' }}>Caricamento...</Text></View>
      ) : currentMission > 100 ? (
        <View style={mStyles.seqCard}>
          <Text style={{ fontSize: 24, textAlign: 'center' }}>🏆</Text>
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text, textAlign: 'center', marginTop: 8 }}>Tutte le 100 missioni completate!</Text>
        </View>
      ) : (() => {
        const m = SEQ_MISSIONS[currentMission - 1];
        const p = seqProgress;
        const pct = p ? Math.round(p.pct * 100) : 0;
        return (
          <View style={mStyles.seqCard}>
            <View style={mStyles.seqHeader}>
              <View style={mStyles.seqBadge}><Text style={mStyles.seqBadgeText}>#{currentMission}</Text></View>
              <Text style={mStyles.seqLabel} numberOfLines={2}>{m?.label}</Text>
            </View>
            <View style={mStyles.seqBarBg}>
              <View style={[mStyles.seqBarFill, { width: `${pct}%` as any, backgroundColor: p?.completed ? '#4CAF50' : '#FFD700' }]} />
            </View>
            <View style={mStyles.seqFooter}>
              <Text style={mStyles.seqProgressText}>{p?.displayValue ?? '...'}</Text>
              {p?.completed && currentMission <= 100 && (
                <TouchableOpacity
                  style={mStyles.advanceBtn}
                  onPress={handleAdvanceSeq}
                  disabled={advancingSeq}
                >
                  <Text style={mStyles.advanceBtnText}>{advancingSeq ? '...' : `Avanza →${currentMission + 1}`}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })()}

      {/* 3. Tandem card — diagonale */}
      {tandem && tandem.members.length >= 2 && (
        <>
          <Text style={styles.sectionTitle}>Il tuo tandem</Text>
          <View style={styles.tandemCard}>
            {/* Punteggio totale tandem */}
            <View style={styles.tandemHeader}>
              <Text style={styles.tandemName}>👥 {tandem.name}</Text>
              <Text style={[styles.tandemTotal, { color: tandemScore >= 0 ? '#9C27B0' : '#ff3b30' }]}>
                {tandemScore > 0 ? '+' : ''}{tandemScore} ❤️
              </Text>
            </View>
            {/* Due metà con diagonale */}
            <View style={styles.tandemBody}>
              {/* Membro sinistro */}
              <TouchableOpacity style={styles.tandemHalf} onPress={() => router.push(tandem.members[0].id === user?.id ? '/profilo' : `/profilo?userId=${tandem.members[0].id}` as any)}>
                <UserAvatar avatarUrl={tandem.members[0].avatarUrl} isMe={tandem.members[0].id === user?.id} size={54} />
                <Text style={styles.tandemMemberName} numberOfLines={1}>{tandem.members[0].username}</Text>
                <Text style={[styles.tandemMemberScore, { color: tandem.members[0].hearts >= 0 ? '#9C27B0' : '#ff3b30' }]}>
                  {tandem.members[0].hearts > 0 ? '+' : ''}{Math.round(tandem.members[0].hearts)}
                </Text>
              </TouchableOpacity>
              {/* Separatore diagonale */}
              <View style={styles.tandemDiagonalContainer}>
                <View style={styles.tandemDiagonal} />
              </View>
              {/* Membro destro */}
              <TouchableOpacity style={styles.tandemHalf} onPress={() => router.push(tandem.members[1].id === user?.id ? '/profilo' : `/profilo?userId=${tandem.members[1].id}` as any)}>
                <UserAvatar avatarUrl={tandem.members[1].avatarUrl} isMe={tandem.members[1].id === user?.id} size={54} />
                <Text style={styles.tandemMemberName} numberOfLines={1}>{tandem.members[1].username}</Text>
                <Text style={[styles.tandemMemberScore, { color: tandem.members[1].hearts >= 0 ? '#9C27B0' : '#ff3b30' }]}>
                  {tandem.members[1].hearts > 0 ? '+' : ''}{Math.round(tandem.members[1].hearts)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}

      {/* 4. Clan card — avatar circolari */}
      {clan && (
        <>
          <Text style={styles.sectionTitle}>Il tuo clan</Text>
          <View style={styles.clanCard}>
            <View style={styles.clanHeader}>
              <Text style={styles.clanName}>🏆 {clan.name}</Text>
              <Text style={styles.clanCode}>#{clan.code}</Text>
            </View>
            <Text style={[styles.clanTotal, { color: clanScore! >= 0 ? '#E8445A' : '#ff3b30' }]}>
              {clanScore! > 0 ? '+' : ''}{clanScore} ❤️
            </Text>
            <View style={styles.clanMembersGrid}>
              {clan.members.map((m) => (
                <TouchableOpacity key={m.id} style={styles.clanMemberItem} onPress={() => router.push(m.id === user?.id ? '/profilo' : `/profilo?userId=${m.id}` as any)}>
                  <UserAvatar avatarUrl={m.avatarUrl} isMe={m.id === user?.id} size={48} />
                  <Text style={styles.clanMemberName} numberOfLines={1}>{m.username}</Text>
                  <Text style={[styles.clanMemberScore, { color: m.hearts >= 0 ? '#E8445A' : '#ff3b30' }]}>
                    {m.hearts > 0 ? '+' : ''}{Math.round(m.hearts)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </>
      )}

      {/* 5. Il mio feed */}
      {myFeedLogs.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Il mio feed</Text>
          {(showAllFeed ? myFeedLogs : myFeedLogs.slice(0, FEED_LIMIT)).map((log, index) => (
            <LogCard
              key={log.id}
              item={{ ...log, index }}
              onDelete={() => {
                Alert.alert('Elimina log', 'Sei sicuro? La birresponsabilità verrà ripristinata.', [
                  { text: 'Annulla', style: 'cancel' },
                  { text: 'Elimina', style: 'destructive', onPress: () => deleteLog(log.id).then(() => user && fetchMyFeed(user.id)) },
                ]);
              }}
              reactions={reactionsByLog[log.id] ?? []}
              reactors={reactorsByLog[log.id] ?? []}
              onToggleReaction={toggleFeedReaction}
              onShowReactors={(logId) => setReactorsModal({ logId })}
            />
          ))}
          {!showAllFeed && myFeedLogs.length > FEED_LIMIT && (
            <TouchableOpacity style={styles.showAllBtn} onPress={() => setShowAllFeed(true)}>
              <Text style={styles.showAllBtnText}>Mostra tutti ({myFeedLogs.length})</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* Modal reattori */}
      <Modal visible={!!reactorsModal} transparent animationType="fade" onRequestClose={() => setReactorsModal(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setReactorsModal(null)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Chi ha reagito</Text>
            {(reactorsByLog[reactorsModal?.logId ?? ''] ?? []).map((r) => (
              <View key={r.userId} style={styles.modalReactorRow}>
                <View style={styles.modalReactorAvatar}>
                  {r.avatarUrl
                    ? <Image source={{ uri: r.avatarUrl }} style={styles.modalReactorAvatarImg} />
                    : <Text style={{ fontSize: 16 }}>👤</Text>}
                </View>
                <Text style={styles.modalReactorName}>{r.username}</Text>
                <Text style={{ fontSize: 18 }}>{r.emoji}</Text>
              </View>
            ))}
            <TouchableOpacity style={{ marginTop: 14, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 10 }} onPress={() => setReactorsModal(null)}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textDim }}>Chiudi</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

function makeStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 20, paddingBottom: 40 },

    // Mentality banner
    mentalityBanner: {
      backgroundColor: isDark ? '#1c3320' : '#E8F5E9', borderRadius: 14, padding: 14,
      marginBottom: 12, alignItems: 'center',
      borderWidth: 2, borderColor: '#4CAF50',
    },
    mentalityBannerText: { fontSize: 15, fontWeight: '700', color: isDark ? '#7ed896' : '#2e7d32' },

    // 1. Hero score — compatta
    heroCard: {
      backgroundColor: colors.card, borderRadius: 20, padding: 20,
      alignItems: 'center', marginBottom: 16,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0 : 0.07, shadowRadius: 8, elevation: isDark ? 0 : 3,
    },
    hello: { fontSize: 13, color: colors.textFaint, marginBottom: 6 },
    scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    heartBig: { fontSize: 40 },
    heartsNumber: { fontSize: 56, fontWeight: '900', lineHeight: 64 },
    motivational: { fontSize: 13, color: colors.textDim, marginTop: 6, textAlign: 'center' },

    sectionTitle: {
      fontSize: 13, fontWeight: '700', color: colors.textFaint,
      letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, marginTop: 8,
    },

    // 2. CTA + contatori
    ctaRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    ctaButton: {
      flex: 1, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 12,
      alignItems: 'center',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0 : 0.15, shadowRadius: 6, elevation: isDark ? 0 : 4,
    },
    ctaIcon: { fontSize: 28, marginBottom: 4 },
    ctaText: { color: '#fff', fontWeight: '700', fontSize: 15, marginBottom: 6 },
    ctaBadge: {
      backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 8,
      paddingHorizontal: 10, paddingVertical: 4,
    },
    ctaBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },

    // Health
    healthBtn: {
      backgroundColor: isDark ? '#4CAF50' : colors.card, borderRadius: 14, padding: 14,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      marginBottom: 16, gap: 10,
      borderWidth: 2, borderColor: '#4CAF50',
    },
    healthBtnIcon: { fontSize: 20 },
    healthBtnText: { fontSize: 14, fontWeight: '700', color: isDark ? '#fff' : '#2e7d32' },

    // 3. Tandem — diagonale
    tandemCard: {
      backgroundColor: colors.card, borderRadius: 18, padding: 16, marginBottom: 20,
      borderWidth: 2, borderColor: '#9C27B0',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0 : 0.06, shadowRadius: 6, elevation: isDark ? 0 : 2,
      overflow: 'hidden',
    },
    tandemHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: 16,
    },
    tandemName: { fontSize: 16, fontWeight: '800', color: colors.text },
    tandemTotal: { fontSize: 20, fontWeight: '900' },
    tandemBody: {
      flexDirection: 'row', alignItems: 'center',
    },
    tandemHalf: {
      flex: 1, alignItems: 'center', paddingVertical: 8,
    },
    tandemMemberName: { fontSize: 13, fontWeight: '700', color: colors.textDim, maxWidth: 100, textAlign: 'center', marginTop: 8 },
    tandemMemberScore: { fontSize: 22, fontWeight: '900', marginTop: 2 },
    tandemDiagonalContainer: {
      width: 24, height: 100, alignItems: 'center', justifyContent: 'center',
    },
    tandemDiagonal: {
      width: 2, height: 120, backgroundColor: isDark ? '#5a3d63' : '#E0C0E8',
      transform: [{ rotate: '20deg' }],
    },

    // 4. Clan — avatar circolari
    clanCard: {
      backgroundColor: colors.card, borderRadius: 18, padding: 16, marginBottom: 20,
      borderWidth: 2, borderColor: '#FFD700',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0 : 0.06, shadowRadius: 6, elevation: isDark ? 0 : 2,
    },
    clanHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    clanName: { fontSize: 16, fontWeight: '800', color: colors.text },
    clanCode: { fontSize: 12, color: colors.textFaint, fontWeight: '600' },
    clanTotal: { fontSize: 28, fontWeight: '900', marginBottom: 14, textAlign: 'center' },
    clanMembersGrid: {
      flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16,
    },
    clanMemberItem: { alignItems: 'center', width: 64 },
    clanMemberName: { fontSize: 11, fontWeight: '600', color: colors.textDim, textAlign: 'center', maxWidth: 64, marginTop: 6 },
    clanMemberScore: { fontSize: 13, fontWeight: '800', marginTop: 1 },

    showAllBtn: {
      backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 8,
      alignItems: 'center', borderWidth: 1, borderColor: colors.border,
    },
    showAllBtnText: { fontSize: 14, fontWeight: '700', color: colors.textDim },

    modalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center', alignItems: 'center', padding: 24,
    },
    modalContent: {
      backgroundColor: colors.card, borderRadius: 20, padding: 20,
      width: '100%', maxWidth: 340,
    },
    modalTitle: { fontSize: 17, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 14 },
    modalReactorRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    modalReactorAvatar: {
      width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgAlt,
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    },
    modalReactorAvatarImg: { width: 32, height: 32, borderRadius: 16 },
    modalReactorName: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  });
}

function makeMStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    // Daily missions row
    dailyRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    dailyCard: {
      flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: 10,
      alignItems: 'center', borderWidth: 1.5, borderColor: colors.border,
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: isDark ? 0 : 0.05, shadowRadius: 3, elevation: isDark ? 0 : 1,
      minHeight: 130,
    },
    dailyCardDone: { borderColor: '#4CAF50', backgroundColor: isDark ? '#16291a' : '#f0fff4' },
    dailyEmoji: { fontSize: 22, marginBottom: 4 },
    dailyTarget: { fontSize: 15, fontWeight: '900', color: colors.text },
    dailyLabel: { fontSize: 10, color: colors.textFaint, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' },
    miniBarBg: { width: '100%', height: 5, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
    miniBarFill: { height: 5, borderRadius: 3 },
    doneCheck: { fontSize: 12, color: '#4CAF50', fontWeight: '800' },
    dailyCardClaimed: { borderColor: '#9C27B0', backgroundColor: isDark ? '#2a1830' : '#f9f0ff' },
    dailyCardFail: { borderColor: '#E8445A', backgroundColor: isDark ? '#301818' : '#fff5f5' },
    failText: { fontSize: 10, color: '#E8445A', fontWeight: '700', marginTop: 4 },
    claimBtn: {
      marginTop: 6, backgroundColor: '#FFD700', borderRadius: 8,
      paddingHorizontal: 8, paddingVertical: 4,
    },
    claimBtnText: { fontSize: 11, fontWeight: '800', color: '#7a5800' },
    claimedText: { fontSize: 10, color: '#9C27B0', fontWeight: '700', marginTop: 4 },

    // Sequential mission card
    seqCard: {
      backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 16,
      borderWidth: 1.5, borderColor: colors.border,
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: isDark ? 0 : 0.05, shadowRadius: 4, elevation: isDark ? 0 : 1,
    },
    seqHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
    seqBadge: {
      backgroundColor: '#1a1a1a', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, flexShrink: 0,
    },
    seqBadgeText: { fontSize: 12, fontWeight: '900', color: '#FFD700' },
    seqLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text, lineHeight: 20 },
    seqBarBg: { height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
    seqBarFill: { height: 8, borderRadius: 4 },
    seqFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    seqProgressText: { fontSize: 12, color: colors.textDim },
    seqDone: { fontSize: 12, fontWeight: '800', color: '#4CAF50' },
    advanceBtn: {
      backgroundColor: '#4CAF50', borderRadius: 8,
      paddingHorizontal: 10, paddingVertical: 4,
    },
    advanceBtnText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  });
}
