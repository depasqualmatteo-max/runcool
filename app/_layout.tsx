import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider } from '@/context/AuthContext';
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

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  useEffect(() => {
    injectIOSPWATags();
  }, []);

  return (
    <AuthProvider>
      <AppProvider>
        {loaded ? <RootLayoutNav /> : null}
      </AppProvider>
    </AuthProvider>
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
            title: 'Il mio profilo',
            presentation: 'modal',
            headerStyle: { backgroundColor: '#fff' },
            headerTitleStyle: { fontWeight: '700', color: '#1a1a1a' },
            headerShadowVisible: false,
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
