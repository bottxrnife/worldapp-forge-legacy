import '../src/polyfills';

import {
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
  Geist_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/geist';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { loadLoyaltyState, loadThemePreference, useApp } from '../src/state/store';
import { C } from '../src/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});
loadThemePreference();
loadLoyaltyState();

export default function RootLayout() {
  const themeMode = useApp((s) => s.themeMode);
  const [loaded] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
    Geist_800ExtraBold,
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);

  if (!loaded) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  const stack = (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'none',
        contentStyle: { backgroundColor: C.bg },
      }}
    />
  );

  const statusBarStyle = themeMode === 'dark' ? 'light' : 'dark';

  if (Platform.OS === 'web') {
    return (
      <SafeAreaProvider>
        <StatusBar style={statusBarStyle} />
        <View
          style={{
            flex: 1,
            minHeight: '100vh' as unknown as number,
            backgroundColor: themeMode === 'dark' ? '#05070C' : '#E2E5EE',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 24,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 392,
              flex: 1,
              maxHeight: 846,
              backgroundColor: C.bg,
              borderRadius: 28,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: C.divider,
              shadowColor: '#0B1020',
              shadowOpacity: 0.12,
              shadowRadius: 40,
              shadowOffset: { width: 0, height: 16 },
            }}
          >
            {stack}
          </View>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style={statusBarStyle} />
      {stack}
    </SafeAreaProvider>
  );
}
