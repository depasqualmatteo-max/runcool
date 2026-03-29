import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

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

  const token = (await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID })).data;
  return token;
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
export function isMondayAndNotSentYet(lastSentKey: string): boolean {
  const today = new Date();
  if (today.getDay() !== 1) return false; // 1 = lunedì

  const lastSent = global.__weeklyRecapSent;
  const todayStr = today.toISOString().split('T')[0];
  if (lastSent === todayStr) return false;

  global.__weeklyRecapSent = todayStr;
  return true;
}
