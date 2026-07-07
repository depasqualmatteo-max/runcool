import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import LogDrinkScreen from './two';
import LogWorkoutScreen from './log-workout';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeColors } from '@/constants/Colors';

export default function AggiungiScreen() {
  const [activeTab, setActiveTab] = useState<'bevi' | 'sport'>('bevi');
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
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

function makeStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    toggle: {
      flexDirection: 'row',
      marginHorizontal: 16,
      marginTop: 12,
      marginBottom: 4,
      backgroundColor: colors.bgAlt,
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
      backgroundColor: colors.card,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0 : 0.1,
      shadowRadius: 2,
      elevation: isDark ? 0 : 2,
    },
    btnText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textDim,
    },
    btnTextActive: {
      color: colors.text,
    },
  });
}
