import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { UserAvatar } from '@/components/UserAvatar';

type Period = 'month' | 'all';
type Category = 'singoli' | 'tandem' | 'clan';

interface RankEntry { id: string; name: string; score: number; isMe?: boolean; avatarUrl?: string | null }

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

function medal(rank: number): string {
  if (rank === 0) return '🥇';
  if (rank === 1) return '🥈';
  if (rank === 2) return '🥉';
  return `${rank + 1}.`;
}

export default function ClassificheScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('month');
  const [category, setCategory] = useState<Category>('singoli');
  const [rankings, setRankings] = useState<RankEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [membersModal, setMembersModal] = useState<{ title: string; members: { username: string; hearts: number; avatar_url?: string | null }[] } | null>(null);

  async function showGroupMembers(groupId: string, groupName: string, type: 'clan' | 'tandem') {
    const field = type === 'clan' ? 'clan_id' : 'tandem_id';
    const { data } = await supabase
      .from('profiles')
      .select('username, hearts, avatar_url')
      .eq(field, groupId)
      .order('hearts', { ascending: false });
    setMembersModal({ title: groupName, members: data ?? [] });
  }

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      await loadRankings();
    } finally {
      setLoading(false);
    }
  }, [user, period, category]);

  useEffect(() => { load(); }, [load]);

  async function loadRankings() {
    if (!user) return;
    const now = new Date();
    const from = period === 'month' ? format(startOfMonth(now), 'yyyy-MM-dd') : null;
    const to = period === 'month' ? format(endOfMonth(now), 'yyyy-MM-dd') : null;

    if (category === 'singoli') {
      if (period === 'all') {
        const { data } = await supabase.from('profiles').select('id, username, hearts, avatar_url').order('hearts', { ascending: false }).limit(50);
        setRankings((data ?? []).map((p: any) => ({ id: p.id, name: p.username, score: p.hearts, isMe: p.id === user.id, avatarUrl: p.avatar_url ?? null })));
      } else {
        const { data: logs } = await supabase
          .from('logs')
          .select('user_id, hearts_delta, profiles(username, avatar_url)')
          .gte('created_at', from!)
          .lte('created_at', to! + 'T23:59:59');
        const map: Record<string, { name: string; score: number; avatarUrl: string | null }> = {};
        (logs ?? []).forEach((l: any) => {
          if (!map[l.user_id]) map[l.user_id] = { name: l.profiles?.username ?? '?', score: 0, avatarUrl: l.profiles?.avatar_url ?? null };
          map[l.user_id].score += l.hearts_delta ?? 0;
        });
        setRankings(Object.entries(map)
          .map(([id, v]) => ({ id, name: v.name, score: v.score, isMe: id === user.id, avatarUrl: v.avatarUrl }))
          .sort((a, b) => b.score - a.score));
      }
    } else if (category === 'tandem') {
      const { data: tandems } = await supabase.from('tandems').select('id, name');
      const { data: myProfile } = await supabase.from('profiles').select('tandem_id').eq('id', user.id).single();
      const scores = await Promise.all((tandems ?? []).map(async (t: any) => {
        let score = 0;
        if (period === 'all') {
          const { data: m } = await supabase.from('profiles').select('hearts').eq('tandem_id', t.id);
          if (!m || m.length === 0) return null;
          score = m.reduce((s: number, p: any) => s + p.hearts, 0);
        } else {
          const { data: m } = await supabase.from('profiles').select('id').eq('tandem_id', t.id);
          if (!m || m.length === 0) return null;
          score = await fetchPeriodScore(m.map((p: any) => p.id), from!, to!);
        }
        return { id: t.id, name: t.name, score, isMe: t.id === myProfile?.tandem_id };
      }));
      setRankings((scores.filter(s => s !== null) as RankEntry[]).sort((a, b) => b.score - a.score));
    } else {
      const { data: clans } = await supabase.from('clans').select('id, name');
      const { data: myProfile } = await supabase.from('profiles').select('clan_id').eq('id', user.id).single();
      const scores = await Promise.all((clans ?? []).map(async (c: any) => {
        const { data: m } = await supabase.from('profiles').select('id, hearts').eq('clan_id', c.id);
        if (!m || m.length === 0) return null;
        let score = 0;
        if (period === 'all') {
          score = m.reduce((s: number, p: any) => s + p.hearts, 0);
        } else {
          score = await fetchPeriodScore(m.map((p: any) => p.id), from!, to!);
        }
        return { id: c.id, name: c.name, score, isMe: c.id === myProfile?.clan_id };
      }));
      setRankings((scores.filter(s => s !== null) as RankEntry[]).sort((a, b) => b.score - a.score));
    }
  }

  const onRefresh = async () => { setRefreshing(true); await loadRankings(); setRefreshing(false); };

  const top3 = rankings.slice(0, 3);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFD700" />}
    >
      {/* Mappa mondiale */}
      <TouchableOpacity style={styles.mapBtn} onPress={() => router.push('/mappa' as any)}>
        <Text style={styles.mapBtnText}>🌍 Mappa Mondiale</Text>
      </TouchableOpacity>

      {/* Filtri periodo */}
      <View style={styles.filterSection}>
        <View style={styles.toggleRow}>
          {(['month', 'all'] as Period[]).map((p) => (
            <TouchableOpacity key={p} style={[styles.pill, period === p && styles.pillActive]} onPress={() => setPeriod(p)}>
              <Text style={[styles.pillText, period === p && styles.pillTextActive]}>
                {p === 'month' ? '📆 Mese' : '🏆 Sempre'}
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
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 48 }} size="large" color="#FFD700" />
      ) : (
        <View style={styles.listContainer}>
          {/* Podio top 3 */}
          {top3.length >= 3 && (
            <View style={styles.podium}>
              {/* 2° posto */}
              <View style={[styles.podiumItem, { marginTop: 28 }]}>
                {category === 'singoli'
                  ? <UserAvatar avatarUrl={top3[1].avatarUrl} isMe={top3[1].isMe} size={44} />
                  : <Text style={styles.podiumAvatar}>{category === 'clan' ? '🏆' : '👥'}</Text>}
                <Text style={styles.podiumMedal}>🥈</Text>
                <Text style={styles.podiumName} numberOfLines={1}>{top3[1].name}</Text>
                <Text style={[styles.podiumScore, { color: top3[1].score >= 0 ? '#E8445A' : '#ff3b30' }]}>
                  {top3[1].score >= 0 ? '+' : ''}{Math.round(top3[1].score)}
                </Text>
              </View>
              {/* 1° posto */}
              <View style={[styles.podiumItem, styles.podiumFirst]}>
                {category === 'singoli'
                  ? <UserAvatar avatarUrl={top3[0].avatarUrl} isMe={top3[0].isMe} size={54} />
                  : <Text style={styles.podiumAvatarBig}>{category === 'clan' ? '🏆' : '👥'}</Text>}
                <Text style={styles.podiumMedalBig}>🥇</Text>
                <Text style={styles.podiumName} numberOfLines={1}>{top3[0].name}</Text>
                <Text style={[styles.podiumScore, { color: top3[0].score >= 0 ? '#E8445A' : '#ff3b30' }]}>
                  {top3[0].score >= 0 ? '+' : ''}{Math.round(top3[0].score)}
                </Text>
              </View>
              {/* 3° posto */}
              <View style={[styles.podiumItem, { marginTop: 48 }]}>
                {category === 'singoli'
                  ? <UserAvatar avatarUrl={top3[2].avatarUrl} isMe={top3[2].isMe} size={44} />
                  : <Text style={styles.podiumAvatar}>{category === 'clan' ? '🏆' : '👥'}</Text>}
                <Text style={styles.podiumMedal}>🥉</Text>
                <Text style={styles.podiumName} numberOfLines={1}>{top3[2].name}</Text>
                <Text style={[styles.podiumScore, { color: top3[2].score >= 0 ? '#E8445A' : '#ff3b30' }]}>
                  {top3[2].score >= 0 ? '+' : ''}{Math.round(top3[2].score)}
                </Text>
              </View>
            </View>
          )}

          {/* Lista completa */}
          <Text style={styles.sectionTitle}>
            {category === 'singoli' ? 'Tutti i maialini' : category === 'tandem' ? 'Tutti i tandem' : 'Tutti i clan'}
          </Text>

          {rankings.length === 0 ? (
            <Text style={styles.empty}>Nessun dato per questo periodo 🐷</Text>
          ) : (
            rankings.map((r, i) => {
              const isTappable = category !== 'singoli';
              const Row = isTappable ? TouchableOpacity : View;
              return (
                <Row
                  key={r.id}
                  style={[styles.row, r.isMe && styles.rowMe, i === 0 && styles.rowFirst]}
                  {...(isTappable ? { onPress: () => showGroupMembers(r.id, r.name, category as 'clan' | 'tandem') } : {})}
                >
                  <Text style={[styles.rankText, i < 3 && styles.rankMedal]}>{medal(i)}</Text>
                  {category === 'singoli'
                    ? <UserAvatar avatarUrl={r.avatarUrl} isMe={r.isMe} size={32} />
                    : <Text style={styles.rowAvatar}>{category === 'clan' ? '🏆' : '👥'}</Text>
                  }
                  <Text style={[styles.rowName, r.isMe && styles.rowNameMe, isTappable && styles.tappableName]} numberOfLines={1}>
                    {r.name}{r.isMe ? ' (tu)' : ''}
                  </Text>
                  <Text style={[styles.rowScore, { color: r.score >= 0 ? '#E8445A' : '#ff3b30' }]}>
                    {r.score >= 0 ? '+' : ''}{Math.round(r.score)} ❤️
                  </Text>
                </Row>
              );
            })
          )}

          <View style={{ height: 32 }} />
        </View>
      )}

      {/* Modal membri */}
      <Modal visible={!!membersModal} transparent animationType="fade" onRequestClose={() => setMembersModal(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMembersModal(null)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{membersModal?.title}</Text>
            {(membersModal?.members ?? []).map((m, i) => (
              <View key={i} style={styles.modalMember}>
                <UserAvatar avatarUrl={m.avatar_url} size={32} />
                <Text style={styles.modalMemberName}>{m.username}</Text>
                <Text style={[styles.modalMemberScore, { color: m.hearts >= 0 ? '#E8445A' : '#ff3b30' }]}>
                  {m.hearts > 0 ? `+${Math.round(m.hearts)}` : Math.round(m.hearts)}
                </Text>
              </View>
            ))}
            <TouchableOpacity style={styles.modalClose} onPress={() => setMembersModal(null)}>
              <Text style={styles.modalCloseText}>Chiudi</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f7' },

  filterSection: {
    backgroundColor: '#fff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 8,
  },
  toggleRow: { flexDirection: 'row', gap: 6 },
  pill: { flex: 1, paddingVertical: 9, borderRadius: 20, alignItems: 'center', backgroundColor: '#f0f0f0' },
  pillActive: { backgroundColor: '#FFD700' },
  pillText: { fontSize: 11, fontWeight: '600', color: '#888' },
  pillTextActive: { color: '#1a1a1a' },

  listContainer: { padding: 16 },

  podium: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: 28,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  podiumItem: { flex: 1, alignItems: 'center', gap: 4 },
  podiumFirst: { transform: [{ scale: 1.05 }] },
  podiumAvatar: { fontSize: 28 },
  podiumAvatarBig: { fontSize: 36 },
  podiumMedal: { fontSize: 28 },
  podiumMedalBig: { fontSize: 36 },
  podiumName: { fontSize: 11, fontWeight: '700', color: '#333', textAlign: 'center', width: '100%' },
  podiumScore: { fontSize: 16, fontWeight: '800' },

  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: '#aaa',
    letterSpacing: 1, textTransform: 'uppercase',
    marginBottom: 10, marginTop: 4,
  },

  row: {
    backgroundColor: '#fff',
    borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 8, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  rowMe: { borderWidth: 2, borderColor: '#FFD700', backgroundColor: '#FFFDE7' },
  rowFirst: { borderWidth: 2, borderColor: '#FFD700' },
  rankText: { fontSize: 13, fontWeight: '800', color: '#ccc', width: 32, textAlign: 'center' },
  rankMedal: { fontSize: 18, color: '#1a1a1a' },
  rowAvatar: { fontSize: 22 },
  rowName: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  rowNameMe: { color: '#b8860b', fontWeight: '800' },
  rowScore: { fontSize: 16, fontWeight: '800' },

  empty: { textAlign: 'center', color: '#bbb', fontSize: 15, marginTop: 40, marginBottom: 20 },

  mapBtn: {
    backgroundColor: '#1a1a2e', borderRadius: 16, padding: 16,
    marginHorizontal: 16, marginTop: 12, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
  },
  mapBtnText: { color: '#FFD700', fontWeight: '800', fontSize: 16 },

  tappableName: { textDecorationLine: 'underline' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    width: '100%', maxWidth: 340,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1a1a1a', textAlign: 'center', marginBottom: 18 },
  modalMember: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  modalMemberName: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  modalMemberScore: { fontSize: 18, fontWeight: '800' },
  modalClose: { marginTop: 18, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 10 },
  modalCloseText: { fontSize: 14, fontWeight: '600', color: '#888' },
});
