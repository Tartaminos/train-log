import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

import { WorkoutTemplateRepositorySQLite } from '../../src/data/repositories/sqlite';
import { Screen } from '../../src/ui/components/Layout';
import { theme } from '../../src/ui/theme';

const workoutTemplateRepository = new WorkoutTemplateRepositorySQLite();

export default function NewTemplateScreen() {
  const router = useRouter();
  const [templateName, setTemplateName] = useState('');
  const [templateNotes, setTemplateNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  const handleSaveTemplate = async () => {
    const trimmedTemplateName = templateName.trim();

    if (!trimmedTemplateName) {
      setErrorMessage('Informe o nome da ficha.');
      return;
    }

    try {
      setErrorMessage(null);
      setIsSavingTemplate(true);

      const createdAt = new Date().toISOString();

      await workoutTemplateRepository.createTemplate({
        name: trimmedTemplateName,
        notes: templateNotes.trim() || null,
        createdAt
      });

      router.replace('/');
    } catch (error) {
      console.error('Failed to create workout template', error);
      setErrorMessage('Não foi possível salvar a ficha. Tente novamente.');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.screenTitle}>Nova ficha</Text>

      <View style={styles.formGroup}>
        <Text style={styles.inputLabel}>Nome da ficha *</Text>
        <TextInput
          style={styles.textInput}
          value={templateName}
          onChangeText={setTemplateName}
          placeholder="Ex.: Treino A"
          placeholderTextColor={theme.colors.textSecondary}
          autoCapitalize="sentences"
        />
        {errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null}
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
              {isSavingTemplate ? 'Salvando...' : 'Salvar ficha'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.lg
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
  errorMessage: {
    color: theme.colors.error,
    marginTop: theme.spacing.sm,
    fontSize: 14
  },
  mainActionsContainer: {
    marginTop: theme.spacing.lg,
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
