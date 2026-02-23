import { Stack } from 'expo-router';
import { useEffect } from 'react';

import { initDatabase } from '../src/data/database';
import { syncAndroidNavigationBarDynamicMode } from '../src/ui/system-ui/androidNavigationBar';

export default function RootLayout() {
  useEffect(() => {
    syncAndroidNavigationBarDynamicMode();

    initDatabase().catch((error) => {
      console.error('Failed to initialize database', error);
    });
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
