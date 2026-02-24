import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  WorkoutSessionRepositorySQLite,
  WorkoutTemplateRepositorySQLite
} from '../../../src/data/repositories/sqlite';
import type { WorkoutSessionSummary } from '../../../src/domain/entities';
import { Card, Screen } from '../../../src/ui/components/Layout';
import { syncAndroidNavigationBarDynamicMode } from '../../../src/ui/system-ui/androidNavigationBar';
import { theme } from '../../../src/ui/theme';

const workoutSessionRepository = new WorkoutSessionRepositorySQLite();
const workoutTemplateRepository = new WorkoutTemplateRepositorySQLite();

function formatVolume(totalVolume: number): string {
  return totalVolume.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

export default function WorkoutSessionSummaryScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string | string[] }>();

  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [workoutTemplateName, setWorkoutTemplateName] = useState<string | null>(null);
  const [workoutSessionSummary, setWorkoutSessionSummary] = useState<WorkoutSessionSummary | null>(null);

  useFocusEffect(
    useCallback(() => {
      syncAndroidNavigationBarDynamicMode();

      return undefined;
    }, [])
  );

  const parsedSessionId = useMemo(() => {
    const sessionIdParam = Array.isArray(sessionId) ? sessionId[0] : sessionId;
    return Number(sessionIdParam);
  }, [sessionId]);

  useEffect(() => {
    let isCancelled = false;

    const loadWorkoutSummary = async () => {
      if (!Number.isInteger(parsedSessionId) || parsedSessionId <= 0) {
        setWorkoutSessionSummary(null);
        setWorkoutTemplateName(null);
        setIsLoadingSummary(false);
        return;
      }

      try {
        setIsLoadingSummary(true);

        const loadedSummary = await workoutSessionRepository.getWorkoutSessionSummary(parsedSessionId);

        if (!loadedSummary) {
          if (!isCancelled) {
            setWorkoutSessionSummary(null);
            setWorkoutTemplateName(null);
          }
          return;
        }

        const loadedSession = await workoutSessionRepository.getSessionWithSets(parsedSessionId);

        const loadedTemplate = loadedSession?.workoutTemplateId
          ? await workoutTemplateRepository.getTemplateById(loadedSession.workoutTemplateId)
          : null;

        if (!isCancelled) {
          setWorkoutSessionSummary(loadedSummary);
          setWorkoutTemplateName(loadedTemplate?.name ?? 'Treino sem nome');
        }
      } catch (error) {
        console.error('Failed to load workout summary', error);

        if (!isCancelled) {
          setWorkoutSessionSummary(null);
          setWorkoutTemplateName(null);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingSummary(false);
        }
      }
    };

    loadWorkoutSummary();

    return () => {
      isCancelled = true;
    };
  }, [parsedSessionId]);

  const handleGoBackWithoutStory = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/');
  }, [router]);

  if (isLoadingSummary) {
    return (
      <Screen>
        <Text style={styles.loadingText}>Carregando resumo do treino...</Text>
      </Screen>
    );
  }

  if (!workoutSessionSummary) {
    return (
      <Screen style={styles.centeredScreen}>
        <Text style={styles.notFoundText}>Resumo da sessão não encontrado.</Text>

        <Pressable style={styles.secondaryButton} onPress={() => router.replace('/')}>
          <Text style={styles.secondaryButtonText}>Voltar para home</Text>
        </Pressable>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.headerContainer}>
        <Text style={styles.screenTitle}>Treino finalizado</Text>
        <Text style={styles.templateName}>{workoutTemplateName ?? 'Treino sem nome'}</Text>
      </View>

      <View style={styles.metricsContainer}>
        <Card>
          <Text style={styles.metricLabel}>Duração</Text>
          <Text style={styles.metricValue}>{workoutSessionSummary.durationInMinutes} min</Text>
        </Card>

        <Card>
          <Text style={styles.metricLabel}>Volume total</Text>
          <Text style={styles.metricValue}>{formatVolume(workoutSessionSummary.totalVolume)} kg</Text>
        </Card>

        <Card>
          <Text style={styles.metricLabel}>Exercícios</Text>
          <Text style={styles.metricValue}>{workoutSessionSummary.exercisesCount}</Text>
        </Card>

        <Card>
          <Text style={styles.metricLabel}>Séries</Text>
          <Text style={styles.metricValue}>{workoutSessionSummary.setsCount}</Text>
        </Card>
      </View>

      <View style={styles.actionButtonsContainer}>
        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push(`/workout/${workoutSessionSummary.sessionId}/story`)}
        >
          <Text style={styles.primaryButtonText}>Gerar Story do treino</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={handleGoBackWithoutStory}>
          <Text style={styles.secondaryButtonText}>Voltar sem gerar Story</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centeredScreen: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerContainer: {
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.lg
  },
  screenTitle: {
    color: theme.colors.textPrimary,
    fontSize: 30,
    fontWeight: '700'
  },
  templateName: {
    color: theme.colors.primary,
    fontSize: 18,
    fontWeight: '600'
  },
  metricsContainer: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg
  },
  actionButtonsContainer: {
    marginTop: 'auto',
    gap: theme.spacing.sm
  },
  metricLabel: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginBottom: theme.spacing.xs
  },
  metricValue: {
    color: theme.colors.textPrimary,
    fontSize: 24,
    fontWeight: '700'
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md
  },
  primaryButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700'
  },
  secondaryButton: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    minWidth: 200
  },
  secondaryButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '600'
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: 16
  },
  notFoundText: {
    color: theme.colors.textSecondary,
    fontSize: 16
  }
});
