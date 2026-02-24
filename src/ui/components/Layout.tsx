import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from './AppHeader';
import { theme } from '../theme';

type ScreenProps = PropsWithChildren<{
  style?: ViewStyle;
  isScrollable?: boolean;
  contentContainerStyle?: ViewStyle;
  showBackButton?: boolean;
  title?: string;
}>;

type CardProps = PropsWithChildren<{
  style?: ViewStyle;
}>;

export function Screen({
  children,
  style,
  isScrollable = false,
  contentContainerStyle,
  showBackButton = false,
  title
}: ScreenProps) {
  if (isScrollable) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeAreaContainer}>
        <View style={styles.layoutContainer}>
          {showBackButton ? <AppHeader title={title} /> : null}
          <ScrollView
            style={[styles.scrollableScreen, style]}
            contentContainerStyle={[
              styles.scrollableContentContainer,
              showBackButton && styles.scrollableContentContainerWithHeader,
              contentContainerStyle
            ]}
          >
            {children}
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeAreaContainer}>
      <View style={styles.layoutContainer}>
        {showBackButton ? <AppHeader title={title} /> : null}
        <View style={[styles.screenContainer, showBackButton && styles.screenContainerWithHeader, style]}>
          {children}
        </View>
      </View>
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
  layoutContainer: {
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
  screenContainerWithHeader: {
    paddingTop: theme.spacing.md
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
  scrollableContentContainerWithHeader: {
    paddingTop: theme.spacing.md
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
