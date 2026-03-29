import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import ChatScreen from './chat';
import HistoryScreen from './history';

export default function SocialScreen() {
  const [activeTab, setActiveTab] = useState<'chat' | 'feed'>('feed');

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#f8f8f8' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <View style={styles.toggle}>
        <TouchableOpacity
          style={[styles.btn, activeTab === 'feed' && styles.btnActive]}
          onPress={() => setActiveTab('feed')}
        >
          <Text style={[styles.btnText, activeTab === 'feed' && styles.btnTextActive]}>📰 Feed</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, activeTab === 'chat' && styles.btnActive]}
          onPress={() => setActiveTab('chat')}
        >
          <Text style={[styles.btnText, activeTab === 'chat' && styles.btnTextActive]}>💬 Chat</Text>
        </TouchableOpacity>
      </View>
      <View style={{ flex: 1 }}>
        {activeTab === 'feed' ? <HistoryScreen /> : <ChatScreen />}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  toggle: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: '#e8e8e8',
    borderRadius: 12,
    padding: 4,
  },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#888',
  },
  btnTextActive: {
    color: '#1a1a1a',
  },
});
