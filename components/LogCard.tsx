import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { PigSkin } from '@/components/PigSkin';
import { PigBgView } from '@/components/PigBgView';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeColors } from '@/constants/Colors';

export const REACTION_EMOJIS = ['❤️', '🔥', '😂', '💪', '🐷'];

export interface Reactor { userId: string; username: string; avatarUrl: string | null; emoji: string }
export interface ReactionSummary { emoji: string; count: number; mine: boolean }

export interface LogRow {
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

function Avatar({ avatarUrl, skinId, bgId }: { avatarUrl: string | null; skinId: number; bgId: number }) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  return (
    <View style={styles.avatarWrap}>
      <View style={styles.avatarCircle}>
        {avatarUrl
          ? <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
          : <Text style={styles.avatarFallback}>👤</Text>}
      </View>
      <View style={styles.avatarPigBadge}>
        <PigBgView bgId={bgId} size={28}>
          <PigSkin skinId={skinId} size={22} />
        </PigBgView>
      </View>
    </View>
  );
}

export function ReactionBar({
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
          {reactors.length > 3 && <Text style={styles.reactorMore}>+{reactors.length - 3}</Text>}
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

export function LogCard({ item, onDelete, onReport, onPressUser, reactions, reactors, onToggleReaction, onShowReactors }: {
  item: LogRow; onDelete?: () => void; onReport?: () => void; onPressUser?: () => void;
  reactions: ReactionSummary[]; reactors: Reactor[];
  onToggleReaction: (logId: string, emoji: string) => void;
  onShowReactors: (logId: string) => void;
}) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const isMentality = item.item_id === 'mentality';
  const isWorkout = item.type === 'workout';
  const cardBg = (item.index ?? 0) % 2 === 0 ? colors.card : (isDark ? '#2a2a2a' : '#F0F0F0');
  const hasMedia = !!(item.description || item.photo_url);
  const absHearts = Math.abs(item.hearts_delta);
  const activityEmoji = isMentality ? '🧘' : isWorkout ? '🏃' : '🍺';

  let subtitle = '';
  if (isMentality) subtitle = 'Mentalità allenata';
  else if (!isWorkout) subtitle = item.quantity && item.quantity > 1 ? `x${item.quantity}` : '';
  else if (item.km != null) subtitle = `${item.km} km${item.elevation_meters ? ` +${item.elevation_meters}m` : ''} · ${item.calories} kcal`;
  else subtitle = `${item.duration_minutes}' · ${item.calories} kcal`;

  const timeStr = format(new Date(item.timestamp), hasMedia ? "d MMM 'alle' HH:mm" : 'HH:mm', { locale: it });
  const today = new Date().toISOString().slice(0, 10);
  const isPast = item.activity_date && item.activity_date < today;
  const activityDateLabel = isPast ? format(new Date(item.activity_date + 'T12:00:00'), 'd MMM', { locale: it }) : null;

  if (hasMedia) {
    return (
      <View style={[styles.cardLarge, { backgroundColor: cardBg }]}>
        {onDelete && (
          <TouchableOpacity onPress={onDelete} style={styles.deleteBtnCorner}>
            <Text style={styles.deleteBtnCornerText}>✕</Text>
          </TouchableOpacity>
        )}
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
        {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
        <ReactionBar logId={item.id} reactions={reactions} reactors={reactors} onToggle={onToggleReaction} onShowReactors={onShowReactors} />
      </View>
    );
  }

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

  return (
    <View style={[styles.cardCompact, { backgroundColor: cardBg }]}>
      <TouchableOpacity onPress={onPressUser} activeOpacity={onPressUser ? 0.7 : 1}>
        <Avatar avatarUrl={item.avatar_url} skinId={item.pig_skin} bgId={item.pig_bg} />
      </TouchableOpacity>
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
      <View style={styles.compactRight}>
        <Text style={styles.time}>{timeStr}</Text>
        <Text style={[styles.compactDelta, { color: isWorkout ? '#2196F3' : '#E8445A', marginTop: 2 }]}>
          {isWorkout ? '+' : '-'}{absHearts} ❤️
        </Text>
        {activityDateLabel && <Text style={styles.compactPastDate} numberOfLines={1}>📅 {activityDateLabel}</Text>}
      </View>
      {onDelete && (
        <TouchableOpacity onPress={onDelete} style={styles.deleteBtnCorner}>
          <Text style={styles.deleteBtnCornerText}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function makeLogCardStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    avatarWrap: { position: 'relative', flexShrink: 0 },
    avatarCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.bgAlt, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    avatarImg: { width: 56, height: 56, borderRadius: 28 },
    avatarFallback: { fontSize: 28 },
    avatarPigBadge: { position: 'absolute', bottom: -4, right: -6, borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: colors.card },
    cardMentality: { backgroundColor: colors.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', marginBottom: 5, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: isDark ? 0 : 0.03, shadowRadius: 2, elevation: isDark ? 0 : 1, opacity: 0.75 },
    mentalityAvatarCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.bgAlt, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    mentalityAvatarImg: { width: 28, height: 28, borderRadius: 14 },
    mentalityText: { flex: 1, fontSize: 12, color: colors.text },
    cardCompact: { backgroundColor: colors.card, borderRadius: 14, padding: 11, minHeight: 96, flexDirection: 'row', alignItems: 'center', marginBottom: 7, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: isDark ? 0 : 0.05, shadowRadius: 3, elevation: isDark ? 0 : 2 },
    username: { fontSize: 13, fontWeight: '700', color: colors.text },
    time: { fontSize: 11, color: colors.textFaint },
    compactName: { fontSize: 12, fontWeight: '600', color: colors.textDim },
    compactSub: { fontSize: 10, color: colors.textFaint, marginTop: 2 },
    compactDelta: { fontSize: 12, fontWeight: '800' },
    compactPastDate: { fontSize: 10, color: '#FF9800', fontWeight: '700', marginTop: 2 },
    compactRight: { alignItems: 'flex-end', justifyContent: 'flex-start', marginLeft: 10, flexShrink: 0 },
    pastBadge: { backgroundColor: isDark ? '#332313' : '#FFF3E0', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
    pastBadgeText: { fontSize: 11, color: '#FF9800', fontWeight: '700' },
    cardLarge: { backgroundColor: colors.card, borderRadius: 18, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: isDark ? 0 : 0.08, shadowRadius: 8, elevation: isDark ? 0 : 4 },
    activityBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bgAlt, borderRadius: 10, padding: 10, marginTop: 10 },
    activityEmoji: { fontSize: 22 },
    activityName: { fontSize: 14, fontWeight: '700', color: colors.text },
    activitySub: { fontSize: 12, color: colors.textFaint, marginTop: 1 },
    heartsBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    heartsBadgeText: { fontSize: 13, fontWeight: '800' },
    photo: { width: '100%', height: 200, borderRadius: 12, marginTop: 10, resizeMode: 'cover' },
    reportBtn: { alignSelf: 'flex-end', marginTop: 4, paddingHorizontal: 8, paddingVertical: 3 },
    reportBtnText: { fontSize: 11, color: colors.textFaint },
    description: { fontSize: 14, color: colors.text, marginTop: 10, lineHeight: 20 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    deleteBtnCorner: { position: 'absolute', top: 4, left: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.bgAlt, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
    deleteBtnCornerText: { fontSize: 9, color: colors.textFaint, fontWeight: '800', lineHeight: 12 },
    reactionBar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 10, position: 'relative' },
    reactionChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgAlt, borderRadius: 14, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1, borderColor: 'transparent' },
    reactionChipMine: { borderColor: '#FFD700', backgroundColor: isDark ? '#332a0d' : '#FFFBEA' },
    reactionChipText: { fontSize: 12, fontWeight: '700', color: colors.text },
    reactionAddBtn: { backgroundColor: colors.bgAlt, borderRadius: 14, paddingHorizontal: 9, paddingVertical: 4 },
    reactionAddBtnText: { fontSize: 12, fontWeight: '700', color: colors.textFaint },
    reactionPicker: { position: 'absolute', bottom: '100%', left: 0, marginBottom: 6, flexDirection: 'row', backgroundColor: colors.card, borderRadius: 14, padding: 6, gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: isDark ? 0.3 : 0.15, shadowRadius: 8, elevation: 6, borderWidth: 1, borderColor: colors.border, zIndex: 10 },
    reactionPickerItem: { padding: 6 },
    reactionPickerEmoji: { fontSize: 20 },
    reactorStack: { flexDirection: 'row', alignItems: 'center', paddingRight: 4 },
    reactorAvatar: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.bgAlt, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1.5, borderColor: colors.card },
    reactorAvatarImg: { width: 22, height: 22, borderRadius: 11 },
    reactorAvatarFallback: { fontSize: 11 },
    reactorMore: { fontSize: 11, fontWeight: '700', color: colors.textFaint, marginLeft: 4 },
  });
}

function makeStyles(colors: ThemeColors, isDark: boolean) {
  return makeLogCardStyles(colors, isDark);
}
