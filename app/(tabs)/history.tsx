import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { LogEntry } from '@/types';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

// ─── Tipi feed globale ──────────────────────────────────────────────────────

interface FeedEntry {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  type: 'drink' | 'workout';
  item_name: string;
  hearts_delta: number;
  calories: number;
  quantity?: number;
  km?: number;
  elevation_meters?: number;
  duration_minutes?: number;
  timestamp: string;
}

// ─── Card storico personale ─────────────────────────────────────────────────

function MyLogCard({ log, onDelete }: { log: LogEntry; onDelete: () => void }) {
  const isWorkout = log.type === 'workout';
  const name = isWorkout ? log.workoutName : log.drinkName;
  const emoji = isWorkout ? '🏃' : '🐷';
  const delta = isWorkout ? `+${log.heartsGained} ❤️` : `-${log.heartsLost} ❤️`;
  const deltaColor = isWorkout ? '#2196F3' : '#E8445A';

  let subtitle = '';
  if (log.type === 'drink') {
    subtitle = `${log.quantity > 1 ? `x${log.quantity} — ` : ''}${log.calories} kcal`;
  } else {
    if (log.km !== undefined) {
      subtitle = `${log.km} km${log.elevationMeters ? ` +${log.elevationMeters}m` : ''} — ${log.calories} kcal`;
    } else {
      subtitle = `${log.durationMinutes} min — ${log.calories} kcal`;
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardEmoji}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardName}>{name}</Text>
        <Text style={styles.cardSub}>{subtitle}</Text>
        <Text style={styles.cardTime}>
          {format(new Date(log.timestamp), "d MMM 'alle' HH:mm", { locale: it })}
        </Text>
      </View>
      <View style={styles.cardRight}>
        <Text style={[styles.cardDelta, { color: deltaColor }]}>{delta}</Text>
        <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
          <Text style={styles.deleteBtnText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Card feed globale ──────────────────────────────────────────────────────

function FeedCard({ item }: { item: FeedEntry }) {
  const isWorkout = item.type === 'workout';
  const name = item.item_name;
  const emoji = isWorkout ? '🏃' : '🐷';
  const absHearts = Math.abs(item.hearts_delta);
  const delta = isWorkout ? `+${absHearts} ❤️` : `-${absHearts} ❤️`;
  const deltaColor = isWorkout ? '#2196F3' : '#E8445A';

  let subtitle = '';
  if (!isWorkout) {
    subtitle = `${item.quantity && item.quantity > 1 ? `x${item.quantity} — ` : ''}${item.calories} kcal`;
  } else if (item.km != null) {
    subtitle = `${item.km} km${item.elevation_meters ? ` +${item.elevation_meters}m` : ''} — ${item.calories} kcal`;
  } else {
    subtitle = `${item.duration_minutes} min — ${item.calories} kcal`;
  }

  return (
    <View style={styles.feedCard}>
      {/* Avatar */}
      <View style={styles.feedAvatar}>
        {item.avatar_url
          ? <Image source={{ uri: item.avatar_url }} style={styles.feedAvatarImg} />
          : <Text style={styles.feedAvatarEmoji}>🐷</Text>
        }
      </View>
      {/* Content */}
      <View style={{ flex: 1 }}>
        <View style={styles.feedHeader}>
          <Text style={styles.feedUsername}>{item.username}</Text>
          <Text style={styles.feedTime}>
            {format(new Date(item.timestamp), 'HH:mm', { locale: it })}
          </Text>
        </View>
        <View style={styles.feedActivity}>
          <Text style={styles.feedEmoji}>{emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.feedName}>{name}</Text>
            <Text style={styles.feedSub}>{subtitle}</Text>
          </View>
          <Text style={[styles.feedDelta, { color: deltaColor }]}>{delta}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Screen principale ──────────────────────────────────────────────────────

export default function HistoryScreen() {
  const { state, deleteLog } = useApp();
  const { user } = useAuth();
  const [tab, setTab] = useState<'mine' | 'feed'>('mine');
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('logs')
        .select(`
          id, user_id, type,
          item_name, hearts_delta, calories,
          quantity, km, elevation_meters, duration_minutes,
          created_at,
          profiles(username, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) {
        const entries: FeedEntry[] = data.map((row: any) => ({
          id: row.id,
          user_id: row.user_id,
          username: row.profiles?.username ?? 'Maialino',
          avatar_url: row.profiles?.avatar_url ?? null,
          type: row.type,
          item_name: row.item_name,
          hearts_delta: row.hearts_delta,
          calories: row.calories,
          quantity: row.quantity,
          km: row.km,
          elevation_meters: row.elevation_meters,
          duration_minutes: row.duration_minutes,
          timestamp: row.created_at,
        }));
        setFeed(entries);
      }
    } catch (e) {
      console.error('Feed error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'feed') fetchFeed();
  }, [tab, fetchFeed]);

  // Realtime aggiornamenti feed
  useEffect(() => {
    if (tab !== 'feed') return;
    const channel = supabase
      .channel('feed-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'logs' }, () => {
        fetchFeed();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tab, fetchFeed]);

  function confirmDelete(id: string) {
    Alert.alert('Elimina log', 'Sei sicuro? La birresponsabilità verrà ripristinata.', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: () => deleteLog(id) },
    ]);
  }

  const groupByDate = (entries: FeedEntry[]) => {
    const groups: { date: string; items: FeedEntry[] }[] = [];
    entries.forEach((entry) => {
      const date = format(new Date(entry.timestamp), 'd MMMM yyyy', { locale: it });
      const last = groups[groups.length - 1];
      if (last && last.date === date) {
        last.items.push(entry);
      } else {
        groups.push({ date, items: [entry] });
      }
    });
    return groups;
  };

  return (
    <View style={styles.container}>
      {/* Toggle */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'mine' && styles.tabBtnActive]}
          onPress={() => setTab('mine')}
        >
          <Text style={[styles.tabLabel, tab === 'mine' && styles.tabLabelActive]}>
            📋 Il mio
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'feed' && styles.tabBtnActive]}
          onPress={() => setTab('feed')}
        >
          <Text style={[styles.tabLabel, tab === 'feed' && styles.tabLabelActive]}>
            🐷 Tutti i maialini
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── TAB: Il mio storico ── */}
      {tab === 'mine' && (
        state.logs.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>Nessun log ancora</Text>
            <Text style={styles.emptySub}>Inizia a loggare drink e sport, maialino!</Text>
          </View>
        ) : (
          <FlatList
            contentContainerStyle={styles.content}
            data={state.logs}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MyLogCard log={item} onDelete={() => confirmDelete(item.id)} />
            )}
            ListHeaderComponent={
              <Text style={styles.sectionTitle}>{state.logs.length} log totali</Text>
            }
          />
        )
      )}

      {/* ── TAB: Feed globale ── */}
      {tab === 'feed' && (
        loading && feed.length === 0 ? (
          <View style={styles.empty}>
            <ActivityIndicator size="large" color="#FFD700" />
            <Text style={[styles.emptySub, { marginTop: 12 }]}>Caricamento...</Text>
          </View>
        ) : feed.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🐷</Text>
            <Text style={styles.emptyTitle}>Nessuna attività ancora</Text>
            <Text style={styles.emptySub}>Sii il primo a correre o bere!</Text>
          </View>
        ) : (
          <FlatList
            contentContainerStyle={styles.content}
            data={groupByDate(feed).flatMap(g => [
              { _type: 'header', date: g.date, id: `h-${g.date}` } as any,
              ...g.items,
            ])}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); fetchFeed(); }}
                tintColor="#FFD700"
              />
            }
            renderItem={({ item }) => {
              if (item._type === 'header') {
                return <Text style={styles.sectionTitle}>{item.date}</Text>;
              }
              return <FeedCard item={item} />;
            }}
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f7' },
  content: { padding: 16, paddingBottom: 40 },

  /* toggle */
  tabBar: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#eee',
    padding: 8, gap: 8,
  },
  tabBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    alignItems: 'center', backgroundColor: '#f0f0f0',
  },
  tabBtnActive: { backgroundColor: '#FFD700' },
  tabLabel: { fontSize: 13, fontWeight: '700', color: '#999' },
  tabLabelActive: { color: '#1a1a1a' },

  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: '#aaa',
    letterSpacing: 1, textTransform: 'uppercase',
    marginBottom: 10, marginTop: 4,
  },

  /* my log card */
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardEmoji: { fontSize: 28, marginRight: 14 },
  cardName: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  cardSub: { fontSize: 13, color: '#888', marginTop: 2 },
  cardTime: { fontSize: 12, color: '#bbb', marginTop: 3 },
  cardRight: { alignItems: 'flex-end', gap: 8 },
  cardDelta: { fontSize: 15, fontWeight: '800' },
  deleteBtn: { padding: 4 },
  deleteBtnText: { fontSize: 14, color: '#ccc', fontWeight: '700' },

  /* feed card */
  feedCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  feedAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#FFD700', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', flexShrink: 0,
  },
  feedAvatarImg: { width: 38, height: 38, borderRadius: 19 },
  feedAvatarEmoji: { fontSize: 20 },
  feedHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6,
  },
  feedUsername: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  feedTime: { fontSize: 11, color: '#bbb' },
  feedActivity: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  feedEmoji: { fontSize: 22 },
  feedName: { fontSize: 14, fontWeight: '600', color: '#333' },
  feedSub: { fontSize: 12, color: '#aaa', marginTop: 2 },
  feedDelta: { fontSize: 14, fontWeight: '800', marginLeft: 4 },

  /* empty */
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  emptySub: { fontSize: 15, color: '#aaa', textAlign: 'center' },
});
