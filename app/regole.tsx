import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Rule({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <View style={styles.rule}>
      <Text style={styles.ruleEmoji}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.ruleTitle}>{title}</Text>
        <Text style={styles.ruleDesc}>{desc}</Text>
      </View>
    </View>
  );
}

function ScoreRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.scoreRow}>
      <Text style={styles.scoreLabel}>{label}</Text>
      <Text style={[styles.scoreValue, { color }]}>{value}</Text>
    </View>
  );
}

export default function RegoleScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Intro */}
      <View style={styles.heroCard}>
        <Text style={styles.heroEmoji}>🐷🍺🏃</Text>
        <Text style={styles.heroTitle}>Corri Birresponsabilmente</Text>
        <Text style={styles.heroSub}>
          L'obiettivo è semplice: bevi meno di quanto corri. Tieni il saldo cuori positivo e dimostra agli amici che sei un maialino equilibrato.
        </Text>
      </View>

      {/* I Cuori */}
      <Section title="❤️ Il sistema dei cuori">
        <Text style={styles.bodyText}>
          Ogni azione influenza il tuo saldo cuori. Più alto è il saldo, meglio stai (sportivamente parlando).
        </Text>

        <View style={styles.tableCard}>
          <Text style={styles.tableHeader}>🍺 Drink — cuori persi</Text>
          <ScoreRow label="Birra piccola" value="-1 ❤️" color="#E8445A" />
          <ScoreRow label="Birra media" value="-1 ❤️" color="#E8445A" />
          <ScoreRow label="Calice di vino" value="-1 ❤️" color="#E8445A" />
          <ScoreRow label="Amaro" value="-1 ❤️" color="#E8445A" />
          <ScoreRow label="Cocktail" value="-2 ❤️" color="#E8445A" />
          <ScoreRow label="Bottiglia di vino" value="-6 ❤️ ÷ persone" color="#E8445A" />
        </View>

        <View style={[styles.tableCard, { marginTop: 10 }]}>
          <Text style={styles.tableHeader}>🏃 Sport — cuori guadagnati</Text>
          <ScoreRow label="Corsa 10km" value="+6 ❤️" color="#2196F3" />
          <ScoreRow label="Camminata 10km" value="~+3 ❤️" color="#2196F3" />
          <ScoreRow label="HIIT 1h" value="+5 ❤️" color="#2196F3" />
          <ScoreRow label="Pilates 1h" value="+3 ❤️" color="#2196F3" />
          <ScoreRow label="Tennis/Padel 1h" value="+4 ❤️" color="#2196F3" />
          <ScoreRow label="Palestra 1h" value="+4 ❤️" color="#2196F3" />
          <Text style={styles.tableNote}>* i cuori dipendono dalle calorie bruciate</Text>
        </View>
      </Section>

      {/* Clan */}
      <Section title="🏆 Clan">
        <Rule
          emoji="👥"
          title="Cos'è un clan"
          desc="Un gruppo di amici che competono insieme. Il punteggio del clan è la somma dei cuori di tutti i membri."
        />
        <Rule
          emoji="🔑"
          title="Entra nel clan"
          desc="Il capo clan condivide un codice di 6 lettere. Inseriscilo nel tab Clan per unirti."
        />
        <Rule
          emoji="⚔️"
          title="Sfida mensile"
          desc="Il capo clan può sfidare un altro clan. La sfida dura un mese e vince chi guadagna più cuori nel periodo."
        />
      </Section>

      {/* Tandem */}
      <Section title="👥 Tandem">
        <Rule
          emoji="🤝"
          title="Cos'è un tandem"
          desc="Una coppia di giocatori (o trio se il numero è dispari). Indipendente dal clan — puoi essere in entrambi."
        />
        <Rule
          emoji="🔍"
          title="Crea un tandem"
          desc="Cerca il tuo partner per username nel tab Tandem. Una volta creato, il tandem è fisso."
        />
        <Rule
          emoji="📅"
          title="Sfida settimanale"
          desc="Ogni settimana il tuo tandem viene abbinato casualmente ad un altro. Vince chi guadagna più cuori da lunedì a domenica."
        />
      </Section>

      {/* Classifiche */}
      <Section title="📊 Classifiche">
        <Rule
          emoji="🥇"
          title="Tre periodi"
          desc="Le classifiche mostrano i punteggi della settimana corrente, del mese corrente, o di sempre (assoluta)."
        />
        <Rule
          emoji="👤"
          title="Tre categorie"
          desc="Singoli (punteggio personale), Tandem (somma della coppia), Clan (somma del gruppo)."
        />
        <Rule
          emoji="⚡️"
          title="Punteggio sfide"
          desc="Le sfide si basano sul saldo netto del periodo: cuori guadagnati con lo sport MENO cuori persi con i drink."
        />
      </Section>

      {/* Notifiche */}
      <Section title="🔔 Notifiche">
        <Rule
          emoji="📊"
          title="Recap settimanale"
          desc="Ogni lunedì ricevi un riassunto della settimana: drink, cuori guadagnati e persi, leader del clan."
        />
        <Rule
          emoji="🏆"
          title="Sorpasso in classifica"
          desc="Ricevi una notifica quando qualcuno ti supera in classifica. Motivazione garantita!"
        />
      </Section>

      {/* Badge */}
      <Section title="🏅 Badge">
        <Text style={styles.bodyText}>
          Sblocca badge completando obiettivi. Trovi i tuoi badge nel profilo — sfida gli amici a sbloccarne di più!
        </Text>
        <View style={styles.badgeGrid}>
          {[
            { e: '🍺', n: 'Prima Birra' },
            { e: '👟', n: 'Primo Passo' },
            { e: '🐷', n: 'Maialino DOC' },
            { e: '💪', n: 'Atleta' },
            { e: '🍾', n: 'Party Animal' },
            { e: '🔥', n: 'In Forma' },
            { e: '🏔️', n: 'Alpinista' },
            { e: '⚖️', n: 'In Equilibrio' },
          ].map((b) => (
            <View key={b.n} style={styles.badgeItem}>
              <Text style={styles.badgeEmoji}>{b.e}</Text>
              <Text style={styles.badgeName}>{b.n}</Text>
            </View>
          ))}
        </View>
      </Section>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Buona birresponsabilità! 🐷🍺</Text>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f7' },
  content: { padding: 16, paddingBottom: 48 },

  heroCard: {
    backgroundColor: '#1a1a1a', borderRadius: 20, padding: 24,
    alignItems: 'center', marginBottom: 24,
  },
  heroEmoji: { fontSize: 40, marginBottom: 10 },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#FFD700', marginBottom: 10, textAlign: 'center' },
  heroSub: { fontSize: 14, color: '#aaa', textAlign: 'center', lineHeight: 22 },

  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 13, fontWeight: '800', color: '#aaa',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12,
  },

  bodyText: { fontSize: 14, color: '#555', lineHeight: 22, marginBottom: 12 },

  tableCard: {
    backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  tableHeader: {
    fontSize: 13, fontWeight: '700', color: '#fff',
    backgroundColor: '#1a1a1a', padding: 12,
  },
  scoreRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  scoreLabel: { fontSize: 14, color: '#333' },
  scoreValue: { fontSize: 14, fontWeight: '700' },
  tableNote: { fontSize: 12, color: '#aaa', padding: 10, fontStyle: 'italic' },

  rule: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14,
    padding: 14, marginBottom: 8, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  ruleEmoji: { fontSize: 26, width: 34, textAlign: 'center' },
  ruleTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', marginBottom: 3 },
  ruleDesc: { fontSize: 13, color: '#666', lineHeight: 20 },

  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  badgeItem: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12,
    alignItems: 'center', width: '22%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  badgeEmoji: { fontSize: 24, marginBottom: 4 },
  badgeName: { fontSize: 9, color: '#555', textAlign: 'center', fontWeight: '600' },

  footer: { alignItems: 'center', paddingTop: 8 },
  footerText: { fontSize: 16, color: '#aaa' },
});
