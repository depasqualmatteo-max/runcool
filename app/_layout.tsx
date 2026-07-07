import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import React, { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { saveReceivedNotification } from '@/lib/notifications';

import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AppProvider } from '@/context/AppContext';
import { ThemeProvider as AppThemeProvider, useTheme } from '@/context/ThemeContext';

// Inietta i meta tag iOS PWA nel DOM (necessario per standalone mode)
function injectIOSPWATags() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const metas = [
    { name: 'apple-mobile-web-app-capable',           content: 'yes' },
    { name: 'apple-mobile-web-app-status-bar-style',  content: 'black-translucent' },
    { name: 'apple-mobile-web-app-title',             content: 'RunCool' },
    { name: 'mobile-web-app-capable',                 content: 'yes' },
    { name: 'theme-color',                            content: '#FFD700' },
  ];
  metas.forEach(({ name, content }) => {
    if (!document.querySelector(`meta[name="${name}"]`)) {
      const m = document.createElement('meta');
      m.name = name; m.content = content;
      document.head.appendChild(m);
    }
  });
  if (!document.querySelector('link[rel="apple-touch-icon"]')) {
    const l = document.createElement('link');
    l.rel = 'apple-touch-icon';
    l.href = '/assets/images/icon.png';
    document.head.appendChild(l);
  }
  if (!document.querySelector('link[rel="manifest"]')) {
    const l = document.createElement('link');
    l.rel = 'manifest';
    l.href = '/manifest.json';
    document.head.appendChild(l);
  }
}

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

// Nasconde il splash screen appena i font sono pronti
function SplashGate({ fontsLoaded, children }: { fontsLoaded: boolean; children: React.ReactNode }) {
  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: '#ffffff' }} />;
  return <>{children}</>;
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    injectIOSPWATags();
  }, []);

  useEffect(() => {
    // Foreground: notifica arrivata con app aperta
    const subFg = Notifications.addNotificationReceivedListener((notif) => {
      const title = notif.request.content.title ?? '';
      const body = notif.request.content.body ?? '';
      saveReceivedNotification(title, body);
    });

    // Background/killed: utente ha tappato la notifica
    const subBg = Notifications.addNotificationResponseReceivedListener((response) => {
      const title = response.notification.request.content.title ?? '';
      const body = response.notification.request.content.body ?? '';
      saveReceivedNotification(title, body);
    });

    // App lanciata tappando una notifica (stato killed)
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const title = response.notification.request.content.title ?? '';
      const body = response.notification.request.content.body ?? '';
      saveReceivedNotification(title, body);
    });

    return () => { subFg.remove(); subBg.remove(); };
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppThemeProvider>
          <AppProvider>
            <SplashGate fontsLoaded={!!loaded}>
              <RootLayoutNav />
            </SplashGate>
          </AppProvider>
        </AppThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function RootLayoutNav() {
  const { isDark, colors } = useTheme();
  return (
    <NavThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen
          name="profilo"
          options={{
            title: 'Profilo personale',
            presentation: 'modal',
            headerStyle: { backgroundColor: colors.card },
            headerTitleStyle: { fontWeight: '700', color: colors.text },
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="regole"
          options={{
            title: '📖 Regole del gioco',
            presentation: 'modal',
            headerStyle: { backgroundColor: colors.card },
            headerTitleStyle: { fontWeight: '700', color: colors.text },
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="reset-password"
          options={{
            title: 'Nuova password',
            headerStyle: { backgroundColor: colors.card },
            headerTitleStyle: { fontWeight: '700', color: colors.text },
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="admin"
          options={{
            title: '⚙️ Admin',
            presentation: 'modal',
            headerStyle: { backgroundColor: '#1a1a1a' },
            headerTitleStyle: { fontWeight: '700', color: '#FFD700' },
            headerShadowVisible: false,
            headerTintColor: '#FFD700',
          }}
        />
        <Stack.Screen
          name="notifiche"
          options={{
            title: '🔔 Notifiche',
            presentation: 'modal',
            headerStyle: { backgroundColor: colors.card },
            headerTitleStyle: { fontWeight: '700', color: colors.text },
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="shop"
          options={{
            title: '🐷 La Stalla',
            headerStyle: { backgroundColor: colors.card },
            headerTitleStyle: { fontWeight: '800', color: colors.text },
            headerShadowVisible: false,
          }}
        />
      </Stack>
    </NavThemeProvider>
  );
}
