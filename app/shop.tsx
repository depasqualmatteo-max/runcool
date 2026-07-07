import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Dimensions,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { PigSkin } from '@/components/PigSkin';
import { PigBgView } from '@/components/PigBgView';
import {
  SHOP_SKINS, SHOP_BGS, VARIANT_SKIN_IDS,
  GOLD_PRICE, PRO_GOLD_PRICE, PRO_POINTS_NEEDED,
  SKIN_VARIANT_IMAGES, SkinVariant,
} from '@/constants/shop';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeColors } from '@/constants/Colors';

const SCREEN_W = Dimensions.get('window').width;
const ITEM_W = (SCREEN_W - 48 - 14) / 2;
const BG_ITEM_W = (SCREEN_W - 36 - 10 * 3) / 4;

type Tab = 'skin' | 'sfondo';

function computeEarnedMedalIds(logs: any[]): Set<string> {
  const drinks = logs.filter(l => l.type === 'drink');
  const workouts = logs.filter(l => l.type === 'workout');
  const earned = new Set<string>();
  if (drinks.length >= 100) earned.add('alcolizzato');
  if (drinks.length + workouts.length >= 100) earned.add('centurione');
  return earned;
}

export default function ShopScreen() {
  const { user } = useAuth();
  const { state } = useApp();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const params = useLocalSearchParams<{ tab?: string }>();
  const earnedMedalIds = computeEarnedMedalIds(state.logs);

  const [tokens, setTokens] = useState(0);
  const [ownedSkins, setOwnedSkins] = useState<number[]>([0]);
  const [ownedGoldSkins, setOwnedGoldSkins] = useState<number[]>([]);
  const [ownedProSkins, setOwnedProSkins] = useState<number[]>([]);
  const [ownedProGoldSkins, setOwnedProGoldSkins] = useState<number[]>([]);
  const [ownedBgs, setOwnedBgs] = useState<number[]>([0]);
  const [activeSkin, setActiveSkin] = useState(0);
  const [activeSkinVariant, setActiveSkinVariant] = useState<SkinVariant>('base');
  const [activeBg, setActiveBg] = useState(0);
  const [skinPoints, setSkinPoints] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>(params.tab === 'sfondo' ? 'sfondo' : 'skin');
  const [expandedSkinId, setExpandedSkinId] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles')
      .select('tokens, pig_skin, pig_bg, pig_owned_skins, pig_owned_bgs, pig_owned_gold_skins, pig_owned_pro_skins, pig_owned_pro_gold_skins, pig_skin_variant, pig_skin_points')
      .eq('id', user.id).single()
      .then(({ data }) => {
        if (data) {
          setTokens(data.tokens ?? 0);
          setActiveSkin(data.pig_skin ?? 0);
          setActiveSkinVariant((data.pig_skin_variant as SkinVariant) ?? 'base');
          setActiveBg(data.pig_bg ?? 0);
          setOwnedSkins(data.pig_owned_skins ?? [0]);
          setOwnedBgs(data.pig_owned_bgs ?? [0]);
          setOwnedGoldSkins(data.pig_owned_gold_skins ?? []);
          setOwnedProSkins(data.pig_owned_pro_skins ?? []);
          setOwnedProGoldSkins(data.pig_owned_pro_gold_skins ?? []);
          setSkinPoints(data.pig_skin_points ?? {});
        }
        setLoading(false);
      });
  }, [user?.id]);

  // ── Equip ──────────────────────────────────────────────────
  async function equipSkin(id: number, variant: SkinVariant = 'base') {
    if (!user || saving) return;
    setSaving(true);
    await supabase.from('profiles').update({ pig_skin: id, pig_skin_variant: variant }).eq('id', user.id);
    setActiveSkin(id); setActiveSkinVariant(variant);
    setSaving(false);
  }

  async function equipBg(id: number) {
    if (!user || saving) return;
    setSaving(true);
    await supabase.from('profiles').update({ pig_bg: id }).eq('id', user.id);
    setActiveBg(id);
    setSaving(false);
  }

  // ── Buy base skin ──────────────────────────────────────────
  async function buySkin(id: number) {
    const skin = SHOP_SKINS.find(s => s.id === id);
    if (!skin || !user) return;
    if (skin.animalLocked) { Alert.alert('Non disponibile', 'Questa skin si sblocca con missioni speciali — in arrivo!'); return; }
    if (ownedSkins.includes(id)) { await equipSkin(id); return; }
    if (skin.achievement) {
      const unlocked = skin.achievementMedalId ? earnedMedalIds.has(skin.achievementMedalId) : false;
      if (!unlocked) { Alert.alert('Achievement richiesto', 'Sblocca la medaglia per ottenere questa skin.'); return; }
      Alert.alert('Sblocca skin', `Vuoi sbloccare "${skin.name}"?`, [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Sblocca', onPress: async () => {
          setSaving(true);
          const newOwned = [...ownedSkins, id];
          await supabase.from('profiles').update({ pig_skin: id, pig_owned_skins: newOwned, pig_skin_variant: 'base' }).eq('id', user.id);
          setOwnedSkins(newOwned); setActiveSkin(id); setActiveSkinVariant('base');
          setSaving(false);
        }},
      ]);
      return;
    }
    if (tokens < skin.price) { Alert.alert('Gettoni insufficienti', `Ti servono ${skin.price} 🎟`); return; }
    Alert.alert('Conferma acquisto', `Comprare "${skin.name}" per ${skin.price} 🎟?`, [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Compra', onPress: async () => {
        setSaving(true);
        const newTokens = tokens - skin.price;
        const newOwned = [...ownedSkins, id];
        await supabase.from('profiles').update({ tokens: newTokens, pig_skin: id, pig_owned_skins: newOwned, pig_skin_variant: 'base' }).eq('id', user.id);
        setTokens(newTokens); setOwnedSkins(newOwned); setActiveSkin(id); setActiveSkinVariant('base');
        setSaving(false);
      }},
    ]);
  }

  // ── Buy gold variant ───────────────────────────────────────
  async function buyGold(skinId: number) {
    if (!user) return;
    if (ownedGoldSkins.includes(skinId)) { await equipSkin(skinId, 'gold'); return; }
    if (tokens < GOLD_PRICE) { Alert.alert('Gettoni insufficienti', `Ti servono ${GOLD_PRICE} 🎟`); return; }
    Alert.alert('Conferma acquisto', `Comprare la versione Oro per ${GOLD_PRICE} 🎟?`, [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Compra', onPress: async () => {
        setSaving(true);
        const newTokens = tokens - GOLD_PRICE;
        const newOwned = [...ownedGoldSkins, skinId];
        await supabase.from('profiles').update({ tokens: newTokens, pig_skin: skinId, pig_owned_gold_skins: newOwned, pig_skin_variant: 'gold' }).eq('id', user.id);
        setTokens(newTokens); setOwnedGoldSkins(newOwned); setActiveSkin(skinId); setActiveSkinVariant('gold');
        setSaving(false);
      }},
    ]);
  }

  // ── Equip pro (già sbloccata) ──────────────────────────────
  async function equipPro(skinId: number) {
    await equipSkin(skinId, 'pro');
  }

  // ── Buy proGold ───────────────────────────────────────────
  async function buyProGold(skinId: number) {
    if (!user) return;
    if (ownedProGoldSkins.includes(skinId)) { await equipSkin(skinId, 'proGold'); return; }
    if (tokens < PRO_GOLD_PRICE) { Alert.alert('Gettoni insufficienti', `Ti servono ${PRO_GOLD_PRICE} 🎟`); return; }
    Alert.alert('Conferma acquisto', `Comprare la versione Pro Oro per ${PRO_GOLD_PRICE} 🎟?`, [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Compra', onPress: async () => {
        setSaving(true);
        const newTokens = tokens - PRO_GOLD_PRICE;
        const newOwned = [...ownedProGoldSkins, skinId];
        await supabase.from('profiles').update({ tokens: newTokens, pig_skin: skinId, pig_owned_pro_gold_skins: newOwned, pig_skin_variant: 'proGold' }).eq('id', user.id);
        setTokens(newTokens); setOwnedProGoldSkins(newOwned); setActiveSkin(skinId); setActiveSkinVariant('proGold');
        setSaving(false);
      }},
    ]);
  }

  // ── Buy sfondo ─────────────────────────────────────────────
  async function buyBg(id: number) {
    const bg = SHOP_BGS.find(b => b.id === id);
    if (!bg || !user) return;
    if (ownedBgs.includes(id)) { await equipBg(id); return; }
    if (tokens < bg.price) { Alert.alert('Gettoni insufficienti', `Ti servono ${bg.price} 🎟`); return; }
    Alert.alert('Conferma acquisto', `Comprare lo sfondo "${bg.name}" per ${bg.price} 🎟?`, [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Compra', onPress: async () => {
        setSaving(true);
        const newTokens = tokens - bg.price;
        const newOwned = [...ownedBgs, id];
        await supabase.from('profiles').update({ tokens: newTokens, pig_bg: id, pig_owned_bgs: newOwned }).eq('id', user.id);
        setTokens(newTokens); setOwnedBgs(newOwned); setActiveBg(id);
        setSaving(false);
      }},
    ]);
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color="#FFD700" size="large" /></View>;

  const sortedSkins = [...SHOP_SKINS].sort((a, b) => {
    const aO = ownedSkins.includes(a.id) ? 0 : 1;
    const bO = ownedSkins.includes(b.id) ? 0 : 1;
    return aO - bO;
  });

  const sortedBgs = [...SHOP_BGS].sort((a, b) => {
    const aO = ownedBgs.includes(a.id) ? 0 : 1;
    const bO = ownedBgs.includes(b.id) ? 0 : 1;
    return aO - bO;
  });

  const isActiveVariant = (id: number, v: SkinVariant) => activeSkin === id && activeSkinVariant === v;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Hero */}
      <View style={styles.heroCard}>
        <View style={styles.heroLeft}>
          <Text style={styles.heroLabel}>I TUOI GETTONI</Text>
          <Text style={styles.heroTokens}>🎟 {tokens}</Text>
          <Text style={styles.heroHint}>Vinci missioni per guadagnarne altri</Text>
        </View>
        <View style={styles.heroRight}>
          <PigBgView bgId={activeBg} width={150} height={110} square style={styles.heroPig}>
            <PigSkin skinId={activeSkin} variant={activeSkinVariant} size={78} />
          </PigBgView>
          <Text style={styles.heroPreviewLabel}>Il tuo maialino</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabBtn, tab === 'skin' && styles.tabBtnActive]} onPress={() => setTab('skin')}>
          <Text style={[styles.tabText, tab === 'skin' && styles.tabTextActive]}>🐷 Skin</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tab === 'sfondo' && styles.tabBtnActive]} onPress={() => setTab('sfondo')}>
          <Text style={[styles.tabText, tab === 'sfondo' && styles.tabTextActive]}>🎨 Sfondi</Text>
        </TouchableOpacity>
      </View>

      {/* Skin grid */}
      {tab === 'skin' && (
        <View style={styles.bgGrid}>
          {sortedSkins.map(skin => {
            const owned = ownedSkins.includes(skin.id);
            const active = activeSkin === skin.id && activeSkinVariant === 'base';
            const achievementUnlocked = !!(skin.achievement && skin.achievementMedalId && earnedMedalIds.has(skin.achievementMedalId));
            const unlocked = owned || achievementUnlocked;
            const isAnimal = !!skin.animalLocked;
            const hasVariants = VARIANT_SKIN_IDS.includes(skin.id);

            const ownedGold = ownedGoldSkins.includes(skin.id);
            const ownedPro = ownedProSkins.includes(skin.id);
            const ownedProGold = ownedProGoldSkins.includes(skin.id);
            const pts = skinPoints[String(skin.id)] ?? 0;

            return (
              <View key={skin.id} style={[styles.bgItem, active && styles.itemActive, isAnimal && styles.itemAnimal, !unlocked && !isAnimal && styles.itemLocked]}>
                {/* Skin base */}
                <TouchableOpacity
                  style={styles.skinMainTouch}
                  onPress={() => {
                    if (isAnimal) { Alert.alert('In arrivo', 'Questa skin si sblocca con missioni speciali.'); return; }
                    buySkin(skin.id);
                    if (hasVariants) setExpandedSkinId(id => id === skin.id ? null : skin.id);
                  }}
                  disabled={saving}
                  activeOpacity={0.75}
                >
                  <PigBgView bgId={activeBg} size={BG_ITEM_W - 12} style={{ opacity: isAnimal ? 0.25 : (active || unlocked ? 1 : 0.35), marginBottom: 5 }}>
                    <PigSkin skinId={skin.id} size={(BG_ITEM_W - 12) * 0.75} silhouette={isAnimal} />
                  </PigBgView>
                  <Text style={[styles.bgItemName, (!unlocked || isAnimal) && { opacity: 0.4 }]} numberOfLines={1}>{skin.name}</Text>

                  {isAnimal ? (
                    <View style={styles.badgeLocked}><Text style={styles.badgeLockedText}>🔒</Text></View>
                  ) : active ? (
                    <View style={styles.badgeActive}><Text style={styles.badgeActiveText}>✓</Text></View>
                  ) : unlocked ? (
                    <View style={styles.badgeOwned}><Text style={styles.badgeOwnedText}>Indossa</Text></View>
                  ) : skin.achievement ? (
                    <View style={styles.badgeAchievement}><Text style={styles.badgeAchievementText}>🏆</Text></View>
                  ) : (
                    <View style={styles.badgePrice}><Text style={styles.badgePriceText}>{skin.price === 0 ? '🎁' : `${skin.price}🎟`}</Text></View>
                  )}
                </TouchableOpacity>

                {/* Varianti (solo se owned, ha PNG, e la skin è stata cliccata) */}
                {unlocked && hasVariants && expandedSkinId === skin.id && (
                  <View style={styles.variantRow}>
                    {/* GOLD (solo se esiste l'immagine) */}
                    {SKIN_VARIANT_IMAGES[skin.id]?.gold && (
                      <TouchableOpacity
                        style={[styles.variantBox, isActiveVariant(skin.id, 'gold') && styles.variantBoxActive]}
                        onPress={() => buyGold(skin.id)}
                        disabled={saving}
                      >
                        <PigSkin
                          skinId={skin.id} variant="gold" size={36}
                          opacity={ownedGold ? 1 : 0.3}
                        />
                        <Text style={styles.variantLabel}>
                          {isActiveVariant(skin.id, 'gold') ? '✓' : ownedGold ? '🥇' : `${GOLD_PRICE}🎟`}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* PRO */}
                    <TouchableOpacity
                      style={[styles.variantBox, isActiveVariant(skin.id, 'pro') && styles.variantBoxActive]}
                      onPress={() => ownedPro ? equipPro(skin.id) : Alert.alert('Skin Pro', `Indossa questa skin e guadagna punti allenandoti.\n\nProgresso: ${Math.min(pts, PRO_POINTS_NEEDED)}/${PRO_POINTS_NEEDED} punti\n\n• 500 m di corsa = 1 punto\n• 12 minuti di attività = 1 punto`)}
                      disabled={saving}
                    >
                      <PigSkin
                        skinId={skin.id} variant="pro" size={36}
                        silhouette={!ownedPro} opacity={ownedPro ? 1 : 0.45}
                      />
                      <Text style={styles.variantLabel}>
                        {isActiveVariant(skin.id, 'pro') ? '✓' : ownedPro ? '⭐' : `${Math.min(pts, PRO_POINTS_NEEDED)}/${PRO_POINTS_NEEDED}`}
                      </Text>
                    </TouchableOpacity>

                    {/* PRO GOLD (solo se pro owned) */}
                    {ownedPro && (
                      <TouchableOpacity
                        style={[styles.variantBox, isActiveVariant(skin.id, 'proGold') && styles.variantBoxActive]}
                        onPress={() => buyProGold(skin.id)}
                        disabled={saving}
                      >
                        <PigSkin
                          skinId={skin.id} variant="proGold" size={36}
                          opacity={ownedProGold ? 1 : 0.3}
                        />
                        <Text style={styles.variantLabel}>
                          {isActiveVariant(skin.id, 'proGold') ? '✓' : ownedProGold ? '👑' : `${PRO_GOLD_PRICE}🎟`}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}


      {/* Sfondo grid — 4 colonne */}
      {tab === 'sfondo' && (
        <View style={styles.bgGrid}>
          {sortedBgs.filter(bg => bg.image && (!bg.secretOnly || ownedBgs.includes(bg.id))).map(bg => {
            const owned = ownedBgs.includes(bg.id);
            const active = activeBg === bg.id;
            return (
              <TouchableOpacity
                key={bg.id}
                style={[styles.bgItem, active && styles.itemActive, !owned && !active && styles.itemLocked]}
                onPress={() => buyBg(bg.id)}
                disabled={saving}
                activeOpacity={0.75}
              >
                <PigBgView bgId={bg.id} size={BG_ITEM_W - 12} style={{ opacity: owned ? 1 : 0.35, marginBottom: 5 }}>
                  <PigSkin skinId={activeSkin} variant={activeSkinVariant} size={(BG_ITEM_W - 12) * 0.75} />
                </PigBgView>
                <Text style={styles.bgItemName} numberOfLines={1}>{bg.name}</Text>
                {active ? (
                  <View style={styles.badgeActive}><Text style={styles.badgeActiveText}>✓</Text></View>
                ) : owned ? (
                  <View style={styles.badgeOwned}><Text style={styles.badgeOwnedText}>Indossa</Text></View>
                ) : (
                  <View style={styles.badgePrice}><Text style={styles.badgePriceText}>{bg.price === 0 ? '🎁' : `${bg.price}🎟`}</Text></View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const GOLD = '#FFD700';
const GOLD_DARK = '#b8860b';

function makeStyles(colors: ThemeColors, isDark: boolean) {
  const GOLD_BG = isDark ? '#332a0d' : '#FFFBEA';
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 18, paddingBottom: 48 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    heroCard: {
      backgroundColor: colors.card, borderRadius: 24, padding: 20,
      flexDirection: 'row', alignItems: 'center', marginBottom: 18,
      borderWidth: 2, borderColor: GOLD,
      shadowColor: GOLD, shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.1 : 0.25, shadowRadius: 12, elevation: isDark ? 0 : 6,
    },
    heroLeft: { flex: 1 },
    heroLabel: { fontSize: 10, fontWeight: '800', color: colors.textFaint, letterSpacing: 1.5, marginBottom: 4 },
    heroTokens: { fontSize: 32, fontWeight: '900', color: GOLD_DARK, marginBottom: 4 },
    heroHint: { fontSize: 11, color: colors.textFaint, lineHeight: 15 },
    heroRight: { alignItems: 'center', marginLeft: 16 },
    heroPig: {
      borderRadius: 22, alignItems: 'center', justifyContent: 'center',
      borderWidth: 3, borderColor: GOLD,
      shadowColor: GOLD, shadowOffset: { width: 0, height: 3 }, shadowOpacity: isDark ? 0.2 : 0.5, shadowRadius: 8, elevation: isDark ? 0 : 4,
      overflow: 'hidden',
    },
    heroPreviewLabel: { fontSize: 10, color: colors.textFaint, fontWeight: '700', marginTop: 6 },

    tabRow: { flexDirection: 'row', backgroundColor: colors.bgAlt, borderRadius: 16, padding: 4, marginBottom: 18 },
    tabBtn: { flex: 1, paddingVertical: 12, borderRadius: 13, alignItems: 'center' },
    tabBtnActive: { backgroundColor: colors.card, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: isDark ? 0 : 0.1, shadowRadius: 6, elevation: isDark ? 0 : 3 },
    tabText: { fontSize: 14, fontWeight: '700', color: colors.textFaint },
    tabTextActive: { color: colors.text, fontWeight: '900' },

    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
    sectionLabel: { fontSize: 12, fontWeight: '800', color: colors.textFaint, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
    colorDot: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
    colorDotActive: { borderColor: GOLD, transform: [{ scale: 1.15 }] },
    bgGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    bgItem: {
      width: BG_ITEM_W, backgroundColor: colors.card, borderRadius: 14,
      alignItems: 'center', paddingTop: 10, paddingBottom: 8, paddingHorizontal: 4,
      borderWidth: 2, borderColor: colors.border,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: isDark ? 0 : 0.07, shadowRadius: 8, elevation: isDark ? 0 : 3,
    },
    bgItemName: { fontSize: 10, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 5 },
    item: {
      width: ITEM_W, backgroundColor: colors.card, borderRadius: 20,
      alignItems: 'center', paddingTop: 16, paddingBottom: 14, paddingHorizontal: 10,
      borderWidth: 2, borderColor: colors.border,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: isDark ? 0 : 0.07, shadowRadius: 8, elevation: isDark ? 0 : 3,
    },
    itemActive: { borderColor: GOLD, backgroundColor: GOLD_BG, shadowColor: GOLD, shadowOpacity: isDark ? 0.15 : 0.3, shadowRadius: 12 },
    itemLocked: { borderColor: colors.border, backgroundColor: colors.bgAlt },
    itemAnimal: { borderColor: colors.border, backgroundColor: colors.bgAlt },
    skinMainTouch: { alignItems: 'center', width: '100%' },
    itemName: { fontSize: 13, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 8 },

    // Varianti
    variantRow: {
      flexDirection: 'row', gap: 6, marginTop: 10,
      borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, width: '100%', justifyContent: 'center',
    },
    variantBox: {
      alignItems: 'center', padding: 6, borderRadius: 10,
      borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.bgAlt, minWidth: 48,
    },
    variantBoxActive: { borderColor: GOLD, backgroundColor: GOLD_BG },
    variantLabel: { fontSize: 10, fontWeight: '800', color: colors.textDim, marginTop: 3 },

    // Badge
    badgeActive: { backgroundColor: isDark ? '#1c3320' : '#E8F5E9', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1.5, borderColor: '#4CAF50' },
    badgeActiveText: { fontSize: 11, fontWeight: '800', color: isDark ? '#7ed896' : '#2E7D32' },
    badgeOwned: { backgroundColor: isDark ? '#16273a' : '#E3F2FD', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
    badgeOwnedText: { fontSize: 11, fontWeight: '700', color: isDark ? '#7eb8f0' : '#1565C0' },
    badgePrice: { backgroundColor: GOLD_BG, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1.5, borderColor: GOLD },
    badgePriceText: { fontSize: 11, fontWeight: '800', color: GOLD_DARK },
    badgeAchievement: { backgroundColor: isDark ? '#2a1830' : '#F3E5F5', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1.5, borderColor: '#9C27B0' },
    badgeAchievementText: { fontSize: 10, fontWeight: '800', color: isDark ? '#d896f0' : '#6A1B9A' },
    badgeLocked: { backgroundColor: colors.bgAlt, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
    badgeLockedText: { fontSize: 11, fontWeight: '700', color: colors.textFaint },
  });
}
