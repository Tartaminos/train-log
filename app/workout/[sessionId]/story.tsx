import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Screen } from '../../../src/ui/components/Layout';
import { theme } from '../../../src/ui/theme';

export default function WorkoutStoryPlaceholderScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string | string[] }>();

  const sessionIdentifier = Array.isArray(sessionId) ? sessionId[0] : sessionId;

  return (
    <Screen style={styles.screen}>
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Story de treino</Text>
        <Text style={styles.description}>Sessão {sessionIdentifier ?? '-'} pronta para gerar Story.</Text>
        <Text style={styles.description}>TODO: implementar layout e exportação do Story.</Text>
      </View>

      <Pressable style={styles.button} onPress={() => router.back()}>
        <Text style={styles.buttonText}>Voltar para resumo</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: 'space-between'
  },
  contentContainer: {
    gap: theme.spacing.sm
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 30,
    fontWeight: '700'
  },
  description: {
    color: theme.colors.textSecondary,
    fontSize: 16
  },
  button: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonText: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '600'
  }
});
