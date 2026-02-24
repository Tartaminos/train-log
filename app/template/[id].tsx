import { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import {
  TemplateExerciseRepositorySQLite,
  WorkoutTemplateRepositorySQLite
} from '../../src/data/repositories/sqlite';
import type { TemplateExercise } from '../../src/domain/entities';
import { Screen } from '../../src/ui/components/Layout';
import { theme } from '../../src/ui/theme';

const workoutTemplateRepository = new WorkoutTemplateRepositorySQLite();
const templateExerciseRepository = new TemplateExerciseRepositorySQLite();

function reorderExercisesByDirection(
  exercises: TemplateExercise[],
  exerciseIndex: number,
  direction: 'up' | 'down'
): TemplateExercise[] {
  const targetIndex = direction === 'up' ? exerciseIndex - 1 : exerciseIndex + 1;

  if (targetIndex < 0 || targetIndex >= exercises.length) {
    return exercises;
  }

  const reorderedExercises = [...exercises];
  const exerciseToMove = reorderedExercises[exerciseIndex];

  reorderedExercises.splice(exerciseIndex, 1);
  reorderedExercises.splice(targetIndex, 0, exerciseToMove);

  return reorderedExercises;
}

export default function EditTemplateScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string | string[] }>();

  const [isLoadingTemplate, setIsLoadingTemplate] = useState(true);
  const [templateNotFound, setTemplateNotFound] = useState(false);

  const [templateId, setTemplateId] = useState<number | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateNotes, setTemplateNotes] = useState('');
  const [templateExercises, setTemplateExercises] = useState<TemplateExercise[]>([]);

  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseMachine, setNewExerciseMachine] = useState('');

  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);
  const [templateNameErrorMessage, setTemplateNameErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isDeletingTemplate, setIsDeletingTemplate] = useState(false);
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [removingExerciseId, setRemovingExerciseId] = useState<number | null>(null);

  useEffect(() => {
    const parsedTemplateId = Number(Array.isArray(id) ? id[0] : id);

    if (!Number.isInteger(parsedTemplateId) || parsedTemplateId <= 0) {
      setTemplateNotFound(true);
      setIsLoadingTemplate(false);
      return;
    }

    const loadTemplateData = async () => {
      try {
        setIsLoadingTemplate(true);
        setTemplateNotFound(false);

        const foundTemplate = await workoutTemplateRepository.getTemplateById(parsedTemplateId);

        if (!foundTemplate) {
          setTemplateNotFound(true);
          return;
        }

        const foundExercises = await templateExerciseRepository.getExercisesByTemplateId(parsedTemplateId);

        setTemplateId(foundTemplate.id);
        setTemplateName(foundTemplate.name);
        setTemplateNotes(foundTemplate.notes ?? '');
        setTemplateExercises(foundExercises);
      } catch (error) {
        console.error('Failed to load template details', error);
        setTemplateNotFound(true);
      } finally {
        setIsLoadingTemplate(false);
      }
    };

    loadTemplateData();
  }, [id]);

  const persistExerciseSortOrder = async (exercises: TemplateExercise[]) => {
    for (const [exerciseIndex, exercise] of exercises.entries()) {
      await templateExerciseRepository.updateExercise({
        id: exercise.id,
        sortOrder: exerciseIndex + 1
      });
    }
  };

  const handleMoveExercise = async (exerciseIndex: number, direction: 'up' | 'down') => {
    const currentExercises = templateExercises;
    const reorderedExercises = reorderExercisesByDirection(currentExercises, exerciseIndex, direction);

    if (reorderedExercises === currentExercises) {
      return;
    }

    setTemplateExercises(reorderedExercises);

    try {
      await persistExerciseSortOrder(reorderedExercises);
      setFormErrorMessage(null);
      setSuccessMessage(null);
    } catch (error) {
      console.error('Failed to reorder exercises', error);
      setTemplateExercises(currentExercises);
      setFormErrorMessage('Não foi possível reordenar os exercícios.');
      setSuccessMessage(null);
    }
  };

  const handleSaveTemplateChanges = async () => {
    if (!templateId) {
      return;
    }

    const trimmedTemplateName = templateName.trim();

    if (!trimmedTemplateName) {
      setTemplateNameErrorMessage('Nome do treino é obrigatório.');
      setSuccessMessage(null);
      return;
    }

    try {
      setIsSavingTemplate(true);
      setFormErrorMessage(null);
      setTemplateNameErrorMessage(null);
      setSuccessMessage(null);

      await persistExerciseSortOrder(templateExercises);

      const updatedTemplate = await workoutTemplateRepository.updateTemplate({
        id: templateId,
        name: trimmedTemplateName,
        notes: templateNotes.trim() || null
      });

      if (!updatedTemplate) {
        setFormErrorMessage('Não foi possível salvar as alterações.');
        return;
      }

      setTemplateName(updatedTemplate.name);
      setTemplateNotes(updatedTemplate.notes ?? '');
      setSuccessMessage('Salvo com sucesso.');
    } catch (error) {
      console.error('Failed to save template changes', error);
      setFormErrorMessage('Não foi possível salvar as alterações.');
      setSuccessMessage(null);
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!templateId) {
      return;
    }

    try {
      setIsDeletingTemplate(true);
      setFormErrorMessage(null);
      setSuccessMessage(null);

      const deletedSuccessfully = await workoutTemplateRepository.deleteTemplate(templateId);

      if (deletedSuccessfully) {
        router.replace('/');
        return;
      }

      setFormErrorMessage('Não foi possível excluir o treino. Tente novamente.');
    } catch (error) {
      console.error('Failed to delete template', error);
      setFormErrorMessage('Erro ao excluir o treino. Tente novamente em instantes.');
    } finally {
      setIsDeletingTemplate(false);
    }
  };

  const handleAddExercise = async () => {
    if (!templateId) {
      return;
    }

    const trimmedExerciseName = newExerciseName.trim();

    if (!trimmedExerciseName) {
      setFormErrorMessage('Informe o nome do exercício.');
      setSuccessMessage(null);
      return;
    }

    try {
      setIsAddingExercise(true);
      setFormErrorMessage(null);
      setSuccessMessage(null);

      const createdExercise = await templateExerciseRepository.createExercise({
        workoutTemplateId: templateId,
        name: trimmedExerciseName,
        machine: newExerciseMachine.trim() || null,
        defaultLoad: null,
        defaultReps: null,
        sortOrder: templateExercises.length + 1
      });

      setTemplateExercises((currentExercises) => [...currentExercises, createdExercise]);
      setNewExerciseName('');
      setNewExerciseMachine('');
    } catch (error) {
      console.error('Failed to add exercise', error);
      setFormErrorMessage('Não foi possível adicionar o exercício.');
    } finally {
      setIsAddingExercise(false);
    }
  };

  const handleRemoveExercise = async (exerciseToRemove: TemplateExercise) => {
    try {
      setRemovingExerciseId(exerciseToRemove.id);
      const removedSuccessfully = await templateExerciseRepository.deleteExercise(exerciseToRemove.id);

      if (!removedSuccessfully) {
        setFormErrorMessage('Não foi possível remover o exercício.');
        return;
      }

      const updatedExercises = templateExercises.filter(
        (exercise) => exercise.id !== exerciseToRemove.id
      );

      setTemplateExercises(updatedExercises);
      await persistExerciseSortOrder(updatedExercises);
      setFormErrorMessage(null);
    } catch (error) {
      console.error('Failed to remove exercise', error);
      setFormErrorMessage('Não foi possível remover o exercício.');
    } finally {
      setRemovingExerciseId(null);
    }
  };

  if (isLoadingTemplate) {
    return (
      <Screen>
        <Text style={styles.screenTitle}>Editar treino</Text>
        <Text style={styles.secondaryText}>Carregando...</Text>
      </Screen>
    );
  }

  if (templateNotFound || !templateId) {
    return (
      <Screen>
        <Text style={styles.screenTitle}>Editar treino</Text>
        <Text style={styles.errorMessage}>Treino não encontrado.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/')}>
          <Text style={styles.primaryButtonText}>Voltar para Home</Text>
        </TouchableOpacity>
      </Screen>
    );
  }

  return (
    <Screen isScrollable contentContainerStyle={styles.contentContainer}>
        <View style={styles.headerContainer}>
          <Text style={styles.screenTitle}>Editar treino</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push(`/template/${templateId}`)}
          >
            <Feather name="edit-2" size={14} color={theme.colors.textPrimary} />
            <Text style={styles.editButtonText}>Editar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Dados do treino</Text>

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
          />
          {templateNameErrorMessage ? (
            <Text style={styles.inputErrorMessage}>{templateNameErrorMessage}</Text>
          ) : null}

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

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Exercícios</Text>

          {templateExercises.length === 0 ? (
            <Text style={styles.secondaryText}>Nenhum exercício cadastrado.</Text>
          ) : (
            templateExercises.map((templateExercise, exerciseIndex) => (
              <View key={templateExercise.id} style={styles.exerciseCard}>
                <View style={styles.exerciseTextContent}>
                  <Text style={styles.exerciseName}>{templateExercise.name}</Text>
                  {templateExercise.machine ? (
                    <Text style={styles.secondaryText}>{templateExercise.machine}</Text>
                  ) : null}
                </View>
                <View style={styles.exerciseActionsContainer}>
                  <TouchableOpacity
                    style={styles.moveUpExerciseButton}
                    onPress={() => handleMoveExercise(exerciseIndex, 'up')}
                    disabled={exerciseIndex === 0}
                  >
                    <View style={styles.exerciseActionContent}>
                      <Feather name="arrow-up" size={14} color="#FFFFFF" />
                      <Text style={styles.moveUpExerciseButtonText}>Subir</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.moveDownExerciseButton}
                    onPress={() => handleMoveExercise(exerciseIndex, 'down')}
                    disabled={exerciseIndex === templateExercises.length - 1}
                  >
                    <View style={styles.exerciseActionContent}>
                      <Feather name="arrow-down" size={14} color="#1A1D23" />
                      <Text style={styles.moveDownExerciseButtonText}>Descer</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.removeExerciseButton}
                    onPress={() => handleRemoveExercise(templateExercise)}
                    disabled={removingExerciseId === templateExercise.id}
                  >
                    <View style={styles.exerciseActionContent}>
                      <Feather name="trash-2" size={14} color="#FFFFFF" />
                      <Text style={styles.removeExerciseButtonText}>
                        {removingExerciseId === templateExercise.id ? 'Removendo...' : 'Remover'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

          <View style={styles.addExerciseContainer}>
            <Text style={styles.inputLabel}>Novo exercício *</Text>
            <TextInput
              style={styles.textInput}
              value={newExerciseName}
              onChangeText={setNewExerciseName}
              placeholder="Nome do exercício"
              placeholderTextColor={theme.colors.textSecondary}
            />

            <Text style={styles.inputLabel}>Máquina/equipamento</Text>
            <TextInput
              style={styles.textInput}
              value={newExerciseMachine}
              onChangeText={setNewExerciseMachine}
              placeholder="Opcional"
              placeholderTextColor={theme.colors.textSecondary}
            />

            <TouchableOpacity
              style={[styles.primaryButton, isAddingExercise && styles.disabledButton]}
              onPress={handleAddExercise}
              disabled={isAddingExercise}
            >
              <Text style={styles.primaryButtonText}>
                {isAddingExercise ? 'Adicionando...' : 'Adicionar exercício'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {formErrorMessage ? <Text style={styles.errorMessage}>{formErrorMessage}</Text> : null}
        {successMessage ? <Text style={styles.successMessage}>{successMessage}</Text> : null}

        <View style={styles.mainActionsContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() =>
              router.push({ pathname: '/session/[templateId]', params: { templateId: String(templateId) } })
            }
          >
            <Text style={styles.primaryButtonText}>Iniciar treino</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryButton, isSavingTemplate && styles.disabledButton]}
            onPress={handleSaveTemplateChanges}
            disabled={isSavingTemplate}
          >
            <Text style={styles.primaryButtonText}>
              {isSavingTemplate ? 'Salvando...' : 'Salvar alterações'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.deleteButton, isDeletingTemplate && styles.disabledButton]}
            onPress={handleDeleteTemplate}
            disabled={isDeletingTemplate}
          >
            <Text style={styles.deleteButtonText}>
              {isDeletingTemplate ? 'Excluindo...' : 'Excluir treino'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.replace('/')}>
            <Text style={styles.secondaryButtonText}>Voltar</Text>
          </TouchableOpacity>
        </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    gap: theme.spacing.md
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 0
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.card,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm
  },
  editButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '600'
  },
  sectionContainer: {
    marginBottom: theme.spacing.lg
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
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
    fontSize: 16,
    marginBottom: theme.spacing.md
  },
  notesInput: {
    minHeight: 100
  },
  exerciseCard: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm
  },
  exerciseTextContent: {
    flex: 1
  },
  exerciseName: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: theme.spacing.xs
  },
  addExerciseContainer: {
    marginTop: theme.spacing.sm
  },
  exerciseActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: theme.spacing.sm
  },
  exerciseActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs
  },
  moveUpExerciseButton: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm
  },
  moveUpExerciseButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600'
  },
  moveDownExerciseButton: {
    backgroundColor: '#F2C94C',
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm
  },
  moveDownExerciseButtonText: {
    color: '#1A1D23',
    fontSize: 14,
    fontWeight: '600'
  },
  removeExerciseButton: {
    backgroundColor: '#EB5757',
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm
  },
  removeExerciseButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600'
  },
  mainActionsContainer: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    gap: theme.spacing.sm
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14
  },
  deleteButton: {
    backgroundColor: theme.colors.error,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14
  },
  secondaryButton: {
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
  deleteButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '600'
  },
  secondaryButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '600'
  },
  errorMessage: {
    color: theme.colors.error,
    marginBottom: theme.spacing.sm,
    fontSize: 14
  },
  textInputError: {
    borderColor: theme.colors.error
  },
  inputErrorMessage: {
    color: theme.colors.error,
    marginBottom: theme.spacing.sm,
    fontSize: 12
  },
  successMessage: {
    color: theme.colors.success,
    marginBottom: theme.spacing.sm,
    fontSize: 14
  },
  secondaryText: {
    color: theme.colors.textSecondary,
    fontSize: 14
  },
  disabledButton: {
    opacity: 0.6
  }
});
