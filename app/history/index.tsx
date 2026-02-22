import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';

import {
  WorkoutSessionRepositorySQLite,
  WorkoutSetRepositorySQLite,
  WorkoutTemplateRepositorySQLite
} from '../../src/data/repositories/sqlite';
import type { WorkoutSession } from '../../src/domain/entities';
import { Card, Screen } from '../../src/ui/components/Layout';
import { theme } from '../../src/ui/theme';

type HistorySessionListItem = {
  id: number;
  workoutTemplateName: string;
  startedAtLabel: string;
  totalVolumeLabel: string;
};

const workoutSessionRepository = new WorkoutSessionRepositorySQLite();
const workoutSetRepository = new WorkoutSetRepositorySQLite();
const workoutTemplateRepository = new WorkoutTemplateRepositorySQLite();

function formatSessionDate(startedAt: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(startedAt));
}

function formatVolume(totalVolume: number): string {
  return totalVolume.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

export default function WorkoutHistoryScreen() {
  const router = useRouter();
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [historySessionList, setHistorySessionList] = useState<HistorySessionListItem[]>([]);

  useEffect(() => {
    let isCancelled = false;

    const loadWorkoutHistory = async () => {
      try {
        setIsLoadingHistory(true);
        const workoutSessionList = await workoutSessionRepository.getRecentSessions(50);

        const historyList = await Promise.all(
          workoutSessionList.map(async (workoutSession: WorkoutSession) => {
            const workoutTemplate = workoutSession.workoutTemplateId
              ? await workoutTemplateRepository.getTemplateById(workoutSession.workoutTemplateId)
              : null;
            const totalVolume = await workoutSetRepository.getTotalVolumeBySessionId(workoutSession.id);

            return {
              id: workoutSession.id,
              workoutTemplateName: workoutTemplate?.name ?? 'Treino sem ficha',
              startedAtLabel: formatSessionDate(workoutSession.startedAt),
              totalVolumeLabel: `Volume: ${formatVolume(totalVolume)} kg`
            };
          })
        );

        if (!isCancelled) {
          setHistorySessionList(historyList);
        }
      } catch (error) {
        console.error('Failed to load workout history', error);
        if (!isCancelled) {
          setHistorySessionList([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingHistory(false);
        }
      }
    };

    loadWorkoutHistory();

    return () => {
      isCancelled = true;
    };
  }, []);

  const emptyStateText = useMemo(() => {
    if (isLoadingHistory) {
      return 'Carregando histórico...';
    }

    return 'Você ainda não registrou nenhum treino.';
  }, [isLoadingHistory]);

  return (
    <Screen>
      <Text style={styles.screenTitle}>Histórico de treinos</Text>

      <FlatList
        data={historySessionList}
        keyExtractor={(historySession) => String(historySession.id)}
        contentContainerStyle={styles.historyListContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={styles.emptyStateText}>{emptyStateText}</Text>}
        renderItem={({ item: historySession }) => (
          <Card>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/history/[sessionId]',
                  params: { sessionId: String(historySession.id) }
                })
              }
            >
              <Text style={styles.cardTitle}>{historySession.workoutTemplateName}</Text>
              <Text style={styles.cardSubtitle}>{historySession.startedAtLabel}</Text>
              <Text style={styles.cardVolume}>{historySession.totalVolumeLabel}</Text>
            </Pressable>
          </Card>
        )}
      />
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
  historyListContainer: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.md
  },
  emptyStateText: {
    color: theme.colors.textSecondary,
    fontSize: 16
  },
  cardTitle: {
    color: theme.colors.textPrimary,
    fontSize: 17,
    fontWeight: '600'
  },
  cardSubtitle: {
    marginTop: theme.spacing.xs,
    color: theme.colors.textSecondary,
    fontSize: 14
  },
  cardVolume: {
    marginTop: theme.spacing.sm,
    color: theme.colors.textSecondary,
    fontSize: 13
  }
});
