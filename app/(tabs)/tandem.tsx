import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Alert, ScrollView, ActivityIndicator, RefreshControl, Modal,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import { UserAvatar } from '@/components/UserAvatar';
import {
  getTandemWeekMissions, calcTandemProgress, MissionDef, MissionProgress,
  getPrevWeekStart, getPrevWeekEnd, getTandemClaimState, claimTandemMissions,
} from '@/lib/missions';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeColors } from '@/constants/Colors';

interface ProfileResult { id: string; username: string; tandem_id: string | null; avatar_url?: string | null }
interface PendingInvite {
  id: string;
  name: string;
  creatorUsername: string;
  creatorAvatar: string | null;
}

type MemberInfo = { id: string; username: string; avatar_url?: string | null };

function formatMemberValue(value: number, category: string): string {
  if (category === 'corsa' || category === 'camminata') return `${value} km`;
  if (category === 'attivita') {
    const h = Math.floor(value / 60);
    const m = value % 60;
    return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`;
  }
  return `${value}gg`;
}

function MissionCard({ def, progress, memberInfo }: { def: MissionDef; progress: MissionProgress; memberInfo?: MemberInfo[] }) {
  const [expanded, setExpanded] = useState(false);
  const { colors, isDark } = useTheme();
  const missionStyles = useMemo(() => makeMissionStyles(colors, isDark), [colors, isDark]);
  const pct = Math.min(progress.pct, 1);
  const done = progress.completed;

  const mv = progress.memberValues;
  const hasTwoMembers = memberInfo && memberInfo.length === 2 && mv && mv.length === 2;
  const totalVal = mv ? mv.reduce((s, m) => s + m.value, 0) : 0;

  return (
    <TouchableOpacity
      style={[missionStyles.card, done && missionStyles.cardDone]}
      onPress={() => hasTwoMembers && setExpanded(e => !e)}
      activeOpacity={hasTwoMembers ? 0.75 : 1}
    >
      <View style={missionStyles.header}>
        <Text style={missionStyles.label} numberOfLines={2}>{def.emoji} {def.label}</Text>
        <View style={missionStyles.tokenBadge}>
          <Text style={missionStyles.tokenText}>🎟 {def.tokens}</Text>
        </View>
      </View>

      {/* Split bar when expanded and 2 members */}
      {expanded && hasTwoMembers ? (() => {
        const splitFrac = totalVal > 0 ? mv![0].value / totalVal : 0.5;
        const leftPct = Math.round(splitFrac * pct * 100);
        const rightPct = Math.round((1 - splitFrac) * pct * 100);
        return (
          <>
            <View style={missionStyles.barBg}>
              <View style={{ flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden' }}>
                <View style={{ width: `${leftPct}%` as any, backgroundColor: '#2196F3' }} />
                <View style={{ width: `${rightPct}%` as any, backgroundColor: '#FF9800' }} />
              </View>
            </View>
            <View style={missionStyles.splitRow}>
              <View style={missionStyles.splitMember}>
                <UserAvatar avatarUrl={memberInfo![0].avatar_url} size={32} />
                <Text style={missionStyles.splitName}>{memberInfo![0].username}</Text>
                <Text style={[missionStyles.splitValue, { color: '#2196F3' }]}>{formatMemberValue(mv![0].value, def.category)}</Text>
              </View>
              <View style={missionStyles.splitDivider} />
              <View style={missionStyles.splitMember}>
                <UserAvatar avatarUrl={memberInfo![1].avatar_url} size={32} />
                <Text style={missionStyles.splitName}>{memberInfo![1].username}</Text>
                <Text style={[missionStyles.splitValue, { color: '#FF9800' }]}>{formatMemberValue(mv![1].value, def.category)}</Text>
              </View>
            </View>
          </>
        );
      })() : (
        <View style={missionStyles.barBg}>
          <View style={[missionStyles.barFill, { width: `${Math.round(pct * 100)}%` as any, backgroundColor: done ? '#4CAF50' : '#FFD700' }]} />
        </View>
      )}

      <View style={missionStyles.footer}>
        <Text style={missionStyles.progressText}>{progress.displayValue}</Text>
        {done ? <Text style={missionStyles.doneText}>✅ Completata!</Text> : hasTwoMembers ? <Text style={missionStyles.expandHint}>{expanded ? '▲' : '▼'}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

function makeMissionStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 10,
      borderWidth: 1.5, borderColor: colors.border,
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: isDark ? 0 : 0.05, shadowRadius: 4, elevation: isDark ? 0 : 1,
    },
    cardDone: { borderColor: '#4CAF50', backgroundColor: isDark ? '#16291a' : '#f0fff4' },
    header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 8 },
    label: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.text, lineHeight: 18 },
    tokenBadge: { backgroundColor: isDark ? '#332a0d' : '#FFF8E1', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#FFD700', flexShrink: 0 },
    tokenText: { fontSize: 12, fontWeight: '800', color: '#b8860b' },
    barBg: { height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
    barFill: { height: 8, borderRadius: 4 },
    footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    progressText: { fontSize: 11, color: colors.textDim, flex: 1 },
    doneText: { fontSize: 12, fontWeight: '700', color: '#4CAF50' },
    expandHint: { fontSize: 11, color: colors.textFaint },
    splitRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 4 },
    splitMember: { flex: 1, alignItems: 'center', gap: 4 },
    splitDivider: { width: 1, height: 48, backgroundColor: colors.border, marginHorizontal: 8 },
    splitName: { fontSize: 11, fontWeight: '600', color: colors.textDim, textAlign: 'center' },
    splitValue: { fontSize: 13, fontWeight: '800', textAlign: 'center' },
  });
}

export default function TandemScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const claimCardStyles = useMemo(() => makeClaimCardStyles(colors, isDark), [colors, isDark]);
  const [myTandem, setMyTandem] = useState<{ id: string; name: string; members: { id: string; username: string; avatar_url?: string | null; hearts?: number }[] } | null>(null);
  const [tandemName, setTandemName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProfileResult[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<ProfileResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [pendingSent, setPendingSent] = useState<{ id: string; name: string; invitedUsername: string } | null>(null);
  const [matchup, setMatchup] = useState<null | {
    myId: string; oppId: string;
    myName: string; oppName: string; myScore: number; oppScore: number;
    weekStart: string; weekEnd: string;
  }>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const [membersModal, setMembersModal] = useState<{ title: string; members: { id: string; username: string; hearts: number; avatar_url?: string | null }[] } | null>(null);
  const [missions, setMissions] = useState<{ def: MissionDef; progress: MissionProgress }[]>([]);
  const [missionsLoading, setMissionsLoading] = useState(false);
  const [prevMissions, setPrevMissions] = useState<{ def: MissionDef; progress: MissionProgress }[]>([]);
  const [tandemClaimedWeek, setTandemClaimedWeek] = useState<string | null>(null);
  const [claimingTandem, setClaimingTandem] = useState(false);

  async function showTandemMembers(tandemId: string, tandemName: string) {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, hearts, avatar_url')
      .eq('tandem_id', tandemId)
      .order('hearts', { ascending: false });
    setMembersModal({ title: tandemName, members: data ?? [] });
  }

  function openProfile(userId: string) {
    if (userId === user?.id) router.push('/profilo' as any);
    else router.push(`/profilo?userId=${userId}` as any);
  }

  const load = useCallback(async () => {
    if (!user) return;
    await Promise.all([loadMyTandem(), loadPendingInvites(), loadPendingSent()]);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // =============================================
  // CARICA IL MIO TANDEM (se esiste e attivo)
  // =============================================
  async function loadMyTandem() {
    if (!user) return;
    setLoading(true);
    try {
      const { data: profile } = await supabase.from('profiles').select('tandem_id').eq('id', user.id).single();
      if (!profile?.tandem_id) { setMyTandem(null); setMatchup(null); return; }

      const { data: tandem } = await supabase.from('tandems').select('id, name, status').eq('id', profile.tandem_id).single();
      if (!tandem || tandem.status !== 'active') {
        // Se il tandem è pending o non esiste, resetta
        if (!tandem) {
          await supabase.from('profiles').update({ tandem_id: null }).eq('id', user.id);
        }
        setMyTandem(null);
        setMatchup(null);
        return;
      }

      const { data: members } = await supabase.from('profiles').select('id, username, avatar_url, hearts').eq('tandem_id', tandem.id);
      setMyTandem({ ...tandem, members: members ?? [] });

      // Se solo 1 membro (l'altro ha lasciato), elimina il tandem
      if (!members || members.length < 2) {
        await cleanupTandem(tandem.id);
        setMyTandem(null);
        setMatchup(null);
        return;
      }

      await loadMatchup(tandem.id);
      await loadMissions(members.map((p: any) => p.id));
    } finally {
      setLoading(false);
    }
  }

  async function loadMissions(memberIds: string[]) {
    setMissionsLoading(true);
    try {
      const now = new Date();
      const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const defs = getTandemWeekMissions(weekStart);
      const progresses = await Promise.all(defs.map(d => calcTandemProgress(d, memberIds, weekStart, weekEnd)));
      setMissions(defs.map((d, i) => ({ def: d, progress: progresses[i] })));

      // Carica anche le missioni della settimana precedente (per il claim)
      const prevStart = getPrevWeekStart();
      const prevEnd = getPrevWeekEnd();
      const prevDefs = getTandemWeekMissions(prevStart);
      const prevProgresses = await Promise.all(prevDefs.map(d => calcTandemProgress(d, memberIds, prevStart, prevEnd)));
      setPrevMissions(prevDefs.map((d, i) => ({ def: d, progress: prevProgresses[i] })));

      // Stato claim
      if (user) {
        const { claimedWeek } = await getTandemClaimState(user.id);
        setTandemClaimedWeek(claimedWeek);
      }
    } catch {}
    finally { setMissionsLoading(false); }
  }

  async function handleClaimTandem() {
    if (!user || claimingTandem) return;
    setClaimingTandem(true);
    try {
      const prevStart = getPrevWeekStart();
      const completedMissions = prevMissions.filter(m => m.progress.completed);
      const totalTokens = completedMissions.reduce((s, m) => s + m.def.tokens, 0);
      if (totalTokens === 0) return;
      const ok = await claimTandemMissions(user.id, prevStart, totalTokens, completedMissions.length);
      if (ok) {
        setTandemClaimedWeek(prevStart);
        Alert.alert('🎟 Gettoni riscossi!', `Hai guadagnato ${totalTokens} gettoni dalla settimana scorsa!`);
      }
    } finally {
      setClaimingTandem(false);
    }
  }

  // =============================================
  // INVITI PENDENTI RICEVUTI
  // =============================================
  async function loadPendingInvites() {
    if (!user) return;
    const { data } = await supabase
      .from('tandems')
      .select('id, name, created_by')
      .eq('invited_user_id', user.id)
      .eq('status', 'pending');

    if (!data || data.length === 0) { setPendingInvites([]); return; }

    // Prendi i profili dei creatori
    const creatorIds = data.map((t) => t.created_by);
    const { data: creators } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', creatorIds);

    const creatorMap: Record<string, { username: string; avatar_url: string | null }> = {};
    (creators ?? []).forEach((c) => { creatorMap[c.id] = { username: c.username, avatar_url: c.avatar_url }; });

    setPendingInvites(data.map((t) => ({
      id: t.id,
      name: t.name,
      creatorUsername: creatorMap[t.created_by]?.username ?? '???',
      creatorAvatar: creatorMap[t.created_by]?.avatar_url ?? null,
    })));
  }

  // =============================================
  // INVITO CHE HO MANDATO (in attesa)
  // =============================================
  async function loadPendingSent() {
    if (!user) return;
    const { data } = await supabase
      .from('tandems')
      .select('id, name, invited_user_id')
      .eq('created_by', user.id)
      .eq('status', 'pending')
      .maybeSingle();

    if (!data) { setPendingSent(null); return; }

    const { data: invitedProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', data.invited_user_id)
      .single();

    setPendingSent({
      id: data.id,
      name: data.name,
      invitedUsername: invitedProfile?.username ?? '???',
    });
  }

  // =============================================
  // ACCETTA INVITO
  // =============================================
  async function acceptInvite(invite: PendingInvite) {
    try {
      const { error } = await supabase.rpc('accept_tandem_invite', { tandem_uuid: invite.id });
      if (error) throw error;
      Alert.alert('✅ Tandem attivo!', `Sei entrato in "${invite.name}"!`);
      await load();
    } catch (e: any) {
      Alert.alert('Errore', e.message);
    }
  }

  // =============================================
  // RIFIUTA INVITO
  // =============================================
  async function declineInvite(invite: PendingInvite) {
    Alert.alert('Rifiuta invito', `Rifiuti l'invito per "${invite.name}"?`, [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Rifiuta', style: 'destructive', onPress: async () => {
          await supabase.from('tandems').delete().eq('id', invite.id);
          await load();
        },
      },
    ]);
  }

  // =============================================
  // ANNULLA INVITO MANDATO
  // =============================================
  async function cancelSentInvite() {
    if (!pendingSent) return;
    Alert.alert('Annulla invito', `Annulli l'invito per "${pendingSent.name}"?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Annulla invito', style: 'destructive', onPress: async () => {
          await supabase.from('tandems').delete().eq('id', pendingSent.id);
          setPendingSent(null);
        },
      },
    ]);
  }

  // =============================================
  // PULIZIA TANDEM INATTIVI
  // =============================================
  async function cleanupTandem(tandemId: string) {
    // Resetta tandem_id di tutti i membri rimasti
    await supabase.from('profiles').update({ tandem_id: null }).eq('tandem_id', tandemId);
    // Elimina il tandem
    await supabase.from('tandems').delete().eq('id', tandemId);
  }

  // =============================================
  // MATCHUP SETTIMANALE
  // =============================================
  async function loadMatchup(tandemId: string) {
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

    const { data: m } = await supabase
      .from('tandem_matchups')
      .select('*, t1:tandem1_id(name), t2:tandem2_id(name)')
      .or(`tandem1_id.eq.${tandemId},tandem2_id.eq.${tandemId}`)
      .eq('week_start', weekStart)
      .maybeSingle();

    if (!m) { setMatchup(null); return; }

    const myId = tandemId;
    const oppId = m.tandem1_id === myId ? m.tandem2_id : m.tandem1_id;
    const myName = m.tandem1_id === myId ? m.t1?.name : m.t2?.name;
    const oppName = m.tandem1_id === myId ? m.t2?.name : m.t1?.name;

    const [{ data: myMem }, { data: oppMem }] = await Promise.all([
      supabase.from('profiles').select('id').eq('tandem_id', myId),
      supabase.from('profiles').select('id').eq('tandem_id', oppId),
    ]);

    const calcScore = async (memberIds: string[]) => {
      if (memberIds.length === 0) return 0;
      const { data } = await supabase
        .from('logs').select('hearts_delta')
        .in('user_id', memberIds)
        .gte('created_at', m.week_start)
        .lte('created_at', m.week_end + 'T23:59:59');
      return (data ?? []).reduce((s: number, l: any) => s + (l.hearts_delta ?? 0), 0);
    };

    const [myScore, oppScore] = await Promise.all([
      calcScore((myMem ?? []).map((m: any) => m.id)),
      calcScore((oppMem ?? []).map((m: any) => m.id)),
    ]);

    setMatchup({ myId: myId, oppId: oppId, myName, oppName, myScore, oppScore, weekStart: m.week_start, weekEnd: m.week_end });
  }

  // =============================================
  // RICERCA PARTNER
  // =============================================
  function onSearchChange(text: string) {
    setSearchQuery(text);
    setSelectedPartner(null);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (text.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, tandem_id, avatar_url')
        .ilike('username', `%${text}%`)
        .neq('id', user!.id)
        .limit(8);
      setSearchResults(data ?? []);
      setSearching(false);
    }, 400);
  }

  function selectPartner(p: ProfileResult) {
    if (p.tandem_id) { Alert.alert('Non disponibile', `${p.username} è già in un tandem`); return; }
    setSelectedPartner(p);
    setSearchQuery(p.username);
    setSearchResults([]);
  }

  // =============================================
  // CREA TANDEM (manda invito)
  // =============================================
  async function createTandem() {
    if (!tandemName.trim()) { Alert.alert('Dai un nome al tandem!'); return; }
    if (!selectedPartner) { Alert.alert('Cerca e seleziona il tuo partner!'); return; }
    setCreating(true);
    try {
      // Crea il tandem in stato 'pending' con invito al partner
      const { data: tandem, error } = await supabase
        .from('tandems')
        .insert({
          name: tandemName.trim(),
          created_by: user!.id,
          invited_user_id: selectedPartner.id,
          status: 'pending',
        })
        .select().single();
      if (error || !tandem) throw new Error(error?.message || 'Errore creazione tandem');

      setTandemName('');
      setSearchQuery('');
      setSelectedPartner(null);
      await load();
      Alert.alert('📩 Invito mandato!', `${selectedPartner.username} deve accettare l'invito per attivare il tandem "${tandemName.trim()}"`);
    } catch (e: any) {
      Alert.alert('Errore', e.message);
    } finally {
      setCreating(false);
    }
  }

  // =============================================
  // LASCIA TANDEM
  // =============================================
  async function leaveTandem() {
    Alert.alert('Lascia tandem', 'Sei sicuro? Il tandem verrà eliminato.', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Lascia', style: 'destructive', onPress: async () => {
          if (myTandem) {
            await cleanupTandem(myTandem.id);
          }
          setMyTandem(null);
          setMatchup(null);
        },
      },
    ]);
  }

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (loading) return <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color="#FFD700" /></View>;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFD700" />}
    >
      {/* ======= INVITI RICEVUTI ======= */}
      {pendingInvites.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>📩 Inviti ricevuti</Text>
          {pendingInvites.map((invite) => (
            <View key={invite.id} style={styles.inviteCard}>
              <View style={styles.inviteHeader}>
                <UserAvatar avatarUrl={invite.creatorAvatar} size={40} />
                <View style={styles.inviteInfo}>
                  <Text style={styles.inviteName}>{invite.name}</Text>
                  <Text style={styles.inviteFrom}>da {invite.creatorUsername}</Text>
                </View>
              </View>
              <View style={styles.inviteButtons}>
                <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptInvite(invite)}>
                  <Text style={styles.acceptBtnText}>✅ Accetta</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.declineBtn} onPress={() => declineInvite(invite)}>
                  <Text style={styles.declineBtnText}>Rifiuta</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </>
      )}

      {/* ======= INVITO MANDATO IN ATTESA ======= */}
      {pendingSent && !myTandem && (
        <View style={styles.pendingSentCard}>
          <Text style={styles.pendingSentEmoji}>⏳</Text>
          <Text style={styles.pendingSentTitle}>Invito in attesa</Text>
          <Text style={styles.pendingSentSub}>
            Hai invitato <Text style={{ fontWeight: '800' }}>{pendingSent.invitedUsername}</Text> a unirsi a "{pendingSent.name}"
          </Text>
          <TouchableOpacity style={styles.cancelInviteBtn} onPress={cancelSentInvite}>
            <Text style={styles.cancelInviteBtnText}>Annulla invito</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ======= IL MIO TANDEM (attivo) ======= */}
      {myTandem ? (
        <>
          <View style={styles.card}>
            <View style={styles.membersAvatarRow}>
              {myTandem.members.map((m, i) => (
                <View key={i} style={styles.memberAvatarItem}>
                  <UserAvatar avatarUrl={m.avatar_url} isMe={m.username === user?.username} size={52} />
                  <Text style={styles.memberAvatarName}>{m.username}</Text>
                  <Text style={styles.memberAvatarScore}>{(m.hearts ?? 0) > 0 ? `+${Math.round(m.hearts ?? 0)}` : Math.round(m.hearts ?? 0)} ❤️</Text>
                </View>
              ))}
            </View>
            <Text style={styles.tandemName}>{myTandem.name}</Text>
          </View>

          {/* Claim settimana scorsa */}
          {!missionsLoading && (() => {
            const prevStart = getPrevWeekStart();
            const prevEnd = getPrevWeekEnd();
            const completedPrev = prevMissions.filter(m => m.progress.completed);
            const totalTokens = completedPrev.reduce((s, m) => s + m.def.tokens, 0);
            const alreadyClaimed = tandemClaimedWeek === prevStart;
            if (totalTokens === 0) return null;
            return (
              <View style={claimCardStyles.card}>
                <Text style={claimCardStyles.title}>📅 Settimana {prevStart} → {prevEnd}</Text>
                {completedPrev.map((m, i) => (
                  <Text key={i} style={claimCardStyles.missionRow}>✅ {m.def.emoji} {m.def.label} — 🎟 {m.def.tokens}</Text>
                ))}
                {alreadyClaimed ? (
                  <View style={claimCardStyles.claimedRow}>
                    <Text style={claimCardStyles.claimedText}>🎟 Riscosso — {totalTokens} gettoni</Text>
                  </View>
                ) : (
                  <TouchableOpacity style={claimCardStyles.claimBtn} onPress={handleClaimTandem} disabled={claimingTandem}>
                    <Text style={claimCardStyles.claimBtnText}>{claimingTandem ? '...' : `Riscuoti 🎟 ${totalTokens} gettoni`}</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })()}

          {/* Missioni settimanali in corso */}
          <Text style={styles.sectionTitle}>🎯 Missioni di questa settimana</Text>
          {missionsLoading ? (
            <ActivityIndicator color="#FFD700" style={{ marginBottom: 12 }} />
          ) : (
            missions.map(({ def, progress }, i) => (
              <MissionCard key={i} def={def} progress={progress} memberInfo={myTandem?.members} />
            ))
          )}

          {/* Sfida settimanale */}
          <Text style={styles.sectionTitle}>⚔️ Sfida settimanale</Text>
          {matchup ? (
            <View style={styles.matchupCard}>
              <Text style={styles.matchupLabel}>
                {matchup.weekStart} — {matchup.weekEnd}
              </Text>
              <View style={styles.vsRow}>
                <TouchableOpacity style={styles.vsSide} onPress={() => showTandemMembers(matchup.myId, matchup.myName)}>
                  <Text style={[styles.vsName, styles.tappableName]}>{matchup.myName}</Text>
                  <Text style={[styles.vsScore, {
                    color: matchup.myScore >= matchup.oppScore ? '#2196F3' : '#E8445A',
                  }]}>
                    {matchup.myScore >= 0 ? '+' : ''}{Math.round(matchup.myScore)}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.vsText}>VS</Text>
                <TouchableOpacity style={styles.vsSide} onPress={() => showTandemMembers(matchup.oppId, matchup.oppName)}>
                  <Text style={[styles.vsName, styles.tappableName]}>{matchup.oppName}</Text>
                  <Text style={[styles.vsScore, {
                    color: matchup.oppScore >= matchup.myScore ? '#2196F3' : '#E8445A',
                  }]}>
                    {matchup.oppScore >= 0 ? '+' : ''}{Math.round(matchup.oppScore)}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.noMatchup}>
              <Text style={styles.noMatchupText}>Nessuna sfida questa settimana</Text>
              <Text style={styles.noMatchupSub}>Le sfide vengono assegnate automaticamente ogni lunedì quando ci sono abbastanza tandem</Text>
            </View>
          )}

          {/* Lascia tandem */}
          <TouchableOpacity onPress={leaveTandem} style={styles.leaveBtn}>
            <Text style={styles.leaveBtnText}>Lascia tandem</Text>
          </TouchableOpacity>
        </>
      ) : !pendingSent && (
        /* ======= CREA TANDEM (solo se non hai inviti in uscita) ======= */
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Crea il tuo Tandem 👥</Text>
          <Text style={styles.cardSub}>Un tandem è una coppia — sfiderete altri tandem ogni settimana. Il tuo partner dovrà accettare l'invito.</Text>

          <Text style={styles.label}>Nome del tandem</Text>
          <TextInput
            style={styles.input}
            placeholder="I Maialini Veloci 🐷"
            value={tandemName}
            onChangeText={setTandemName}
            placeholderTextColor="#bbb"
          />

          <Text style={styles.label}>Cerca il tuo partner</Text>
          <TextInput
            style={[styles.input, selectedPartner && styles.inputSelected]}
            placeholder="Cerca per username..."
            value={searchQuery}
            onChangeText={onSearchChange}
            autoCapitalize="none"
            placeholderTextColor="#bbb"
          />

          {searching && <ActivityIndicator style={{ marginBottom: 8 }} color="#FFD700" />}

          {searchResults.length > 0 && (
            <View style={styles.resultsList}>
              {searchResults.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.resultItem, p.tandem_id && styles.resultItemDisabled]}
                  onPress={() => selectPartner(p)}
                >
                  <UserAvatar avatarUrl={p.avatar_url} size={28} />
                  <Text style={styles.resultUsername}>{p.username}</Text>
                  {p.tandem_id
                    ? <Text style={styles.resultStatus}>già in tandem</Text>
                    : <Text style={styles.resultStatusFree}>disponibile ✓</Text>
                  }
                </TouchableOpacity>
              ))}
            </View>
          )}

          {selectedPartner && (
            <View style={styles.selectedBox}>
              <Text style={styles.selectedText}>✅ Partner: <Text style={{ fontWeight: '800' }}>{selectedPartner.username}</Text></Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.createBtn, (!tandemName.trim() || !selectedPartner || creating) && styles.createBtnDisabled]}
            onPress={createTandem}
            disabled={!tandemName.trim() || !selectedPartner || creating}
          >
            {creating
              ? <ActivityIndicator color="#1a1a1a" />
              : <Text style={styles.createBtnText}>Manda invito 📩</Text>
            }
          </TouchableOpacity>
        </View>
      )}
      {/* Modal membri */}
      <Modal visible={!!membersModal} transparent animationType="fade" onRequestClose={() => setMembersModal(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMembersModal(null)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{membersModal?.title}</Text>
            {(membersModal?.members ?? []).map((m) => (
              <TouchableOpacity key={m.id} style={styles.modalMember} onPress={() => { setMembersModal(null); openProfile(m.id); }}>
                <UserAvatar avatarUrl={m.avatar_url} size={32} />
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
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

function makeClaimCardStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    card: {
      backgroundColor: isDark ? '#332a0d' : '#FFFBEA', borderRadius: 16, padding: 16, marginBottom: 12,
      borderWidth: 2, borderColor: '#FFD700',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: isDark ? 0 : 0.07, shadowRadius: 6, elevation: isDark ? 0 : 3,
    },
    title: { fontSize: 12, fontWeight: '700', color: '#b8860b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
    missionRow: { fontSize: 13, color: colors.text, marginBottom: 4, lineHeight: 18 },
    claimBtn: {
      marginTop: 12, backgroundColor: '#FFD700', borderRadius: 12, padding: 14, alignItems: 'center',
      shadowColor: '#FFD700', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 4,
    },
    claimBtnText: { fontSize: 15, fontWeight: '800', color: '#7a5800' },
    claimedRow: { marginTop: 10, alignItems: 'center' },
    claimedText: { fontSize: 13, fontWeight: '700', color: '#9C27B0' },
  });
}

function makeStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 16, paddingBottom: 40 },

    sectionTitle: {
      fontSize: 13, fontWeight: '700', color: colors.textFaint,
      letterSpacing: 1, textTransform: 'uppercase',
      marginBottom: 10, marginTop: 4,
    },

    // Inviti ricevuti
    inviteCard: {
      backgroundColor: colors.card, borderRadius: 16, padding: 18, marginBottom: 12,
      borderWidth: 2, borderColor: '#FFD700',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: isDark ? 0 : 0.08, shadowRadius: 8, elevation: isDark ? 0 : 3,
    },
    inviteHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    inviteInfo: { marginLeft: 12, flex: 1 },
    inviteName: { fontSize: 18, fontWeight: '800', color: colors.text },
    inviteFrom: { fontSize: 13, color: colors.textDim, marginTop: 2 },
    inviteButtons: { flexDirection: 'row', gap: 10 },
    acceptBtn: { flex: 1, backgroundColor: '#4CAF50', borderRadius: 12, padding: 14, alignItems: 'center' },
    acceptBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
    declineBtn: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border },
    declineBtnText: { fontSize: 15, fontWeight: '600', color: colors.textFaint },

    // Invito mandato in attesa
    pendingSentCard: {
      backgroundColor: colors.card, borderRadius: 16, padding: 24, marginBottom: 16, alignItems: 'center',
      borderWidth: 2, borderColor: '#FFD700',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: isDark ? 0 : 0.08, shadowRadius: 8, elevation: isDark ? 0 : 3,
    },
    pendingSentEmoji: { fontSize: 40, marginBottom: 10 },
    pendingSentTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 6 },
    pendingSentSub: { fontSize: 14, color: colors.textDim, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
    cancelInviteBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: isDark ? '#5a2a30' : '#ffcdd2' },
    cancelInviteBtnText: { color: '#E8445A', fontWeight: '700', fontSize: 14 },

    // Card tandem attivo
    card: {
      backgroundColor: colors.card, borderRadius: 20, padding: 24, marginBottom: 16,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: isDark ? 0 : 0.08, shadowRadius: 8, elevation: isDark ? 0 : 3,
    },
    membersAvatarRow: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginBottom: 16 },
    memberAvatarItem: { alignItems: 'center', gap: 6 },
    memberAvatarName: { fontSize: 12, fontWeight: '600', color: colors.textDim },
    memberAvatarScore: { fontSize: 16, fontWeight: '800', color: '#E8445A' },
    tandemName: { fontSize: 24, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 6 },
    cardTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 6 },
    cardSub: { fontSize: 14, color: colors.textDim, marginBottom: 24, lineHeight: 20 },

    // Matchup
    matchupCard: {
      backgroundColor: colors.card, borderRadius: 16, padding: 18, marginBottom: 16,
      borderWidth: 2, borderColor: '#9C27B0',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: isDark ? 0 : 0.07, shadowRadius: 6, elevation: isDark ? 0 : 3,
    },
    matchupLabel: { fontSize: 12, color: colors.textDim, fontWeight: '600', marginBottom: 14, textAlign: 'center' },
    vsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    vsSide: { flex: 1, alignItems: 'center' },
    vsName: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 6, textAlign: 'center' },
    vsScore: { fontSize: 32, fontWeight: '800' },
    vsText: { fontSize: 14, fontWeight: '800', color: colors.textFaint, marginHorizontal: 12 },

    noMatchup: {
      backgroundColor: colors.card, borderRadius: 16, padding: 20, marginBottom: 16,
      borderWidth: 1.5, borderColor: colors.border,
    },
    noMatchupText: { fontSize: 14, color: colors.textFaint, textAlign: 'center', marginBottom: 8 },
    noMatchupSub: { fontSize: 12, color: colors.textFaint, textAlign: 'center', lineHeight: 18 },

    // Form crea tandem
    label: { fontSize: 13, fontWeight: '700', color: colors.textDim, marginBottom: 8 },
    input: {
      backgroundColor: colors.bgAlt, borderRadius: 12, padding: 14,
      fontSize: 16, color: colors.text, marginBottom: 8,
      borderWidth: 1.5, borderColor: colors.border,
    },
    inputSelected: { borderColor: '#4CAF50', backgroundColor: isDark ? '#16291a' : '#f0fff0' },
    resultsList: {
      backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
      marginBottom: 12, overflow: 'hidden',
    },
    resultItem: { padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.border },
    resultItemDisabled: { opacity: 0.5 },
    resultUsername: { fontSize: 15, fontWeight: '600', color: colors.text },
    resultStatus: { fontSize: 12, color: colors.textFaint },
    resultStatusFree: { fontSize: 12, color: '#4CAF50', fontWeight: '600' },
    selectedBox: { backgroundColor: isDark ? '#16291a' : '#f0fff0', borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#4CAF50' },
    selectedText: { fontSize: 14, color: isDark ? '#7ed896' : '#2e7d32' },
    leaveBtn: { alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: isDark ? '#5a2a30' : '#ffcdd2' },
    leaveBtnText: { color: '#E8445A', fontWeight: '700', fontSize: 14 },
    createBtn: { backgroundColor: '#FFD700', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
    createBtnDisabled: { opacity: 0.4 },
    createBtnText: { fontSize: 16, fontWeight: '800', color: '#1a1a1a' },

    tappableName: { textDecorationLine: 'underline' },

    modalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center', alignItems: 'center', padding: 24,
    },
    modalContent: {
      backgroundColor: colors.card, borderRadius: 20, padding: 24,
      width: '100%', maxWidth: 340,
    },
    modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 18 },
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
