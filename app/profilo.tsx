import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, ActivityIndicator, Alert, Platform, ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';

export default function ProfiloScreen() {
  const { user, logout, updateAvatar } = useAuth();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);

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
      const uri = result.assets[0].uri;

      const response = await fetch(uri);
      const blob = await response.blob();

      const path = `${user!.id}.jpg`;

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
            <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
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

  logoutBtn: {
    backgroundColor: '#ff3b30', borderRadius: 14, padding: 16,
    alignItems: 'center', marginTop: 8,
  },
  logoutText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
