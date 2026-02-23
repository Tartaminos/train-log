import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initDatabase } from '../src/data/database';
import { syncAndroidNavigationBarDynamicMode } from '../src/ui/system-ui/androidNavigationBar';
import { theme } from '../src/ui/theme';

export default function RootLayout() {
  useEffect(() => {
    syncAndroidNavigationBarDynamicMode();

    initDatabase().catch((error) => {
      console.error('Failed to initialize database', error);
    });
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor={theme.colors.background} translucent={false} />
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
