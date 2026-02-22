import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

import type { WorkoutTemplate } from '../src/domain/entities';
import {
  TemplateExerciseRepositorySQLite,
  WorkoutTemplateRepositorySQLite
} from '../src/data/repositories/sqlite';

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

  return (
    <View style={styles.container}>
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
              <TouchableOpacity
                key={template.id}
                style={styles.templateCard}
                onPress={() => router.push(`/template/${template.id}`)}
              >
                <Text style={styles.templateName}>{template.name}</Text>
                <Text style={styles.templateExerciseCount}>{template.exerciseCount} exercícios</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      <TouchableOpacity style={styles.createButton} onPress={() => router.push('/template/new')}>
        <Text style={styles.createButtonText}>Nova Ficha</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 20
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingText: {
    color: '#475569',
    fontSize: 16
  },
  listContainer: {
    gap: 10,
    paddingBottom: 90
  },
  emptyStateText: {
    fontSize: 16,
    color: '#64748b'
  },
  templateCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  templateName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a'
  },
  templateExerciseCount: {
    marginTop: 4,
    fontSize: 14,
    color: '#64748b'
  },
  createButton: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 20,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14
  },
  createButtonText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600'
  }
});
