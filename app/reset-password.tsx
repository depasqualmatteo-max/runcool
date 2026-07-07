import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeColors } from '@/constants/Colors';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function handleUrl(url: string | null) {
      if (!url) { setError('Link non valido. Riprova dalla schermata di login.'); return; }
      const hashPart = url.split('#')[1] ?? '';
      const params = Object.fromEntries(new URLSearchParams(hashPart));
      if (params.access_token && params.refresh_token) {
        const { error: e } = await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token,
        });
        if (e) { setError('Link scaduto o non valido. Richiedine uno nuovo.'); }
        else { setReady(true); }
      } else {
        setError('Link non valido. Riprova dalla schermata di login.');
      }
    }

    Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  async function handleUpdate() {
    if (password.length < 6) { Alert.alert('Password troppo corta', 'Almeno 6 caratteri'); return; }
    if (password !== confirm) { Alert.alert('Errore', 'Le password non coincidono'); return; }
    setLoading(true);
    const { error: e } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (e) { Alert.alert('Ops', e.message); return; }
    Alert.alert('Password aggiornata! 🎉', '', [
      { text: 'Accedi', onPress: () => router.replace('/(tabs)') },
    ]);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <Text style={styles.logo}>🔑</Text>
        <Text style={styles.title}>Nuova password</Text>

        {!ready && !error && (
          <>
            <ActivityIndicator color="#E8445A" size="large" style={{ marginTop: 20 }} />
            <Text style={styles.sub}>Verifica in corso...</Text>
          </>
        )}

        {!!error && (
          <>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.btn} onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.btnText}>Torna al login</Text>
            </TouchableOpacity>
          </>
        )}

        {ready && (
          <>
            <Text style={styles.sub}>Scegli una nuova password</Text>
            <TextInput
              style={styles.input}
              placeholder="Nuova password"
              placeholderTextColor="#bbb"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <TextInput
              style={styles.input}
              placeholder="Ripeti password"
              placeholderTextColor="#bbb"
              secureTextEntry
              value={confirm}
              onChangeText={setConfirm}
            />
            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleUpdate}
              disabled={loading}
            >
              <Text style={styles.btnText}>{loading ? 'Aggiornamento...' : 'Aggiorna password'}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1, backgroundColor: colors.bg,
      alignItems: 'center', justifyContent: 'center', padding: 32,
    },
    logo: { fontSize: 56, marginBottom: 12 },
    title: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 8 },
    sub: { fontSize: 14, color: colors.textFaint, marginBottom: 32, textAlign: 'center' },
    errorText: { fontSize: 14, color: '#E8445A', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
    input: {
      width: '100%', backgroundColor: colors.card, borderRadius: 12, padding: 16,
      fontSize: 16, color: colors.text, marginBottom: 16,
      borderWidth: 1.5, borderColor: colors.border,
    },
    btn: {
      width: '100%', backgroundColor: '#E8445A', borderRadius: 14, padding: 18,
      alignItems: 'center',
      shadowColor: '#E8445A', shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
    },
    btnDisabled: { backgroundColor: isDark ? '#3a3a3a' : '#ddd', shadowOpacity: 0 },
    btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  });
}
