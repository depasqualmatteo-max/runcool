import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const KEY_LAST_DATE = 'mentality_last_date';
const KEY_QUARTERS = 'mentality_quarters';

export async function getMentalityState(): Promise<{ quarters: number; lastDate: string | null }> {
  const [lastDate, quarters] = await Promise.all([
    AsyncStorage.getItem(KEY_LAST_DATE),
    AsyncStorage.getItem(KEY_QUARTERS),
  ]);
  return { quarters: parseInt(quarters ?? '0', 10), lastDate };
}

/**
 * Controlla se oggi è un nuovo giorno e assegna 1/4 di cuore.
 * Se si raggiungono 4/4, restituisce fullHeart=true (il chiamante aggiunge 1 cuore).
 * Se userId è fornito, salva anche un log su Supabase per il tracking delle missioni.
 */
export async function checkAndAwardMentality(userId?: string): Promise<{
  awarded: boolean;
  newQuarters: number;
  fullHeart: boolean;
}> {
  const today = new Date().toISOString().slice(0, 10);
  const { quarters, lastDate } = await getMentalityState();

  // Già aperta oggi
  if (lastDate === today) {
    return { awarded: false, newQuarters: quarters, fullHeart: false };
  }

  const next = quarters + 1;
  const fullHeart = next >= 4;

  await AsyncStorage.setItem(KEY_LAST_DATE, today);
  await AsyncStorage.setItem(KEY_QUARTERS, fullHeart ? '0' : String(next));

  // Salva log su DB per il tracking delle missioni (in background, non blocca)
  if (userId) {
    supabase.from('logs').insert({
      user_id: userId,
      type: 'mentality',
      item_id: 'mentality',
      item_name: 'Mentality',
      quantity: 1,
      calories: 0,
      hearts_delta: 0.25,
    }).then(() => {}).catch(() => {});
  }

  return { awarded: true, newQuarters: fullHeart ? 0 : next, fullHeart };
}
