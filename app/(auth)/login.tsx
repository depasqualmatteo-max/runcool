import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeColors } from '@/constants/Colors';

type Step = 'login' | 'reset_email' | 'reset_code' | 'reset_newpw';

export default function LoginScreen() {
  const { user, login, isLoading } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const router = useRouter();

  const [step, setStep] = useState<Step>('login');
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newPwConfirm, setNewPwConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  if (isLoading) return null;
  if (user && step === 'login') return <Redirect href="/(tabs)" />;

  async function handleLogin() {
    if (!emailOrUsername.trim() || !password.trim()) {
      Alert.alert('Ehi maialino', 'Inserisci email (o username) e password 🐷'); return;
    }
    setLoading(true);
    try {
      let email = emailOrUsername.trim();
      if (!email.includes('@')) {
        const { data } = await supabase.rpc('get_email_by_username', { p_username: email });
        if (!data) { Alert.alert('Ops', 'Username non trovato 🐷'); return; }
        email = data;
      }
      await login(email, password);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Ops', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendCode() {
    const val = resetEmail.trim();
    if (!val) { Alert.alert('Inserisci la tua email'); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(val);
    setLoading(false);
    if (error) { Alert.alert('Ops', error.message); return; }
    setStep('reset_code');
  }

  async function handleVerifyCode() {
    if (code.trim().length < 6) { Alert.alert('Codice non valido'); return; }
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: resetEmail.trim(),
      token: code.trim(),
      type: 'recovery',
    });
    setLoading(false);
    if (error) { Alert.alert('Codice errato o scaduto', 'Richiedi un nuovo codice.'); return; }
    setStep('reset_newpw');
  }

  async function handleUpdatePassword() {
    if (newPw.length < 6) { Alert.alert('Password troppo corta', 'Almeno 6 caratteri'); return; }
    if (newPw !== newPwConfirm) { Alert.alert('Le password non coincidono'); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setLoading(false);
    if (error) { Alert.alert('Ops', error.message); return; }
    Alert.alert('Password aggiornata! 🎉', '', [
      { text: 'Accedi', onPress: () => { setStep('login'); router.replace('/(tabs)'); } },
    ]);
  }

  // ─── Step: login ───
  if (step === 'login') return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.logo}>🍺🏃</Text>
        <Text style={styles.title}>Corri Birresponsabilmente</Text>
        <Text style={styles.subtitle}>Accedi al tuo account</Text>
        <View style={styles.form}>
          <Text style={styles.label}>Email o Username</Text>
          <TextInput style={styles.input} placeholder="tu@example.com oppure maialino23"
            placeholderTextColor="#bbb" value={emailOrUsername} onChangeText={setEmailOrUsername}
            autoCapitalize="none" autoComplete="email" />
          <Text style={styles.label}>Password</Text>
          <TextInput style={styles.input} placeholder="••••••••"
            placeholderTextColor="#bbb" value={password} onChangeText={setPassword} secureTextEntry />
          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleLogin} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Accedendo...' : 'Entra 🏃'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.forgotButton} onPress={() => { setResetEmail(emailOrUsername.includes('@') ? emailOrUsername : ''); setStep('reset_email'); }}>
            <Text style={styles.forgotText}>Password dimenticata?</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.secondaryText}>Non hai un account? <Text style={styles.link}>Registrati</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  // ─── Step: inserisci email ───
  if (step === 'reset_email') return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.logo}>📬</Text>
        <Text style={styles.title}>Reset password</Text>
        <Text style={styles.subtitle}>Ti mandiamo un codice via email</Text>
        <View style={styles.form}>
          <Text style={styles.label}>La tua email</Text>
          <TextInput style={styles.input} placeholder="tu@example.com"
            placeholderTextColor="#bbb" value={resetEmail} onChangeText={setResetEmail}
            autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSendCode} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Invio...' : 'Invia codice'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.forgotButton} onPress={() => setStep('login')}>
            <Text style={styles.forgotText}>← Torna al login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  // ─── Step: inserisci codice ───
  if (step === 'reset_code') return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.logo}>🔢</Text>
        <Text style={styles.title}>Inserisci il codice</Text>
        <Text style={styles.subtitle}>Controlla la tua email{'\n'}{resetEmail}</Text>
        <View style={styles.form}>
          <Text style={styles.label}>Codice ricevuto via email</Text>
          <TextInput style={[styles.input, styles.codeInput]} placeholder="00000000"
            placeholderTextColor="#bbb" value={code} onChangeText={setCode}
            keyboardType="number-pad" maxLength={8} />
          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleVerifyCode} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Verifica...' : 'Verifica codice'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.forgotButton} onPress={() => setStep('reset_email')}>
            <Text style={styles.forgotText}>Non hai ricevuto l'email? Rimanda</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  // ─── Step: nuova password ───
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.logo}>🔑</Text>
        <Text style={styles.title}>Nuova password</Text>
        <Text style={styles.subtitle}>Scegli una nuova password</Text>
        <View style={styles.form}>
          <Text style={styles.label}>Nuova password</Text>
          <TextInput style={styles.input} placeholder="••••••••"
            placeholderTextColor="#bbb" value={newPw} onChangeText={setNewPw} secureTextEntry />
          <Text style={styles.label}>Ripeti password</Text>
          <TextInput style={styles.input} placeholder="••••••••"
            placeholderTextColor="#bbb" value={newPwConfirm} onChangeText={setNewPwConfirm} secureTextEntry />
          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleUpdatePassword} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Aggiornamento...' : 'Aggiorna password'}</Text>
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
    subtitle: { fontSize: 15, color: colors.textFaint, marginBottom: 40, textAlign: 'center', lineHeight: 22 },
    form: { width: '100%' },
    label: { fontSize: 13, fontWeight: '700', color: colors.textDim, marginBottom: 6, letterSpacing: 0.5 },
    input: {
      backgroundColor: colors.card, borderRadius: 12, padding: 16,
      fontSize: 16, color: colors.text, marginBottom: 20,
      borderWidth: 1.5, borderColor: colors.border,
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0 : 0.04, shadowRadius: 3, elevation: isDark ? 0 : 1,
    },
    codeInput: { fontSize: 28, fontWeight: '800', textAlign: 'center', letterSpacing: 6 },
    button: {
      backgroundColor: '#E8445A', borderRadius: 14, padding: 18,
      alignItems: 'center', marginBottom: 16,
      shadowColor: '#E8445A', shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
    },
    buttonDisabled: { backgroundColor: isDark ? '#3a3a3a' : '#ddd', shadowOpacity: 0 },
    buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
    forgotButton: { alignItems: 'center', paddingVertical: 4, marginBottom: 12 },
    forgotText: { fontSize: 13, color: '#E8445A', fontWeight: '600' },
    secondaryButton: { alignItems: 'center', padding: 8 },
    secondaryText: { fontSize: 14, color: colors.textDim },
    link: { color: '#E8445A', fontWeight: '700' },
  });
}
