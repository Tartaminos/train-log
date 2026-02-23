import { Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';

export async function syncAndroidNavigationBarDynamicMode() {
  if (Platform.OS !== 'android') {
    return;
  }

  try {
    await NavigationBar.setVisibilityAsync('hidden');
  } catch (error) {
    console.error('Failed to apply Android navigation bar dynamic mode', error);
  }
}
