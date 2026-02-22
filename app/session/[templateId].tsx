import { useEffect, useState } from 'react';
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

  useEffect(() => {
    const parsedTemplateId = Number(Array.isArray(templateId) ? templateId[0] : templateId);

    if (!Number.isInteger(parsedTemplateId) || parsedTemplateId <= 0) {
      setScreenErrorMessage('Ficha inválida para iniciar o treino.');
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
          setScreenErrorMessage('Ficha não encontrada.');
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
          load: '',
          reps: ''
        }
      }));
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

      await workoutSessionRepository.finishSession({
        id: workoutSessionId,
        endedAt: new Date().toISOString()
      });

      router.replace('/');
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

        {templateExerciseList.map((templateExercise) => {
          const currentExerciseInput = exerciseInputMap[templateExercise.id] ?? { load: '', reps: '' };
          const currentExerciseSetList = exerciseSetMap[templateExercise.id] ?? [];
          const isAddingSet = Boolean(exerciseLoadingMap[templateExercise.id]);

          return (
            <View key={templateExercise.id} style={styles.exerciseCard}>
              <Text style={styles.exerciseName}>{templateExercise.name}</Text>
              {templateExercise.machine ? (
                <Text style={styles.exerciseMachine}>{templateExercise.machine}</Text>
              ) : null}

              <View style={styles.setInputRow}>
                <TextInput
                  style={[styles.textInput, styles.smallInput]}
                  value={currentExerciseInput.load}
                  onChangeText={(value) => handleExerciseInputChange(templateExercise.id, 'load', value)}
                  placeholder="Carga (kg)"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="numeric"
                />

                <TextInput
                  style={[styles.textInput, styles.smallInput]}
                  value={currentExerciseInput.reps}
                  onChangeText={(value) => handleExerciseInputChange(templateExercise.id, 'reps', value)}
                  placeholder="Reps"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>

              <Pressable
                style={[styles.primaryButton, isAddingSet && styles.disabledButton]}
                onPress={() => handleAddSet(templateExercise)}
                disabled={isAddingSet}
              >
                <Text style={styles.primaryButtonText}>
                  {isAddingSet ? 'Adicionando...' : 'Adicionar série'}
                </Text>
              </Pressable>

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
    gap: theme.spacing.md
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
  exerciseName: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '700'
  },
  exerciseMachine: {
    color: theme.colors.textSecondary,
    fontSize: 14
  },
  setInputRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm
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
  disabledButton: {
    opacity: 0.6
  },
  errorMessage: {
    color: theme.colors.error,
    fontSize: 14
  }
});
