import AsyncStorage from '@react-native-async-storage/async-storage';

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
 */
export async function checkAndAwardMentality(): Promise<{
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

  return { awarded: true, newQuarters: fullHeart ? 0 : next, fullHeart };
}
