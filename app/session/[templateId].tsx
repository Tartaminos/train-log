import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  SessionExerciseRepositorySQLite,
  TemplateExerciseRepositorySQLite,
  WorkoutSessionRepositorySQLite,
  WorkoutSetRepositorySQLite,
  WorkoutTemplateRepositorySQLite
} from '../../src/data/repositories/sqlite';
import type { SessionExercise, WorkoutSet, WorkoutTemplate } from '../../src/domain/entities';
import { calculateExerciseVolumeTotal } from '../../src/domain/services/calculate-exercise-volume-total';
import { Screen } from '../../src/ui/components/Layout';
import { theme } from '../../src/ui/theme';

const workoutTemplateRepository = new WorkoutTemplateRepositorySQLite();
const templateExerciseRepository = new TemplateExerciseRepositorySQLite();
const workoutSessionRepository = new WorkoutSessionRepositorySQLite();
const workoutSetRepository = new WorkoutSetRepositorySQLite();
const sessionExerciseRepository = new SessionExerciseRepositorySQLite();

type ExerciseInputState = {
  load: string;
  reps: string;
};

type NewExerciseFormState = {
  name: string;
  machine: string;
  defaultLoad: string;
  defaultReps: string;
};

type ExerciseSetMap = Record<number, WorkoutSet[]>;
type ExerciseInputMap = Record<number, ExerciseInputState>;
type ExerciseLoadingMap = Record<number, boolean>;
type ExerciseSuccessMessageMap = Record<number, string | null>;
type ExerciseCompletionMap = Record<number, boolean>;

function groupSetsBySessionExercise(workoutSetList: WorkoutSet[]): ExerciseSetMap {
  return workoutSetList.reduce<ExerciseSetMap>((currentMap, workoutSet) => {
    if (!workoutSet.sessionExerciseId) {
      return currentMap;
    }

    const groupedSetList = currentMap[workoutSet.sessionExerciseId] ?? [];

    return {
      ...currentMap,
      [workoutSet.sessionExerciseId]: [...groupedSetList, workoutSet]
    };
  }, {});
}

function buildDefaultInputMap(sessionExerciseList: SessionExercise[]): ExerciseInputMap {
  return sessionExerciseList.reduce<ExerciseInputMap>((currentInputMap, sessionExercise) => {
    return {
      ...currentInputMap,
      [sessionExercise.id]: {
        load:
          sessionExercise.defaultLoad !== null && sessionExercise.defaultLoad !== undefined
            ? String(sessionExercise.defaultLoad)
            : '',
        reps:
          sessionExercise.defaultReps !== null && sessionExercise.defaultReps !== undefined
            ? String(sessionExercise.defaultReps)
            : ''
      }
    };
  }, {});
}

