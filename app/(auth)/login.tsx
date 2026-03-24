import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
  const { user, login, isLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (isLoading) return null;
  if (user) return <Redirect href="/(tabs)/" />;

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Ehi maialino', 'Inserisci email e password 🐷');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)/');
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
        <Text style={styles.logo}>🍺🏃</Text>
        <Text style={styles.title}>Corri Birresponsabilmente</Text>
        <Text style={styles.subtitle}>Accedi al tuo account</Text>

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
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Accedendo...' : 'Entra 🏃'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/(auth)/register')}
          >
            <Text style={styles.secondaryText}>Non hai un account? <Text style={styles.link}>Registrati</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1, backgroundColor: '#f7f7f7',
    alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  logo: { fontSize: 64, marginBottom: 12 },
  title: { fontSize: 26, fontWeight: '800', color: '#1a1a1a', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 15, color: '#aaa', marginBottom: 40 },

  form: { width: '100%' },
  label: { fontSize: 13, fontWeight: '700', color: '#555', marginBottom: 6, letterSpacing: 0.5 },
  input: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    fontSize: 16, color: '#1a1a1a', marginBottom: 20,
    borderWidth: 1.5, borderColor: '#eee',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  button: {
    backgroundColor: '#E8445A', borderRadius: 14, padding: 18,
    alignItems: 'center', marginBottom: 16,
    shadowColor: '#E8445A', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  buttonDisabled: { backgroundColor: '#ddd', shadowOpacity: 0 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  secondaryButton: { alignItems: 'center', padding: 8 },
  secondaryText: { fontSize: 14, color: '#888' },
  link: { color: '#E8445A', fontWeight: '700' },
});
