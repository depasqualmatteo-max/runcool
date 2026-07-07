import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeColors } from '@/constants/Colors';

type Period = 'week' | 'month' | 'all';
type Category = 'singoli' | 'tandem' | 'clan';

interface RankEntry { id: string; name: string; score: number; isMe?: boolean }

async function fetchPeriodScore(userIds: string[], from: string, to: string): Promise<number> {
  if (userIds.length === 0) return 0;
  const { data } = await supabase
    .from('logs')
    .select('hearts_delta')
    .in('user_id', userIds)
    .gte('created_at', from)
    .lte('created_at', to + 'T23:59:59');
  return (data ?? []).reduce((s: number, l: any) => s + (l.hearts_delta ?? 0), 0);
}

export default function SfideScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const [period, setPeriod] = useState<Period>('week');
  const [category, setCategory] = useState<Category>('singoli');
  const [rankings, setRankings] = useState<RankEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeClanChallenge, setActiveClanChallenge] = useState<any>(null);
  const [activeTandemMatchup, setActiveTandemMatchup] = useState<any>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      await Promise.all([loadRankings(), loadActiveChallenges()]);
    } finally {
      setLoading(false);
    }
  }, [user, period, category]);

  useEffect(() => { load(); }, [load]);

  async function loadActiveChallenges() {
    if (!user) return;

    // Clan challenge
    const { data: profile } = await supabase.from('profiles').select('clan_id, tandem_id').eq('id', user.id).single();

    if (profile?.clan_id) {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data: ch } = await supabase
        .from('clan_challenges')
        .select('*, challenger:challenger_clan_id(name), challenged:challenged_clan_id(name)')
        .or(`challenger_clan_id.eq.${profile.clan_id},challenged_clan_id.eq.${profile.clan_id}`)
        .lte('start_date', today)
        .gte('end_date', today)
        .single();
      if (ch) {
        const myId = profile.clan_id;
        const oppId = ch.challenger_clan_id === myId ? ch.challenged_clan_id : ch.challenger_clan_id;
        const oppName = ch.challenger_clan_id === myId ? ch.challenged?.name : ch.challenger?.name;
        const myName = ch.challenger_clan_id === myId ? ch.challenger?.name : ch.challenged?.name;
        const { data: myMembers } = await supabase.from('profiles').select('id').eq('clan_id', myId);
        const { data: oppMembers } = await supabase.from('profiles').select('id').eq('clan_id', oppId);
        const myScore = await fetchPeriodScore((myMembers ?? []).map((m: any) => m.id), ch.start_date, ch.end_date);
        const oppScore = await fetchPeriodScore((oppMembers ?? []).map((m: any) => m.id), ch.start_date, ch.end_date);
        setActiveClanChallenge({ myName, oppName, myScore, oppScore, endDate: ch.end_date });
      } else {
        setActiveClanChallenge(null);
      }
    }

    // Tandem matchup
    if (profile?.tandem_id) {
      const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const { data: m } = await supabase
        .from('tandem_matchups')
        .select('*, t1:tandem1_id(name), t2:tandem2_id(name)')
        .or(`tandem1_id.eq.${profile.tandem_id},tandem2_id.eq.${profile.tandem_id}`)
        .eq('week_start', weekStart)
        .single();
      if (m) {
        const myId = profile.tandem_id;
        const oppId = m.tandem1_id === myId ? m.tandem2_id : m.tandem1_id;
        const myName = m.tandem1_id === myId ? m.t1?.name : m.t2?.name;
        const oppName = m.tandem1_id === myId ? m.t2?.name : m.t1?.name;
        const { data: myMem } = await supabase.from('profiles').select('id').eq('tandem_id', myId);
        const { data: oppMem } = await supabase.from('profiles').select('id').eq('tandem_id', oppId);
        const myScore = await fetchPeriodScore((myMem ?? []).map((m: any) => m.id), m.week_start, m.week_end);
        const oppScore = await fetchPeriodScore((oppMem ?? []).map((m: any) => m.id), m.week_start, m.week_end);
        setActiveTandemMatchup({ myName, oppName, myScore, oppScore, endDate: m.week_end });
      } else {
        setActiveTandemMatchup(null);
      }
    }
  }

  async function loadRankings() {
    if (!user) return;
    const now = new Date();
    const from = period === 'week'
      ? format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      : period === 'month' ? format(startOfMonth(now), 'yyyy-MM-dd') : null;
    const to = period === 'week'
      ? format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      : period === 'month' ? format(endOfMonth(now), 'yyyy-MM-dd') : null;

    if (category === 'singoli') {
      if (period === 'all') {
        const { data } = await supabase.from('profiles').select('id, username, hearts').order('hearts', { ascending: false }).limit(50);
        setRankings((data ?? []).map((p: any) => ({ id: p.id, name: p.username, score: p.hearts, isMe: p.id === user.id })));
      } else {
        const { data: logs } = await supabase
          .from('logs')
          .select('user_id, hearts_delta, profiles(username)')
          .gte('created_at', from!)
          .lte('created_at', to! + 'T23:59:59');
        const map: Record<string, { name: string; score: number }> = {};
        (logs ?? []).forEach((l: any) => {
          if (!map[l.user_id]) map[l.user_id] = { name: l.profiles?.username ?? '?', score: 0 };
          map[l.user_id].score += l.hearts_delta ?? 0;
        });
        setRankings(Object.entries(map)
          .map(([id, v]) => ({ id, name: v.name, score: v.score, isMe: id === user.id }))
          .sort((a, b) => b.score - a.score));
      }
    } else if (category === 'tandem') {
      const { data: tandems } = await supabase.from('tandems').select('id, name');
      const { data: myProfile } = await supabase.from('profiles').select('tandem_id').eq('id', user.id).single();
      const scores = await Promise.all((tandems ?? []).map(async (t: any) => {
        let score = 0;
        if (period === 'all') {
          const { data: m } = await supabase.from('profiles').select('hearts').eq('tandem_id', t.id);
          score = (m ?? []).reduce((s: number, p: any) => s + p.hearts, 0);
        } else {
          const { data: m } = await supabase.from('profiles').select('id').eq('tandem_id', t.id);
          score = await fetchPeriodScore((m ?? []).map((p: any) => p.id), from!, to!);
        }
        return { id: t.id, name: t.name, score, isMe: t.id === myProfile?.tandem_id };
      }));
      setRankings(scores.sort((a, b) => b.score - a.score));
    } else {
      const { data: clans } = await supabase.from('clans').select('id, name');
      const { data: myProfile } = await supabase.from('profiles').select('clan_id').eq('id', user.id).single();
      const scores = await Promise.all((clans ?? []).map(async (c: any) => {
        const { data: m } = await supabase.from('profiles').select('id, hearts').eq('clan_id', c.id);
        let score = 0;
        if (period === 'all') {
          score = (m ?? []).reduce((s: number, p: any) => s + p.hearts, 0);
        } else {
          score = await fetchPeriodScore((m ?? []).map((p: any) => p.id), from!, to!);
        }
        return { id: c.id, name: c.name, score, isMe: c.id === myProfile?.clan_id };
      }));
      setRankings(scores.sort((a, b) => b.score - a.score));
    }
  }

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  const medal = (i: number) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>

      {/* Sfide attive */}
      {(activeClanChallenge || activeTandemMatchup) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚔️ Sfide in corso</Text>

          {activeClanChallenge && (
            <View style={styles.challengeCard}>
              <Text style={styles.challengeLabel}>🏆 Sfida Clan — fino al {activeClanChallenge.endDate}</Text>
              <View style={styles.vsRow}>
                <View style={styles.vsSide}>
                  <Text style={styles.vsName}>{activeClanChallenge.myName}</Text>
                  <Text style={[styles.vsScore, { color: activeClanChallenge.myScore >= activeClanChallenge.oppScore ? '#2196F3' : '#E8445A' }]}>
                    {activeClanChallenge.myScore >= 0 ? '+' : ''}{activeClanChallenge.myScore}
                  </Text>
                </View>
                <Text style={styles.vsText}>VS</Text>
                <View style={styles.vsSide}>
                  <Text style={styles.vsName}>{activeClanChallenge.oppName}</Text>
                  <Text style={[styles.vsScore, { color: activeClanChallenge.oppScore >= activeClanChallenge.myScore ? '#2196F3' : '#E8445A' }]}>
                    {activeClanChallenge.oppScore >= 0 ? '+' : ''}{activeClanChallenge.oppScore}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {activeTandemMatchup && (
            <View style={[styles.challengeCard, { borderColor: '#9C27B0' }]}>
              <Text style={styles.challengeLabel}>👥 Sfida Tandem — fino al {activeTandemMatchup.endDate}</Text>
              <View style={styles.vsRow}>
                <View style={styles.vsSide}>
                  <Text style={styles.vsName}>{activeTandemMatchup.myName}</Text>
                  <Text style={[styles.vsScore, { color: activeTandemMatchup.myScore >= activeTandemMatchup.oppScore ? '#2196F3' : '#E8445A' }]}>
                    {activeTandemMatchup.myScore >= 0 ? '+' : ''}{activeTandemMatchup.myScore}
                  </Text>
                </View>
                <Text style={styles.vsText}>VS</Text>
                <View style={styles.vsSide}>
                  <Text style={styles.vsName}>{activeTandemMatchup.oppName}</Text>
                  <Text style={[styles.vsScore, { color: activeTandemMatchup.oppScore >= activeTandemMatchup.myScore ? '#2196F3' : '#E8445A' }]}>
                    {activeTandemMatchup.oppScore >= 0 ? '+' : ''}{activeTandemMatchup.oppScore}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Classifiche */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Classifiche</Text>

        <View style={styles.toggleRow}>
          {(['week', 'month', 'all'] as Period[]).map((p) => (
            <TouchableOpacity key={p} style={[styles.pill, period === p && styles.pillActive]} onPress={() => setPeriod(p)}>
              <Text style={[styles.pillText, period === p && styles.pillTextActive]}>
                {p === 'week' ? 'Settimana' : p === 'month' ? 'Mese' : 'Assoluta'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.toggleRow}>
          {(['singoli', 'tandem', 'clan'] as Category[]).map((c) => (
            <TouchableOpacity key={c} style={[styles.pill, category === c && styles.pillActive]} onPress={() => setCategory(c)}>
              <Text style={[styles.pillText, category === c && styles.pillTextActive]}>
                {c === 'singoli' ? '👤 Singoli' : c === 'tandem' ? '👥 Tandem' : '🏆 Clan'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading
          ? <ActivityIndicator style={{ marginTop: 32 }} color="#FFD700" />
          : rankings.length === 0
            ? <Text style={styles.empty}>Nessun dato per questo periodo</Text>
            : rankings.map((r, i) => (
              <View key={r.id} style={[styles.rankRow, r.isMe && styles.rankRowMe, i === 0 && styles.rankRowFirst]}>
                <Text style={styles.rankMedal}>{medal(i)}</Text>
                <Text style={[styles.rankName, r.isMe && { fontWeight: '800' }]}>{r.name}{r.isMe ? ' 🐷' : ''}</Text>
                <Text style={[styles.rankScore, { color: r.score >= 0 ? '#E8445A' : '#ff3b30' }]}>
                  {r.score >= 0 ? '+' : ''}{r.score} ❤️
                </Text>
              </View>
            ))
        }
      </View>
    </ScrollView>
  );
}

function makeStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    section: { padding: 16, paddingBottom: 0 },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textFaint, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },
    challengeCard: {
      backgroundColor: colors.card, borderRadius: 16, padding: 18, marginBottom: 12,
      borderWidth: 2, borderColor: '#FFD700',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: isDark ? 0 : 0.07, shadowRadius: 6, elevation: isDark ? 0 : 3,
    },
    challengeLabel: { fontSize: 13, color: colors.textDim, fontWeight: '600', marginBottom: 14 },
    vsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    vsSide: { flex: 1, alignItems: 'center' },
    vsName: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 6, textAlign: 'center' },
    vsScore: { fontSize: 32, fontWeight: '800' },
    vsText: { fontSize: 14, fontWeight: '800', color: colors.textFaint, marginHorizontal: 12 },
    toggleRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
    pill: { flex: 1, paddingVertical: 8, borderRadius: 20, alignItems: 'center', backgroundColor: colors.bgAlt },
    pillActive: { backgroundColor: '#FFD700' },
    pillText: { fontSize: 11, fontWeight: '600', color: colors.textDim },
    pillTextActive: { color: '#1a1a1a' },
    rankRow: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card,
      borderRadius: 12, padding: 14, marginBottom: 8,
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: isDark ? 0 : 0.04, shadowRadius: 3, elevation: isDark ? 0 : 1,
    },
    rankRowFirst: { borderWidth: 2, borderColor: '#FFD700' },
    rankRowMe: { backgroundColor: isDark ? '#332a0d' : '#FFF8E1' },
    rankMedal: { fontSize: 18, width: 36 },
    rankName: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
    rankScore: { fontSize: 15, fontWeight: '700' },
    empty: { textAlign: 'center', color: colors.textFaint, marginTop: 32, fontSize: 15, paddingBottom: 20 },
  });
}
