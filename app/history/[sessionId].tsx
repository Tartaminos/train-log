import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Screen } from '../../src/ui/components/Layout';
import { theme } from '../../src/ui/theme';

export default function WorkoutHistoryDetailScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string | string[] }>();
  const parsedSessionId = Number(Array.isArray(sessionId) ? sessionId[0] : sessionId);

  return (
    <Screen>
      <Text style={styles.screenTitle}>Detalhes do treino</Text>
      <Text style={styles.sessionText}>Sessão #{Number.isFinite(parsedSessionId) ? parsedSessionId : '-'}</Text>

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>Voltar</Text>
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md
  },
  sessionText: {
    fontSize: 16,
    color: theme.colors.textSecondary
  },
  backButton: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12
  },
  backButtonText: {
    color: theme.colors.textPrimary,
    fontWeight: '600'
  }
});
