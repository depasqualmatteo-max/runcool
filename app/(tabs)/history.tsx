import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl, Image, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { PigSkin } from '@/components/PigSkin';
import { PigBgView } from '@/components/PigBgView';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeColors } from '@/constants/Colors';
import { sendPushNotification } from '@/lib/notifications';

const ADMIN_USER_ID = '5dc65840-d19b-4051-a7b8-564fd0f368db';

const REACTION_EMOJIS = ['❤️', '🔥', '😂', '💪', '🐷'];

interface Reactor { userId: string; username: string; avatarUrl: string | null; emoji: string }
interface ReactionSummary { emoji: string; count: number; mine: boolean }

interface LogRow {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  pig_skin: number;
  pig_bg: number;
  index?: number;
  type: 'drink' | 'workout';
  item_id: string;
  item_name: string;
  hearts_delta: number;
  calories: number;
  quantity?: number;
  km?: number;
  elevation_meters?: number;
  duration_minutes?: number;
  description?: string | null;
  photo_url?: string | null;
  timestamp: string;
  activity_date: string;
  is_mine: boolean;
}

// ─── Avatar: foto profilo + maialino sovrapposto ────────────────────────────

function Avatar({ avatarUrl, skinId, bgId }: { avatarUrl: string | null; skinId: number; bgId: number }) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  return (
    <View style={styles.avatarWrap}>
      {/* Foto profilo principale */}
      <View style={styles.avatarCircle}>
        {avatarUrl
          ? <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
          : <Text style={styles.avatarFallback}>👤</Text>
        }
      </View>
      {/* Maialino in basso a destra */}
      <View style={styles.avatarPigBadge}>
        <PigBgView bgId={bgId} size={28}>
          <PigSkin skinId={skinId} size={22} />
        </PigBgView>
      </View>
    </View>
  );
}

// ─── Barra reazioni emoji ────────────────────────────────────────────────────

