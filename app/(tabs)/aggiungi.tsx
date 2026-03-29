import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import LogDrinkScreen from './two';
import LogWorkoutScreen from './log-workout';

export default function AggiungiScreen() {
  const [activeTab, setActiveTab] = useState<'bevi' | 'sport'>('bevi');

  return (
    <View style={{ flex: 1, backgroundColor: '#f8f8f8' }}>
      <View style={styles.toggle}>
        <TouchableOpacity
          style={[styles.btn, activeTab === 'bevi' && styles.btnActive]}
          onPress={() => setActiveTab('bevi')}
        >
          <Text style={[styles.btnText, activeTab === 'bevi' && styles.btnTextActive]}>🐷 Bevi</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, activeTab === 'sport' && styles.btnActive]}
          onPress={() => setActiveTab('sport')}
        >
          <Text style={[styles.btnText, activeTab === 'sport' && styles.btnTextActive]}>🏃 Sport</Text>
        </TouchableOpacity>
      </View>
      <View style={{ flex: 1 }}>
        {activeTab === 'bevi' ? <LogDrinkScreen /> : <LogWorkoutScreen />}
      </View>
    </View>
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
