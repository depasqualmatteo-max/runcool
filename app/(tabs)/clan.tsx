import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Platform, ActivityIndicator, RefreshControl, Modal, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { UserAvatar } from '@/components/UserAvatar';
import { getClanMonthMissions, calcClanProgress, MissionDef, MissionProgress } from '@/lib/missions';

function ClanMissionCard({ def, progress }: { def: MissionDef; progress: MissionProgress }) {
  const pct = Math.min(progress.pct, 1);
  const done = progress.completed;
  return (
    <View style={[clanMissionStyles.card, done && clanMissionStyles.cardDone]}>
      <View style={clanMissionStyles.header}>
        <Text style={clanMissionStyles.label} numberOfLines={2}>{def.emoji} {def.label}</Text>
        <View style={clanMissionStyles.tokenBadge}>
          <Text style={clanMissionStyles.tokenText}>🎟 {def.tokens}</Text>
        </View>
      </View>
      <View style={clanMissionStyles.barBg}>
        <View style={[clanMissionStyles.barFill, { width: `${Math.round(pct * 100)}%` as any, backgroundColor: done ? '#4CAF50' : '#FFD700' }]} />
      </View>
      <View style={clanMissionStyles.footer}>
        <Text style={clanMissionStyles.progressText}>{progress.displayValue}</Text>
        {done && <Text style={clanMissionStyles.doneText}>✅ Completata!</Text>}
      </View>
    </View>
  );
}

const clanMissionStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1.5, borderColor: '#eee',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  cardDone: { borderColor: '#4CAF50', backgroundColor: '#f0fff4' },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 8 },
  label: { flex: 1, fontSize: 13, fontWeight: '700', color: '#1a1a1a', lineHeight: 18 },
  tokenBadge: { backgroundColor: '#FFF8E1', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#FFD700', flexShrink: 0 },
  tokenText: { fontSize: 12, fontWeight: '800', color: '#b8860b' },
  barBg: { height: 8, backgroundColor: '#f0f0f0', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  barFill: { height: 8, borderRadius: 4 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressText: { fontSize: 11, color: '#888', flex: 1 },
  doneText: { fontSize: 12, fontWeight: '700', color: '#4CAF50' },
});

export default function ClanScreen() {
  const { user, clan, createClan, joinClan, leaveClan, logout, refreshClan } = useAuth();
  const { state } = useApp();
  const [clanName, setClanName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Clan challenge state
  const [activeChallenge, setActiveChallenge] = useState<null | {
    myId: string; oppId: string;
    myName: string; oppName: string; myScore: number; oppScore: number; endDate: string;
  }>(null);
  const [challenging, setChallenging] = useState(false);
  const [challengeLoading, setChallengeLoading] = useState(false);
  const isOwner = clan && user && clan.ownerId === user.id;

  const clanScore = clan ? clan.members.reduce((s, m) => s + m.hearts, 0) : 0;
  const router = useRouter();
  const [clanMissions, setClanMissions] = useState<{ def: MissionDef; progress: MissionProgress }[]>([]);
  const [missionsLoading, setMissionsLoading] = useState(false);

  const [clanMembersModal, setClanMembersModal] = useState<{ title: string; members: { id: string; username: string; hearts: number; avatar_url?: string | null }[] } | null>(null);

  async function showClanMembers(clanId: string, clanName: string) {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, hearts, avatar_url')
      .eq('clan_id', clanId)
      .order('hearts', { ascending: false });
    setClanMembersModal({ title: clanName, members: data ?? [] });
  }

  function openProfile(userId: string) {
    if (userId === user?.id) router.push('/profilo' as any);
    else router.push(`/profilo?userId=${userId}` as any);
  }

  const loadChallenge = useCallback(async () => {
    if (!user || !clan) { setActiveChallenge(null); return; }
    setChallengeLoading(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data: ch } = await supabase
        .from('clan_challenges')
        .select('*, challenger:challenger_clan_id(name), challenged:challenged_clan_id(name)')
        .or(`challenger_clan_id.eq.${clan.id},challenged_clan_id.eq.${clan.id}`)
        .lte('start_date', today)
        .gte('end_date', today)
        .maybeSingle();

      if (!ch) { setActiveChallenge(null); return; }

      const myId = clan.id;
      const oppId = ch.challenger_clan_id === myId ? ch.challenged_clan_id : ch.challenger_clan_id;
      const myName = ch.challenger_clan_id === myId ? ch.challenger?.name : ch.challenged?.name;
      const oppName = ch.challenger_clan_id === myId ? ch.challenged?.name : ch.challenger?.name;

      const [{ data: myMembers }, { data: oppMembers }] = await Promise.all([
        supabase.from('profiles').select('id, hearts').eq('clan_id', myId),
        supabase.from('profiles').select('id, hearts').eq('clan_id', oppId),
      ]);

      const { data: myLogs } = await supabase
        .from('logs').select('hearts_delta')
        .in('user_id', (myMembers ?? []).map((m: any) => m.id))
        .gte('created_at', ch.start_date)
        .lte('created_at', ch.end_date + 'T23:59:59');
      const { data: oppLogs } = await supabase
        .from('logs').select('hearts_delta')
        .in('user_id', (oppMembers ?? []).map((m: any) => m.id))
        .gte('created_at', ch.start_date)
        .lte('created_at', ch.end_date + 'T23:59:59');

      const myScore = (myLogs ?? []).reduce((s: number, l: any) => s + (l.hearts_delta ?? 0), 0);
      const oppScore = (oppLogs ?? []).reduce((s: number, l: any) => s + (l.hearts_delta ?? 0), 0);

      setActiveChallenge({ myId: myId, oppId: oppId, myName, oppName, myScore, oppScore, endDate: ch.end_date });
    } catch (e) {
      setActiveChallenge(null);
    } finally {
      setChallengeLoading(false);
    }
  }, [user, clan]);

  useEffect(() => { loadChallenge(); }, [loadChallenge]);

  useEffect(() => {
    if (clan) loadClanMissions(clan.members.map(m => m.id));
  }, [clan?.id]);

  async function loadClanMissions(memberIds: string[]) {
    setMissionsLoading(true);
    try {
      const now = new Date();
      const monthStart = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
      const monthEnd = format(new Date(now.getFullYear(), now.getMonth() + 1, 0), 'yyyy-MM-dd');
      const defs = getClanMonthMissions(monthStart);
      const progresses = await Promise.all(defs.map(d => calcClanProgress(d, memberIds, monthStart, monthEnd)));
      setClanMissions(defs.map((d, i) => ({ def: d, progress: progresses[i] })));
    } catch {}
    finally { setMissionsLoading(false); }
  }

  async function handleCreate() {
    if (!clanName.trim()) { Alert.alert('Inserisci un nome per il clan'); return; }
    setLoading(true);
    try {
      await createClan(clanName.trim());
      setClanName('');
    } catch (e: any) {
      Alert.alert('Errore', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!joinCode.trim()) { Alert.alert('Inserisci il codice del clan'); return; }
    setLoading(true);
    try {
      await joinClan(joinCode.trim());
      setJoinCode('');
    } catch (e: any) {
      Alert.alert('Errore', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLeave() {
    Alert.alert('Lascia il clan', 'Sei sicuro di voler lasciare il clan?', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Lascia', style: 'destructive', onPress: leaveClan },
    ]);
  }

  function copyCode() {
    if (clan) {
      if (Platform.OS === 'web') {
        navigator.clipboard?.writeText(clan.code);
      }
      // Su mobile il codice viene mostrato nell'alert — l'utente può copiarlo da lì
      Alert.alert('Codice clan', `${clan.code}\n\nCondividilo con i tuoi amici maialini 🐷`);
    }
  }

  // Ricerca clan avversario per nome
  const [challengeSearch, setChallengeSearch] = useState('');
  const [challengeResults, setChallengeResults] = useState<{ id: string; name: string }[]>([]);
  const [selectedChallengeClan, setSelectedChallengeClan] = useState<{ id: string; name: string } | null>(null);
  const challengeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  function onChallengeSearchChange(text: string) {
    setChallengeSearch(text);
    setSelectedChallengeClan(null);
    if (challengeTimer.current) clearTimeout(challengeTimer.current);
    if (text.length < 2) { setChallengeResults([]); return; }
    challengeTimer.current = setTimeout(async () => {
      const { data } = await supabase
        .from('clans')
        .select('id, name')
        .ilike('name', `%${text}%`)
        .neq('id', clan?.id ?? '')
        .limit(6);
      setChallengeResults(data ?? []);
    }, 400);
  }

  async function sendChallenge() {
    if (!selectedChallengeClan || !clan) return;
    setChallenging(true);
    try {
      const targetClan = selectedChallengeClan;

      const today = new Date();
      const start = format(today, 'yyyy-MM-dd');
      const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const end = format(endDate, 'yyyy-MM-dd');

      const { error } = await supabase.from('clan_challenges').insert({
        challenger_clan_id: clan.id,
        challenged_clan_id: targetClan.id,
        start_date: start,
        end_date: end,
        status: 'active',
      });
      if (error) throw error;

      setChallengeSearch('');
      setChallengeResults([]);
      setSelectedChallengeClan(null);
      await loadChallenge();
      Alert.alert('⚔️ Sfida lanciata!', `Avete sfidato ${targetClan.name}! La sfida dura fino al ${end}.`);
    } catch (e: any) {
      Alert.alert('Errore', e.message);
    } finally {
      setChallenging(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([refreshClan(), loadChallenge()]);
    setRefreshing(false);
  }

  async function pickClanImage() {
    if (!isOwner) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permesso negato', 'Serve accesso alla galleria'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [16, 9], quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const ext = asset.uri.split('.').pop() ?? 'jpg';
    const path = `clan-avatars/${clan!.id}.${ext}`;
    const response = await fetch(asset.uri);
    const blob = await response.blob();
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, blob, { upsert: true, contentType: `image/${ext}` });
    if (upErr) { Alert.alert('Errore upload', upErr.message); return; }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
    await supabase.from('clans').update({ avatar_url: publicUrl }).eq('id', clan!.id);
    await refreshClan();
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFD700" />}
    >
      {clan ? (
        <>
          {/* Clan info */}
          <View style={styles.clanCard}>
            {/* Sfondo immagine */}
            <TouchableOpacity onPress={pickClanImage} activeOpacity={isOwner ? 0.85 : 1} style={styles.clanBannerWrapper}>
              {clan.avatarUrl ? (
                <Image source={{ uri: clan.avatarUrl }} style={styles.clanBanner} />
              ) : (
                <View style={styles.clanBannerPlaceholder}>
                  <Text style={styles.clanBannerPlaceholderText}>{isOwner ? '📷  Aggiungi foto' : '🐷'}</Text>
                </View>
              )}
              {/* Overlay scuro per leggere il testo */}
              <View style={styles.clanBannerOverlay} />
              {/* Nome sopra l'immagine */}
              <Text style={styles.clanNameOnBanner}>{clan.name}</Text>
              <Text style={styles.clanMembersOnBanner}>{clan.members.length} maialini</Text>
              {isOwner && (
                <View style={styles.clanBannerEditBadge}>
                  <Text style={{ fontSize: 11, color: '#fff' }}>✎</Text>
                </View>
              )}
              {/* Codice in basso a destra sull'immagine */}
              <TouchableOpacity style={styles.codeChip} onPress={copyCode}>
                <Text style={styles.codeText}>#{clan.code} 📋</Text>
              </TouchableOpacity>
            </TouchableOpacity>

            {/* Punteggio sotto */}
            <View style={styles.clanScoreSection}>
              <Text style={styles.clanScoreLabel}>Punteggio totale</Text>
              <Text style={[styles.clanScore, { color: clanScore >= 0 ? '#E8445A' : '#ff3b30' }]}>
                {clanScore > 0 ? `+${Math.round(clanScore)}` : Math.round(clanScore)} ❤️
              </Text>
            </View>

          </View>

          {/* Missioni mensili */}
          <Text style={styles.sectionTitle}>🎯 Missioni del mese</Text>
          {missionsLoading ? (
            <ActivityIndicator color="#FFD700" style={{ marginBottom: 12 }} />
          ) : (
            clanMissions.map(({ def, progress }, i) => (
              <ClanMissionCard key={i} def={def} progress={progress} />
            ))
          )}

          {/* Active challenge */}
          <Text style={styles.sectionTitle}>⚔️ Sfida in corso</Text>
          {challengeLoading ? (
            <ActivityIndicator color="#FFD700" style={{ marginBottom: 16 }} />
          ) : activeChallenge ? (
            <View style={styles.challengeCard}>
              <Text style={styles.challengeLabel}>Fino al {activeChallenge.endDate}</Text>
              <View style={styles.vsRow}>
                <TouchableOpacity style={styles.vsSide} onPress={() => showClanMembers(activeChallenge.myId, activeChallenge.myName)}>
                  <Text style={[styles.vsName, styles.tappableName]}>{activeChallenge.myName}</Text>
                  <Text style={[styles.vsScore, {
                    color: activeChallenge.myScore >= activeChallenge.oppScore ? '#2196F3' : '#E8445A',
                  }]}>
                    {activeChallenge.myScore >= 0 ? '+' : ''}{Math.round(activeChallenge.myScore)}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.vsText}>VS</Text>
                <TouchableOpacity style={styles.vsSide} onPress={() => showClanMembers(activeChallenge.oppId, activeChallenge.oppName)}>
                  <Text style={[styles.vsName, styles.tappableName]}>{activeChallenge.oppName}</Text>
                  <Text style={[styles.vsScore, {
                    color: activeChallenge.oppScore >= activeChallenge.myScore ? '#2196F3' : '#E8445A',
                  }]}>
                    {activeChallenge.oppScore >= 0 ? '+' : ''}{Math.round(activeChallenge.oppScore)}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.noChallenge}>
              <Text style={styles.noChallengeText}>Nessuna sfida attiva questo mese</Text>
              {isOwner ? (
                <>
                  <Text style={styles.challengeHint}>Come capo clan, puoi sfidare un altro clan!</Text>
                  <View style={styles.challengeForm}>
                    <TextInput
                      style={[styles.input, selectedChallengeClan && { borderColor: '#4CAF50', backgroundColor: '#f0fff0' }]}
                      placeholder="Cerca clan per nome..."
                      placeholderTextColor="#bbb"
                      value={challengeSearch}
                      onChangeText={onChallengeSearchChange}
                      autoCapitalize="none"
                    />
                    {challengeResults.length > 0 && !selectedChallengeClan && (
                      <View style={styles.challengeResultsList}>
                        {challengeResults.map((c) => (
                          <TouchableOpacity
                            key={c.id}
                            style={styles.challengeResultItem}
                            onPress={() => {
                              setSelectedChallengeClan(c);
                              setChallengeSearch(c.name);
                              setChallengeResults([]);
                            }}
                          >
                            <Text style={{ fontSize: 14 }}>🏆</Text>
                            <Text style={styles.challengeResultName}>{c.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    {selectedChallengeClan && (
                      <View style={styles.selectedChallengeBox}>
                        <Text style={styles.selectedChallengeText}>🏆 Sfidi: <Text style={{ fontWeight: '800' }}>{selectedChallengeClan.name}</Text></Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={[styles.challengeBtn, (!selectedChallengeClan || challenging) && styles.buttonDisabled]}
                      onPress={sendChallenge}
                      disabled={!selectedChallengeClan || challenging}
                    >
                      {challenging
                        ? <ActivityIndicator color="#1a1a1a" />
                        : <Text style={styles.challengeBtnText}>⚔️ Lancia sfida</Text>
                      }
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <Text style={styles.challengeHint}>Solo il capo clan può lanciare sfide</Text>
              )}
            </View>
          )}

          {/* Members */}
          <Text style={styles.sectionTitle}>Maialini del clan</Text>
          {clan.members
            .slice()
            .sort((a, b) => b.hearts - a.hearts)
            .map((member, i) => (
              <View key={member.id} style={styles.memberCard}>
                <Text style={styles.memberRank}>#{i + 1}</Text>
                <UserAvatar avatarUrl={member.avatarUrl} isMe={member.id === user?.id} size={36} />
                <Text style={styles.memberName}>
                  {member.username}{member.id === user?.id ? ' (tu)' : ''}
                </Text>
                <Text style={[styles.memberScore, { color: member.hearts >= 0 ? '#E8445A' : '#ff3b30' }]}>
                  {member.hearts > 0 ? `+${Math.round(member.hearts)}` : Math.round(member.hearts)}
                </Text>
              </View>
            ))}

          <TouchableOpacity style={styles.leaveButton} onPress={handleLeave}>
            <Text style={styles.leaveButtonText}>Lascia il clan</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          {/* Create clan */}
          <Text style={styles.sectionTitle}>Crea un clan</Text>
          <View style={styles.formCard}>
            <Text style={styles.formLabel}>Nome del clan</Text>
            <TextInput
              style={styles.input}
              placeholder="I Maialini Veloci 🐷"
              placeholderTextColor="#bbb"
              value={clanName}
              onChangeText={setClanName}
            />
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleCreate}
              disabled={loading}
            >
              <Text style={styles.primaryButtonText}>Crea Clan 🏆</Text>
            </TouchableOpacity>
          </View>

          {/* Join clan */}
          <Text style={styles.sectionTitle}>Entra in un clan</Text>
          <View style={styles.formCard}>
            <Text style={styles.formLabel}>Codice del clan</Text>
            <TextInput
              style={styles.input}
              placeholder="ABC123"
              placeholderTextColor="#bbb"
              value={joinCode}
              onChangeText={setJoinCode}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={[styles.secondaryButton, loading && styles.buttonDisabled]}
              onPress={handleJoin}
              disabled={loading}
            >
              <Text style={styles.secondaryButtonText}>Entra nel Clan 🏃</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Esci dall'account</Text>
      </TouchableOpacity>

      {/* Modal membri clan */}
      <Modal visible={!!clanMembersModal} transparent animationType="fade" onRequestClose={() => setClanMembersModal(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setClanMembersModal(null)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{clanMembersModal?.title}</Text>
            {(clanMembersModal?.members ?? []).map((m) => (
              <TouchableOpacity key={m.id} style={styles.modalMember} onPress={() => { setClanMembersModal(null); openProfile(m.id); }}>
                <UserAvatar avatarUrl={m.avatar_url} size={32} />
                <Text style={styles.modalMemberName}>{m.username}</Text>
                <Text style={[styles.modalMemberScore, { color: m.hearts >= 0 ? '#E8445A' : '#ff3b30' }]}>
                  {m.hearts > 0 ? `+${Math.round(m.hearts)}` : Math.round(m.hearts)}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalClose} onPress={() => setClanMembersModal(null)}>
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
  content: { padding: 20, paddingBottom: 60 },

  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: '#aaa',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10,
  },

  profileCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18,
    flexDirection: 'row', alignItems: 'center', marginBottom: 28, gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  profileEmoji: { fontSize: 36 },
  profileName: { fontSize: 17, fontWeight: '800', color: '#1a1a1a' },
  profileEmail: { fontSize: 13, color: '#aaa', marginTop: 2 },
  profileScore: { fontSize: 28, fontWeight: '800' },

  clanCard: {
    backgroundColor: '#fff', borderRadius: 20, marginBottom: 20, overflow: 'hidden',
    borderWidth: 2, borderColor: '#FFD700',
    shadowColor: '#FFD700', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 10, elevation: 4,
  },
  clanBannerWrapper: { width: '100%', height: 150, position: 'relative', justifyContent: 'flex-end' },
  clanBanner: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  clanBannerPlaceholder: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#FFF8E1', alignItems: 'center', justifyContent: 'center',
  },
  clanBannerPlaceholderText: { fontSize: 16, color: '#b8860b', fontWeight: '700' },
  clanBannerOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  clanNameOnBanner: {
    color: '#fff', fontSize: 24, fontWeight: '900',
    paddingHorizontal: 16, paddingBottom: 4, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4,
  },
  clanMembersOnBanner: {
    color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600',
    paddingHorizontal: 16, paddingBottom: 12,
  },
  clanBannerEditBadge: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4,
  },
  clanScoreSection: { alignItems: 'center', paddingVertical: 16, paddingBottom: 8 },
  clanName: { fontSize: 24, fontWeight: '900', color: '#1a1a1a', textAlign: 'center' },
  codeChip: {
    position: 'absolute', bottom: 10, right: 10,
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
  },
  codeText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  clanDivider: { height: 1, backgroundColor: '#f0f0f0', width: '100%', marginVertical: 14 },
  clanScoreLabel: { fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  clanScore: { fontSize: 48, fontWeight: '900', marginBottom: 4 },
  clanMembersCount: { fontSize: 12, color: '#bbb', fontWeight: '600' },

  challengeCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 20,
    borderWidth: 2, borderColor: '#FFD700',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  challengeLabel: { fontSize: 13, color: '#888', fontWeight: '600', marginBottom: 14 },
  vsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  vsSide: { flex: 1, alignItems: 'center' },
  vsName: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', marginBottom: 6, textAlign: 'center' },
  vsScore: { fontSize: 32, fontWeight: '800' },
  vsText: { fontSize: 14, fontWeight: '800', color: '#ccc', marginHorizontal: 12 },

  noChallenge: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 20,
    borderWidth: 1.5, borderColor: '#eee',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  noChallengeText: { fontSize: 14, color: '#aaa', textAlign: 'center', marginBottom: 8 },
  challengeHint: { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 12 },
  challengeForm: { gap: 10 },
  challengeResultsList: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eee',
    overflow: 'hidden', marginBottom: 4,
  },
  challengeResultItem: {
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  challengeResultName: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  selectedChallengeBox: {
    backgroundColor: '#f0fff0', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#4CAF50',
  },
  selectedChallengeText: { fontSize: 14, color: '#2e7d32' },
  challengeBtn: {
    backgroundColor: '#E8445A', borderRadius: 12, padding: 14, alignItems: 'center',
  },
  challengeBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  memberCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
    gap: 10,
  },
  memberRank: { fontSize: 13, fontWeight: '800', color: '#ccc', width: 24 },
  memberEmoji: { fontSize: 24 },
  memberName: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  memberScore: { fontSize: 18, fontWeight: '800' },

  hintCard: {
    backgroundColor: '#FFF8E1', borderRadius: 12, padding: 14,
    marginBottom: 16, marginTop: 4, borderWidth: 1, borderColor: '#FFD700',
  },
  hintText: { fontSize: 13, color: '#666', lineHeight: 20 },

  leaveButton: {
    borderRadius: 14, padding: 16, alignItems: 'center',
    borderWidth: 2, borderColor: '#ffcdd2', marginBottom: 16,
  },
  leaveButtonText: { color: '#E8445A', fontSize: 15, fontWeight: '700' },

  formCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  formLabel: { fontSize: 13, fontWeight: '700', color: '#555', marginBottom: 8 },
  input: {
    backgroundColor: '#f7f7f7', borderRadius: 12, padding: 14,
    fontSize: 16, color: '#1a1a1a', marginBottom: 14,
    borderWidth: 1.5, borderColor: '#eee',
  },
  primaryButton: {
    backgroundColor: '#FFD700', borderRadius: 12, padding: 16, alignItems: 'center',
    shadowColor: '#FFD700', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  primaryButtonText: { color: '#1a1a1a', fontSize: 16, fontWeight: '800' },
  secondaryButton: {
    backgroundColor: '#2196F3', borderRadius: 12, padding: 16, alignItems: 'center',
  },
  secondaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  buttonDisabled: { opacity: 0.5 },

  logoutButton: { alignItems: 'center', padding: 16, marginTop: 8 },
  logoutText: { color: '#bbb', fontSize: 14, fontWeight: '600' },

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
