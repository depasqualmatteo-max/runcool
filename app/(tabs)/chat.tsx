import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, Image,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface Message {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  text: string;
  created_at: string;
}

function Avatar({ uri, isMe }: { uri: string | null; isMe: boolean }) {
  return (
    <View style={styles.avatar}>
      {uri
        ? <Image source={{ uri }} style={styles.avatarImg} />
        : <Text style={styles.avatarEmoji}>{isMe ? '🐷' : '👤'}</Text>
      }
    </View>
  );
}

export default function ChatScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const scrollToBottom = useCallback((animated = true) => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated }), 80);
  }, []);

  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(200);
    if (data) setMessages(data as Message[]);
    setLoading(false);
    scrollToBottom(false);
  }, [scrollToBottom]);

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel('chat-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new as Message];
          });
          scrollToBottom();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchMessages, scrollToBottom]);

  const send = async () => {
    if (!user || !text.trim() || sending) return;
    const msgText = text.trim();
    setText('');
    setSending(true);
    try {
      await supabase.from('messages').insert({
        user_id: user.id,
        username: user.username,
        avatar_url: user.avatarUrl ?? null,
        text: msgText,
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
          <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{item.text}</Text>
          <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
            {format(new Date(item.created_at), 'HH:mm', { locale: it })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Caricamento chat...</Text>
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

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Scrivi un messaggio..."
          placeholderTextColor="#bbb"
          multiline
          maxLength={500}
          onSubmitEditing={Platform.OS === 'web' ? send : undefined}
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f7' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  loadingText: { color: '#aaa', fontSize: 14 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#ccc' },
  emptyHint: { fontSize: 13, color: '#ddd' },

  list: { padding: 12, paddingBottom: 4, gap: 6 },

  msgRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 2,
  },
  msgRowMe: {
    flexDirection: 'row',
  },

  avatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', flexShrink: 0,
  },
  avatarImg: { width: 34, height: 34, borderRadius: 17 },
  avatarEmoji: { fontSize: 18 },

  bubble: {
    maxWidth: '70%', borderRadius: 18, paddingHorizontal: 13, paddingVertical: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  bubbleMe: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  bubbleThem: {
    backgroundColor: '#FFD700',
    borderBottomRightRadius: 4,
  },
  bubbleUser: { fontSize: 11, fontWeight: '700', color: '#E8445A', marginBottom: 2 },
  bubbleText: { fontSize: 15, color: '#1a1a1a', lineHeight: 20 },
  bubbleTextMe: { color: '#1a1a1a' },
  bubbleTime: { fontSize: 10, color: '#aaa', marginTop: 3, textAlign: 'right' },
  bubbleTimeMe: { color: '#aaa' },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee',
    padding: 10, gap: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
  },
  input: {
    flex: 1, backgroundColor: '#f7f7f7', borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: Platform.OS === 'web' ? 10 : 8,
    fontSize: 15, color: '#1a1a1a', maxHeight: 120,
    borderWidth: 1, borderColor: '#eee',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#FFD700', alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#e8e8e8' },
  sendIcon: { fontSize: 16, color: '#1a1a1a', marginLeft: 2 },
});
