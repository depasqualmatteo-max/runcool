import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Clipboard, Platform,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import ClassificheScreen from './classifiche';

export default function ClanScreen() {
  const [mainTab, setMainTab] = useState<'clan' | 'classifiche'>('clan');
  const { user, clan, createClan, joinClan, leaveClan, logout, refreshClan } = useAuth();
  const { state } = useApp();
  const [clanName, setClanName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);

  const clanScore = clan ? clan.members.reduce((s, m) => s + m.hearts, 0) : 0;

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
      } else {
        Clipboard.setString(clan.code);
      }
      Alert.alert('Copiato!', `Codice ${clan.code} copiato. Condividilo con i tuoi amici maialini 🐷`);
    }
  }

  if (mainTab === 'classifiche') {
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.topToggle}>
          <TouchableOpacity style={styles.toggleBtn} onPress={() => setMainTab('clan')}>
            <Text style={styles.toggleBtnText}>🏆 Clan</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toggleBtn, styles.toggleBtnActive]}>
            <Text style={[styles.toggleBtnText, styles.toggleBtnTextActive]}>📊 Classifiche</Text>
          </TouchableOpacity>
        </View>
        <ClassificheScreen />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.topToggle}>
        <TouchableOpacity style={[styles.toggleBtn, styles.toggleBtnActive]}>
          <Text style={[styles.toggleBtnText, styles.toggleBtnTextActive]}>🏆 Clan</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toggleBtn} onPress={() => setMainTab('classifiche')}>
          <Text style={styles.toggleBtnText}>📊 Classifiche</Text>
        </TouchableOpacity>
      </View>
      {/* Profile */}
      <View style={styles.profileCard}>
        <Text style={styles.profileEmoji}>🐷</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.profileName}>{user?.username}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
        </View>
        <Text style={[styles.profileScore, { color: state.hearts >= 0 ? '#E8445A' : '#ff3b30' }]}>
          {state.hearts > 0 ? `+${state.hearts}` : state.hearts}
        </Text>
      </View>

      {clan ? (
        <>
          {/* Clan info */}
          <Text style={styles.sectionTitle}>Il tuo clan</Text>
          <View style={styles.clanCard}>
            <View style={styles.clanHeaderRow}>
              <Text style={styles.clanName}>🏆 {clan.name}</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={styles.codeChip} onPress={refreshClan}>
                  <Text style={styles.codeText}>↻</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.codeChip} onPress={copyCode}>
                  <Text style={styles.codeText}>#{clan.code} 📋</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.clanScoreLabel}>Punteggio totale del clan</Text>
            <Text style={[styles.clanScore, { color: clanScore >= 0 ? '#E8445A' : '#ff3b30' }]}>
              {clanScore > 0 ? `+${clanScore}` : clanScore}
            </Text>
          </View>

          {/* Members */}
          <Text style={styles.sectionTitle}>Maialini del clan</Text>
          {clan.members
            .slice()
            .sort((a, b) => b.hearts - a.hearts)
            .map((member, i) => (
              <View key={member.id} style={styles.memberCard}>
                <Text style={styles.memberRank}>#{i + 1}</Text>
                <Text style={styles.memberEmoji}>{member.id === user?.id ? '🐷' : '👤'}</Text>
                <Text style={styles.memberName}>
                  {member.username}{member.id === user?.id ? ' (tu)' : ''}
                </Text>
                <Text style={[styles.memberScore, { color: member.hearts >= 0 ? '#E8445A' : '#ff3b30' }]}>
                  {member.hearts > 0 ? `+${member.hearts}` : member.hearts}
                </Text>
              </View>
            ))}

          <View style={styles.hintCard}>
            <Text style={styles.hintText}>
              💡 Condividi il codice <Text style={{ fontWeight: '800' }}>#{clan.code}</Text> con i tuoi amici perché possano entrare nel clan!
            </Text>
          </View>

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f7' },
  content: { padding: 20, paddingBottom: 60 },

  topToggle: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: '#e8e8e8',
    borderRadius: 12,
    padding: 4,
  },
  toggleBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 2, elevation: 2,
  },
  toggleBtnText: { fontSize: 14, fontWeight: '600', color: '#888' },
  toggleBtnTextActive: { color: '#1a1a1a' },

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
    backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 20,
    borderWidth: 2, borderColor: '#FFD700',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  clanHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  clanName: { fontSize: 18, fontWeight: '800', color: '#1a1a1a', flex: 1 },
  codeChip: {
    backgroundColor: '#f0f0f0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  codeText: { fontSize: 12, fontWeight: '700', color: '#555' },
  clanScoreLabel: { fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  clanScore: { fontSize: 44, fontWeight: '800' },

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
});
