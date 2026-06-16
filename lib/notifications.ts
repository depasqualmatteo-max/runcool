import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PROJECT_ID = '730ff266-09d0-4b0a-94b0-9891663f40aa';

// Configura il comportamento delle notifiche in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Registra il dispositivo e ottieni il push token
// Ritorna { token, error } — error è null se tutto ok
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'RunCool',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FFD700',
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  try {
    const token = (await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID })).data;
    return token;
  } catch (e: any) {
    throw new Error(e?.message ?? 'Errore sconosciuto nel recupero del token');
  }
}

// Versione diagnostica: ritorna il token o lancia con messaggio dettagliato
export async function debugRegisterForPushNotifications(): Promise<string> {
  if (!Device.isDevice) throw new Error('Non è un dispositivo fisico (isDevice=false)');

  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'RunCool',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FFD700',
      });
    } catch (e: any) {
      throw new Error('Errore creazione canale Android: ' + (e?.message ?? e));
    }
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') throw new Error(`Permesso notifiche negato (status: ${finalStatus})`);

  try {
    const result = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID });
    return result.data;
  } catch (e: any) {
    throw new Error('getExpoPushTokenAsync fallito: ' + (e?.message ?? e));
  }
}

// Manda una notifica push via Expo Push API
export async function sendPushNotification(
  to: string,
  title: string,
  body: string,
) {
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ to, title, body, sound: 'default' }),
    });
  } catch (_) {
    // Ignora errori di rete — le notifiche non sono critiche
  }
}

// Controlla se oggi è lunedì e non abbiamo ancora mandato il recap settimanale
const RECAP_STORAGE_KEY = 'weekly_recap_sent';

export async function isMondayAndNotSentYet(lastSentKey: string): Promise<boolean> {
  const today = new Date();
  if (today.getDay() !== 1) return false; // 1 = lunedì

  const todayStr = today.toISOString().split('T')[0];
  try {
    const lastSent = await AsyncStorage.getItem(RECAP_STORAGE_KEY);
    if (lastSent === todayStr) return false;
    await AsyncStorage.setItem(RECAP_STORAGE_KEY, todayStr);
  } catch (_) {}
  return true;
}