function ReactionBar({
  logId, reactions, reactors, onToggle, onShowReactors,
}: {
  logId: string; reactions: ReactionSummary[]; reactors: Reactor[];
  onToggle: (logId: string, emoji: string) => void;
  onShowReactors: (logId: string) => void;
}) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <View style={styles.reactionBar}>
      {reactors.length > 0 && (
        <TouchableOpacity style={styles.reactorStack} onPress={() => onShowReactors(logId)}>
          {reactors.slice(0, 3).map((r, i) => (
            <View key={r.userId} style={[styles.reactorAvatar, i > 0 && { marginLeft: -10 }]}>
              {r.avatarUrl
                ? <Image source={{ uri: r.avatarUrl }} style={styles.reactorAvatarImg} />
                : <Text style={styles.reactorAvatarFallback}>👤</Text>}
            </View>
          ))}
          {reactors.length > 3 && (
            <Text style={styles.reactorMore}>+{reactors.length - 3}</Text>
          )}
        </TouchableOpacity>
      )}
      {reactions.map((r) => (
        <TouchableOpacity
          key={r.emoji}
          style={[styles.reactionChip, r.mine && styles.reactionChipMine]}
          onPress={() => onToggle(logId, r.emoji)}
        >
          <Text style={styles.reactionChipText}>{r.emoji} {r.count}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={styles.reactionAddBtn} onPress={() => setPickerOpen((v) => !v)}>
        <Text style={styles.reactionAddBtnText}>{pickerOpen ? '✕' : '+ 😀'}</Text>
      </TouchableOpacity>
      {pickerOpen && (
        <View style={styles.reactionPicker}>
          {REACTION_EMOJIS.map((e) => (
            <TouchableOpacity key={e} style={styles.reactionPickerItem} onPress={() => { onToggle(logId, e); setPickerOpen(false); }}>
              <Text style={styles.reactionPickerEmoji}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Card unificata ──────────────────────────────────────────────────────────

function LogCard({ item, onDelete, onReport, onPressUser, reactions, reactors, onToggleReaction, onShowReactors }: {
  item: LogRow; onDelete?: () => void; onReport?: () => void; onPressUser?: () => void; reactions: ReactionSummary[]; reactors: Reactor[];
  onToggleReaction: (logId: string, emoji: string) => void; onShowReactors: (logId: string) => void;
}) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const isMentality = item.item_id === 'mentality';
  const isWorkout = item.type === 'workout';
  const cardBg = (item.index ?? 0) % 2 === 0 ? colors.card : (isDark ? '#2a2a2a' : '#F0F0F0');
  const hasMedia = !!(item.description || item.photo_url);
  const absHearts = Math.abs(item.hearts_delta);

  const badge = isMentality ? '🧘' : isWorkout ? '💪' : '🐷';
  const activityEmoji = isMentality ? '🧘' : isWorkout ? '🏃' : '🍺';

  let subtitle = '';
  if (isMentality) {
    subtitle = 'Mentalità allenata';
  } else if (!isWorkout) {
    subtitle = item.quantity && item.quantity > 1 ? `x${item.quantity}` : '';
  } else if (item.km != null) {
    subtitle = `${item.km} km${item.elevation_meters ? ` +${item.elevation_meters}m` : ''} · ${item.calories} kcal`;
  } else {
    subtitle = `${item.duration_minutes}' · ${item.calories} kcal`;
  }

  const timeStr = format(new Date(item.timestamp), hasMedia ? "d MMM 'alle' HH:mm" : 'HH:mm', { locale: it });
  const today = new Date().toISOString().slice(0, 10);
  const isPast = item.activity_date && item.activity_date < today;
  const activityDateLabel = isPast
    ? format(new Date(item.activity_date + 'T12:00:00'), 'd MMM', { locale: it })
    : null;

  if (hasMedia) {
    return (
      <View style={[styles.cardLarge, { backgroundColor: cardBg }]}>
        {/* X cancella: assoluta in alto a SX */}
        {onDelete && (
          <TouchableOpacity onPress={onDelete} style={styles.deleteBtnCorner}>
            <Text style={styles.deleteBtnCornerText}>✕</Text>
          </TouchableOpacity>
        )}
        {/* Header */}
        <View style={styles.rowBetween}>
          <TouchableOpacity style={styles.row} onPress={onPressUser} activeOpacity={onPressUser ? 0.7 : 1}>
            <Avatar avatarUrl={item.avatar_url} skinId={item.pig_skin} bgId={item.pig_bg} />
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.username}>{item.username}</Text>
              <Text style={styles.time}>{timeStr}</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.row}>
            {!isMentality && (
              <View style={[styles.heartsBadge, { backgroundColor: isWorkout ? (isDark ? '#16273a' : '#E3F2FD') : (isDark ? '#301818' : '#FFF0F0') }]}>
                <Text style={[styles.heartsBadgeText, { color: isWorkout ? '#2196F3' : '#E8445A' }]}>
                  {isWorkout ? '+' : '-'}{absHearts} ❤️
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Attività */}
        <View style={styles.activityBox}>
          <Text style={styles.activityEmoji}>{activityEmoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.activityName}>{item.item_name}</Text>
            {subtitle ? <Text style={styles.activitySub}>{subtitle}</Text> : null}
          </View>
          {activityDateLabel && (
            <View style={styles.pastBadge}>
              <Text style={styles.pastBadgeText}>📅 {activityDateLabel}</Text>
            </View>
          )}
        </View>

        {item.photo_url ? (
          <View>
            <Image source={{ uri: item.photo_url }} style={styles.photo} />
            {onReport && (
              <TouchableOpacity style={styles.reportBtn} onPress={onReport}>
                <Text style={styles.reportBtnText}>🚩</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}
        {item.description ? (
          <Text style={styles.description}>{item.description}</Text>
        ) : null}

        <ReactionBar logId={item.id} reactions={reactions} reactors={reactors} onToggle={onToggleReaction} onShowReactors={onShowReactors} />
      </View>
    );
  }

  // Card compatta
  // ── Mentality: riga piccola, NO x cancella ──────────────────
  if (isMentality) {
    return (
      <View style={[styles.cardMentality, { backgroundColor: cardBg }]}>
        <View style={styles.mentalityAvatarCircle}>
          {item.avatar_url
            ? <Image source={{ uri: item.avatar_url }} style={styles.mentalityAvatarImg} />
            : <Text style={{ fontSize: 14 }}>👤</Text>}
        </View>
        <Text style={[styles.mentalityText, { flex: 1, marginLeft: 12 }]} numberOfLines={1}>
          🧠 <Text style={{ fontWeight: '700' }}>{item.username}</Text>
        </Text>
        <Text style={[styles.mentalityText, { flex: 0, color: colors.textFaint }]}>{timeStr}</Text>
      </View>
    );
  }

  // ── Card compatta ─────────────────────────────────────────────
  return (
    <View style={[styles.cardCompact, { backgroundColor: cardBg }]}>
      <TouchableOpacity onPress={onPressUser} activeOpacity={onPressUser ? 0.7 : 1}>
        <Avatar avatarUrl={item.avatar_url} skinId={item.pig_skin} bgId={item.pig_bg} />
      </TouchableOpacity>

      {/* Colonna centrale */}
      <View style={{ flex: 1, marginLeft: 10 }}>
        <TouchableOpacity onPress={onPressUser} activeOpacity={onPressUser ? 0.7 : 1}>
          <Text style={styles.username} numberOfLines={1}>{item.username}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 4 }}>
            <Text style={{ fontSize: 12 }}>{activityEmoji}</Text>
            <Text style={styles.compactName} numberOfLines={1}>{item.item_name}</Text>
          </View>
          {subtitle ? <Text style={styles.compactSub} numberOfLines={1}>{subtitle}</Text> : null}
        </TouchableOpacity>
        <ReactionBar logId={item.id} reactions={reactions} reactors={reactors} onToggle={onToggleReaction} onShowReactors={onShowReactors} />
      </View>

      {/* Colonna destra: orario sopra, cuori sotto, data sotto */}
      <View style={styles.compactRight}>
        <Text style={styles.time}>{timeStr}</Text>
        <Text style={[styles.compactDelta, { color: isWorkout ? '#2196F3' : '#E8445A', marginTop: 2 }]}>
          {isWorkout ? '+' : '-'}{absHearts} ❤️
        </Text>
        {activityDateLabel && (
          <Text style={styles.compactPastDate} numberOfLines={1}>📅 {activityDateLabel}</Text>
        )}
      </View>

      {/* X cancella: assoluta in alto a SX */}
      {onDelete && (
        <TouchableOpacity onPress={onDelete} style={styles.deleteBtnCorner}>
          <Text style={styles.deleteBtnCornerText}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Screen principale ───────────────────────────────────────────────────────

export default function HistoryScreen() {
  const { deleteLog } = useApp();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const router = useRouter();
  const [tab, setTab] = useState<'following' | 'feed'>('following');
  const [followingLogs, setFollowingLogs] = useState<LogRow[]>([]);
  const [feed, setFeed] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reactionsByLog, setReactionsByLog] = useState<Record<string, ReactionSummary[]>>({});
  const [reactorsByLog, setReactorsByLog] = useState<Record<string, Reactor[]>>({});
  const [reactorsModal, setReactorsModal] = useState<{ logId: string } | null>(null);

  function mapRow(row: any, myUserId?: string): LogRow {
    return {
      id: row.id,
      user_id: row.user_id,
      username: row.profiles?.username ?? 'Maialino',
      avatar_url: row.profiles?.avatar_url ?? null,
      pig_skin: row.profiles?.pig_skin ?? 0,
      pig_bg: row.profiles?.pig_bg ?? 0,
      type: row.type,
      item_id: row.item_id ?? '',
      item_name: row.item_name,
      hearts_delta: row.hearts_delta,
      calories: row.calories,
      quantity: row.quantity,
      km: row.km,
      elevation_meters: row.elevation_meters,
      duration_minutes: row.duration_minutes,
      description: row.description ?? null,
      photo_url: row.photo_url ?? null,
      activity_date: row.activity_date ?? row.created_at?.slice(0, 10),
      timestamp: row.created_at,
      is_mine: row.user_id === myUserId,
    };
  }

  const SELECT = `
    id, user_id, type,
    item_id, item_name, hearts_delta, calories,
    quantity, km, elevation_meters, duration_minutes,
    description, photo_url, activity_date, created_at,
    profiles(username, avatar_url, pig_skin, pig_bg, private_alcohol)
  `;

  const fetchReactions = useCallback(async (logIds: string[]) => {
    if (!user || logIds.length === 0) { setReactionsByLog({}); setReactorsByLog({}); return; }
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
      reactors[r.log_id].push({
        userId: r.user_id,
        username: r.profiles?.username ?? '?',
        avatarUrl: r.profiles?.avatar_url ?? null,
        emoji: r.emoji,
      });
    });
    const result: Record<string, ReactionSummary[]> = {};
    Object.entries(grouped).forEach(([logId, emojis]) => {
      result[logId] = Object.entries(emojis).map(([emoji, v]) => ({ emoji, count: v.count, mine: v.mine }));
    });
    setReactionsByLog(result);
    setReactorsByLog(reactors);
  }, [user]);

  const fetchFollowing = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);
      const ids = (follows ?? []).map((f: any) => f.following_id);
      if (ids.length === 0) { setFollowingLogs([]); setLoading(false); setRefreshing(false); return; }
      const { data } = await supabase
        .from('logs')
        .select(SELECT)
        .in('user_id', ids)
        .order('created_at', { ascending: false })
        .limit(80);
      if (data) {
        const rows = data
          .filter((r) => !(r.type === 'drink' && r.profiles?.private_alcohol))
          .map((r) => mapRow(r, user.id));
        setFollowingLogs(rows);
        fetchReactions(rows.map((r) => r.id));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [user, fetchReactions]);

  const fetchFeed = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('logs')
        .select(SELECT)
        .order('created_at', { ascending: false })
        .limit(60);
      if (data) {
        const rows = data
          .filter((r) => !(r.type === 'drink' && r.profiles?.private_alcohol && r.user_id !== user.id))
          .map((r) => mapRow(r, user.id));
        setFeed(rows);
        fetchReactions(rows.map((r) => r.id));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [user, fetchReactions]);

  useEffect(() => { if (tab === 'following') fetchFollowing(); }, [tab, fetchFollowing]);
  useEffect(() => { if (tab === 'feed') fetchFeed(); }, [tab, fetchFeed]);

  // Realtime: INSERT e UPDATE su logs, e su log_reactions
  useEffect(() => {
    const refresh = tab === 'following' ? fetchFollowing : fetchFeed;
    const channel = supabase
      .channel(`history-realtime-${tab}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'logs' }, refresh)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'logs' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'log_reactions' }, () => {
        const ids = (tab === 'following' ? followingLogs : feed).map((r) => r.id);
        fetchReactions(ids);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tab, fetchFollowing, fetchFeed, fetchReactions, followingLogs, feed]);

  async function toggleReaction(logId: string, emoji: string) {
    if (!user) return;
    const current = reactionsByLog[logId] ?? [];
    const myExisting = current.find((r) => r.mine);
    const removingMine = myExisting?.emoji === emoji;

    // Aggiornamento ottimistico: rimuove la mia reazione precedente (se diversa) e applica la nuova
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
      notifyReaction(logId, emoji);
    }
  }

  function showReactors(logId: string) {
    setReactorsModal({ logId });
  }

  async function notifyReaction(logId: string, emoji: string) {
    if (!user) return;
    const log = [...followingLogs, ...feed].find((l) => l.id === logId);
    if (!log || log.user_id === user.id) return;
    const { data: owner } = await supabase
      .from('profiles')
      .select('push_token, notif_pref')
      .eq('id', log.user_id)
      .single();
    if (!owner?.push_token || owner.notif_pref === 'none') return;
    await sendPushNotification(
      owner.push_token,
      `${emoji} Reazione!`,
      `${user.username} ha reagito a "${log.item_name}" con ${emoji}`,
    );
  }

  async function reportLog(item: LogRow) {
    if (!user) return;
    Alert.alert('Segnala foto', 'Vuoi segnalare questa foto come inappropriata?', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Segnala', style: 'destructive', onPress: async () => {
          await supabase.from('reports').insert({ reporter_id: user.id, log_id: item.id, reason: 'foto inappropriata' });
          const { data: admin } = await supabase.from('profiles').select('push_token').eq('id', ADMIN_USER_ID).single();
          if (admin?.push_token) {
            await sendPushNotification(admin.push_token, '🚩 Foto segnalata', `${user.username} ha segnalato una foto di ${item.username}`);
          }
          Alert.alert('Segnalazione inviata', 'Grazie, verificheremo al più presto.');
        }
      },
    ]);
  }

  function confirmDelete(item: LogRow) {
    Alert.alert('Elimina log', 'Sei sicuro? La birresponsabilità verrà ripristinata.', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: () => deleteLog(item.id).then(() => tab === 'following' ? fetchFollowing() : fetchFeed()) },
    ]);
  }

  const groupByDate = (entries: LogRow[]) => {
    const groups: { date: string; items: LogRow[] }[] = [];
    entries.forEach((e) => {
      const date = format(new Date(e.timestamp), 'd MMMM yyyy', { locale: it });
      const last = groups[groups.length - 1];
      if (last && last.date === date) last.items.push(e);
      else groups.push({ date, items: [e] });
    });
    return groups;
  };

  const activeData = tab === 'following' ? followingLogs : feed;
  const flatData = groupByDate(activeData).flatMap((g) => [
    { _type: 'header', date: g.date, id: `h-${g.date}` } as any,
    ...g.items,
  ]);

  return (
    <View style={styles.container}>
      {/* Toggle */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'following' && styles.tabBtnActive]}
          onPress={() => setTab('following')}
        >
          <Text style={[styles.tabLabel, tab === 'following' && styles.tabLabelActive]}>👥 Following</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'feed' && styles.tabBtnActive]}
          onPress={() => setTab('feed')}
        >
          <Text style={[styles.tabLabel, tab === 'feed' && styles.tabLabelActive]}>🐷 Tutti i maialini</Text>
        </TouchableOpacity>
      </View>

      {loading && activeData.length === 0 ? (
        <View style={styles.empty}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={[styles.emptySub, { marginTop: 12 }]}>Caricamento...</Text>
        </View>
      ) : activeData.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>{tab === 'following' ? '👥' : '🐷'}</Text>
          <Text style={styles.emptyTitle}>
            {tab === 'following' ? 'Non segui ancora nessuno' : 'Nessuna attività ancora'}
          </Text>
          <Text style={styles.emptySub}>
            {tab === 'following' ? 'Vai sul profilo di un maialino e inizia a seguirlo!' : 'Sii il primo a correre o bere!'}
          </Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.content}
          data={flatData}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); tab === 'following' ? fetchFollowing() : fetchFeed(); }}
              tintColor="#FFD700"
            />
          }
          renderItem={({ item, index }) => {
            if (item._type === 'header') {
              return <Text style={styles.sectionTitle}>{item.date}</Text>;
            }
            return (
              <LogCard
                item={{ ...item, index }}
                onDelete={item.is_mine ? () => confirmDelete(item) : undefined}
                onReport={!item.is_mine && item.photo_url ? () => reportLog(item) : undefined}
                onPressUser={!item.is_mine ? () => router.push(`/profilo?userId=${item.user_id}` as any) : undefined}
                reactions={reactionsByLog[item.id] ?? []}
                reactors={reactorsByLog[item.id] ?? []}
                onToggleReaction={toggleReaction}
                onShowReactors={showReactors}
              />
            );
          }}
        />
      )}

      {/* Modal elenco reazioni */}
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
                <Text style={styles.modalReactorEmoji}>{r.emoji}</Text>
              </View>
            ))}
            <TouchableOpacity style={styles.modalClose} onPress={() => setReactorsModal(null)}>
              <Text style={styles.modalCloseText}>Chiudi</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function makeStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 14, paddingBottom: 40 },

    tabBar: {
      flexDirection: 'row', backgroundColor: colors.card,
      borderBottomWidth: 1, borderBottomColor: colors.border,
      padding: 8, gap: 8,
    },
    tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: colors.bgAlt },
    tabBtnActive: { backgroundColor: '#FFD700' },
    tabLabel: { fontSize: 13, fontWeight: '700', color: colors.textDim },
    tabLabelActive: { color: '#1a1a1a' },

    sectionTitle: {
      fontSize: 11, fontWeight: '700', color: colors.textFaint,
      letterSpacing: 1, textTransform: 'uppercase',
      marginBottom: 8, marginTop: 6,
    },

    // Avatar
    avatarWrap: { position: 'relative', flexShrink: 0 },
    avatarCircle: {
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: colors.bgAlt, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    },
    avatarImg: { width: 56, height: 56, borderRadius: 28 },
    avatarFallback: { fontSize: 28 },
    avatarPigBadge: {
      position: 'absolute', bottom: -4, right: -6,
      borderRadius: 16, overflow: 'hidden',
      borderWidth: 2, borderColor: colors.card,
    },

    // Card mentality (piccola)
    cardMentality: {
      backgroundColor: colors.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7,
      flexDirection: 'row', alignItems: 'center', marginBottom: 5, overflow: 'hidden',
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0 : 0.03, shadowRadius: 2, elevation: isDark ? 0 : 1,
      opacity: 0.75,
    },
    mentalityAvatarCircle: {
      width: 28, height: 28, borderRadius: 14,
      backgroundColor: colors.bgAlt, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    },
    mentalityAvatarImg: { width: 28, height: 28, borderRadius: 14 },
    mentalityText: { flex: 1, fontSize: 12, color: colors.text },

    // Card compatta
    cardCompact: {
      backgroundColor: colors.card, borderRadius: 14, padding: 11, minHeight: 96,
      flexDirection: 'row', alignItems: 'center', marginBottom: 7,
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0 : 0.05, shadowRadius: 3, elevation: isDark ? 0 : 2,
    },
    username: { fontSize: 13, fontWeight: '700', color: colors.text },
    time: { fontSize: 11, color: colors.textFaint },
    compactName: { fontSize: 12, fontWeight: '600', color: colors.textDim },
    compactSub: { fontSize: 10, color: colors.textFaint, marginTop: 2 },
    compactDelta: { fontSize: 12, fontWeight: '800' },
    compactPastDate: { fontSize: 10, color: '#FF9800', fontWeight: '700', marginTop: 2 },
    compactRight: { alignItems: 'flex-end', justifyContent: 'flex-start', marginLeft: 10, flexShrink: 0 },
    pastBadge: { backgroundColor: isDark ? '#332313' : '#FFF3E0', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
    pastBadgeText: { fontSize: 11, color: '#FF9800', fontWeight: '700' },

    // Card grande
    cardLarge: {
      backgroundColor: colors.card, borderRadius: 18, padding: 14, marginBottom: 12,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0 : 0.08, shadowRadius: 8, elevation: isDark ? 0 : 4,
    },
    activityBox: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: colors.bgAlt, borderRadius: 10, padding: 10, marginTop: 10,
    },
    activityEmoji: { fontSize: 22 },
    activityName: { fontSize: 14, fontWeight: '700', color: colors.text },
    activitySub: { fontSize: 12, color: colors.textFaint, marginTop: 1 },
    heartsBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    heartsBadgeText: { fontSize: 13, fontWeight: '800' },
    photo: { width: '100%', height: 200, borderRadius: 12, marginTop: 10, resizeMode: 'cover' },
    reportBtn: { alignSelf: 'flex-end', marginTop: 4, paddingHorizontal: 8, paddingVertical: 3 },
    reportBtnText: { fontSize: 11, color: colors.textFaint },
    description: { fontSize: 14, color: colors.text, marginTop: 10, lineHeight: 20 },

    // Utility
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    deleteBtn: { padding: 6 },
    deleteBtnText: { fontSize: 14, color: colors.textFaint, fontWeight: '700' },
    deleteBtnCorner: {
      position: 'absolute', top: 4, left: 4,
      width: 18, height: 18, borderRadius: 9,
      backgroundColor: colors.bgAlt,
      alignItems: 'center', justifyContent: 'center',
      zIndex: 10,
    },
    deleteBtnCornerText: { fontSize: 9, color: colors.textFaint, fontWeight: '800', lineHeight: 12 },

    // Reazioni
    reactionBar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 10, position: 'relative' },
    reactionChip: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgAlt,
      borderRadius: 14, paddingHorizontal: 9, paddingVertical: 4,
      borderWidth: 1, borderColor: 'transparent',
    },
    reactionChipMine: { borderColor: '#FFD700', backgroundColor: isDark ? '#332a0d' : '#FFFBEA' },
    reactionChipText: { fontSize: 12, fontWeight: '700', color: colors.text },
    reactionAddBtn: {
      backgroundColor: colors.bgAlt, borderRadius: 14, paddingHorizontal: 9, paddingVertical: 4,
    },
    reactionAddBtnText: { fontSize: 12, fontWeight: '700', color: colors.textFaint },
    reactionPicker: {
      position: 'absolute', bottom: '100%', left: 0, marginBottom: 6,
      flexDirection: 'row', backgroundColor: colors.card, borderRadius: 14,
      padding: 6, gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.15, shadowRadius: 8, elevation: 6,
      borderWidth: 1, borderColor: colors.border, zIndex: 10,
    },
    reactionPickerItem: { padding: 6 },
    reactionPickerEmoji: { fontSize: 20 },

    // Stack avatar reattori
    reactorStack: { flexDirection: 'row', alignItems: 'center', paddingRight: 4 },
    reactorAvatar: {
      width: 22, height: 22, borderRadius: 11, backgroundColor: colors.bgAlt,
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      borderWidth: 1.5, borderColor: colors.card,
    },
    reactorAvatarImg: { width: 22, height: 22, borderRadius: 11 },
    reactorAvatarFallback: { fontSize: 11 },
    reactorMore: { fontSize: 11, fontWeight: '700', color: colors.textFaint, marginLeft: 4 },

    // Modal elenco reattori
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
    modalReactorEmoji: { fontSize: 18 },
    modalClose: { marginTop: 14, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 10 },
    modalCloseText: { fontSize: 14, fontWeight: '600', color: colors.textDim },

    // Empty
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    emptyIcon: { fontSize: 64, marginBottom: 16 },
    emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 8 },
    emptySub: { fontSize: 15, color: colors.textFaint, textAlign: 'center' },
  });
}