export default function WorkoutSessionScreen() {
  const router = useRouter();
  const { templateId } = useLocalSearchParams<{ templateId: string | string[] }>();

  const [isInitializing, setIsInitializing] = useState(true);
  const [isFinishingWorkout, setIsFinishingWorkout] = useState(false);
  const [isEditingExercises, setIsEditingExercises] = useState(false);
  const [isSavingNewExercise, setIsSavingNewExercise] = useState(false);

  const [screenErrorMessage, setScreenErrorMessage] = useState<string | null>(null);
  const [editModalErrorMessage, setEditModalErrorMessage] = useState<string | null>(null);

  const [workoutTemplate, setWorkoutTemplate] = useState<WorkoutTemplate | null>(null);
  const [sessionExerciseList, setSessionExerciseList] = useState<SessionExercise[]>([]);
  const [workoutSessionId, setWorkoutSessionId] = useState<number | null>(null);
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null);
  const [sessionEndedAt, setSessionEndedAt] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [exerciseSetMap, setExerciseSetMap] = useState<ExerciseSetMap>({});
  const [exerciseInputMap, setExerciseInputMap] = useState<ExerciseInputMap>({});
  const [exerciseLoadingMap, setExerciseLoadingMap] = useState<ExerciseLoadingMap>({});
  const [exerciseSuccessMessageMap, setExerciseSuccessMessageMap] =
    useState<ExerciseSuccessMessageMap>({});
  const [exerciseCompletionMap, setExerciseCompletionMap] = useState<ExerciseCompletionMap>({});
  const [newExerciseFormState, setNewExerciseFormState] = useState<NewExerciseFormState>({
    name: '',
    machine: '',
    defaultLoad: '',
    defaultReps: ''
  });

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

  const formatElapsedTime = (totalElapsedSeconds: number) => {
    const totalSafeElapsedSeconds = Math.max(0, totalElapsedSeconds);
    const elapsedHours = Math.floor(totalSafeElapsedSeconds / 3600)
      .toString()
      .padStart(2, '0');
    const elapsedMinutes = Math.floor((totalSafeElapsedSeconds % 3600) / 60)
      .toString()
      .padStart(2, '0');
    const elapsedRemainingSeconds = Math.floor(totalSafeElapsedSeconds % 60)
      .toString()
      .padStart(2, '0');

    return `${elapsedHours}:${elapsedMinutes}:${elapsedRemainingSeconds}`;
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

        const activeWorkoutSession =
          await workoutSessionRepository.getActiveSessionByTemplateId(parsedTemplateId);

        const workoutSession =
          activeWorkoutSession ??
          (await workoutSessionRepository.createSession({
            workoutTemplateId: parsedTemplateId,
            startedAt: new Date().toISOString()
          }));

        await sessionExerciseRepository.ensureExercisesForSession(workoutSession.id, foundTemplateExercises);

        const persistedSessionExerciseList =
          await sessionExerciseRepository.getExercisesBySessionId(workoutSession.id);

        const existingWorkoutSets = await workoutSetRepository.getSetsBySessionId(workoutSession.id);

        if (isCancelled) {
          return;
        }

        setWorkoutTemplate(foundWorkoutTemplate);
        setSessionExerciseList(persistedSessionExerciseList);
        setWorkoutSessionId(workoutSession.id);
        setSessionStartedAt(workoutSession.startedAt);
        setSessionEndedAt(workoutSession.endedAt ?? null);
        setExerciseSetMap(groupSetsBySessionExercise(existingWorkoutSets));
        setExerciseInputMap(buildDefaultInputMap(persistedSessionExerciseList));
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

  useEffect(() => {
    if (!sessionStartedAt) {
      setElapsedSeconds(0);
      return;
    }

    const sessionStartedAtDate = new Date(sessionStartedAt);
    if (Number.isNaN(sessionStartedAtDate.getTime())) {
      setElapsedSeconds(0);
      return;
    }

    if (sessionEndedAt) {
      const sessionEndedAtDate = new Date(sessionEndedAt);
      const endedElapsedSeconds = Math.floor(
        (sessionEndedAtDate.getTime() - sessionStartedAtDate.getTime()) / 1000
      );
      setElapsedSeconds(Math.max(0, endedElapsedSeconds));
      return;
    }

    const updateElapsedSeconds = () => {
      const elapsedFromStart = Math.floor((Date.now() - sessionStartedAtDate.getTime()) / 1000);
      setElapsedSeconds(Math.max(0, elapsedFromStart));
    };

    updateElapsedSeconds();
    const timerInterval = setInterval(updateElapsedSeconds, 1000);

    return () => {
      clearInterval(timerInterval);
    };
  }, [sessionStartedAt, sessionEndedAt]);

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

  const orderedSessionExerciseList = useMemo(() => {
    const activeExerciseList: SessionExercise[] = [];
    const completedExerciseList: SessionExercise[] = [];

    sessionExerciseList.forEach((sessionExercise) => {
      if (exerciseCompletionMap[sessionExercise.id]) {
        completedExerciseList.push(sessionExercise);
        return;
      }

      activeExerciseList.push(sessionExercise);
    });

    return [...activeExerciseList, ...completedExerciseList];
  }, [sessionExerciseList, exerciseCompletionMap]);

  const handleFinishExercise = (sessionExerciseId: number) => {
    setExerciseCompletionMap((currentCompletionMap) => ({
      ...currentCompletionMap,
      [sessionExerciseId]: true
    }));

    setExerciseInputMap((currentInputMap) => ({
      ...currentInputMap,
      [sessionExerciseId]: {
        load: '',
        reps: ''
      }
    }));

    setExerciseSuccessMessageMap((currentSuccessMessageMap) => ({
      ...currentSuccessMessageMap,
      [sessionExerciseId]: null
    }));
  };

  const handleAddSet = async (sessionExercise: SessionExercise) => {
    if (!workoutSessionId) {
      setScreenErrorMessage('Sessão de treino não encontrada.');
      return;
    }

    const currentExerciseInput = exerciseInputMap[sessionExercise.id] ?? { load: '', reps: '' };

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
        [sessionExercise.id]: true
      }));

      const exerciseSetList = exerciseSetMap[sessionExercise.id] ?? [];
      const nextSetIndex = exerciseSetList.length + 1;

      await workoutSetRepository.createSet({
        workoutSessionId,
        templateExerciseId: sessionExercise.templateExerciseId,
        sessionExerciseId: sessionExercise.id,
        exerciseName: sessionExercise.name,
        load: parsedLoad,
        reps: parsedReps,
        setIndex: nextSetIndex,
        notes: null
      });

      const updatedWorkoutSetList = await workoutSetRepository.getSetsBySessionId(workoutSessionId);

      setExerciseSetMap(groupSetsBySessionExercise(updatedWorkoutSetList));
      setExerciseInputMap((currentInputMap) => ({
        ...currentInputMap,
        [sessionExercise.id]: {
          load: currentInputMap[sessionExercise.id]?.load ?? '',
          reps: ''
        }
      }));
      showExerciseSuccessMessage(sessionExercise.id);
    } catch (error) {
      console.error('Failed to add workout set', error);
      setScreenErrorMessage('Não foi possível adicionar a série.');
    } finally {
      setExerciseLoadingMap((currentLoadingMap) => ({
        ...currentLoadingMap,
        [sessionExercise.id]: false
      }));
    }
  };

  const handleRemoveSessionExercise = async (sessionExercise: SessionExercise) => {
    const hasLoggedSets = (exerciseSetMap[sessionExercise.id] ?? []).length > 0;

    if (hasLoggedSets) {
      setEditModalErrorMessage('Não é possível remover exercício com séries registradas.');
      return;
    }

    try {
      setEditModalErrorMessage(null);
      await sessionExerciseRepository.deleteSessionExercise(sessionExercise.id);

      setSessionExerciseList((currentSessionExerciseList) =>
        currentSessionExerciseList.filter((currentExercise) => currentExercise.id !== sessionExercise.id)
      );

      setExerciseInputMap((currentInputMap) => {
        const { [sessionExercise.id]: _, ...remainingInputMap } = currentInputMap;
        return remainingInputMap;
      });
    } catch (error) {
      console.error('Failed to remove session exercise', error);
      setEditModalErrorMessage('Não foi possível remover o exercício.');
    }
  };

  const handleCreateSessionExercise = async () => {
    if (!workoutSessionId) {
      setEditModalErrorMessage('Sessão de treino não encontrada.');
      return;
    }

    const trimmedExerciseName = newExerciseFormState.name.trim();

    if (!trimmedExerciseName) {
      setEditModalErrorMessage('Informe o nome do exercício.');
      return;
    }

    const defaultLoadValue = newExerciseFormState.defaultLoad.trim();
    const defaultRepsValue = newExerciseFormState.defaultReps.trim();

    const parsedDefaultLoad = defaultLoadValue ? Number(defaultLoadValue.replace(',', '.')) : null;
    const parsedDefaultReps = defaultRepsValue ? Number.parseInt(defaultRepsValue, 10) : null;

    if (parsedDefaultLoad !== null && (!Number.isFinite(parsedDefaultLoad) || parsedDefaultLoad <= 0)) {
      setEditModalErrorMessage('Carga padrão inválida.');
      return;
    }

    if (parsedDefaultReps !== null && (!Number.isInteger(parsedDefaultReps) || parsedDefaultReps <= 0)) {
      setEditModalErrorMessage('Reps padrão inválidas.');
      return;
    }

    try {
      setIsSavingNewExercise(true);
      setEditModalErrorMessage(null);

      const createdSessionExercise = await sessionExerciseRepository.createSessionExercise({
        workoutSessionId,
        name: trimmedExerciseName,
        machine: newExerciseFormState.machine.trim() || null,
        defaultLoad: parsedDefaultLoad,
        defaultReps: parsedDefaultReps,
        templateExerciseId: null
      });

      setSessionExerciseList((currentSessionExerciseList) => [
        ...currentSessionExerciseList,
        createdSessionExercise
      ]);

      setExerciseInputMap((currentInputMap) => ({
        ...currentInputMap,
        [createdSessionExercise.id]: {
          load: createdSessionExercise.defaultLoad ? String(createdSessionExercise.defaultLoad) : '',
          reps: createdSessionExercise.defaultReps ? String(createdSessionExercise.defaultReps) : ''
        }
      }));

      setNewExerciseFormState({
        name: '',
        machine: '',
        defaultLoad: '',
        defaultReps: ''
      });
    } catch (error) {
      console.error('Failed to add session exercise', error);
      setEditModalErrorMessage('Não foi possível adicionar o exercício.');
    } finally {
      setIsSavingNewExercise(false);
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

      setSessionEndedAt(finishedWorkoutSession.endedAt ?? new Date().toISOString());

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
      <View style={styles.headerRow}>
        <Text style={styles.screenTitle}>{workoutTemplate.name}</Text>
        <Pressable style={styles.editExercisesButton} onPress={() => setIsEditingExercises(true)}>
          <Text style={styles.editExercisesButtonText}>Editar exercícios</Text>
        </Pressable>
      </View>

      <View style={styles.sessionInfoRow}>
        <Text style={styles.secondaryText}>Início: {new Date(sessionStartedAt).toLocaleString()}</Text>
        <Text style={styles.secondaryText}>•</Text>
        <Text style={styles.secondaryText}>Tempo: {formatElapsedTime(elapsedSeconds)}</Text>
      </View>

      {orderedSessionExerciseList.map((sessionExercise) => {
        const currentExerciseInput = exerciseInputMap[sessionExercise.id] ?? { load: '', reps: '' };
        const currentExerciseSetList = exerciseSetMap[sessionExercise.id] ?? [];
        const isAddingSet = Boolean(exerciseLoadingMap[sessionExercise.id]);
        const isExerciseCompleted = Boolean(exerciseCompletionMap[sessionExercise.id]);
        const exerciseVolumeTotal = calculateExerciseVolumeTotal(currentExerciseSetList);

        return (
          <View
            key={sessionExercise.id}
            style={[styles.exerciseCard, isExerciseCompleted && styles.completedExerciseCard]}
          >
            <View style={styles.exerciseHeaderRow}>
              <View style={styles.exerciseHeaderContent}>
                <Text style={styles.exerciseName}>{sessionExercise.name}</Text>
                {sessionExercise.machine ? (
                  <Text style={styles.exerciseMachine}>{sessionExercise.machine}</Text>
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
                      <View style={styles.inputWithUnitContainer}>
                        <TextInput
                          style={[styles.textInput, styles.inputWithUnitField]}
                          value={currentExerciseInput.load}
                          onChangeText={(value) => handleExerciseInputChange(sessionExercise.id, 'load', value)}
                          placeholder="Carga"
                          placeholderTextColor={theme.colors.textSecondary}
                          keyboardType="numeric"
                        />
                        <Text style={styles.inputUnitLabel}>kg</Text>
                      </View>

                      <View style={styles.quickActionsContainer}>
                        <Pressable
                          style={styles.quickActionButton}
                          onPress={() => handleLoadQuickIncrement(sessionExercise.id, 2.5)}
                        >
                          <Text style={styles.quickActionButtonText}>+2,5</Text>
                        </Pressable>
                        <Pressable
                          style={styles.quickActionButton}
                          onPress={() => handleLoadQuickIncrement(sessionExercise.id, 5)}
                        >
                          <Text style={styles.quickActionButtonText}>+5</Text>
                        </Pressable>
                      </View>
                    </View>

                    <View style={styles.repsInputContainer}>
                      <TextInput
                        style={styles.textInput}
                        value={currentExerciseInput.reps}
                        onChangeText={(value) => handleExerciseInputChange(sessionExercise.id, 'reps', value)}
                        placeholder="Reps"
                        placeholderTextColor={theme.colors.textSecondary}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <View style={styles.exerciseActionsRow}>
                    <Pressable
                      style={[styles.primaryButton, styles.exerciseActionButton, isAddingSet && styles.disabledButton]}
                      onPress={() => handleAddSet(sessionExercise)}
                      disabled={isAddingSet}
                    >
                      <Text style={styles.primaryButtonText}>
                        {isAddingSet ? 'Adicionando...' : 'Adicionar série'}
                      </Text>
                    </Pressable>

                    <Pressable
                      style={[styles.finishExerciseButton, styles.exerciseActionButton]}
                      onPress={() => handleFinishExercise(sessionExercise.id)}
                    >
                      <Text style={styles.finishExerciseButtonText}>Finalizar exercício</Text>
                    </Pressable>
                  </View>

                  {exerciseSuccessMessageMap[sessionExercise.id] ? (
                    <Text style={styles.successMessage}>{exerciseSuccessMessageMap[sessionExercise.id]}</Text>
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

      <Modal visible={isEditingExercises} animationType="slide" transparent onRequestClose={() => setIsEditingExercises(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar exercícios do treino</Text>
              <Pressable onPress={() => setIsEditingExercises(false)}>
                <Text style={styles.closeModalButtonText}>Fechar</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalContentContainer}>
              <Text style={styles.sectionTitle}>Exercícios da sessão</Text>

              {sessionExerciseList.map((sessionExercise) => (
                <View key={sessionExercise.id} style={styles.modalExerciseRow}>
                  <View style={styles.exerciseHeaderContent}>
                    <Text style={styles.exerciseName}>{sessionExercise.name}</Text>
                    {sessionExercise.machine ? (
                      <Text style={styles.exerciseMachine}>{sessionExercise.machine}</Text>
                    ) : null}
                  </View>
                  <Pressable
                    style={styles.removeExerciseButton}
                    onPress={() => handleRemoveSessionExercise(sessionExercise)}
                  >
                    <Text style={styles.removeExerciseButtonText}>Remover</Text>
                  </Pressable>
                </View>
              ))}

              <View style={styles.newExerciseCard}>
                <Text style={styles.sectionTitle}>Adicionar exercício</Text>
                <TextInput
                  style={styles.textInput}
                  value={newExerciseFormState.name}
                  onChangeText={(value) =>
                    setNewExerciseFormState((currentFormState) => ({ ...currentFormState, name: value }))
                  }
                  placeholder="Nome / Máquina"
                  placeholderTextColor={theme.colors.textSecondary}
                />
                <TextInput
                  style={styles.textInput}
                  value={newExerciseFormState.machine}
                  onChangeText={(value) =>
                    setNewExerciseFormState((currentFormState) => ({ ...currentFormState, machine: value }))
                  }
                  placeholder="Máquina (opcional)"
                  placeholderTextColor={theme.colors.textSecondary}
                />
                <View style={styles.setInputRow}>
                  <TextInput
                    style={[styles.textInput, styles.repsInputContainer]}
                    value={newExerciseFormState.defaultLoad}
                    onChangeText={(value) =>
                      setNewExerciseFormState((currentFormState) => ({ ...currentFormState, defaultLoad: value }))
                    }
                    placeholder="Carga padrão"
                    placeholderTextColor={theme.colors.textSecondary}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={[styles.textInput, styles.repsInputContainer]}
                    value={newExerciseFormState.defaultReps}
                    onChangeText={(value) =>
                      setNewExerciseFormState((currentFormState) => ({ ...currentFormState, defaultReps: value }))
                    }
                    placeholder="Reps padrão"
                    placeholderTextColor={theme.colors.textSecondary}
                    keyboardType="numeric"
                  />
                </View>

                <Pressable
                  style={[styles.primaryButton, isSavingNewExercise && styles.disabledButton]}
                  onPress={handleCreateSessionExercise}
                  disabled={isSavingNewExercise}
                >
                  <Text style={styles.primaryButtonText}>
                    {isSavingNewExercise ? 'Adicionando...' : 'Adicionar exercício'}
                  </Text>
                </Pressable>
              </View>

              {editModalErrorMessage ? <Text style={styles.errorMessage}>{editModalErrorMessage}</Text> : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xl
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.sm
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    flex: 1
  },
  editExercisesButton: {
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs
  },
  editExercisesButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600'
  },
  secondaryText: {
    color: theme.colors.textSecondary,
    fontSize: 14
  },
  sessionInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    flexWrap: 'wrap'
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
  inputWithUnitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs
  },
  inputWithUnitField: {
    flex: 1
  },
  inputUnitLabel: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '600'
  },
  repsInputContainer: {
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end'
  },
  modalContainer: {
    maxHeight: '88%',
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.sm
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modalTitle: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '700'
  },
  closeModalButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '600'
  },
  modalContentContainer: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xl
  },
  modalExerciseRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md
  },
  removeExerciseButton: {
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.error,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: 'rgba(255, 92, 92, 0.08)'
  },
  removeExerciseButtonText: {
    color: theme.colors.error,
    fontSize: 12,
    fontWeight: '700'
  },
  newExerciseCard: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm
  }
});
