import { Stack } from 'expo-router';
import { useEffect } from 'react';

import { initDatabase } from '../src/data/database';

export default function RootLayout() {
  useEffect(() => {
    initDatabase().catch((error) => {
      console.error('Failed to initialize database', error);
    });
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
