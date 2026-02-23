import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '../theme';

type ScreenProps = PropsWithChildren<{
  style?: ViewStyle;
  isScrollable?: boolean;
  contentContainerStyle?: ViewStyle;
}>;

type CardProps = PropsWithChildren<{
  style?: ViewStyle;
}>;

export function Screen({ children, style, isScrollable = false, contentContainerStyle }: ScreenProps) {
  if (isScrollable) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeAreaContainer}>
        <ScrollView
          style={[styles.scrollableScreen, style]}
          contentContainerStyle={[styles.scrollableContentContainer, contentContainerStyle]}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeAreaContainer}>
      <View style={[styles.screenContainer, style]}>{children}</View>
    </SafeAreaView>
  );
}

export function Card({ children, style }: CardProps) {
  return <View style={[styles.cardContainer, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  screenContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl
  },
  scrollableScreen: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  scrollableContentContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl
  },
  cardContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border
  }
});
