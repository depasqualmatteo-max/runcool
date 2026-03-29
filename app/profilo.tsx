import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, ActivityIndicator, Alert, Platform, ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { useRouter } from 'expo-router';

// ─── Badge system ────────────────────────────────────────────────────────────

interface Badge {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  earned: boolean;
}

function computeBadges(logs: any[], hearts: number): Badge[] {
  const drinks = logs.filter(l => l.type === 'drink');
  const workouts = logs.filter(l => l.type === 'workout');
  const totalKm = workouts.reduce((s, l) => s + (l.km ?? 0), 0);
  const totalElev = workouts.reduce((s, l) => s + (l.elevationMeters ?? 0), 0);

  // drink in un singolo giorno
  const drinksByDay: Record<string, number> = {};
  drinks.forEach(d => {
    const day = d.timestamp.slice(0, 10);
    drinksByDay[day] = (drinksByDay[day] ?? 0) + 1;
  });
  const maxDrinksInDay = Math.max(0, ...Object.values(drinksByDay));

  // sport in una settimana
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const workoutsThisWeek = workouts.filter(w => new Date(w.timestamp) >= weekAgo).length;

  return [
    {
      id: 'first_drink',
      emoji: '🍺',
      name: 'Prima Birra',
      desc: 'Hai loggato il tuo primo drink',
      earned: drinks.length >= 1,
    },
    {
      id: 'first_workout',
      emoji: '👟',
      name: 'Primo Passo',
      desc: 'Hai loggato il tuo primo allenamento',
      earned: workouts.length >= 1,
    },
    {
      id: 'maialino_doc',
      emoji: '🐷',
      name: 'Maialino DOC',
      desc: '20 drink loggati in totale',
      earned: drinks.length >= 20,
    },
    {
      id: 'atleta',
      emoji: '💪',
      name: 'Atleta',
      desc: '20 sport loggati in totale',
      earned: workouts.length >= 20,
    },
    {
      id: 'party_animal',
      emoji: '🍾',
      name: 'Party Animal',
      desc: '3 drink in un solo giorno',
      earned: maxDrinksInDay >= 3,
    },
    {
      id: 'in_forma',
      emoji: '🔥',
      name: 'In Forma',
      desc: '5 sport in una settimana',
      earned: workoutsThisWeek >= 5,
    },
    {
      id: 'virtuoso',
      emoji: '🌟',
      name: 'Virtuoso',
      desc: 'Score superiore a +15',
      earned: hearts >= 15,
    },
    {
      id: 'debiti',
      emoji: '💸',
      name: 'Troppo Bere',
      desc: 'Score sceso sotto -5',
      earned: hearts <= -5,
    },
    {
      id: 'maratoneta',
      emoji: '🏅',
      name: 'Maratoneta',
      desc: '42 km totali corsi',
      earned: totalKm >= 42,
    },
    {
      id: 'scalatore',
      emoji: '🏔️',
      name: 'Scalatore',
      desc: '500m di dislivello totali',
      earned: totalElev >= 500,
    },
  ];
}

