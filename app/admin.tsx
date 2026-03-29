import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

const SUPABASE_URL = 'https://qqpxtxcmssxxvajfagie.supabase.co';
const ADMIN_EMAIL = 'de.pasqual.matteo@gmail.com';

export default function AdminScreen() {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  if (user?.email !== ADMIN_EMAIL) {
    return (
      <View style={styles.center}>
        <Text style={styles.forbidden}>🚫 Accesso negato</Text>
      </View>
    );
  }

  async function sendNotification(target: 'all' | string) {
    if (!title.trim() || !body.trim()) {
      Alert.alert('Errore', 'Scrivi titolo e messaggio!');
      return;
    }
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), target }),
      });
      const json = await res.json();
      Alert.alert('✅ Inviata!', `Notifica mandata a ${json.sent} utenti`);
      setTitle('');
      setBody('');
    } catch (e) {
      Alert.alert('Errore', 'Qualcosa è andato storto');
    } finally {
      setSending(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>📣 Admin — Invia Notifica</Text>

      <Text style={styles.label}>Titolo</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="es. RunCool News 🐷"
        placeholderTextColor="#aaa"
        maxLength={50}
      />

      <Text style={styles.label}>Messaggio</Text>
      <TextInput
        style={[styles.input, styles.inputMulti]}
        value={body}
        onChangeText={setBody}
        placeholder="es. Stasera si corre alle 18! Chi c'è?"
        placeholderTextColor="#aaa"
        multiline
        maxLength={200}
      />
      <Text style={styles.counter}>{body.length}/200</Text>

      {sending ? (
        <ActivityIndicator size="large" color="#FFD700" style={{ marginTop: 24 }} />
      ) : (
        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.btnAll}
            onPress={() => Alert.alert(
              'Conferma',
              `Mandi "${title}" a TUTTI gli utenti?`,
              [{ text: 'Annulla', style: 'cancel' }, { text: 'Invia', onPress: () => sendNotification('all') }],
            )}
          >
            <Text style={styles.btnText}>📣 Manda a tutti</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnClan}
            onPress={() => {
              if (!user?.clanId) { Alert.alert('Non sei in un clan'); return; }
              Alert.alert(
                'Conferma',
                `Mandi "${title}" solo al tuo clan?`,
                [{ text: 'Annulla', style: 'cancel' }, { text: 'Invia', onPress: () => sendNotification(user.clanId!) }],
              );
            }}
          >
            <Text style={styles.btnText}>🏆 Manda al clan</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  content: { padding: 24, paddingTop: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  forbidden: { fontSize: 24, color: '#999' },
  title: { fontSize: 22, fontWeight: '800', color: '#1a1a1a', marginBottom: 28 },
  label: { fontSize: 13, fontWeight: '700', color: '#555', marginBottom: 6, textTransform: 'uppercase' },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 16,
  },
  inputMulti: { height: 120, textAlignVertical: 'top' },
  counter: { fontSize: 12, color: '#aaa', textAlign: 'right', marginTop: -12, marginBottom: 16 },
  buttons: { gap: 12, marginTop: 8 },
  btnAll: {
    backgroundColor: '#FFD700',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  btnClan: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  btnText: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
});
