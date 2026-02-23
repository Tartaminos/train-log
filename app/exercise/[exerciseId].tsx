import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { WorkoutSetRepositorySQLite } from '../../src/data/repositories/sqlite';
import type { ExercisePerformanceSummary } from '../../src/domain/repositories/workout-set-repository';
import { ExerciseLoadChart } from '../../src/ui/components/ExerciseLoadChart';
import { Card, Screen } from '../../src/ui/components/Layout';
import { theme } from '../../src/ui/theme';

const workoutSetRepository = new WorkoutSetRepositorySQLite();

function formatDateTime(dateValue: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(dateValue));
}

function formatLoad(loadValue: number): string {
  return loadValue.toLocaleString('pt-BR', {
    minimumFractionDigits: Number.isInteger(loadValue) ? 0 : 1,
    maximumFractionDigits: 2
  });
}

function formatVolume(volumeValue: number): string {
  return volumeValue.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

export default function ExercisePerformanceScreen() {
  const router = useRouter();
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string | string[] }>();

  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [loadingErrorMessage, setLoadingErrorMessage] = useState<string | null>(null);
  const [exercisePerformanceSummary, setExercisePerformanceSummary] =
    useState<ExercisePerformanceSummary | null>(null);

  const exerciseName = useMemo(() => {
    const exerciseIdParam = Array.isArray(exerciseId) ? exerciseId[0] : exerciseId;

    if (!exerciseIdParam) {
      return '';
    }

    try {
      return decodeURIComponent(exerciseIdParam);
    } catch {
      return exerciseIdParam;
    }
  }, [exerciseId]);

  useEffect(() => {
    let isCancelled = false;

    const loadExercisePerformanceSummary = async () => {
      if (!exerciseName) {
        setExercisePerformanceSummary(null);
        setLoadingErrorMessage(null);
        setIsLoadingSummary(false);
        return;
      }

      try {
        setIsLoadingSummary(true);
        setLoadingErrorMessage(null);

        const loadedExercisePerformanceSummary =
          await workoutSetRepository.getExercisePerformanceSummaryByExerciseName(exerciseName);

        if (!isCancelled) {
          setExercisePerformanceSummary(loadedExercisePerformanceSummary);
        }
      } catch (error) {
        console.error('Failed to load exercise performance summary', error);

        if (!isCancelled) {
          setExercisePerformanceSummary(null);
          setLoadingErrorMessage('Não foi possível carregar os dados agora.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingSummary(false);
        }
      }
    };

    loadExercisePerformanceSummary();

    return () => {
      isCancelled = true;
    };
  }, [exerciseName]);

  if (isLoadingSummary) {
    return (
      <Screen>
        <Text style={styles.loadingText}>Carregando evolução...</Text>
      </Screen>
    );
  }

  if (loadingErrorMessage) {
    return (
      <Screen>
        <Text style={styles.notFoundText}>{loadingErrorMessage}</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Voltar</Text>
        </Pressable>
      </Screen>
    );
  }

  if (!exercisePerformanceSummary) {
    return (
      <Screen>
        <Text style={styles.notFoundText}>Exercício não encontrado.</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Voltar</Text>
        </Pressable>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Voltar</Text>
        </Pressable>

        <View>
          <Text style={styles.exerciseName}>{exercisePerformanceSummary.exerciseName}</Text>
          <Text style={styles.metricText}>Melhor carga: {formatLoad(exercisePerformanceSummary.bestLoad)} kg</Text>
          <Text style={styles.metricText}>
            Volume total acumulado: {formatVolume(exercisePerformanceSummary.totalAccumulatedVolume)} kg
          </Text>
        </View>

        <View style={styles.chartSectionContainer}>
          <Text style={styles.sectionTitle}>Evolução da carga</Text>
          <ExerciseLoadChart
            pointList={exercisePerformanceSummary.entriesChronological.map((entryItem) => ({
              date: entryItem.sessionDate,
              load: entryItem.load
            }))}
          />
        </View>

        <View style={styles.historySectionContainer}>
          <Text style={styles.sectionTitle}>Execuções anteriores</Text>
          <View style={styles.historyListContainer}>
            {exercisePerformanceSummary.historyItemList.map((historyItem) => (
              <Card key={historyItem.workoutSetId} style={styles.historyCard}>
                <Text style={styles.historyDate}>Sessão: {formatDateTime(historyItem.sessionStartedAt)}</Text>
                <Text style={styles.historyMetric}>Carga: {formatLoad(historyItem.load)} kg</Text>
                <Text style={styles.historyMetric}>Repetições: {historyItem.reps}</Text>
              </Card>
            ))}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.md
  },
  exerciseName: {
    color: theme.colors.primary,
    fontSize: 26,
    fontWeight: '700'
  },
  metricText: {
    marginTop: theme.spacing.xs,
    color: theme.colors.textSecondary,
    fontSize: 15,
    fontWeight: '600'
  },
  chartSectionContainer: {
    gap: theme.spacing.sm
  },
  historySectionContainer: {
    gap: theme.spacing.sm
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700'
  },
  historyListContainer: {
    gap: theme.spacing.sm
  },
  historyCard: {
    backgroundColor: theme.colors.card
  },
  historyDate: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '600'
  },
  historyMetric: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginTop: theme.spacing.xs
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: 16
  },
  notFoundText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    marginBottom: theme.spacing.md
  },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.md
  },
  backButtonText: {
    color: theme.colors.textPrimary,
    fontWeight: '600'
  }
});
