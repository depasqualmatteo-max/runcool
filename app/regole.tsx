import React, { useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeColors } from '@/constants/Colors';
import { PigSkin } from '@/components/PigSkin';
import { PigBgView } from '@/components/PigBgView';

export default function RegoleScreen() {
  const params = useLocalSearchParams<{ onboarding?: string }>();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const s = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const isOnboarding = params.onboarding === '1';

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>

      {/* ── HERO ── */}
      <View style={s.hero}>
        <Text style={s.heroEmoji}>🐷🍺🏃</Text>
        <Text style={s.heroTitle}>Corri Birresponsabilmente</Text>
        <Text style={s.heroSub}>Allénati più di quanto bevi. Tieni i cuori in positivo. Fai del tuo maialino un campione.</Text>
      </View>

      {/* ── CUORI ── */}
      <Text style={s.sectionTitle}>❤️ I Cuori</Text>
      <View style={s.infoBox}>
        <Text style={s.infoText}>Ogni profilo parte con <Text style={s.bold}>10 cuori</Text>. Il saldo si vede nelle classifiche — cerca di restare sopra zero, anche se nessuno ti blocca 🐷</Text>
      </View>

      <View style={s.twoCol}>
        {/* Bevi */}
        <View style={[s.bigCard, s.cardRed]}>
          <Text style={s.bigCardEmoji}>🍺</Text>
          <Text style={s.bigCardTitle}>Bevi</Text>
          <Text style={s.bigCardSub}>perdi ❤️</Text>
          <View style={s.exampleList}>
            <View style={s.exampleRow}>
              <Text style={s.exampleEmoji}>🍺</Text>
              <Text style={s.exampleText}>Birra  <Text style={s.exampleVal}>-1</Text></Text>
            </View>
            <View style={s.exampleRow}>
              <Text style={s.exampleEmoji}>🍸</Text>
              <Text style={s.exampleText}>Cocktail  <Text style={s.exampleVal}>-2</Text></Text>
            </View>
            <View style={s.exampleRow}>
              <Text style={s.exampleEmoji}>🍾</Text>
              <Text style={s.exampleText}>Bottiglia  <Text style={s.exampleVal}>-6 🐷</Text></Text>
            </View>
          </View>
          <Text style={s.varia}>varia in base al drink 👆</Text>
        </View>

        {/* Ti alleni */}
        <View style={[s.bigCard, s.cardBlue]}>
          <Text style={s.bigCardEmoji}>🏃</Text>
          <Text style={s.bigCardTitle}>Ti alleni</Text>
          <Text style={s.bigCardSub}>guadagni ❤️</Text>
          <View style={s.exampleList}>
            <View style={s.exampleRow}>
              <Text style={s.exampleEmoji}>🏃</Text>
              <Text style={s.exampleText}>Corsa  <Text style={s.exampleVal}>+km</Text></Text>
            </View>
            <View style={s.exampleRow}>
              <Text style={s.exampleEmoji}>🥾</Text>
              <Text style={s.exampleText}>Camminata  <Text style={s.exampleVal}>+↑m</Text></Text>
            </View>
            <View style={s.exampleRow}>
              <Text style={s.exampleEmoji}>💪</Text>
              <Text style={s.exampleText}>Palestra  <Text style={s.exampleVal}>+ore</Text></Text>
            </View>
          </View>
          <Text style={s.varia}>varia in base all'attività 👆</Text>
        </View>
      </View>

      {/* ── GETTONI ── */}
      <Text style={s.sectionTitle}>🎟 I Gettoni</Text>
      <View style={s.tokenCard}>
        <Text style={s.tokenIntro}>
          I gettoni si guadagnano completando le <Text style={s.bold}>missioni</Text> e si spendono nella <Text style={s.bold}>Stalla</Text> per personalizzare il tuo maialino.
        </Text>
        <Text style={s.tokenJoke}>Il maialino sei tu. Nel bene e nel male. 🐷</Text>

        {/* Evoluzione maialino */}
        <View style={s.pigEvoRow}>
          {/* Maialino base */}
          <View style={s.pigEvoItem}>
            <PigBgView bgId={0} size={80}>
              <PigSkin skinId={0} variant="base" size={64} />
            </PigBgView>
            <Text style={s.pigEvoLabel}>Base</Text>
          </View>

          <View style={s.pigEvoArrow}>
            <Text style={s.pigEvoArrowText}>🎟{'\n'}→</Text>
          </View>

          {/* Maialino evoluto (silhouette della variante pro su sfondo scuro) */}
          <View style={s.pigEvoItem}>
            <View style={s.pigEvoDarkBg}>
              <PigSkin skinId={0} variant="pro" size={64} silhouette silhouetteColor="#b0b0b0" />
            </View>
            <Text style={s.pigEvoLabel}>Evoluto</Text>
          </View>
        </View>

        <Text style={s.tokenHint}>Usa i gettoni per sbloccare skin e sfondi — e potenzia il maialino facendo attività 💪</Text>
      </View>

      {/* ── CLAN & TANDEM ── */}
      <Text style={s.sectionTitle}>🏰 Clan & 🤝 Tandem</Text>

      <View style={s.groupCard}>
        <View style={s.groupHeader}>
          <Text style={s.groupEmoji}>🏰</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.groupTitle}>Il Clan</Text>
            <Text style={s.groupSub}>Il tuo gruppo di amici</Text>
          </View>
        </View>
        <Text style={s.groupDesc}>
          Il punteggio clan è la <Text style={s.bold}>somma dei cuori di tutti i membri</Text>. A fine mese si sfidano altri clan e chi vince scala la classifica. Ogni mese ci sono missioni clan da completare tutti insieme per guadagnare gettoni.
        </Text>
        <View style={s.groupTags}>
          <View style={s.tag}><Text style={s.tagText}>📊 Classifica mensile</Text></View>
          <View style={s.tag}><Text style={s.tagText}>🎟 Missioni condivise</Text></View>
          <View style={s.tag}><Text style={s.tagText}>🏆 Medaglie clan</Text></View>
        </View>
      </View>

      <View style={[s.groupCard, { borderColor: '#9C27B0' }]}>
        <View style={s.groupHeader}>
          <Text style={s.groupEmoji}>🤝</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.groupTitle}>Il Tandem</Text>
            <Text style={s.groupSub}>Una coppia, indipendente dal clan</Text>
          </View>
        </View>
        <Text style={s.groupDesc}>
          Sei abbinato a un'altra persona. Ogni settimana si rinnovano le missioni tandem: dovete <Text style={s.bold}>completarle entrambi</Text> per riscuotere i gettoni. Se uno dei due non ce la fa, li perdete tutti e due.
        </Text>
        <View style={s.groupTags}>
          <View style={s.tag}><Text style={s.tagText}>⏱ Missioni settimanali</Text></View>
          <View style={s.tag}><Text style={s.tagText}>🎟 Gettoni condivisi</Text></View>
          <View style={s.tag}><Text style={s.tagText}>🏆 Medaglie tandem</Text></View>
        </View>
      </View>

      {/* ── MISSIONI ── */}
      <Text style={s.sectionTitle}>🎯 Le Missioni</Text>
      <View style={s.infoBox}>
        <Text style={s.infoText}>Le missioni sono il motore del gioco — ti sfidano ogni giorno, ogni mese e nella vita. Completarle ti dà <Text style={s.bold}>gettoni 🎟</Text> per la Stalla.</Text>
      </View>

      <View style={s.missionGrid}>
        <View style={[s.missionCard, { borderColor: '#E8445A' }]}>
          <Text style={s.missionEmoji}>🧬</Text>
          <Text style={s.missionTitle}>Missione della vita</Text>
          <Text style={s.missionDesc}>100 missioni in sequenza, una alla volta. Completarne una sblocca la successiva. Il traguardo personale definitivo.</Text>
        </View>
        <View style={[s.missionCard, { borderColor: '#9C27B0' }]}>
          <Text style={s.missionEmoji}>🤝</Text>
          <Text style={s.missionTitle}>Tandem</Text>
          <Text style={s.missionDesc}>Missioni settimanali col tuo partner. Ci riuscite solo se le completate entrambi.</Text>
        </View>
        <View style={[s.missionCard, { borderColor: '#FFD700' }]}>
          <Text style={s.missionEmoji}>🏰</Text>
          <Text style={s.missionTitle}>Clan</Text>
          <Text style={s.missionDesc}>Missioni mensili per tutto il gruppo. Se uno non ce la fa, i gettoni li perdete tutti.</Text>
        </View>
        <View style={[s.missionCard, { borderColor: '#4CAF50' }]}>
          <Text style={s.missionEmoji}>☀️</Text>
          <Text style={s.missionTitle}>Giornaliere</Text>
          <Text style={s.missionDesc}>Ogni giorno: corri, fai attività, non bere ieri. Fino a 3 gettoni al giorno. Si resettano a mezzanotte.</Text>
        </View>
      </View>

      {/* ── SOCIAL ── */}
      <Text style={s.sectionTitle}>👥 Social</Text>
      <View style={[s.groupCard, { borderColor: '#2196F3' }]}>
        <View style={s.groupHeader}>
          <Text style={s.groupEmoji}>👥</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.groupTitle}>Segui i tuoi amici</Text>
            <Text style={s.groupSub}>Confrontati e reagisci</Text>
          </View>
        </View>
        <Text style={s.groupDesc}>
          Nel tab <Text style={s.bold}>Social</Text> vedi il feed di chi segui — allenamenti, bevute, foto. Vai sul profilo di un amico e tocca <Text style={s.bold}>+ Segui</Text> per iniziare a vederlo nel feed. Puoi reagire con emoji ai loro log.
        </Text>
        <View style={s.groupTags}>
          <View style={s.tag}><Text style={s.tagText}>❤️ Reazioni</Text></View>
          <View style={s.tag}><Text style={s.tagText}>📸 Foto</Text></View>
          <View style={s.tag}><Text style={s.tagText}>📊 Classifiche</Text></View>
        </View>
      </View>

      {/* ── CLASSIFICHE & MEDAGLIE ── */}
      <Text style={s.sectionTitle}>🏅 Classifiche & Medaglie</Text>
      <View style={s.twoCol}>
        <View style={[s.infoBox, { flex: 1, marginBottom: 0 }]}>
          <Text style={{ fontSize: 24, textAlign: 'center', marginBottom: 6 }}>📊</Text>
          <Text style={[s.infoText, { textAlign: 'center' }]}>Singoli, Tandem e Clan. Filtra per <Text style={s.bold}>mese</Text> o classifica assoluta.</Text>
        </View>
        <View style={[s.infoBox, { flex: 1, marginBottom: 0 }]}>
          <Text style={{ fontSize: 24, textAlign: 'center', marginBottom: 6 }}>🏅</Text>
          <Text style={[s.infoText, { textAlign: 'center' }]}>Si sbloccano raggiungendo traguardi. Alcune medaglie danno skin <Text style={s.bold}>esclusive</Text>.</Text>
        </View>
      </View>

      {/* ── INFORTUNIO ── */}
      <Text style={s.sectionTitle}>🩹 Infortunio</Text>
      <View style={s.infoBox}>
        <Text style={s.infoText}>Infortunato? Attiva la modalità dal menu profilo: le missioni sport si adattano. Ricordati di disattivarla quando sei guarito 💪</Text>
      </View>

      {/* ── PRIVACY ── */}
      <Text style={s.sectionTitle}>🔒 Privacy</Text>
      <View style={s.infoBox}>
        <Text style={s.infoText}>Puoi impostare l'<Text style={s.bold}>alcol come privato</Text> nelle impostazioni — visibile solo a te, non nel feed degli altri. Nessun giudizio qui: il maialino sei tu, con le tue birre e le tue corse. 🐷🍺</Text>
      </View>

      {isOnboarding ? (
        <TouchableOpacity style={s.startBtn} onPress={() => router.replace('/(tabs)')}>
          <Text style={s.startBtnText}>Inizia a giocare 🐷</Text>
        </TouchableOpacity>
      ) : (
        <View style={s.footer}>
          <Text style={s.footerText}>Buona birresponsabilità! 🐷🍺</Text>
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
      backgroundColor: isDark ? '#1a1a1a' : '#1a1a1a', borderRadius: 22, padding: 26,
      alignItems: 'center', marginBottom: 28,
    },
    heroEmoji: { fontSize: 40, marginBottom: 10 },
    heroTitle: { fontSize: 21, fontWeight: '900', color: '#FFD700', marginBottom: 8, textAlign: 'center' },
    heroSub: { fontSize: 14, color: '#ccc', textAlign: 'center', lineHeight: 22 },

    sectionTitle: {
      fontSize: 13, fontWeight: '800', color: colors.textFaint,
      letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, marginTop: 20,
    },
    infoBox: {
      backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 12,
    },
    infoText: { fontSize: 14, color: colors.textDim, lineHeight: 22 },
    bold: { fontWeight: '800', color: colors.text },

    // ── Due colonne ──
    twoCol: { flexDirection: 'row', gap: 10, marginBottom: 12 },

    // ── Card bevi / alleni ──
    bigCard: {
      flex: 1, borderRadius: 18, padding: 16,
      alignItems: 'center',
      borderWidth: 1.5,
    },
    cardRed: {
      backgroundColor: isDark ? '#2d1518' : '#FFF5F5',
      borderColor: isDark ? '#5a2020' : '#FFCCCC',
    },
    cardBlue: {
      backgroundColor: isDark ? '#0d1f33' : '#F0F7FF',
      borderColor: isDark ? '#1a3a5c' : '#BFDBFE',
    },
    bigCardEmoji: { fontSize: 36, marginBottom: 4 },
    bigCardTitle: { fontSize: 15, fontWeight: '900', color: colors.text },
    bigCardSub: { fontSize: 12, color: colors.textFaint, marginBottom: 12 },
    exampleList: { width: '100%', gap: 6, marginBottom: 10 },
    exampleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    exampleEmoji: { fontSize: 15, width: 22 },
    exampleText: { fontSize: 12, color: colors.textDim },
    exampleVal: { fontWeight: '800', color: colors.text },
    varia: { fontSize: 10, color: colors.textFaint, textAlign: 'center', fontStyle: 'italic' },

    // ── Gettoni ──
    tokenCard: {
      backgroundColor: colors.card, borderRadius: 18, padding: 18, marginBottom: 12,
      borderWidth: 2, borderColor: '#FFD700',
    },
    tokenIntro: { fontSize: 14, color: colors.textDim, lineHeight: 22, marginBottom: 8 },
    tokenJoke: { fontSize: 13, color: colors.textFaint, fontStyle: 'italic', marginBottom: 18, textAlign: 'center' },
    pigEvoRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      marginBottom: 16, gap: 8,
    },
    pigEvoItem: { alignItems: 'center', gap: 8 },
    pigEvoLabel: { fontSize: 12, fontWeight: '700', color: colors.textFaint },
    pigEvoDarkBg: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: '#2a2a2a',
      alignItems: 'center', justifyContent: 'center',
    },
    pigEvoArrow: { alignItems: 'center', paddingHorizontal: 8 },
    pigEvoArrowText: { fontSize: 16, color: '#FFD700', fontWeight: '800', textAlign: 'center', lineHeight: 22 },
    tokenHint: { fontSize: 12, color: colors.textFaint, textAlign: 'center', lineHeight: 18 },

    // ── Clan & Tandem card ──
    groupCard: {
      backgroundColor: colors.card, borderRadius: 18, padding: 16,
      marginBottom: 12, borderWidth: 2, borderColor: '#FFD700',
    },
    groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
    groupEmoji: { fontSize: 32 },
    groupTitle: { fontSize: 16, fontWeight: '900', color: colors.text },
    groupSub: { fontSize: 12, color: colors.textFaint, marginTop: 1 },
    groupDesc: { fontSize: 13, color: colors.textDim, lineHeight: 21, marginBottom: 12 },
    groupTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    tag: {
      backgroundColor: colors.bgAlt, borderRadius: 20,
      paddingHorizontal: 10, paddingVertical: 4,
    },
    tagText: { fontSize: 11, fontWeight: '700', color: colors.textDim },

    // ── Missioni grid ──
    missionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
    missionCard: {
      width: '47%', backgroundColor: colors.card, borderRadius: 16,
      padding: 14, borderWidth: 2,
    },
    missionEmoji: { fontSize: 28, marginBottom: 6 },
    missionTitle: { fontSize: 13, fontWeight: '800', color: colors.text, marginBottom: 4 },
    missionDesc: { fontSize: 12, color: colors.textDim, lineHeight: 18 },

    startBtn: {
      backgroundColor: '#E8445A', borderRadius: 16, padding: 20,
      alignItems: 'center', marginTop: 20,
      shadowColor: '#E8445A', shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
    },
    startBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
    footer: { alignItems: 'center', paddingTop: 16 },
    footerText: { fontSize: 15, color: colors.textFaint },
  });
}
