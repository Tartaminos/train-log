import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  WorkoutSessionRepositorySQLite,
  WorkoutSetRepositorySQLite,
  WorkoutTemplateRepositorySQLite
} from '../../src/data/repositories/sqlite';
import type { WorkoutSession, WorkoutSet } from '../../src/domain/entities';
import { Card, Screen } from '../../src/ui/components/Layout';
import { theme } from '../../src/ui/theme';

type ExerciseGroup = {
  exerciseName: string;
  setList: WorkoutSet[];
};

const workoutSessionRepository = new WorkoutSessionRepositorySQLite();
const workoutSetRepository = new WorkoutSetRepositorySQLite();
const workoutTemplateRepository = new WorkoutTemplateRepositorySQLite();

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

function formatVolume(totalVolume: number): string {
  return totalVolume.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

export default function WorkoutHistoryDetailScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string | string[] }>();

  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [workoutSession, setWorkoutSession] = useState<WorkoutSession | null>(null);
  const [workoutTemplateName, setWorkoutTemplateName] = useState('Treino sem nome');
  const [sessionSetList, setSessionSetList] = useState<WorkoutSet[]>([]);
  const [sessionTotalVolume, setSessionTotalVolume] = useState(0);

  const parsedSessionId = useMemo(() => {
    const sessionIdParam = Array.isArray(sessionId) ? sessionId[0] : sessionId;
    return Number(sessionIdParam);
  }, [sessionId]);

  useEffect(() => {
    let isCancelled = false;

    const loadSessionDetails = async () => {
      if (!Number.isFinite(parsedSessionId)) {
        setWorkoutSession(null);
        setSessionSetList([]);
        setSessionTotalVolume(0);
        setWorkoutTemplateName('Treino sem nome');
        setIsLoadingSession(false);
        return;
      }

      try {
        setIsLoadingSession(true);

        const loadedSession = await workoutSessionRepository.getSessionWithSets(parsedSessionId);

        if (!loadedSession) {
          if (!isCancelled) {
            setWorkoutSession(null);
            setSessionSetList([]);
            setSessionTotalVolume(0);
            setWorkoutTemplateName('Treino sem nome');
          }
          return;
        }

        const [loadedSetList, loadedTotalVolume, loadedWorkoutTemplate] = await Promise.all([
          workoutSetRepository.getSetsBySessionId(parsedSessionId),
          workoutSetRepository.getTotalVolumeBySessionId(parsedSessionId),
          loadedSession.workoutTemplateId
            ? workoutTemplateRepository.getTemplateById(loadedSession.workoutTemplateId)
            : Promise.resolve(null)
        ]);

        if (!isCancelled) {
          setWorkoutSession(loadedSession);
          setSessionSetList(loadedSetList);
          setSessionTotalVolume(loadedTotalVolume);
          setWorkoutTemplateName(loadedWorkoutTemplate?.name ?? 'Treino sem nome');
        }
      } catch (error) {
        console.error('Failed to load workout session details', error);
        if (!isCancelled) {
          setWorkoutSession(null);
          setSessionSetList([]);
          setSessionTotalVolume(0);
          setWorkoutTemplateName('Treino sem nome');
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingSession(false);
        }
      }
    };

    loadSessionDetails();

    return () => {
      isCancelled = true;
    };
  }, [parsedSessionId]);

  const groupedExerciseList = useMemo<ExerciseGroup[]>(() => {
    const exerciseSetMap = new Map<string, WorkoutSet[]>();

    sessionSetList.forEach((workoutSet) => {
      const currentExerciseSetList = exerciseSetMap.get(workoutSet.exerciseName) ?? [];
      currentExerciseSetList.push(workoutSet);
      exerciseSetMap.set(workoutSet.exerciseName, currentExerciseSetList);
    });

    return Array.from(exerciseSetMap.entries()).map(([exerciseName, groupedSetList]) => ({
      exerciseName,
      setList: [...groupedSetList].sort((firstSet, secondSet) => firstSet.setIndex - secondSet.setIndex)
    }));
  }, [sessionSetList]);

  if (isLoadingSession) {
    return (
      <Screen>
        <Text style={styles.loadingText}>Carregando...</Text>
      </Screen>
    );
  }

  if (!workoutSession) {
    return (
      <Screen>
        <Text style={styles.notFoundText}>Sessão não encontrada.</Text>
        <Pressable style={styles.backButton} onPress={() => router.push('/history')}>
          <Text style={styles.backButtonText}>Voltar ao histórico</Text>
        </Pressable>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View>
          <Text style={styles.templateName}>{workoutTemplateName}</Text>
          <Text style={styles.sessionDateText}>Início: {formatDateTime(workoutSession.startedAt)}</Text>
          <Text style={styles.sessionDateText}>
            Término: {workoutSession.endedAt ? formatDateTime(workoutSession.endedAt) : 'Em andamento'}
          </Text>
          <Text style={styles.totalVolumeText}>Volume total: {formatVolume(sessionTotalVolume)} kg</Text>
        </View>

        <View style={styles.exerciseListContainer}>
          {groupedExerciseList.map((exerciseGroup) => (
            <Pressable
              key={exerciseGroup.exerciseName}
              onPress={() =>
                router.push({
                  pathname: '/exercise/[exerciseId]',
                  params: { exerciseId: encodeURIComponent(exerciseGroup.exerciseName) }
                })
              }
            >
              <Card style={styles.exerciseCard}>
                <Text style={styles.exerciseName}>{exerciseGroup.exerciseName}</Text>

                {exerciseGroup.setList.length === 0 ? (
                  <Text style={styles.emptySetText}>Nenhuma série registrada</Text>
                ) : (
                  exerciseGroup.setList.map((workoutSet) => (
                    <Text key={workoutSet.id} style={styles.setText}>
                      Série {workoutSet.setIndex} — {formatLoad(workoutSet.load)} kg x {workoutSet.reps}
                    </Text>
                  ))
                )}
              </Card>
            </Pressable>
          ))}

          {groupedExerciseList.length === 0 ? (
            <Text style={styles.emptySetText}>Nenhuma série registrada</Text>
          ) : null}
        </View>

        <Pressable style={styles.backButton} onPress={() => router.push('/history')}>
          <Text style={styles.backButtonText}>Voltar ao histórico</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.md
  },
  templateName: {
    color: theme.colors.primary,
    fontSize: 26,
    fontWeight: '700'
  },
  sessionDateText: {
    marginTop: theme.spacing.xs,
    color: theme.colors.textSecondary,
    fontSize: 14
  },
  totalVolumeText: {
    marginTop: theme.spacing.sm,
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600'
  },
  exerciseListContainer: {
    gap: theme.spacing.sm
  },
  exerciseCard: {
    backgroundColor: theme.colors.card
  },
  exerciseName: {
    color: theme.colors.textPrimary,
    fontSize: 17,
    fontWeight: '600',
    marginBottom: theme.spacing.xs
  },
  setText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginTop: theme.spacing.xs
  },
  emptySetText: {
    color: theme.colors.textSecondary,
    fontSize: 14
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
    marginTop: theme.spacing.sm,
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
