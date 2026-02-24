import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { theme } from '../theme';

type AppHeaderProps = {
  title?: string;
};

export function AppHeader({ title }: AppHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  return (
    <View style={styles.headerContainer}>
      <Pressable style={styles.backButton} onPress={handleBack}>
        <Text style={styles.backIcon}>{'<'}</Text>
        <Text style={styles.backText}>Voltar</Text>
      </Pressable>

      <Text style={styles.headerTitle} numberOfLines={1}>
        {title ?? ''}
      </Text>

      <View style={styles.rightSpacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md
  },
  backButton: {
    minWidth: 84,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs
  },
  backIcon: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 20
  },
  backText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '600'
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginHorizontal: theme.spacing.sm
  },
  rightSpacer: {
    minWidth: 84
  }
});
