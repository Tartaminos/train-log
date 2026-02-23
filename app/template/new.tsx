import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  TemplateExerciseRepositorySQLite,
  WorkoutTemplateRepositorySQLite
} from '../../src/data/repositories/sqlite';
import { Card, Screen } from '../../src/ui/components/Layout';
import { theme } from '../../src/ui/theme';

type PendingExercise = {
  id: string;
  name: string;
  machine: string | null;
  defaultLoad: number | null;
  defaultReps: number | null;
};

const workoutTemplateRepository = new WorkoutTemplateRepositorySQLite();
const templateExerciseRepository = new TemplateExerciseRepositorySQLite();

export default function NewTemplateScreen() {
  const router = useRouter();
  const [templateName, setTemplateName] = useState('');
  const [templateNotes, setTemplateNotes] = useState('');

  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseMachine, setNewExerciseMachine] = useState('');
  const [newExerciseDefaultLoad, setNewExerciseDefaultLoad] = useState('');
  const [newExerciseDefaultReps, setNewExerciseDefaultReps] = useState('');
  const [pendingExercises, setPendingExercises] = useState<PendingExercise[]>([]);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [templateNameErrorMessage, setTemplateNameErrorMessage] = useState<string | null>(null);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  const clearNewExerciseFields = () => {
    setNewExerciseName('');
    setNewExerciseMachine('');
    setNewExerciseDefaultLoad('');
    setNewExerciseDefaultReps('');
  };

  const handleAddExercise = () => {
    const trimmedExerciseName = newExerciseName.trim();

    if (!trimmedExerciseName) {
      setErrorMessage('Informe o nome do exercício para adicionar.');
      return;
    }

    const parsedDefaultLoad =
      newExerciseDefaultLoad.trim().length > 0 ? Number(newExerciseDefaultLoad.replace(',', '.')) : null;
    const parsedDefaultReps =
      newExerciseDefaultReps.trim().length > 0 ? Number.parseInt(newExerciseDefaultReps, 10) : null;

    const exerciseToAdd: PendingExercise = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: trimmedExerciseName,
      machine: newExerciseMachine.trim() || null,
      defaultLoad: Number.isNaN(parsedDefaultLoad) ? null : parsedDefaultLoad,
      defaultReps: Number.isNaN(parsedDefaultReps) ? null : parsedDefaultReps
    };

    setPendingExercises((currentExercises) => [...currentExercises, exerciseToAdd]);
    clearNewExerciseFields();
    setErrorMessage(null);
  };

  const handleRemoveExercise = (exerciseId: string) => {
    setPendingExercises((currentExercises) =>
      currentExercises.filter((exercise) => exercise.id !== exerciseId)
    );
  };

  const handleSaveTemplate = async () => {
    const trimmedTemplateName = templateName.trim();

    if (!trimmedTemplateName) {
      setTemplateNameErrorMessage('Nome do treino é obrigatório.');
      return;
    }

    try {
      setTemplateNameErrorMessage(null);
      setErrorMessage(null);
      setIsSavingTemplate(true);

      const createdAt = new Date().toISOString();

      const createdTemplate = await workoutTemplateRepository.createTemplate({
        name: trimmedTemplateName,
        notes: templateNotes.trim() || null,
        createdAt
      });

      for (const [exerciseIndex, exercise] of pendingExercises.entries()) {
        await templateExerciseRepository.createExercise({
          workoutTemplateId: createdTemplate.id,
          name: exercise.name,
          machine: exercise.machine,
          defaultLoad: exercise.defaultLoad,
          defaultReps: exercise.defaultReps,
          sortOrder: exerciseIndex + 1
        });
      }

      router.replace('/');
    } catch (error) {
      console.error('Failed to create workout template', error);
      setErrorMessage('Não foi possível salvar o treino. Tente novamente.');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  return (
    <Screen isScrollable contentContainerStyle={styles.contentContainer}>
      <Text style={styles.screenTitle}>Novo treino</Text>

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Dados do treino</Text>

        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>Nome do treino *</Text>
          <TextInput
            style={[styles.textInput, templateNameErrorMessage && styles.textInputError]}
            value={templateName}
            onChangeText={(value) => {
              setTemplateName(value);
              if (templateNameErrorMessage) {
                setTemplateNameErrorMessage(null);
              }
            }}
            placeholder="Ex.: Treino A"
            placeholderTextColor={theme.colors.textSecondary}
            autoCapitalize="sentences"
          />
          {templateNameErrorMessage ? (
            <Text style={styles.inputErrorMessage}>{templateNameErrorMessage}</Text>
          ) : null}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>Observações</Text>
          <TextInput
            style={[styles.textInput, styles.notesInput]}
            value={templateNotes}
            onChangeText={setTemplateNotes}
            placeholder="Anotações opcionais"
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            textAlignVertical="top"
          />
        </View>
      </View>

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Exercícios do treino</Text>

        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>Nome do exercício *</Text>
          <TextInput
            style={styles.textInput}
            value={newExerciseName}
            onChangeText={setNewExerciseName}
            placeholder="Ex.: Supino reto"
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>Máquina/equipamento</Text>
          <TextInput
            style={styles.textInput}
            value={newExerciseMachine}
            onChangeText={setNewExerciseMachine}
            placeholder="Ex.: Banco + barra"
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>Carga padrão</Text>
          <TextInput
            style={styles.textInput}
            value={newExerciseDefaultLoad}
            onChangeText={setNewExerciseDefaultLoad}
            placeholder="Ex.: 40"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>Repetições padrão</Text>
          <TextInput
            style={styles.textInput}
            value={newExerciseDefaultReps}
            onChangeText={setNewExerciseDefaultReps}
            placeholder="Ex.: 12"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="number-pad"
          />
        </View>

        <TouchableOpacity style={styles.addExerciseButton} onPress={handleAddExercise}>
          <Text style={styles.addExerciseButtonText}>Adicionar exercício</Text>
        </TouchableOpacity>

        <View style={styles.exerciseListContainer}>
          {pendingExercises.length === 0 ? (
            <Text style={styles.secondaryText}>Nenhum exercício adicionado ainda.</Text>
          ) : (
            pendingExercises.map((exercise) => (
              <Card key={exercise.id} style={styles.exerciseCard}>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                {exercise.machine ? <Text style={styles.exerciseMeta}>Máquina: {exercise.machine}</Text> : null}
                {exercise.defaultLoad !== null ? (
                  <Text style={styles.exerciseMeta}>Carga padrão: {exercise.defaultLoad}</Text>
                ) : null}
                {exercise.defaultReps !== null ? (
                  <Text style={styles.exerciseMeta}>Repetições padrão: {exercise.defaultReps}</Text>
                ) : null}

                <TouchableOpacity
                  style={styles.removeExerciseButton}
                  onPress={() => handleRemoveExercise(exercise.id)}
                >
                  <Text style={styles.removeExerciseButtonText}>Remover</Text>
                </TouchableOpacity>
              </Card>
            ))
          )}
        </View>
      </View>

      {errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null}

      <View style={styles.mainActionsContainer}>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.back()}
            disabled={isSavingTemplate}
          >
            <Text style={styles.secondaryButtonText}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryButton, isSavingTemplate && styles.disabledButton]}
            onPress={handleSaveTemplate}
            disabled={isSavingTemplate}
          >
            <Text style={styles.primaryButtonText}>
              {isSavingTemplate ? 'Salvando...' : 'Salvar treino'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingBottom: theme.spacing.xl + theme.spacing.lg
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.lg
  },
  sectionContainer: {
    marginBottom: theme.spacing.lg
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md
  },
  formGroup: {
    marginBottom: theme.spacing.md
  },
  inputLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm
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
  notesInput: {
    minHeight: 120
  },
  addExerciseButton: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: theme.spacing.xs
  },
  addExerciseButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '600'
  },
  exerciseListContainer: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm
  },
  exerciseCard: {
    gap: theme.spacing.xs
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary
  },
  exerciseMeta: {
    fontSize: 14,
    color: theme.colors.textSecondary
  },
  removeExerciseButton: {
    alignSelf: 'flex-start',
    marginTop: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface
  },
  removeExerciseButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '600'
  },
  secondaryText: {
    color: theme.colors.textSecondary,
    fontSize: 14
  },
  errorMessage: {
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
    fontSize: 14
  },
  textInputError: {
    borderColor: theme.colors.error
  },
  inputErrorMessage: {
    color: theme.colors.error,
    fontSize: 12,
    marginTop: theme.spacing.xs
  },
  mainActionsContainer: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xl
  },
  buttonRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm
  },
  primaryButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14
  },
  primaryButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '600'
  },
  secondaryButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '600'
  },
  disabledButton: {
    opacity: 0.6
  }
});
