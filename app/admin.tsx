import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeColors } from '@/constants/Colors';

const ADMIN_EMAILS = ['de.pasqual.matteo@gmail.com', 'andreasperti@yahoo.it'];

export default function AdminScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  // Utenti selezionati (array)
  const [selected, setSelected] = useState<string[]>([]);
  // Testo del campo di ricerca (l'ultimo "pezzo" dopo l'ultima virgola)
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (query.length < 1) { setSuggestions([]); return; }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .ilike('username', `${query}%`)
        .limit(8);
      const names = (data ?? []).map((r: any) => r.username).filter((n: string) => !selected.includes(n));
      setSuggestions(names);
    }, 250);
  }, [query]);

  function addUser(username: string) {
    setSelected(prev => [...prev, username]);
    setQuery('');
    setSuggestions([]);
  }

  function removeUser(username: string) {
    setSelected(prev => prev.filter(u => u !== username));
  }

  if (!ADMIN_EMAILS.includes(user?.email ?? '')) {
    return (
      <View style={styles.center}>
        <Text style={styles.forbidden}>🚫 Accesso negato</Text>
      </View>
    );
  }

  async function sendNotification(target: 'all' | 'clan' | 'users') {
    if (!title.trim() || !body.trim()) {
      Alert.alert('Errore', 'Scrivi titolo e messaggio!');
      return;
    }
    if (target === 'users' && selected.length === 0) {
      Alert.alert('Errore', 'Seleziona almeno un utente');
      return;
    }
    setSending(true);
    try {
      let query2 = supabase.from('profiles').select('id, push_token, username').not('push_token', 'is', null);

      if (target === 'clan') {
        if (!user?.clanId) { Alert.alert('Non sei in un clan'); setSending(false); return; }
        query2 = query2.eq('clan_id', user.clanId);
      } else if (target === 'users') {
        query2 = query2.in('username', selected);
      }

      const { data: profiles, error: dbError } = await query2;

      if (dbError) {
        Alert.alert('Errore DB', dbError.message);
        return;
      }

      if (!profiles || profiles.length === 0) {
        Alert.alert('Nessun utente', 'Nessun utente trovato con notifiche attive');
        return;
      }

      const t = title.trim();
      const b = body.trim();

      const notifications = profiles.map((p: any) => ({
        to: p.push_token,
        title: t,
        body: b,
        sound: 'default' as const,
      }));

      // Salva su Supabase per ogni utente (anche quelli senza push_token)
      // Recupera tutti gli utenti del target per salvare nel DB
      let allUsersQuery = supabase.from('profiles').select('id');
      if (target === 'clan') {
        allUsersQuery = allUsersQuery.eq('clan_id', user.clanId!);
      } else if (target === 'users') {
        allUsersQuery = allUsersQuery.in('username', selected);
      }
      const { data: allUsers } = await allUsersQuery;
      if (allUsers && allUsers.length > 0) {
        await supabase.from('notifications').insert(
          allUsers.map((u: any) => ({ user_id: u.id, title: t, body: b }))
        );
      }

      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(notifications),
      });

      if (!res.ok) {
        const text = await res.text();
        Alert.alert('Errore Expo', `Status ${res.status}: ${text}`);
        return;
      }

      const names = profiles.map((p: any) => p.username).join(', ');
      Alert.alert('✅ Inviata!', `Notifica mandata a ${notifications.length} utenti${target === 'users' ? `:\n${names}` : ''}`);
      setTitle('');
      setBody('');
      if (target === 'users') setSelected([]);
    } catch (e: any) {
      Alert.alert('Errore', e?.message || 'Qualcosa è andato storto');
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView ref={scrollRef} style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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

      {/* Utenti specifici */}
      <Text style={styles.label}>Utenti specifici</Text>

      {/* Chip degli utenti selezionati */}
      {selected.length > 0 && (
        <View style={styles.chips}>
          {selected.map(u => (
            <TouchableOpacity key={u} style={styles.chip} onPress={() => removeUser(u)}>
              <Text style={styles.chipText}>{u}</Text>
              <Text style={styles.chipX}>✕</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Suggerimenti — sopra il campo così non finiscono sotto la tastiera */}
      {suggestions.length > 0 && (
        <View style={styles.suggestBox}>
          {suggestions.map(name => (
            <TouchableOpacity key={name} style={styles.suggestRow} onPress={() => addUser(name)}>
              <Text style={styles.suggestText}>{name}</Text>
              <Text style={styles.suggestAdd}>+ Aggiungi</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Campo di ricerca */}
      <TextInput
        style={styles.input}
        value={query}
        onChangeText={setQuery}
        placeholder="Cerca username…"
        placeholderTextColor="#aaa"
        autoCapitalize="none"
        autoCorrect={false}
        onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300)}
      />

      {sending ? (
        <ActivityIndicator size="large" color="#FFD700" style={{ marginTop: 24 }} />
      ) : (
        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.btnUsers, selected.length === 0 && styles.btnDisabled]}
            onPress={() => {
              if (selected.length === 0) return;
              Alert.alert(
                'Conferma',
                `Mandi "${title}" a: ${selected.join(', ')}?`,
                [{ text: 'Annulla', style: 'cancel' }, { text: 'Invia', onPress: () => sendNotification('users') }],
              );
            }}
          >
            <Text style={styles.btnText}>🎯 Manda a utenti selezionati ({selected.length})</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnAll}
            onPress={() => Alert.alert(
              'Conferma',
              `Mandi "${title}" a TUTTI gli utenti?`,
              [{ text: 'Annulla', style: 'cancel' }, { text: 'Invia', onPress: () => sendNotification('all') }],
            )}
          >
            <Text style={styles.btnTextDark}>📣 Manda a tutti</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnClan}
            onPress={() => {
              if (!user?.clanId) { Alert.alert('Non sei in un clan'); return; }
              Alert.alert(
                'Conferma',
                `Mandi "${title}" solo al tuo clan?`,
                [{ text: 'Annulla', style: 'cancel' }, { text: 'Invia', onPress: () => sendNotification('clan') }],
              );
            }}
          >
            <Text style={styles.btnText}>🏆 Manda al clan</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 24, paddingTop: 32, paddingBottom: 40 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    forbidden: { fontSize: 24, color: colors.textDim },
    title: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 28 },
    label: { fontSize: 13, fontWeight: '700', color: colors.textDim, marginBottom: 6, textTransform: 'uppercase' },
    input: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      fontSize: 16,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 8,
    },
    inputMulti: { height: 120, textAlignVertical: 'top' },
    counter: { fontSize: 12, color: colors.textFaint, textAlign: 'right', marginBottom: 16 },
    chips: {
      flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10,
    },
    chip: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: '#6C5CE7', borderRadius: 20,
      paddingHorizontal: 12, paddingVertical: 6,
    },
    chipText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    chipX: { color: 'rgba(255,255,255,0.7)', marginLeft: 6, fontSize: 11 },
    suggestBox: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
      overflow: 'hidden',
    },
    suggestRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 14, paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    suggestText: { fontSize: 15, fontWeight: '700', color: colors.text },
    suggestAdd: { fontSize: 12, color: '#6C5CE7', fontWeight: '700' },
    buttons: { gap: 12, marginTop: 8 },
    btnUsers: {
      backgroundColor: '#6C5CE7',
      borderRadius: 14, padding: 16, alignItems: 'center',
    },
    btnAll: {
      backgroundColor: '#FFD700',
      borderRadius: 14, padding: 16, alignItems: 'center',
    },
    btnClan: {
      backgroundColor: '#1a1a1a',
      borderRadius: 14, padding: 16, alignItems: 'center',
    },
    btnDisabled: { opacity: 0.4 },
    btnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
    btnTextDark: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  });
}
