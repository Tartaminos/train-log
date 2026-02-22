import { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  TemplateExerciseRepositorySQLite,
  WorkoutTemplateRepositorySQLite
} from '../../src/data/repositories/sqlite';
import type { TemplateExercise } from '../../src/domain/entities';
import { Screen } from '../../src/ui/components/Layout';
import { theme } from '../../src/ui/theme';

const workoutTemplateRepository = new WorkoutTemplateRepositorySQLite();
const templateExerciseRepository = new TemplateExerciseRepositorySQLite();

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

  const handleSaveTemplateChanges = async () => {
    if (!templateId) {
      return;
    }

    const trimmedTemplateName = templateName.trim();

    if (!trimmedTemplateName) {
      setFormErrorMessage('Informe o nome da ficha.');
      setSuccessMessage(null);
      return;
    }

    try {
      setIsSavingTemplate(true);
      setFormErrorMessage(null);
      setSuccessMessage(null);

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
      const deletedSuccessfully = await workoutTemplateRepository.deleteTemplate(templateId);

      if (deletedSuccessfully) {
        router.replace('/');
      } else {
        setFormErrorMessage('Não foi possível excluir a ficha.');
      }
    } catch (error) {
      console.error('Failed to delete template', error);
      setFormErrorMessage('Não foi possível excluir a ficha.');
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
        sortOrder: null
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

      setTemplateExercises((currentExercises) =>
        currentExercises.filter((exercise) => exercise.id !== exerciseToRemove.id)
      );
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
        <Text style={styles.screenTitle}>Editar ficha</Text>
        <Text style={styles.secondaryText}>Carregando...</Text>
      </Screen>
    );
  }

  if (templateNotFound || !templateId) {
    return (
      <Screen>
        <Text style={styles.screenTitle}>Editar ficha</Text>
        <Text style={styles.errorMessage}>Ficha não encontrada.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/')}>
          <Text style={styles.primaryButtonText}>Voltar para Home</Text>
        </TouchableOpacity>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>Editar ficha</Text>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Dados da ficha</Text>

          <Text style={styles.inputLabel}>Nome da ficha *</Text>
          <TextInput
            style={styles.textInput}
            value={templateName}
            onChangeText={setTemplateName}
            placeholder="Ex.: Treino A"
            placeholderTextColor={theme.colors.textSecondary}
          />

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
            templateExercises.map((templateExercise) => (
              <View key={templateExercise.id} style={styles.exerciseCard}>
                <View style={styles.exerciseTextContent}>
                  <Text style={styles.exerciseName}>{templateExercise.name}</Text>
                  {templateExercise.machine ? (
                    <Text style={styles.secondaryText}>{templateExercise.machine}</Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  style={styles.removeExerciseButton}
                  onPress={() => handleRemoveExercise(templateExercise)}
                  disabled={removingExerciseId === templateExercise.id}
                >
                  <Text style={styles.removeExerciseButtonText}>
                    {removingExerciseId === templateExercise.id ? 'Removendo...' : 'Remover'}
                  </Text>
                </TouchableOpacity>
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
              {isDeletingTemplate ? 'Excluindo...' : 'Excluir ficha'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.replace('/')}>
            <Text style={styles.secondaryButtonText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingBottom: theme.spacing.lg
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  removeExerciseButton: {
    backgroundColor: theme.colors.error,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm
  },
  removeExerciseButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '600'
  },
  mainActionsContainer: {
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
