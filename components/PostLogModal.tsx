import React, { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, Image, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface Props {
  visible: boolean;
  logId: string | null;
  onDone: () => void;
}

export default function PostLogModal({ visible, logId, onDone }: Props) {
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function pickPhoto() {
    try {
      const ImagePicker = require('expo-image-picker');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permesso negato', 'Abilita l\'accesso alla galleria nelle impostazioni.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (e: any) {
      Alert.alert('Errore', e.message);
    }
  }

  async function save() {
    if (!logId || !user) return;
    setSaving(true);
    try {
      let photo_url: string | null = null;

      if (photoUri) {
        const FileSystem = require('expo-file-system/legacy');
        const ext = photoUri.split('.').pop()?.toLowerCase() ?? 'jpg';
        const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
        const path = `${user.id}/${logId}.${ext}`;

        const base64 = await FileSystem.readAsStringAsync(photoUri, {
          encoding: 'base64',
        });

        // Converti base64 → Uint8Array
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const { error: uploadError } = await supabase.storage
          .from('log-photos')
          .upload(path, bytes, { contentType: mime, upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('log-photos').getPublicUrl(path);
        photo_url = urlData.publicUrl;
      }

      const { error } = await supabase
        .from('logs')
        .update({
          description: description.trim() || null,
          photo_url,
        })
        .eq('id', logId);

      if (error) throw error;
      reset();
      onDone();
    } catch (e: any) {
      Alert.alert('Errore salvataggio', e.message);
    } finally {
      setSaving(false);
    }
  }

  function skip() {
    reset();
    onDone();
  }

  function reset() {
    setDescription('');
    setPhotoUri(null);
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.box}>
          <Text style={styles.title}>Aggiungi al post 📸</Text>
          <Text style={styles.sub}>Opzionale — apparirà nella feed sociale</Text>

          <TextInput
            style={styles.input}
            placeholder="Descrizione (es. Prima gara stagione!)"
            placeholderTextColor="#bbb"
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={200}
          />

          <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photoPreview} />
            ) : (
              <Text style={styles.photoBtnText}>📷  Scegli foto</Text>
            )}
          </TouchableOpacity>

          {photoUri && (
            <TouchableOpacity onPress={() => setPhotoUri(null)}>
              <Text style={styles.removePhoto}>Rimuovi foto</Text>
            </TouchableOpacity>
          )}

          <View style={styles.btns}>
            <TouchableOpacity style={styles.skipBtn} onPress={skip} disabled={saving}>
              <Text style={styles.skipText}>Salta</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveText}>Pubblica</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  box: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, gap: 14,
  },
  title: { fontSize: 20, fontWeight: '800', color: '#1a1a1a', textAlign: 'center' },
  sub: { fontSize: 13, color: '#aaa', textAlign: 'center', marginTop: -8 },

  input: {
    borderWidth: 2, borderColor: '#eee', borderRadius: 14,
    padding: 14, fontSize: 15, color: '#1a1a1a', minHeight: 80,
    textAlignVertical: 'top',
  },

  photoBtn: {
    borderWidth: 2, borderColor: '#eee', borderRadius: 14, borderStyle: 'dashed',
    height: 120, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  photoBtnText: { fontSize: 16, color: '#aaa', fontWeight: '600' },
  photoPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  removePhoto: { textAlign: 'center', color: '#E8445A', fontWeight: '700', fontSize: 13 },

  btns: { flexDirection: 'row', gap: 12, marginTop: 4 },
  skipBtn: {
    flex: 1, padding: 16, borderRadius: 14, backgroundColor: '#f5f5f5', alignItems: 'center',
  },
  skipText: { fontWeight: '700', color: '#888', fontSize: 15 },
  saveBtn: {
    flex: 2, padding: 16, borderRadius: 14, backgroundColor: '#2196F3', alignItems: 'center',
  },
  saveText: { fontWeight: '800', color: '#fff', fontSize: 15 },
});