export default function ProfiloScreen() {
  const { user, logout, updateAvatar } = useAuth();
  const { state } = useApp();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);

  const badges = computeBadges(state.logs, state.hearts);
  const earnedBadges = badges.filter(b => b.earned);
  const lockedBadges = badges.filter(b => !b.earned);

  async function pickAndUpload() {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permesso negato', "Devi permettere l'accesso alla galleria per cambiare la foto.");
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (result.canceled || !result.assets[0]) return;

      setUploading(true);
      const asset = result.assets[0];
      const uri = asset.uri;
      const path = `avatars/${user!.id}.jpg`;

      // Leggi il file e caricalo direttamente come blob
      const response = await fetch(uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(path);

      const avatarUrl = `${publicUrl}?t=${Date.now()}`;

      await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user!.id);

      await updateAvatar(avatarUrl);
    } catch (e: any) {
      Alert.alert('Errore', e.message ?? 'Impossibile caricare la foto');
    } finally {
      setUploading(false);
    }
  }

  async function handleLogout() {
    await logout();
    router.replace('/(auth)/login' as any);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={pickAndUpload} disabled={uploading} style={styles.avatarWrap}>
          {user?.avatarUrl ? (
            <Image key={user.avatarUrl} source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarEmoji}>🐷</Text>
            </View>
          )}
          {uploading && (
            <View style={styles.avatarOverlay}>
              <ActivityIndicator color="#fff" />
            </View>
          )}
          <View style={styles.editBadge}>
            <Text style={styles.editBadgeText}>✏️</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.username}>{user?.username}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <Text style={styles.hint}>Tocca la foto per cambiarla</Text>
      </View>

      {/* Info */}
      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Username</Text>
          <Text style={styles.infoValue}>{user?.username}</Text>
        </View>
        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{user?.email}</Text>
        </View>
      </View>

      {/* Badge */}
      <Text style={styles.sectionTitle}>
        🏅 Badge — {earnedBadges.length}/{badges.length} sbloccati
      </Text>

      {earnedBadges.length > 0 && (
        <View style={styles.badgeGrid}>
          {earnedBadges.map(b => (
            <View key={b.id} style={styles.badgeCard}>
              <Text style={styles.badgeEmoji}>{b.emoji}</Text>
              <Text style={styles.badgeName}>{b.name}</Text>
              <Text style={styles.badgeDesc}>{b.desc}</Text>
            </View>
          ))}
        </View>
      )}

      {lockedBadges.length > 0 && (
        <View style={styles.badgeGrid}>
          {lockedBadges.map(b => (
            <View key={b.id} style={[styles.badgeCard, styles.badgeLocked]}>
              <Text style={[styles.badgeEmoji, styles.badgeEmojiLocked]}>🔒</Text>
              <Text style={[styles.badgeName, styles.badgeNameLocked]}>{b.name}</Text>
              <Text style={styles.badgeDesc}>{b.desc}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Admin panel — solo per Matteo */}
      {user?.email === 'de.pasqual.matteo@gmail.com' && (
        <TouchableOpacity
          style={styles.adminBtn}
          onPress={() => router.push('/admin' as any)}
        >
          <Text style={styles.adminText}>⚙️ Admin</Text>
        </TouchableOpacity>
      )}

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>🚪 Esci dall'account</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f7' },
  content: { padding: 24, paddingBottom: 48 },

  avatarSection: { alignItems: 'center', marginBottom: 32 },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatarImg: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: '#FFD700' },
  avatarPlaceholder: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: '#FFD700', alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#FFD700',
  },
  avatarEmoji: { fontSize: 52 },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 55,
    alignItems: 'center', justifyContent: 'center',
  },
  editBadge: {
    position: 'absolute', bottom: 2, right: 2,
    backgroundColor: '#fff', borderRadius: 14, width: 28, height: 28,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2, shadowRadius: 3, elevation: 3,
  },
  editBadgeText: { fontSize: 14 },
  username: { fontSize: 22, fontWeight: '800', color: '#1a1a1a', marginTop: 4 },
  email: { fontSize: 13, color: '#aaa', marginTop: 3 },
  hint: { fontSize: 11, color: '#ccc', marginTop: 6 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, marginBottom: 20, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  infoLabel: { fontSize: 14, color: '#aaa', fontWeight: '600' },
  infoValue: { fontSize: 14, color: '#1a1a1a', fontWeight: '600', maxWidth: '65%', textAlign: 'right' },

  sectionTitle: {
    fontSize: 14, fontWeight: '700', color: '#1a1a1a',
    marginBottom: 12, marginTop: 8,
  },

  badgeGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12,
  },
  badgeCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    alignItems: 'center', width: '47%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    borderWidth: 2, borderColor: '#FFD700',
  },
  badgeLocked: {
    borderColor: '#eee', backgroundColor: '#fafafa',
  },
  badgeEmoji: { fontSize: 32, marginBottom: 6 },
  badgeEmojiLocked: { opacity: 0.4 },
  badgeName: { fontSize: 13, fontWeight: '800', color: '#1a1a1a', textAlign: 'center', marginBottom: 4 },
  badgeNameLocked: { color: '#ccc' },
  badgeDesc: { fontSize: 11, color: '#aaa', textAlign: 'center', lineHeight: 15 },

  adminBtn: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  adminText: { color: '#FFD700', fontWeight: '700', fontSize: 16 },
  logoutBtn: {
    backgroundColor: '#ff3b30', borderRadius: 14, padding: 16,
    alignItems: 'center', marginTop: 8,
  },
  logoutText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
