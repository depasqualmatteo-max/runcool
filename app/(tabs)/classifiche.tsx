import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, Image, ImageBackground,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { PigSkin } from '@/components/PigSkin';
import { SHOP_BGS } from '@/constants/shop';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeColors } from '@/constants/Colors';

type Period = 'month' | 'all';
type Category = 'singoli' | 'tandem' | 'clan';

interface RankEntry { id: string; name: string; score: number; isMe?: boolean; avatarUrl?: string | null; avatarOffsetY?: number; skinId?: number; skinVariant?: string; bgId?: number; injured?: boolean; members?: { skinId: number; skinVariant?: string; bgId: number }[] }

const PAD = 14;

function PigAvatar({ skinId, skinVariant, bgId, size }: { skinId: number; skinVariant?: string; bgId: number; size: number }) {
  const bg = SHOP_BGS.find(b => b.id === bgId) ?? SHOP_BGS[0];
  const circleSize = size + PAD;
  return (
    <View style={{ width: circleSize, height: circleSize, borderRadius: circleSize / 2, backgroundColor: bg.color, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      {bg.image ? <Image source={bg.image} style={{ position: 'absolute', top: 0, left: 0, width: circleSize, height: circleSize }} resizeMode="cover" /> : null}
      <PigSkin skinId={skinId} variant={(skinVariant as any) ?? 'base'} size={size} />
    </View>
  );
}

function TandemAvatar({ members, size, noCircle }: { members: { skinId: number; skinVariant?: string; bgId: number }[]; size: number; noCircle?: boolean }) {
  const circleSize = size + PAD;
  const two = members.slice(0, 2);
  const overlap = Math.round(circleSize * 0.35);
  const totalW = two.length >= 2 ? circleSize * 2 - overlap : circleSize;
  const mid = Math.round(totalW / 2); // linea di divisione al centro esatto
  // Cerchio dx inizia a: totalW - circleSize
  const rightCircleLeft = totalW - circleSize;
  if (noCircle) {
    return (
      <View style={{ flexDirection: 'row' }}>
        {two.map((m, i) => (
          <View key={i} style={i > 0 ? { marginLeft: -Math.round(size * 0.4) } : undefined}>
            <PigSkin skinId={m.skinId} variant={(m.skinVariant as any) ?? 'base'} size={size} />
          </View>
        ))}
      </View>
    );
  }
  return (
    <View style={{ width: totalW, height: circleSize }}>
      {two.length >= 2 ? (
        <>
          {/* Cerchio sinistro: clippato a sinistra della linea centrale */}
          <View style={{ position: 'absolute', left: 0, width: mid, height: circleSize, overflow: 'hidden', zIndex: 1 }}>
            {(() => { const bg = SHOP_BGS.find(b => b.id === two[0].bgId) ?? SHOP_BGS[0]; return (
              <View style={{ position: 'absolute', left: 0, width: circleSize, height: circleSize, borderRadius: circleSize / 2, backgroundColor: bg.color, overflow: 'hidden' }}>
                {bg.image ? <Image source={bg.image} style={{ position: 'absolute', top: 0, left: 0, width: circleSize, height: circleSize }} resizeMode="cover" /> : null}
              </View>
            ); })()}
          </View>
          {/* Cerchio destro: clippato a destra della linea centrale */}
          <View style={{ position: 'absolute', left: mid, width: totalW - mid, height: circleSize, overflow: 'hidden', zIndex: 1 }}>
            {(() => { const bg = SHOP_BGS.find(b => b.id === two[1].bgId) ?? SHOP_BGS[0]; return (
              <View style={{ position: 'absolute', left: rightCircleLeft - mid, width: circleSize, height: circleSize, borderRadius: circleSize / 2, backgroundColor: bg.color, overflow: 'hidden' }}>
                {bg.image ? <Image source={bg.image} style={{ position: 'absolute', top: 0, left: 0, width: circleSize, height: circleSize }} resizeMode="cover" /> : null}
              </View>
            ); })()}
          </View>
          {/* Maialino sinistro centrato nel suo cerchio */}
          <View style={{ position: 'absolute', left: 0, width: circleSize, height: circleSize, alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
            <PigSkin skinId={two[0].skinId} variant={(two[0].skinVariant as any) ?? 'base'} size={size} />
          </View>
          {/* Maialino destro centrato nel suo cerchio */}
          <View style={{ position: 'absolute', left: rightCircleLeft, width: circleSize, height: circleSize, alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
            <PigSkin skinId={two[1].skinId} variant={(two[1].skinVariant as any) ?? 'base'} size={size} />
          </View>
        </>
      ) : (
        <PigAvatar skinId={two[0].skinId} skinVariant={two[0].skinVariant} bgId={two[0].bgId} size={size} />
      )}
    </View>
  );
}

function ClanAvatar({ members, bannerUrl, size, noCircle }: { members: { skinId: number; skinVariant?: string }[]; bannerUrl?: string | null; size: number; noCircle?: boolean }) {
  const list = members.slice(0, 5);
  const p = Math.round(size * 0.43); // leggermente più grandi
  const gap = -Math.round(p * 0.15); // sovrapposizione orizzontale
  const vGap = Math.round(p * 0.42);
  const row2Y = size - p;
  const row2W = p * 2 + gap;
  const row2X0 = (size - row2W) / 2;
  const row1Y = row2Y - vGap;
  const row1W = p * 3 + gap * 2;
  const row1X = (size - row1W) / 2;
  const pos: [number, number, number][] = [
    [row1X,               row1Y, 1],
    [row1X + p + gap,     row1Y, 1],
    [row1X + (p + gap)*2, row1Y, 1],
    [row2X0,              row2Y, 2],
    [row2X0 + p + gap,    row2Y, 2],
  ];
  const subsets: number[][] = [[], [1], [0,2], [0,1,2], [0,2,3,4], [0,1,2,3,4]];
  const idxs = subsets[list.length] ?? subsets[5];
  // Outer View senza overflow:hidden così i maialini possono fuoriuscire
  // Il cerchio sfondo è separato con overflow:hidden
  return (
    <View style={{ width: size, height: size }}>
      {!noCircle && (
        <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
          {bannerUrl
            ? <Image source={{ uri: bannerUrl }} style={{ position: 'absolute', width: size, height: size }} resizeMode="cover" />
            : <View style={{ position: 'absolute', width: size, height: size, backgroundColor: '#DFE6E9' }} />}
        </View>
      )}
      {list.map((m, i) => {
        const [left, top, zIdx] = pos[idxs[i]];
        return (
          <View key={i} style={{ position: 'absolute', left, top, zIndex: zIdx }}>
            <PigSkin skinId={m.skinId} variant={(m.skinVariant as any) ?? 'base'} size={p} />
          </View>
        );
      })}
    </View>
  );
}

async function fetchPeriodScore(userIds: string[], from: string, to: string): Promise<number> {
  if (userIds.length === 0) return 0;
  const { data } = await supabase
    .from('logs')
    .select('hearts_delta')
    .in('user_id', userIds)
    .gte('activity_date', from)
    .lte('activity_date', to);
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
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('month');
  const [category, setCategory] = useState<Category>('singoli');
  const [rankings, setRankings] = useState<RankEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [membersModal, setMembersModal] = useState<{
    title: string;
    bannerUrl?: string | null;
    type: 'clan' | 'tandem';
    members: { id: string; username: string; hearts: number; avatar_url?: string | null; pig_skin?: number; pig_skin_variant?: string; pig_bg?: number }[];
  } | null>(null);

  async function showGroupMembers(groupId: string, groupName: string, type: 'clan' | 'tandem') {
    const field = type === 'clan' ? 'clan_id' : 'tandem_id';
    const [{ data }, clanRes] = await Promise.all([
      supabase.from('profiles').select('id, username, hearts, avatar_url, pig_skin, pig_skin_variant, pig_bg').eq(field, groupId).order('hearts', { ascending: false }),
      type === 'clan' ? supabase.from('clans').select('avatar_url').eq('id', groupId).single() : Promise.resolve({ data: null }),
    ]);
    setMembersModal({ title: groupName, bannerUrl: clanRes.data?.avatar_url ?? null, type, members: data ?? [] });
  }

  function openProfile(userId: string) {
    if (userId === user?.id) router.push('/profilo' as any);
    else router.push(`/profilo?userId=${userId}` as any);
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
        const { data } = await supabase.from('profiles').select('id, username, hearts, avatar_url, pig_skin, pig_skin_variant, pig_bg, injury_mode').order('hearts', { ascending: false }).limit(50);
        setRankings((data ?? []).map((p: any) => ({ id: p.id, name: p.username, score: p.hearts, isMe: p.id === user.id, avatarUrl: p.avatar_url ?? null, skinId: p.pig_skin ?? 0, skinVariant: p.pig_skin_variant ?? 'base', bgId: p.pig_bg ?? 0, injured: p.injury_mode ?? false })));
      } else {
        const { data: logs } = await supabase
          .from('logs')
          .select('user_id, hearts_delta, profiles(username, avatar_url, pig_skin, pig_skin_variant, pig_bg, injury_mode)')
          .gte('activity_date', from!)
          .lte('activity_date', to!);
        const map: Record<string, { name: string; score: number; avatarUrl: string | null; skinId: number; skinVariant: string; bgId: number; injured: boolean }> = {};
        (logs ?? []).forEach((l: any) => {
          if (!map[l.user_id]) map[l.user_id] = { name: l.profiles?.username ?? '?', score: 0, avatarUrl: l.profiles?.avatar_url ?? null, skinId: l.profiles?.pig_skin ?? 0, skinVariant: l.profiles?.pig_skin_variant ?? 'base', bgId: l.profiles?.pig_bg ?? 0, injured: l.profiles?.injury_mode ?? false };
          map[l.user_id].score += l.hearts_delta ?? 0;
        });
        setRankings(Object.entries(map)
          .map(([id, v]) => ({ id, name: v.name, score: v.score, isMe: id === user.id, avatarUrl: v.avatarUrl, skinId: v.skinId, skinVariant: v.skinVariant, bgId: v.bgId, injured: v.injured }))
          .sort((a, b) => b.score - a.score));
      }
    } else if (category === 'tandem') {
      const { data: tandems } = await supabase.from('tandems').select('id, name');
      const { data: myProfile } = await supabase.from('profiles').select('tandem_id').eq('id', user.id).single();
      const scores = await Promise.all((tandems ?? []).map(async (t: any) => {
        let score = 0;
        const { data: m } = await supabase.from('profiles').select('id, hearts, pig_skin, pig_skin_variant, pig_bg').eq('tandem_id', t.id);
        if (!m || m.length === 0) return null;
        if (period === 'all') {
          score = m.reduce((s: number, p: any) => s + p.hearts, 0);
        } else {
          score = await fetchPeriodScore(m.map((p: any) => p.id), from!, to!);
        }
        const members = m.map((p: any) => ({ skinId: p.pig_skin ?? 0, skinVariant: p.pig_skin_variant ?? 'base', bgId: p.pig_bg ?? 0 }));
        return { id: t.id, name: t.name, score, isMe: t.id === myProfile?.tandem_id, members };
      }));
      setRankings((scores.filter(s => s !== null) as RankEntry[]).sort((a, b) => b.score - a.score));
    } else {
      const { data: clans } = await supabase.from('clans').select('id, name, avatar_url, avatar_offset_y');
      const { data: myProfile } = await supabase.from('profiles').select('clan_id').eq('id', user.id).single();
      const scores = await Promise.all((clans ?? []).map(async (c: any) => {
        const { data: m } = await supabase.from('profiles').select('id, hearts, pig_skin, pig_skin_variant').eq('clan_id', c.id);
        if (!m || m.length === 0) return null;
        let score = 0;
        if (period === 'all') {
          score = m.reduce((s: number, p: any) => s + p.hearts, 0);
        } else {
          score = await fetchPeriodScore(m.map((p: any) => p.id), from!, to!);
        }
        const members = m.map((p: any) => ({ skinId: p.pig_skin ?? 0, skinVariant: p.pig_skin_variant ?? 'base', bgId: 0 }));
        return { id: c.id, name: c.name, score, isMe: c.id === myProfile?.clan_id, avatarUrl: c.avatar_url ?? null, avatarOffsetY: c.avatar_offset_y ?? 0.5, members };
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
          {top3.length >= 3 && (() => {
            const STEP_H = [72, 50, 36];
            const STEP_COLORS = ['#C9A84C', '#9E9E9E', '#8B6340'];
            const STEP_LABELS = ['1', '2', '3'];
            const sizes = category === 'clan' ? [140, 116, 116] : [88, 72, 72];

            // Sfondo singoli: bg del #1
            const bg1 = category === 'singoli'
              ? (SHOP_BGS.find(b => b.id === (top3[0].bgId ?? 0)) ?? SHOP_BGS[0])
              : null;
            // Sfondo tandem: metà sinistra = membro0, metà destra = membro1 del #1
            const tandemBg0 = category === 'tandem' && top3[0].members?.[0]
              ? (SHOP_BGS.find(b => b.id === (top3[0].members![0].bgId ?? 0)) ?? SHOP_BGS[0]) : null;
            const tandemBg1 = category === 'tandem' && top3[0].members?.[1]
              ? (SHOP_BGS.find(b => b.id === (top3[0].members![1].bgId ?? 0)) ?? SHOP_BGS[0]) : null;
            const clanBanner = category === 'clan' ? top3[0].avatarUrl : null;

            const renderAvatar = (entry: typeof top3[0], sz: number) =>
              category === 'singoli'
                ? <PigSkin skinId={entry.skinId ?? 0} variant={(entry.skinVariant as any) ?? 'base'} size={sz} />
                : category === 'tandem' && entry.members?.length
                  ? <TandemAvatar members={entry.members} size={sz} noCircle />
                  : <ClanAvatar members={entry.members ?? []} bannerUrl={entry.avatarUrl} size={sz} noCircle />;

            const order = [1, 0, 2];

            return (
              <View style={[styles.podium, { overflow: 'hidden' }]}>
                {/* Sfondo singoli */}
                {bg1 && (
                  <ImageBackground source={bg1.image ?? undefined} resizeMode="cover" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: bg1.color }} />
                )}
                {/* Sfondo tandem: split metà */}
                {category === 'tandem' && (tandemBg0 || tandemBg1) && (
                  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row' }}>
                    <View style={{ flex: 1, backgroundColor: tandemBg0?.color ?? '#eee', overflow: 'hidden' }}>
                      {tandemBg0?.image && <Image source={tandemBg0.image} style={{ position: 'absolute', top: 0, left: 0, width: '200%', height: '100%' }} resizeMode="cover" />}
                    </View>
                    <View style={{ flex: 1, backgroundColor: tandemBg1?.color ?? '#eee', overflow: 'hidden' }}>
                      {tandemBg1?.image && <Image source={tandemBg1.image} style={{ position: 'absolute', top: 0, right: 0, width: '200%', height: '100%' }} resizeMode="cover" />}
                    </View>
                  </View>
                )}
                {/* Sfondo clan: banner copre tutto */}
                {clanBanner && (
                  <Image source={{ uri: clanBanner }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} resizeMode="cover" />
                )}
                {/* Overlay scuro */}
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.28)' }} />

                {order.map((rank) => {
                  const entry = top3[rank];
                  return (
                    <TouchableOpacity
                      key={rank}
                      style={styles.podiumItem}
                      onPress={() => category === 'singoli' ? openProfile(entry.id) : showGroupMembers(entry.id, entry.name, category as 'clan' | 'tandem')}
                    >
                      <View style={category === 'clan' && rank === 0 ? { marginBottom: 28 } : undefined}>
                        {renderAvatar(entry, sizes[rank])}
                      </View>
                      <Text style={styles.podiumName} numberOfLines={1}>{entry.name}{entry.injured ? ' 🩹' : ''}</Text>
                      <Text style={styles.podiumScore}>
                        {entry.score >= 0 ? '+' : ''}{Math.round(entry.score)} ❤️
                      </Text>
                      {/* Gradino */}
                      <View style={{ width: '100%', height: STEP_H[rank], backgroundColor: STEP_COLORS[rank], borderTopLeftRadius: 8, borderTopRightRadius: 8, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 8, borderTopWidth: rank === 0 ? 2 : 0, borderColor: 'rgba(255,255,255,0.5)' }}>
                        <Text style={{ color: rank === 0 ? '#fff' : 'rgba(255,255,255,0.6)', fontWeight: '900', fontSize: rank === 0 ? 22 : 18 }}>{STEP_LABELS[rank]}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })()}

          {/* Lista completa */}
          <Text style={styles.sectionTitle}>
            {category === 'singoli' ? 'Tutti i maialini' : category === 'tandem' ? 'Tutti i tandem' : 'Tutti i clan'}
          </Text>

          {rankings.length === 0 ? (
            <Text style={styles.empty}>Nessun dato per questo periodo 🐷</Text>
          ) : (
            rankings.map((r, i) => {
              const isGroup = category !== 'singoli';
              const isTandem = category === 'tandem';
              const m0 = r.members?.[0];
              const m1 = r.members?.[1];
              const bg0 = SHOP_BGS.find(b => b.id === (r.bgId ?? 0)) ?? SHOP_BGS[0];
              const bg1tandem = isTandem && m1 ? (SHOP_BGS.find(b => b.id === (m1.bgId ?? 0)) ?? SHOP_BGS[0]) : null;
              const bg0tandem = isTandem && m0 ? (SHOP_BGS.find(b => b.id === (m0.bgId ?? 0)) ?? SHOP_BGS[0]) : null;
              return (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.row, r.isMe && styles.rowMe, i === 0 && styles.rowFirst, { overflow: 'hidden' }]}
                  onPress={() => isGroup ? showGroupMembers(r.id, r.name, category as 'clan' | 'tandem') : openProfile(r.id)}
                >
                  {/* Sfondo riga */}
                  {category === 'singoli' && (
                    <ImageBackground source={bg0.image ?? undefined} resizeMode="cover" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: bg0.color, opacity: 0.5 }} />
                  )}
                  {isTandem && (bg0tandem || bg1tandem) && (
                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row' }}>
                      <View style={{ flex: 1, backgroundColor: bg0tandem?.color ?? '#eee', opacity: 0.55, overflow: 'hidden' }}>
                        {bg0tandem?.image && <Image source={bg0tandem.image} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '200%', height: '100%', opacity: 0.7 }} resizeMode="cover" />}
                      </View>
                      <View style={{ flex: 1, backgroundColor: bg1tandem?.color ?? '#eee', opacity: 0.55, overflow: 'hidden' }}>
                        {bg1tandem?.image && <Image source={bg1tandem.image} style={{ position: 'absolute', top: 0, bottom: 0, width: '200%', height: '100%', right: 0, left: '-100%', opacity: 0.7 }} resizeMode="cover" />}
                      </View>
                    </View>
                  )}
                  {category === 'clan' && r.avatarUrl && (() => {
                    const ROW_H = 88;
                    const IMG_H = 240;
                    const offset = r.avatarOffsetY ?? 0.5;
                    const topPx = -(offset * (IMG_H - ROW_H));
                    return (
                      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
                        <Image source={{ uri: r.avatarUrl }} style={{ position: 'absolute', top: topPx, left: 0, right: 0, height: IMG_H, opacity: 0.45 }} resizeMode="cover" />
                      </View>
                    );
                  })()}

                  <Text style={[styles.rankText, i < 3 && styles.rankMedal]}>{medal(i)}</Text>

                  {/* Singoli */}
                  {category === 'singoli' && <PigSkin skinId={r.skinId ?? 0} variant={(r.skinVariant as any) ?? 'base'} size={56} />}

                  {/* Tandem */}
                  {isTandem && m0 && <PigSkin skinId={m0.skinId} variant={(m0.skinVariant as any) ?? 'base'} size={50} />}

                  {/* Clan: nome + riga maialini */}
                  {category === 'clan' ? (
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowName, r.isMe && styles.rowNameMe, { marginBottom: 6 }]} numberOfLines={1}>
                        {r.name}{r.isMe ? ' (tu)' : ''}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        {(r.members ?? []).slice(0, 5).map((m, mi) => (
                          <PigSkin key={mi} skinId={m.skinId} variant={(m.skinVariant as any) ?? 'base'} size={36} />
                        ))}
                      </View>
                    </View>
                  ) : (
                    <Text style={[styles.rowName, r.isMe && styles.rowNameMe]} numberOfLines={1}>
                      {r.name}{r.injured ? ' 🩹' : ''}{r.isMe ? ' (tu)' : ''}
                    </Text>
                  )}

                  {/* Tandem membro 1 */}
                  {isTandem && m1 && <PigSkin skinId={m1.skinId} variant={(m1.skinVariant as any) ?? 'base'} size={50} />}

                  <Text style={[styles.rowScore, { color: r.score >= 0 ? '#E8445A' : '#ff3b30' }]}>
                    {r.score >= 0 ? '+' : ''}{Math.round(r.score)} ❤️
                  </Text>
                </TouchableOpacity>
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
            {/* Banner clan con nome centrato */}
            <View style={styles.modalBanner}>
              {membersModal?.type === 'tandem' ? (
                <View style={[styles.modalBannerImg, { flexDirection: 'row' }]}>
                  {membersModal.members.slice(0, 2).map((m, i) => {
                    const bg = SHOP_BGS.find(b => b.id === (m.pig_bg ?? 0)) ?? SHOP_BGS[0];
                    return (
                      <View key={i} style={{ flex: 1, overflow: 'hidden', backgroundColor: bg.color }}>
                        {bg.image && (
                          <Image
                            source={bg.image}
                            style={{
                              position: 'absolute', top: 0, bottom: 0,
                              width: '200%', height: '100%',
                              left: i === 0 ? 0 : '-100%',
                            }}
                            resizeMode="cover"
                          />
                        )}
                      </View>
                    );
                  })}
                </View>
              ) : membersModal?.bannerUrl ? (
                <Image source={{ uri: membersModal.bannerUrl }} style={styles.modalBannerImg} />
              ) : (
                <View style={[styles.modalBannerImg, styles.modalBannerPlaceholder]}>
                  <Text style={{ fontSize: 36 }}>🏆</Text>
                </View>
              )}
              <View style={styles.modalBannerOverlay} />
              <Text style={styles.modalBannerName}>{membersModal?.title}</Text>
            </View>

            <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 }}>
              {(membersModal?.members ?? []).map((m) => (
                <TouchableOpacity key={m.id} style={styles.modalMember} onPress={() => { setMembersModal(null); openProfile(m.id); }}>
                  <PigSkin skinId={m.pig_skin ?? 0} variant={(m.pig_skin_variant as any) ?? 'base'} size={32} />
                  <Text style={styles.modalMemberName}>{m.username}</Text>
                  <Text style={[styles.modalMemberScore, { color: m.hearts >= 0 ? '#E8445A' : '#ff3b30' }]}>
                    {m.hearts > 0 ? `+${Math.round(m.hearts)}` : Math.round(m.hearts)}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.modalClose} onPress={() => setMembersModal(null)}>
                <Text style={styles.modalCloseText}>Chiudi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

function makeStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },

    filterSection: {
      backgroundColor: colors.card,
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 8,
    },
    toggleRow: { flexDirection: 'row', gap: 6 },
    pill: { flex: 1, paddingVertical: 9, borderRadius: 20, alignItems: 'center', backgroundColor: colors.bgAlt },
    pillActive: { backgroundColor: '#FFD700' },
    pillText: { fontSize: 11, fontWeight: '600', color: colors.textDim },
    pillTextActive: { color: '#1a1a1a' },

    listContainer: { padding: 16 },

    podium: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'flex-end',
      marginBottom: 28,
      borderRadius: 20,
      height: 276,
      paddingTop: 20,
      paddingHorizontal: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 10,
      elevation: 5,
    },
    podiumItem: { flex: 1, alignItems: 'center', gap: 5 },
    podiumMedal: { fontSize: 26 },
    podiumMedalBig: { fontSize: 34 },
    podiumName: { fontSize: 13, fontWeight: '700', color: '#fff', textAlign: 'center', width: '100%', textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
    podiumScore: { fontSize: 14, fontWeight: '800', color: '#fff', textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },

    sectionTitle: {
      fontSize: 12, fontWeight: '700', color: colors.textFaint,
      letterSpacing: 1, textTransform: 'uppercase',
      marginBottom: 10, marginTop: 4,
    },

    row: {
      backgroundColor: colors.card,
      borderRadius: 14, padding: 16, minHeight: 96,
      flexDirection: 'row', alignItems: 'center',
      marginBottom: 8, gap: 2,
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0 : 0.04, shadowRadius: 3, elevation: isDark ? 0 : 1,
    },
    rowMe: { borderWidth: 2, borderColor: '#FFD700', backgroundColor: isDark ? '#332a0d' : '#FFFDE7' },
    rowFirst: { borderWidth: 2, borderColor: '#FFD700' },
    rankText: { fontSize: 13, fontWeight: '800', color: colors.textFaint, width: 20, textAlign: 'center' },
    rankMedal: { fontSize: 18, color: colors.text },
    rowAvatar: { fontSize: 22 },
    rowName: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
    rowNameMe: { color: '#b8860b', fontWeight: '800' },
    rowScore: { fontSize: 16, fontWeight: '800' },

    empty: { textAlign: 'center', color: colors.textFaint, fontSize: 15, marginTop: 40, marginBottom: 20 },

    mapBtn: {
      backgroundColor: '#4DA6FF', borderRadius: 16, padding: 16,
      marginHorizontal: 16, marginTop: 12, alignItems: 'center',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
    },
    mapBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },

    tappableName: { textDecorationLine: 'underline' },

    modalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center', alignItems: 'center', padding: 24,
    },
    modalContent: {
      backgroundColor: colors.card, borderRadius: 20,
      width: '100%', maxWidth: 340, overflow: 'hidden',
    },
    modalBanner: { width: '100%', height: 110, position: 'relative', justifyContent: 'center', alignItems: 'center' },
    modalBannerImg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
    modalBannerPlaceholder: { backgroundColor: '#FFD700', justifyContent: 'center', alignItems: 'center' },
    modalBannerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
    modalBannerName: { fontSize: 22, fontWeight: '900', color: '#fff', textAlign: 'center', paddingHorizontal: 16, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 6, zIndex: 1 },
    modalMember: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    modalMemberName: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
    modalMemberScore: { fontSize: 18, fontWeight: '800' },
    modalClose: { marginTop: 18, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 10 },
    modalCloseText: { fontSize: 14, fontWeight: '600', color: colors.textDim },
  });
}
