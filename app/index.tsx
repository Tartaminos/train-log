import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

import type { WorkoutTemplate } from '../src/domain/entities';
import {
  TemplateExerciseRepositorySQLite,
  WorkoutTemplateRepositorySQLite
} from '../src/data/repositories/sqlite';
import { Card, Screen } from '../src/ui/components/Layout';
import { theme } from '../src/ui/theme';

type TemplateListItem = {
  id: number;
  name: string;
  exerciseCount: number;
};

const workoutTemplateRepository = new WorkoutTemplateRepositorySQLite();
const templateExerciseRepository = new TemplateExerciseRepositorySQLite();

export default function HomeScreen() {
  const router = useRouter();
  const [templateList, setTemplateList] = useState<TemplateListItem[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);

  useEffect(() => {
    const loadTemplateList = async () => {
      try {
        setIsLoadingTemplates(true);
        const templates = await workoutTemplateRepository.getAllTemplates();

        const templatesWithExerciseCount = await Promise.all(
          templates.map(async (template: WorkoutTemplate) => {
            const exercises = await templateExerciseRepository.getExercisesByTemplateId(template.id);

            return {
              id: template.id,
              name: template.name,
              exerciseCount: exercises.length
            };
          })
        );

        setTemplateList(templatesWithExerciseCount);
      } catch (error) {
        console.error('Failed to load workout templates', error);
        setTemplateList([]);
      } finally {
        setIsLoadingTemplates(false);
      }
    };

    loadTemplateList();
  }, []);

  const handleOpenTemplate = (templateId: number) => {
    router.push(`/template/${templateId}`);
  };

  const handleStartWorkoutSession = (templateId: number) => {
    router.push({
      pathname: '/session/[templateId]',
      params: { templateId: String(templateId) }
    });
  };

  return (
    <Screen>
      <Text style={styles.screenTitle}>Minhas Fichas</Text>

      {isLoadingTemplates ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContainer}>
          {templateList.length === 0 ? (
            <Text style={styles.emptyStateText}>Nenhuma ficha cadastrada.</Text>
          ) : (
            templateList.map((template) => (
              <Card key={template.id}>
                <TouchableOpacity onPress={() => handleOpenTemplate(template.id)} activeOpacity={0.9}>
                  <Text style={styles.templateName}>{template.name}</Text>
                  <Text style={styles.templateExerciseCount}>{template.exerciseCount} exercícios</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.startWorkoutButton}
                  onPress={() => handleStartWorkoutSession(template.id)}
                >
                  <Text style={styles.startWorkoutButtonText}>Iniciar treino</Text>
                </TouchableOpacity>
              </Card>
            ))
          )}
        </ScrollView>
      )}

      <TouchableOpacity style={styles.createButton} onPress={() => router.push('/template/new')}>
        <Text style={styles.createButtonText}>Nova Ficha</Text>
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: 16
  },
  listContainer: {
    gap: theme.spacing.sm,
    paddingBottom: 90
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.colors.textSecondary
  },
  templateName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary
  },
  templateExerciseCount: {
    marginTop: theme.spacing.xs,
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md
  },
  startWorkoutButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12
  },
  startWorkoutButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '600'
  },
  createButton: {
    position: 'absolute',
    left: theme.spacing.md,
    right: theme.spacing.md,
    bottom: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14
  },
  createButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '600'
  }
});
