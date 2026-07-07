import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeColors } from '@/constants/Colors';

export default function RegisterScreen() {
  const { user, register, isLoading } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (isLoading) return null;
  if (user) return <Redirect href="/(tabs)" />;

  async function handleRegister() {
    if (!email.trim() || !username.trim() || !password.trim()) {
      Alert.alert('Ehi maialino', 'Compila tutti i campi 🐷');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Password troppo corta', 'Almeno 6 caratteri');
      return;
    }
    setLoading(true);
    try {
      await register(email.trim(), username.trim(), password);
      router.replace('/regole?onboarding=1');
    } catch (e: any) {
      Alert.alert('Ops', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.logo}>🐷🏃</Text>
        <Text style={styles.title}>Diventa un Maialino</Text>
        <Text style={styles.subtitle}>Crea il tuo account gratuito</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="tu@example.com"
            placeholderTextColor="#bbb"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />

          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="MaialinoCampione"
            placeholderTextColor="#bbb"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#bbb"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Registrando...' : 'Registrati 🐷'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.secondaryText}>Hai già un account? <Text style={styles.link}>Accedi</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flexGrow: 1, backgroundColor: colors.bg,
      alignItems: 'center', justifyContent: 'center', padding: 32,
    },
    logo: { fontSize: 64, marginBottom: 12 },
    title: { fontSize: 26, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 6 },
    subtitle: { fontSize: 15, color: colors.textFaint, marginBottom: 40 },

    form: { width: '100%' },
    label: { fontSize: 13, fontWeight: '700', color: colors.textDim, marginBottom: 6, letterSpacing: 0.5 },
    input: {
      backgroundColor: colors.card, borderRadius: 12, padding: 16,
      fontSize: 16, color: colors.text, marginBottom: 20,
      borderWidth: 1.5, borderColor: colors.border,
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0 : 0.04, shadowRadius: 3, elevation: isDark ? 0 : 1,
    },
    button: {
      backgroundColor: '#E8445A', borderRadius: 14, padding: 18,
      alignItems: 'center', marginBottom: 16,
      shadowColor: '#E8445A', shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
    },
    buttonDisabled: { backgroundColor: isDark ? '#3a3a3a' : '#ddd', shadowOpacity: 0 },
    buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
    secondaryButton: { alignItems: 'center', padding: 8 },
    secondaryText: { fontSize: 14, color: colors.textDim },
    link: { color: '#E8445A', fontWeight: '700' },
  });
}
