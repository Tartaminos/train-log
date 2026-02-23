import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  TemplateExerciseRepositorySQLite,
  WorkoutSessionRepositorySQLite,
  WorkoutSetRepositorySQLite,
  WorkoutTemplateRepositorySQLite
} from '../../src/data/repositories/sqlite';
import type { TemplateExercise, WorkoutSet, WorkoutTemplate } from '../../src/domain/entities';
import { calculateExerciseVolumeTotal } from '../../src/domain/services/calculate-exercise-volume-total';
import { Screen } from '../../src/ui/components/Layout';
import { theme } from '../../src/ui/theme';

const workoutTemplateRepository = new WorkoutTemplateRepositorySQLite();
const templateExerciseRepository = new TemplateExerciseRepositorySQLite();
const workoutSessionRepository = new WorkoutSessionRepositorySQLite();
const workoutSetRepository = new WorkoutSetRepositorySQLite();

type ExerciseInputState = {
  load: string;
  reps: string;
};

type ExerciseSetMap = Record<number, WorkoutSet[]>;
type ExerciseInputMap = Record<number, ExerciseInputState>;
type ExerciseLoadingMap = Record<number, boolean>;
type ExerciseSuccessMessageMap = Record<number, string | null>;
type ExerciseCompletionMap = Record<number, boolean>;

function groupSetsByTemplateExercise(workoutSetList: WorkoutSet[]): ExerciseSetMap {
  return workoutSetList.reduce<ExerciseSetMap>((currentMap, workoutSet) => {
    if (!workoutSet.templateExerciseId) {
      return currentMap;
    }

    const groupedSetList = currentMap[workoutSet.templateExerciseId] ?? [];

    return {
      ...currentMap,
      [workoutSet.templateExerciseId]: [...groupedSetList, workoutSet]
    };
  }, {});
}

