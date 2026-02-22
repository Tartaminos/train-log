import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';

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
      <ScrollView
        style={[styles.scrollableScreen, style]}
        contentContainerStyle={[styles.scrollableContentContainer, contentContainerStyle]}
      >
        {children}
      </ScrollView>
    );
  }

  return <View style={[styles.screenContainer, style]}>{children}</View>;
}

export function Card({ children, style }: CardProps) {
  return <View style={[styles.cardContainer, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
    paddingTop: 60,
    paddingBottom: theme.spacing.xl
  },
  scrollableScreen: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  scrollableContentContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: 60,
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
