import * as Location from 'expo-location';

let _cachedCountry: string | null = null;
let _cacheTimestamp = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 ora

/**
 * Ottiene il codice ISO del paese corrente (es. "IT", "FR", "US").
 * Usa expo-location con cache di 1 ora per non bombardare il GPS.
 * Ritorna null se non riesce (permessi negati, errore, ecc).
 */
export async function getCountryCode(): Promise<string | null> {
  if (_cachedCountry && Date.now() - _cacheTimestamp < CACHE_DURATION) {
    return _cachedCountry;
  }

  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
      if (newStatus !== 'granted') return null;
    }

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Low,
    });

    const [geo] = await Location.reverseGeocodeAsync({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    });

    if (geo?.isoCountryCode) {
      _cachedCountry = geo.isoCountryCode;
      _cacheTimestamp = Date.now();
      return geo.isoCountryCode;
    }
  } catch (_) {}

  return null;
}