export default function WorkoutSessionScreen() {
  const router = useRouter();
  const { templateId } = useLocalSearchParams<{ templateId: string | string[] }>();

  const [isInitializing, setIsInitializing] = useState(true);
  const [isFinishingWorkout, setIsFinishingWorkout] = useState(false);

  const [screenErrorMessage, setScreenErrorMessage] = useState<string | null>(null);

  const [workoutTemplate, setWorkoutTemplate] = useState<WorkoutTemplate | null>(null);
  const [templateExerciseList, setTemplateExerciseList] = useState<TemplateExercise[]>([]);
  const [workoutSessionId, setWorkoutSessionId] = useState<number | null>(null);
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null);

  const [exerciseSetMap, setExerciseSetMap] = useState<ExerciseSetMap>({});
  const [exerciseInputMap, setExerciseInputMap] = useState<ExerciseInputMap>({});
  const [exerciseLoadingMap, setExerciseLoadingMap] = useState<ExerciseLoadingMap>({});
  const [exerciseSuccessMessageMap, setExerciseSuccessMessageMap] =
    useState<ExerciseSuccessMessageMap>({});
  const [exerciseCompletionMap, setExerciseCompletionMap] = useState<ExerciseCompletionMap>({});

  const successMessageTimeoutMapRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const showExerciseSuccessMessage = (exerciseId: number) => {
    const existingTimeoutId = successMessageTimeoutMapRef.current[exerciseId];

    if (existingTimeoutId) {
      clearTimeout(existingTimeoutId);
    }

    setExerciseSuccessMessageMap((currentSuccessMessageMap) => ({
      ...currentSuccessMessageMap,
      [exerciseId]: 'Série adicionada'
    }));

    successMessageTimeoutMapRef.current[exerciseId] = setTimeout(() => {
      setExerciseSuccessMessageMap((currentSuccessMessageMap) => ({
        ...currentSuccessMessageMap,
        [exerciseId]: null
      }));
    }, 3000);
  };

  useEffect(() => {
    const parsedTemplateId = Number(Array.isArray(templateId) ? templateId[0] : templateId);

    if (!Number.isInteger(parsedTemplateId) || parsedTemplateId <= 0) {
      setScreenErrorMessage('Treino inválido para iniciar o treino.');
      setIsInitializing(false);
      return;
    }

    let isCancelled = false;

    const initializeSessionScreen = async () => {
      try {
        setIsInitializing(true);
        setScreenErrorMessage(null);

        const foundWorkoutTemplate = await workoutTemplateRepository.getTemplateById(parsedTemplateId);

        if (!foundWorkoutTemplate) {
          setScreenErrorMessage('Treino não encontrado.');
          return;
        }

        const foundTemplateExercises =
          await templateExerciseRepository.getExercisesByTemplateId(parsedTemplateId);

        const newWorkoutSession = await workoutSessionRepository.createSession({
          workoutTemplateId: parsedTemplateId,
          startedAt: new Date().toISOString()
        });

        const existingWorkoutSets = await workoutSetRepository.getSetsBySessionId(newWorkoutSession.id);

        if (isCancelled) {
          return;
        }

        setWorkoutTemplate(foundWorkoutTemplate);
        setTemplateExerciseList(foundTemplateExercises);
        setWorkoutSessionId(newWorkoutSession.id);
        setSessionStartedAt(newWorkoutSession.startedAt);
        setExerciseSetMap(groupSetsByTemplateExercise(existingWorkoutSets));
        setExerciseInputMap(
          foundTemplateExercises.reduce<ExerciseInputMap>((currentInputMap, templateExercise) => {
            return {
              ...currentInputMap,
              [templateExercise.id]: {
                load:
                  templateExercise.defaultLoad !== null && templateExercise.defaultLoad !== undefined
                    ? String(templateExercise.defaultLoad)
                    : '',
                reps:
                  templateExercise.defaultReps !== null && templateExercise.defaultReps !== undefined
                    ? String(templateExercise.defaultReps)
                    : ''
              }
            };
          }, {})
        );
      } catch (error) {
        console.error('Failed to initialize workout session screen', error);
        if (!isCancelled) {
          setScreenErrorMessage('Não foi possível iniciar o treino.');
        }
      } finally {
        if (!isCancelled) {
          setIsInitializing(false);
        }
      }
    };

    initializeSessionScreen();

    return () => {
      isCancelled = true;

      Object.values(successMessageTimeoutMapRef.current).forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
    };
  }, [templateId]);

  const handleExerciseInputChange = (
    exerciseId: number,
    fieldName: keyof ExerciseInputState,
    inputValue: string
  ) => {
    setExerciseInputMap((currentInputMap) => ({
      ...currentInputMap,
      [exerciseId]: {
        load: currentInputMap[exerciseId]?.load ?? '',
        reps: currentInputMap[exerciseId]?.reps ?? '',
        [fieldName]: inputValue
      }
    }));

    if (exerciseSuccessMessageMap[exerciseId]) {
      setExerciseSuccessMessageMap((currentSuccessMessageMap) => ({
        ...currentSuccessMessageMap,
        [exerciseId]: null
      }));
    }
  };

  const handleLoadQuickIncrement = (exerciseId: number, incrementAmount: number) => {
    setExerciseInputMap((currentInputMap) => {
      const currentLoadValue = currentInputMap[exerciseId]?.load ?? '';
      const parsedCurrentLoad = Number(currentLoadValue.replace(',', '.'));
      const updatedLoadValue = Number.isFinite(parsedCurrentLoad)
        ? String(parsedCurrentLoad + incrementAmount)
        : String(incrementAmount);

      return {
        ...currentInputMap,
        [exerciseId]: {
          load: updatedLoadValue,
          reps: currentInputMap[exerciseId]?.reps ?? ''
        }
      };
    });

    if (exerciseSuccessMessageMap[exerciseId]) {
      setExerciseSuccessMessageMap((currentSuccessMessageMap) => ({
        ...currentSuccessMessageMap,
        [exerciseId]: null
      }));
    }
  };


  const orderedTemplateExerciseList = useMemo(() => {
    const activeExerciseList: TemplateExercise[] = [];
    const completedExerciseList: TemplateExercise[] = [];

    templateExerciseList.forEach((templateExercise) => {
      if (exerciseCompletionMap[templateExercise.id]) {
        completedExerciseList.push(templateExercise);
        return;
      }

      activeExerciseList.push(templateExercise);
    });

    return [...activeExerciseList, ...completedExerciseList];
  }, [templateExerciseList, exerciseCompletionMap]);

  const handleFinishExercise = (templateExerciseId: number) => {
    setExerciseCompletionMap((currentCompletionMap) => ({
      ...currentCompletionMap,
      [templateExerciseId]: true
    }));

    setExerciseInputMap((currentInputMap) => ({
      ...currentInputMap,
      [templateExerciseId]: {
        load: '',
        reps: ''
      }
    }));

    setExerciseSuccessMessageMap((currentSuccessMessageMap) => ({
      ...currentSuccessMessageMap,
      [templateExerciseId]: null
    }));
  };

  const handleAddSet = async (templateExercise: TemplateExercise) => {
    if (!workoutSessionId) {
      setScreenErrorMessage('Sessão de treino não encontrada.');
      return;
    }

    const currentExerciseInput = exerciseInputMap[templateExercise.id] ?? { load: '', reps: '' };

    const parsedLoad = Number(currentExerciseInput.load.replace(',', '.'));
    const parsedReps = Number.parseInt(currentExerciseInput.reps, 10);

    if (!Number.isFinite(parsedLoad) || parsedLoad <= 0 || !Number.isInteger(parsedReps) || parsedReps <= 0) {
      setScreenErrorMessage('Informe carga e reps válidas (maiores que 0).');
      return;
    }

    try {
      setScreenErrorMessage(null);
      setExerciseLoadingMap((currentLoadingMap) => ({
        ...currentLoadingMap,
        [templateExercise.id]: true
      }));

      const exerciseSetList = exerciseSetMap[templateExercise.id] ?? [];
      const nextSetIndex = exerciseSetList.length + 1;

      await workoutSetRepository.createSet({
        workoutSessionId,
        templateExerciseId: templateExercise.id,
        exerciseName: templateExercise.name,
        load: parsedLoad,
        reps: parsedReps,
        setIndex: nextSetIndex,
        notes: null
      });

      const updatedWorkoutSetList = await workoutSetRepository.getSetsBySessionId(workoutSessionId);

      setExerciseSetMap(groupSetsByTemplateExercise(updatedWorkoutSetList));
      setExerciseInputMap((currentInputMap) => ({
        ...currentInputMap,
        [templateExercise.id]: {
          load: currentInputMap[templateExercise.id]?.load ?? '',
          reps: ''
        }
      }));
      showExerciseSuccessMessage(templateExercise.id);
    } catch (error) {
      console.error('Failed to add workout set', error);
      setScreenErrorMessage('Não foi possível adicionar a série.');
    } finally {
      setExerciseLoadingMap((currentLoadingMap) => ({
        ...currentLoadingMap,
        [templateExercise.id]: false
      }));
    }
  };

  const handleFinishWorkout = async () => {
    if (!workoutSessionId) {
      setScreenErrorMessage('Sessão de treino não encontrada.');
      return;
    }

    try {
      setScreenErrorMessage(null);
      setIsFinishingWorkout(true);

      const finishedWorkoutSession = await workoutSessionRepository.finishSession({
        id: workoutSessionId,
        endedAt: new Date().toISOString()
      });

      if (!finishedWorkoutSession) {
        throw new Error('Workout session was not found during finish flow.');
      }

      router.replace(`/workout/${finishedWorkoutSession.id}/summary`);
    } catch (error) {
      console.error('Failed to finish workout session', error);
      setScreenErrorMessage('Não foi possível finalizar o treino.');
    } finally {
      setIsFinishingWorkout(false);
    }
  };

  if (isInitializing) {
    return (
      <Screen>
        <Text style={styles.screenTitle}>Sessão de treino</Text>
        <Text style={styles.secondaryText}>Iniciando treino...</Text>
      </Screen>
    );
  }

  if (!workoutTemplate || !workoutSessionId || !sessionStartedAt) {
    return (
      <Screen>
        <Text style={styles.screenTitle}>Sessão de treino</Text>
        <Text style={styles.errorMessage}>{screenErrorMessage ?? 'Não foi possível abrir a sessão.'}</Text>
        <Pressable style={styles.primaryButton} onPress={() => router.replace('/')}>
          <Text style={styles.primaryButtonText}>Voltar para home</Text>
        </Pressable>
      </Screen>
    );
  }

  return (
    <Screen isScrollable contentContainerStyle={styles.contentContainer}>
      <Text style={styles.screenTitle}>{workoutTemplate.name}</Text>
      <Text style={styles.secondaryText}>Início: {new Date(sessionStartedAt).toLocaleString()}</Text>

      {orderedTemplateExerciseList.map((templateExercise) => {
        const currentExerciseInput = exerciseInputMap[templateExercise.id] ?? { load: '', reps: '' };
        const currentExerciseSetList = exerciseSetMap[templateExercise.id] ?? [];
        const isAddingSet = Boolean(exerciseLoadingMap[templateExercise.id]);
        const isExerciseCompleted = Boolean(exerciseCompletionMap[templateExercise.id]);
        const exerciseVolumeTotal = calculateExerciseVolumeTotal(currentExerciseSetList);

        return (
          <View
            key={templateExercise.id}
            style={[styles.exerciseCard, isExerciseCompleted && styles.completedExerciseCard]}
          >
            <View style={styles.exerciseHeaderRow}>
              <View style={styles.exerciseHeaderContent}>
                <Text style={styles.exerciseName}>{templateExercise.name}</Text>
                {templateExercise.machine ? (
                  <Text style={styles.exerciseMachine}>{templateExercise.machine}</Text>
                ) : null}
              </View>

              {isExerciseCompleted ? (
                <View style={styles.completedBadge}>
                  <Text style={styles.completedBadgeText}>Finalizado</Text>
                </View>
              ) : null}
            </View>

            {isExerciseCompleted ? (
              <View style={styles.exerciseSummaryContainer}>
                <Text style={styles.secondaryText}>Volume total da sessão</Text>
                <Text style={styles.volumeTotalText}>{exerciseVolumeTotal} kg</Text>
              </View>
            ) : (
              <>
                <View style={styles.exerciseSection}>
                  <Text style={styles.sectionTitle}>Séries salvas</Text>
                  <View style={styles.setListContainer}>
                    {currentExerciseSetList.length === 0 ? (
                      <Text style={styles.secondaryText}>Nenhuma série registrada.</Text>
                    ) : (
                      currentExerciseSetList.map((workoutSet) => (
                        <Text key={workoutSet.id} style={styles.setText}>
                          Série {workoutSet.setIndex} — {workoutSet.load} kg x {workoutSet.reps}
                        </Text>
                      ))
                    )}
                  </View>
                </View>

                <View style={styles.exerciseSection}>
                  <Text style={styles.sectionTitle}>Adicionar série</Text>

                  <View style={styles.setInputRow}>
                    <View style={styles.loadInputContainer}>
                      <TextInput
                        style={[styles.textInput, styles.smallInput]}
                        value={currentExerciseInput.load}
                        onChangeText={(value) => handleExerciseInputChange(templateExercise.id, 'load', value)}
                        placeholder="Carga (kg)"
                        placeholderTextColor={theme.colors.textSecondary}
                        keyboardType="numeric"
                      />

                      <View style={styles.quickActionsContainer}>
                        <Pressable
                          style={styles.quickActionButton}
                          onPress={() => handleLoadQuickIncrement(templateExercise.id, 2.5)}
                        >
                          <Text style={styles.quickActionButtonText}>+2.5</Text>
                        </Pressable>

                        <Pressable
                          style={styles.quickActionButton}
                          onPress={() => handleLoadQuickIncrement(templateExercise.id, 5)}
                        >
                          <Text style={styles.quickActionButtonText}>+5</Text>
                        </Pressable>
                      </View>
                    </View>

                    <TextInput
                      style={[styles.textInput, styles.smallInput]}
                      value={currentExerciseInput.reps}
                      onChangeText={(value) => handleExerciseInputChange(templateExercise.id, 'reps', value)}
                      placeholder="Reps"
                      placeholderTextColor={theme.colors.textSecondary}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.exerciseActionsRow}>
                    <Pressable
                      style={[styles.primaryButton, styles.exerciseActionButton, isAddingSet && styles.disabledButton]}
                      onPress={() => handleAddSet(templateExercise)}
                      disabled={isAddingSet}
                    >
                      <Text style={styles.primaryButtonText}>
                        {isAddingSet ? 'Adicionando...' : 'Adicionar série'}
                      </Text>
                    </Pressable>

                    <Pressable
                      style={[styles.finishExerciseButton, styles.exerciseActionButton]}
                      onPress={() => handleFinishExercise(templateExercise.id)}
                    >
                      <Text style={styles.finishExerciseButtonText}>Finalizar exercício</Text>
                    </Pressable>
                  </View>

                  {exerciseSuccessMessageMap[templateExercise.id] ? (
                    <Text style={styles.successMessage}>{exerciseSuccessMessageMap[templateExercise.id]}</Text>
                  ) : null}
                </View>
              </>
            )}
          </View>
        );
      })}

      {screenErrorMessage ? <Text style={styles.errorMessage}>{screenErrorMessage}</Text> : null}

      <View style={styles.mainActionsContainer}>
        <Pressable
          style={[styles.primaryButton, isFinishingWorkout && styles.disabledButton]}
          onPress={handleFinishWorkout}
          disabled={isFinishingWorkout}
        >
          <Text style={styles.primaryButtonText}>
            {isFinishingWorkout ? 'Finalizando...' : 'Finalizar treino'}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xl
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.textPrimary
  },
  secondaryText: {
    color: theme.colors.textSecondary,
    fontSize: 14
  },
  exerciseCard: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm
  },
  completedExerciseCard: {
    opacity: 0.9
  },
  exerciseHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.sm
  },
  exerciseHeaderContent: {
    flex: 1,
    gap: theme.spacing.xs
  },
  exerciseName: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '700'
  },
  exerciseMachine: {
    color: theme.colors.textSecondary,
    fontSize: 14
  },
  completedBadge: {
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.surface
  },
  completedBadgeText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '600'
  },
  exerciseSummaryContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.xs
  },
  volumeTotalText: {
    color: theme.colors.primary,
    fontSize: 18,
    fontWeight: '700'
  },
  exerciseSection: {
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.xs
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '600'
  },
  setInputRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    alignItems: 'flex-start'
  },
  loadInputContainer: {
    flex: 1,
    gap: theme.spacing.xs
  },
  quickActionsContainer: {
    flexDirection: 'row',
    gap: theme.spacing.xs
  },
  quickActionButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm
  },
  quickActionButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '600'
  },
  textInput: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    color: theme.colors.textPrimary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    fontSize: 16
  },
  smallInput: {
    flex: 1
  },
  setListContainer: {
    gap: theme.spacing.xs
  },
  exerciseActionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm
  },
  exerciseActionButton: {
    flex: 1
  },
  setText: {
    color: theme.colors.textPrimary,
    fontSize: 14
  },
  mainActionsContainer: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md
  },
  primaryButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '600'
  },
  finishExerciseButton: {
    backgroundColor: theme.colors.secondary,
    borderWidth: 1,
    borderColor: '#5E95B9',
    borderRadius: theme.radius.md,
    minHeight: 48,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md
  },
  finishExerciseButtonText: {
    color: '#F6FBFF',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false
  },
  disabledButton: {
    opacity: 0.6
  },
  errorMessage: {
    color: theme.colors.error,
    fontSize: 14
  },
  successMessage: {
    color: theme.colors.textSecondary,
    fontSize: 13
  }
});
