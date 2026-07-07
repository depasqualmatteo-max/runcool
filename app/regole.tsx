import React, { useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeColors } from '@/constants/Colors';

function Block({ emoji, title, desc, styles }: { emoji: string; title: string; desc: string; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.block}>
      <Text style={styles.blockEmoji}>{emoji}</Text>
      <Text style={styles.blockTitle}>{title}</Text>
      <Text style={styles.blockDesc}>{desc}</Text>
    </View>
  );
}

export default function RegoleScreen() {
  const params = useLocalSearchParams<{ onboarding?: string }>();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const isOnboarding = params.onboarding === '1';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      <View style={styles.hero}>
        <Text style={styles.heroEmoji}>🐷🍺🏃</Text>
        <Text style={styles.heroTitle}>Corri Birresponsabilmente</Text>
        <Text style={styles.heroSub}>L'obiettivo è semplice: allenarti più di quanto bevi. Tieni i cuori in positivo.</Text>
      </View>

      {/* CUORI */}
      <Text style={styles.sectionTitle}>❤️ I Cuori</Text>
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>Ogni profilo parte con <Text style={styles.bold}>10 cuori</Text>. Bere li toglie, allenarsi li ridà. Cerca di non andare sotto zero — anche se non c'è una penalità diretta, il saldo negativo si vede nelle classifiche.</Text>
      </View>

      <View style={styles.twoCol}>
        <View style={[styles.pill, styles.pillRed]}>
          <Text style={styles.pillHead}>🍺 Bevi → perdi ❤️</Text>
          <Text style={styles.pillLine}>Birra / Calice / Amaro → -1</Text>
          <Text style={styles.pillLine}>Cocktail → -2</Text>
          <Text style={styles.pillLine}>Bottiglia vino → -6 ÷ persone</Text>
          <Text style={styles.pillLine}>Matrimonio → -15</Text>
          <Text style={styles.pillLine}>Giornata in barca → -7</Text>
        </View>
        <View style={[styles.pill, styles.pillBlue]}>
          <Text style={styles.pillHead}>🏃 Ti alleni → guadagni ❤️</Text>
          <Text style={styles.pillLine}>Boxe / Nuoto → +5/h</Text>
          <Text style={styles.pillLine}>HIIT / Palestra → +4/h</Text>
          <Text style={styles.pillLine}>Tennis / Padel → +3/h</Text>
          <Text style={styles.pillLine}>Corsa 10 km → +5</Text>
          <Text style={styles.pillLine}>Camminata 10 km → ~+3</Text>
        </View>
      </View>

      {/* GETTONI */}
      <Text style={styles.sectionTitle}>🎟 I Gettoni</Text>
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>I gettoni si guadagnano completando le <Text style={styles.bold}>missioni</Text>. Si spendono nello <Text style={styles.bold}>shop</Text> per comprare skin e sfondi per il tuo maialino.</Text>
      </View>

      {/* MISSIONI */}
      <Text style={styles.sectionTitle}>🎯 Le Missioni</Text>
      <Block emoji="👤" title="Personali — 100 missioni in sequenza" desc="Hai una lista di 100 missioni da completare in ordine, una alla volta. Ogni missione ha un obiettivo diverso: corsa, camminata, astinenza, mentality, missioni giornaliere… Completarne una sblocca la successiva. Arrivare a 100 è il traguardo personale." styles={styles} />
      <Block emoji="👥" title="Tandem — ogni 2 settimane" desc="3 obiettivi condivisi col tuo partner. Dovete completarli entrambi per riscuotere i gettoni." styles={styles} />
      <Block emoji="🏰" title="Clan — ogni mese" desc="3 obiettivi per tutto il gruppo. Valgono fino a 4 🎟 ciascuno e si riscuotono solo se li fa tutto il clan." styles={styles} />
      <Block emoji="☀️" title="Missioni giornaliere" desc="Ogni giorno puoi riscuotere fino a 3 gettoni: corri, fai attività, e non bere ieri. Resettano a mezzanotte." styles={styles} />

      {/* CLAN & TANDEM */}
      <Text style={styles.sectionTitle}>🏆 Clan & Tandem</Text>
      <Block emoji="🏰" title="Il Clan" desc="Il tuo gruppo di amici. Il punteggio clan è la somma dei cuori di tutti. Il capo può sfidare altri clan ogni mese." styles={styles} />
      <Block emoji="🤝" title="Il Tandem" desc="Una coppia indipendente dal clan. Ogni due settimane le missioni si rinnovano. Il tandem viene abbinato casualmente ad un altro per le sfide." styles={styles} />

      {/* CLASSIFICHE */}
      <Text style={styles.sectionTitle}>📊 Classifiche</Text>
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>Ci sono tre classifiche: <Text style={styles.bold}>singoli</Text>, <Text style={styles.bold}>tandem</Text> e <Text style={styles.bold}>clan</Text>. Il punteggio è il <Text style={styles.bold}>netto</Text>: cuori guadagnati con lo sport meno cuori persi con le bevute. Puoi filtrare per mese o classifica assoluta.</Text>
      </View>

      {/* MEDAGLIE */}
      <Text style={styles.sectionTitle}>🏅 Medaglie</Text>
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>Si sbloccano automaticamente raggiungendo traguardi (es. 20 drink, 50 allenamenti, 42 km corsi…). Alcune medaglie sbloccano skin esclusive nello shop.</Text>
      </View>

      {/* INFORTUNIO */}
      <Text style={styles.sectionTitle}>🩹 Infortunio</Text>
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>Se sei infortunato, attiva la modalità dal menu profilo: le missioni sport si adattano ai giorni di stop. Le missioni drink restano invariate. Ricordati di disattivarla quando sei guarito.</Text>
      </View>

      {isOnboarding ? (
        <TouchableOpacity style={styles.startBtn} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.startBtnText}>Inizia a giocare 🐷</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.footer}>
          <Text style={styles.footerText}>Buona birresponsabilità! 🐷🍺</Text>
        </View>
      )}

    </ScrollView>
  );
}

function makeStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 18, paddingBottom: 48 },

    hero: {
      backgroundColor: isDark ? '#1a1a1a' : '#222', borderRadius: 20, padding: 24,
      alignItems: 'center', marginBottom: 28,
    },
    heroEmoji: { fontSize: 38, marginBottom: 8 },
    heroTitle: { fontSize: 20, fontWeight: '900', color: '#FFD700', marginBottom: 8, textAlign: 'center' },
    heroSub: { fontSize: 14, color: '#bbb', textAlign: 'center', lineHeight: 22 },

    sectionTitle: {
      fontSize: 13, fontWeight: '800', color: colors.textFaint,
      letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, marginTop: 8,
    },

    infoBox: {
      backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 12,
    },
    infoText: { fontSize: 14, color: colors.textDim, lineHeight: 22 },
    bold: { fontWeight: '800', color: colors.text },

    twoCol: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    pill: { flex: 1, borderRadius: 14, padding: 14 },
    pillRed: { backgroundColor: isDark ? '#2d1518' : '#FFF0F0', borderWidth: 1, borderColor: isDark ? '#5a2020' : '#FFD0D0' },
    pillBlue: { backgroundColor: isDark ? '#0d1f33' : '#EFF6FF', borderWidth: 1, borderColor: isDark ? '#1a3a5c' : '#BFDBFE' },
    pillHead: { fontSize: 12, fontWeight: '800', color: colors.text, marginBottom: 8 },
    pillLine: { fontSize: 12, color: colors.textDim, lineHeight: 20 },

    block: {
      backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 8,
      borderLeftWidth: 3, borderLeftColor: '#FFD700',
    },
    blockEmoji: { fontSize: 22, marginBottom: 4 },
    blockTitle: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 4 },
    blockDesc: { fontSize: 13, color: colors.textDim, lineHeight: 20 },

    startBtn: {
      backgroundColor: '#E8445A', borderRadius: 16, padding: 20,
      alignItems: 'center', marginTop: 16,
      shadowColor: '#E8445A', shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
    },
    startBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },

    footer: { alignItems: 'center', paddingTop: 12 },
    footerText: { fontSize: 15, color: colors.textFaint },
  });
}
