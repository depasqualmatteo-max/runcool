import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Platform, Image, ActivityIndicator, Keyboard,
  Modal, KeyboardAvoidingView,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeColors } from '@/constants/Colors';

type ChatMode = 'global' | 'clan';

interface Message {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  text: string;
  clan_id: string | null;
  created_at: string;
}

function Avatar({ uri, isMe }: { uri: string | null; isMe: boolean }) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  return (
    <View style={styles.avatar}>
      {uri
        ? <Image source={{ uri }} style={styles.avatarImg} />
        : <Text style={styles.avatarEmoji}>{isMe ? '🐷' : '👤'}</Text>}
    </View>
  );
}

export default function ChatScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const [mode, setMode] = useState<ChatMode>('global');
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputOpen, setInputOpen] = useState(false);
  const listRef = useRef<FlatList>(null);
  const modalInputRef = useRef<TextInput>(null);

  const scrollToBottom = useCallback((animated = true) => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated }), 80);
  }, []);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(200);

    if (mode === 'clan') {
      if (!user?.clanId) { setMessages([]); setLoading(false); return; }
      query = query.eq('clan_id', user.clanId);
    } else {
      query = query.is('clan_id', null);
    }

    const { data } = await query;
    if (data) setMessages(data as Message[]);
    setLoading(false);
    scrollToBottom(false);
  }, [mode, user?.clanId, scrollToBottom]);

  useEffect(() => {
    fetchMessages();

    const channelName = mode === 'clan' ? `chat-clan-${user?.clanId}` : 'chat-global';
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as Message;
        const isCorrectMode = mode === 'clan'
          ? msg.clan_id === user?.clanId
          : msg.clan_id === null;
        if (!isCorrectMode) return;
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        scrollToBottom();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchMessages, mode, user?.clanId, scrollToBottom]);

  const send = async () => {
    if (!user || !text.trim() || sending) return;
    if (mode === 'clan' && !user.clanId) return;
    const msgText = text.trim();
    setText('');
    setInputOpen(false);
    setSending(true);
    try {
      await supabase.from('messages').insert({
        user_id: user.id,
        username: user.username,
        avatar_url: user.avatarUrl ?? null,
        text: msgText,
        clan_id: mode === 'clan' ? user.clanId : null,
      });
    } catch {
      setText(msgText);
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isMe = item.user_id === user?.id;
    return (
      <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
        <Avatar uri={item.avatar_url} isMe={isMe} />
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          {!isMe && <Text style={styles.bubbleUser}>{item.username}</Text>}
          <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe, !isMe && { color: '#1a1a1a' }]}>{item.text}</Text>
          <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
            {format(new Date(item.created_at), 'HH:mm', { locale: it })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Toggle Clan / Tutti */}
      <View style={styles.toggle}>
        <TouchableOpacity
          style={[styles.toggleBtn, mode === 'global' && styles.toggleBtnActive]}
          onPress={() => setMode('global')}
        >
          <Text style={[styles.toggleText, mode === 'global' && styles.toggleTextActive]}>🌍 Tutti</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, mode === 'clan' && styles.toggleBtnActive]}
          onPress={() => setMode('clan')}
          disabled={!user?.clanId}
        >
          <Text style={[styles.toggleText, mode === 'clan' && styles.toggleTextActive, !user?.clanId && styles.toggleTextDisabled]}>
            🏆 Clan
          </Text>
        </TouchableOpacity>
      </View>

      {/* Messaggi */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FFD700" />
        </View>
      ) : mode === 'clan' && !user?.clanId ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🏆</Text>
          <Text style={styles.emptyText}>Non sei in un clan</Text>
          <Text style={styles.emptyHint}>Unisciti a un clan per chattare!</Text>
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>💬</Text>
          <Text style={styles.emptyText}>Nessun messaggio ancora</Text>
          <Text style={styles.emptyHint}>Sii il primo a scrivere!</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => scrollToBottom(false)}
        />
      )}

      {/* Input bar — tap apre modal */}
      <TouchableOpacity style={styles.inputBar} onPress={() => setInputOpen(true)} activeOpacity={0.8}>
        <Text style={[styles.input, { color: text ? colors.text : colors.textFaint, paddingTop: 10 }]} numberOfLines={1}>
          {text || (mode === 'clan' ? 'Scrivi al clan...' : 'Scrivi a tutti...')}
        </Text>
        <View style={[styles.sendBtn, sending && styles.sendBtnDisabled]}>
          <Text style={styles.sendIcon}>➤</Text>
        </View>
      </TouchableOpacity>

      {/* Modal input — si apre sopra la tastiera */}
      <Modal visible={inputOpen} transparent animationType="fade" onRequestClose={() => setInputOpen(false)} onShow={() => setTimeout(() => modalInputRef.current?.focus(), 50)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setInputOpen(false)} />
        <KeyboardAvoidingView behavior="padding" style={styles.modalKAV}>
          <View style={styles.modalInputBar}>
            <TextInput
              ref={modalInputRef}
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder={mode === 'clan' ? 'Scrivi al clan...' : 'Scrivi a tutti...'}
              placeholderTextColor="#bbb"
              multiline
              maxLength={500}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
              onPress={send}
              disabled={!text.trim() || sending}
            >
              <Text style={styles.sendIcon}>➤</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function makeStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    toggle: {
      flexDirection: 'row',
      marginHorizontal: 16,
      marginTop: 10,
      marginBottom: 6,
      backgroundColor: colors.bgAlt,
      borderRadius: 12,
      padding: 4,
    },
    toggleBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
    toggleBtnActive: { backgroundColor: colors.card, elevation: isDark ? 0 : 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: isDark ? 0 : 0.1, shadowRadius: 2 },
    toggleText: { fontSize: 14, fontWeight: '600', color: colors.textDim },
    toggleTextActive: { color: colors.text },
    toggleTextDisabled: { color: colors.textFaint },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
    emptyEmoji: { fontSize: 48 },
    emptyText: { fontSize: 16, fontWeight: '700', color: colors.textFaint },
    emptyHint: { fontSize: 13, color: colors.textFaint },
    list: { padding: 12, paddingBottom: 4, gap: 6 },
    msgRow: { flexDirection: 'row-reverse', alignItems: 'flex-end', gap: 8, marginBottom: 2 },
    msgRowMe: { flexDirection: 'row' },
    avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.bgAlt, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 },
    avatarImg: { width: 34, height: 34, borderRadius: 17 },
    avatarEmoji: { fontSize: 18 },
    bubble: { maxWidth: '70%', borderRadius: 18, paddingHorizontal: 13, paddingVertical: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: isDark ? 0 : 0.05, shadowRadius: 3, elevation: isDark ? 0 : 1 },
    bubbleMe: { backgroundColor: colors.card, borderBottomLeftRadius: 4 },
    bubbleThem: { backgroundColor: '#FFD700', borderBottomRightRadius: 4 },
    bubbleUser: { fontSize: 11, fontWeight: '700', color: '#E8445A', marginBottom: 2 },
    bubbleText: { fontSize: 15, color: colors.text, lineHeight: 20 },
    bubbleTextMe: { color: colors.text },
    bubbleTime: { fontSize: 10, color: colors.textFaint, marginTop: 3, textAlign: 'right' },
    bubbleTimeMe: { color: colors.textFaint },
    inputBar: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border, padding: 10, gap: 8, paddingBottom: Platform.OS === 'ios' ? 24 : 10 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
    modalKAV: { backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border },
    modalInputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 10, gap: 8, paddingBottom: Platform.OS === 'ios' ? 24 : 10 },
    input: { flex: 1, backgroundColor: colors.bgAlt, borderRadius: 22, paddingHorizontal: 16, paddingVertical: Platform.OS === 'web' ? 10 : 8, fontSize: 15, color: colors.text, maxHeight: 120, borderWidth: 1, borderColor: colors.border, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}) },
    sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFD700', alignItems: 'center', justifyContent: 'center' },
    sendBtnDisabled: { backgroundColor: colors.border },
    sendIcon: { fontSize: 16, color: '#1a1a1a', marginLeft: 2 },
  });
}
