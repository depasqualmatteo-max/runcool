import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface UserRank {
  id: string;
  username: string;
  hearts: number;
}

interface ClanRank {
  id: string;
  name: string;
  totalHearts: number;
  memberCount: number;
}

function medal(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

function scoreColor(hearts: number) {
  return hearts >= 0 ? '#E8445A' : '#ff3b30';
}

function scoreLabel(hearts: number) {
  return hearts > 0 ? `+${hearts}` : `${hearts}`;
}

export default function ClassificheScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'individuale' | 'clan'>('individuale');
  const [users, setUsers] = useState<UserRank[]>([]);
  const [clans, setClans] = useState<ClanRank[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      // ── Classifica individuale ──────────────────────────────────────────────
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, hearts')
        .order('hearts', { ascending: false })
        .limit(100);

      if (profiles) setUsers(profiles as UserRank[]);

      // ── Classifica clan ────────────────────────────────────────────────────
      const [{ data: clanMembers }, { data: clanList }] = await Promise.all([
        supabase.from('profiles').select('clan_id, hearts').not('clan_id', 'is', null),
        supabase.from('clans').select('id, name'),
      ]);

      if (clanMembers && clanList) {
        const map = new Map<string, { totalHearts: number; memberCount: number }>();
        (clanMembers as { clan_id: string; hearts: number }[]).forEach(p => {
          const cur = map.get(p.clan_id) ?? { totalHearts: 0, memberCount: 0 };
          map.set(p.clan_id, {
            totalHearts: cur.totalHearts + (p.hearts ?? 0),
            memberCount: cur.memberCount + 1,
          });
        });

        const ranked: ClanRank[] = (clanList as { id: string; name: string }[])
          .map(c => ({
            id: c.id,
            name: c.name,
            totalHearts: map.get(c.id)?.totalHearts ?? 0,
            memberCount: map.get(c.id)?.memberCount ?? 0,
          }))
          .filter(c => c.memberCount > 0)
          .sort((a, b) => b.totalHearts - a.totalHearts);

        setClans(ranked);
      }
    } catch (e) {
      console.error('Leaderboard error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function onRefresh() {
    setRefreshing(true);
    fetchData();
  }

  return (
    <View style={styles.container}>

      {/* ── Tab switcher ──────────────────────────────────────────────────── */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'individuale' && styles.tabBtnActive]}
          onPress={() => setTab('individuale')}
        >
          <Text style={[styles.tabLabel, tab === 'individuale' && styles.tabLabelActive]}>
            🏃 Individuale
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'clan' && styles.tabBtnActive]}
          onPress={() => setTab('clan')}
        >
          <Text style={[styles.tabLabel, tab === 'clan' && styles.tabLabelActive]}>
            🏆 Clan
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Caricamento classifica...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFD700" />
          }
        >
          {/* ── TOP 3 podio ─────────────────────────────────────────────── */}
          {tab === 'individuale' && users.length >= 3 && (
            <View style={styles.podium}>
              {/* 2° posto */}
              <View style={[styles.podiumItem, { marginTop: 28 }]}>
                <Text style={styles.podiumAvatar}>{users[1].id === user?.id ? '🐷' : '👤'}</Text>
                <Text style={styles.podiumMedal}>🥈</Text>
                <Text style={styles.podiumName} numberOfLines={1}>{users[1].username}</Text>
                <Text style={[styles.podiumScore, { color: scoreColor(users[1].hearts) }]}>
                  {scoreLabel(users[1].hearts)}
                </Text>
              </View>
              {/* 1° posto */}
              <View style={[styles.podiumItem, styles.podiumFirst]}>
                <Text style={styles.podiumAvatarBig}>{users[0].id === user?.id ? '🐷' : '👤'}</Text>
                <Text style={styles.podiumMedalBig}>🥇</Text>
                <Text style={styles.podiumName} numberOfLines={1}>{users[0].username}</Text>
                <Text style={[styles.podiumScore, { color: scoreColor(users[0].hearts) }]}>
                  {scoreLabel(users[0].hearts)}
                </Text>
              </View>
              {/* 3° posto */}
              <View style={[styles.podiumItem, { marginTop: 48 }]}>
                <Text style={styles.podiumAvatar}>{users[2].id === user?.id ? '🐷' : '👤'}</Text>
                <Text style={styles.podiumMedal}>🥉</Text>
                <Text style={styles.podiumName} numberOfLines={1}>{users[2].username}</Text>
                <Text style={[styles.podiumScore, { color: scoreColor(users[2].hearts) }]}>
                  {scoreLabel(users[2].hearts)}
                </Text>
              </View>
            </View>
          )}

          {tab === 'clan' && clans.length >= 3 && (
            <View style={styles.podium}>
              <View style={[styles.podiumItem, { marginTop: 28 }]}>
                <Text style={styles.podiumMedal}>🥈</Text>
                <Text style={styles.podiumName} numberOfLines={1}>{clans[1].name}</Text>
                <Text style={styles.podiumMembers}>{clans[1].memberCount} 🐷</Text>
                <Text style={[styles.podiumScore, { color: scoreColor(clans[1].totalHearts) }]}>
                  {scoreLabel(clans[1].totalHearts)}
                </Text>
              </View>
              <View style={[styles.podiumItem, styles.podiumFirst]}>
                <Text style={styles.podiumMedalBig}>🥇</Text>
                <Text style={styles.podiumName} numberOfLines={1}>{clans[0].name}</Text>
                <Text style={styles.podiumMembers}>{clans[0].memberCount} 🐷</Text>
                <Text style={[styles.podiumScore, { color: scoreColor(clans[0].totalHearts) }]}>
                  {scoreLabel(clans[0].totalHearts)}
                </Text>
              </View>
              <View style={[styles.podiumItem, { marginTop: 48 }]}>
                <Text style={styles.podiumMedal}>🥉</Text>
                <Text style={styles.podiumName} numberOfLines={1}>{clans[2].name}</Text>
                <Text style={styles.podiumMembers}>{clans[2].memberCount} 🐷</Text>
                <Text style={[styles.podiumScore, { color: scoreColor(clans[2].totalHearts) }]}>
                  {scoreLabel(clans[2].totalHearts)}
                </Text>
              </View>
            </View>
          )}

          {/* ── Lista completa ───────────────────────────────────────────── */}
          <Text style={styles.sectionTitle}>
            {tab === 'individuale' ? 'Tutti i maialini' : 'Tutti i clan'}
          </Text>

          {tab === 'individuale' ? (
            users.length === 0 ? (
              <Text style={styles.empty}>Nessun maialino ancora 🐷</Text>
            ) : (
              users.map((u, i) => {
                const isMe = u.id === user?.id;
                return (
                  <View key={u.id} style={[styles.row, isMe && styles.rowMe]}>
                    <Text style={[styles.rankText, i < 3 && styles.rankMedal]}>
                      {medal(i + 1)}
                    </Text>
                    <Text style={styles.rowAvatar}>{isMe ? '🐷' : '👤'}</Text>
                    <Text style={[styles.rowName, isMe && styles.rowNameMe]} numberOfLines={1}>
                      {u.username}{isMe ? ' (tu)' : ''}
                    </Text>
                    <Text style={[styles.rowScore, { color: scoreColor(u.hearts) }]}>
                      {scoreLabel(u.hearts)}
                    </Text>
                  </View>
                );
              })
            )
          ) : (
            clans.length === 0 ? (
              <Text style={styles.empty}>Nessun clan ancora — creane uno! 🏆</Text>
            ) : (
              clans.map((c, i) => {
                const isMyClan = c.id === user?.clanId;
                const avg = c.memberCount > 0
                  ? Math.round(c.totalHearts / c.memberCount)
                  : 0;
                return (
                  <View key={c.id} style={[styles.row, isMyClan && styles.rowMe]}>
                    <Text style={[styles.rankText, i < 3 && styles.rankMedal]}>
                      {medal(i + 1)}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowName, isMyClan && styles.rowNameMe]} numberOfLines={1}>
                        🏆 {c.name}{isMyClan ? ' (il tuo)' : ''}
                      </Text>
                      <Text style={styles.rowSub}>
                        {c.memberCount} maialini · media {avg > 0 ? `+${avg}` : avg}
                      </Text>
                    </View>
                    <Text style={[styles.rowScore, { color: scoreColor(c.totalHearts) }]}>
                      {scoreLabel(c.totalHearts)}
                    </Text>
                  </View>
                );
              })
            )
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f7' },

  /* ── tab bar ── */
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    padding: 8,
    gap: 8,
  },
  tabBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    alignItems: 'center', backgroundColor: '#f0f0f0',
  },
  tabBtnActive: { backgroundColor: '#FFD700' },
  tabLabel: { fontSize: 14, fontWeight: '700', color: '#999' },
  tabLabelActive: { color: '#1a1a1a' },

  /* ── loading ── */
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#aaa', fontSize: 14 },

  /* ── list ── */
  list: { padding: 16, gap: 0 },

  /* ── podio ── */
  podium: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: 28,
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  podiumItem: {
    flex: 1, alignItems: 'center', gap: 4,
  },
  podiumFirst: {
    transform: [{ scale: 1.05 }],
  },
  podiumAvatar: { fontSize: 28 },
  podiumAvatarBig: { fontSize: 36 },
  podiumMedal: { fontSize: 28 },
  podiumMedalBig: { fontSize: 36 },
  podiumName: {
    fontSize: 11, fontWeight: '700', color: '#333',
    textAlign: 'center', width: '100%',
  },
  podiumScore: { fontSize: 16, fontWeight: '800' },
  podiumMembers: { fontSize: 11, color: '#aaa' },

  /* ── section ── */
  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: '#aaa',
    letterSpacing: 1, textTransform: 'uppercase',
    marginBottom: 10, marginTop: 4,
  },

  /* ── row ── */
  row: {
    backgroundColor: '#fff',
    borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 8, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  rowMe: {
    borderWidth: 2, borderColor: '#FFD700',
    backgroundColor: '#FFFDE7',
  },
  rankText: {
    fontSize: 13, fontWeight: '800', color: '#ccc', width: 28, textAlign: 'center',
  },
  rankMedal: { fontSize: 18, color: '#1a1a1a' },
  rowAvatar: { fontSize: 22 },
  rowName: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  rowNameMe: { color: '#b8860b', fontWeight: '800' },
  rowScore: { fontSize: 18, fontWeight: '800' },
  rowSub: { fontSize: 11, color: '#aaa', marginTop: 2 },

  empty: { textAlign: 'center', color: '#bbb', fontSize: 15, marginTop: 40 },
});
