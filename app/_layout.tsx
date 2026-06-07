import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AppProvider } from '@/context/AppContext';

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

// Nasconde il splash screen solo quando font E auth sono entrambi pronti
function SplashGate({ fontsLoaded, children }: { fontsLoaded: boolean; children: React.ReactNode }) {
  const { isLoading } = useAuth();
  const [timedOut, setTimedOut] = React.useState(false);

  // Timeout di sicurezza: dopo 4s nascondi lo splash comunque
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 4000);
    return () => clearTimeout(t);
  }, []);

  const ready = fontsLoaded && (!isLoading || timedOut);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: '#ffffff' }} />;
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

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppProvider>
          <SplashGate fontsLoaded={!!loaded}>
            <RootLayoutNav />
          </SplashGate>
        </AppProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen
          name="profilo"
          options={{
            title: 'Profilo personale',
            presentation: 'modal',
            headerStyle: { backgroundColor: '#fff' },
            headerTitleStyle: { fontWeight: '700', color: '#1a1a1a' },
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="regole"
          options={{
            title: '📖 Regole del gioco',
            presentation: 'modal',
            headerStyle: { backgroundColor: '#fff' },
            headerTitleStyle: { fontWeight: '700', color: '#1a1a1a' },
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
      </Stack>
    </ThemeProvider>
  );
}
