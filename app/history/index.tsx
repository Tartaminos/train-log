import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  WorkoutSessionRepositorySQLite,
  WorkoutSetRepositorySQLite,
  WorkoutTemplateRepositorySQLite
} from '../../src/data/repositories/sqlite';
import type { WorkoutSession } from '../../src/domain/entities';
import type { WorkoutTemplate } from '../../src/domain/entities/workout-template';
import { Card, Screen } from '../../src/ui/components/Layout';
import { WorkoutVolumeChart } from '../../src/ui/components/WorkoutVolumeChart';
import { deleteWorkoutSession } from '../../src/domain/workouts/delete-workout-session';
import { theme } from '../../src/ui/theme';

type HistorySessionListItem = {
  id: number;
  workoutTemplateId: number | null;
  workoutTemplateName: string;
  startedAt: string;
  startedAtLabel: string;
  totalVolume: number;
  totalVolumeLabel: string;
  setCountLabel: string;
};

type TemplateFilterOption = {
  id: number;
  name: string;
};

type WorkoutVolumePoint = {
  date: string;
  totalVolume: number;
};

const workoutSessionRepository = new WorkoutSessionRepositorySQLite();
const workoutSetRepository = new WorkoutSetRepositorySQLite();
const workoutTemplateRepository = new WorkoutTemplateRepositorySQLite();

function formatSessionDate(startedAt: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(startedAt));
}

function formatVolume(totalVolume: number): string {
  return totalVolume.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

export default function WorkoutHistoryScreen() {
  const router = useRouter();
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [historySessionList, setHistorySessionList] = useState<HistorySessionListItem[]>([]);
  const [templateFilterOptionList, setTemplateFilterOptionList] = useState<TemplateFilterOption[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | 'all'>('all');
  const [workoutVolumePointList, setWorkoutVolumePointList] = useState<WorkoutVolumePoint[]>([]);

  const loadWorkoutHistory = useCallback(async () => {
    try {
      setIsLoadingHistory(true);
      const [workoutSessionList, workoutTemplateList] = await Promise.all([
        workoutSessionRepository.getRecentSessions(50),
        workoutTemplateRepository.getAllTemplates()
      ]);

      const workoutTemplateMap = new Map<number, WorkoutTemplate>(
        workoutTemplateList.map((workoutTemplate) => [workoutTemplate.id, workoutTemplate])
      );

      const historyList = await Promise.all(
        workoutSessionList.map(async (workoutSession: WorkoutSession) => {
          const workoutTemplate = workoutSession.workoutTemplateId
            ? workoutTemplateMap.get(workoutSession.workoutTemplateId) ?? null
            : null;
          const [totalVolume, workoutSetList] = await Promise.all([
            workoutSetRepository.getTotalVolumeBySessionId(workoutSession.id),
            workoutSetRepository.getSetsBySessionId(workoutSession.id)
          ]);

          return {
            id: workoutSession.id,
            workoutTemplateId: workoutSession.workoutTemplateId,
            workoutTemplateName: workoutTemplate?.name ?? 'Treino sem nome',
            startedAt: workoutSession.startedAt,
            startedAtLabel: formatSessionDate(workoutSession.startedAt),
            totalVolume,
            totalVolumeLabel: `Volume: ${formatVolume(totalVolume)} kg`,
            setCountLabel: `Séries: ${workoutSetList.length}`
          };
        })
      );

      historyList.sort(
        (firstSession, secondSession) =>
          new Date(secondSession.startedAt).getTime() - new Date(firstSession.startedAt).getTime()
      );

      const availableTemplateFilterOptions = workoutTemplateList.map((workoutTemplate) => ({
        id: workoutTemplate.id,
        name: workoutTemplate.name
      }));

      setHistorySessionList(historyList);
      setTemplateFilterOptionList(availableTemplateFilterOptions);
    } catch (error) {
      console.error('Failed to load workout history', error);
      setHistorySessionList([]);
      setTemplateFilterOptionList([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkoutHistory();
  }, [loadWorkoutHistory]);

  const loadWorkoutVolumePointList = useCallback(async () => {
    if (selectedTemplateId === 'all') {
      setWorkoutVolumePointList([]);
      return;
    }

    try {
      const selectedTemplateSessionList = await workoutSessionRepository.getRecentSessions(50, selectedTemplateId);

      const chartPointList = await Promise.all(
        selectedTemplateSessionList.map(async (selectedTemplateSession) => {
          const totalSessionVolume = await workoutSetRepository.getTotalVolumeBySessionId(selectedTemplateSession.id);

          return {
            date: selectedTemplateSession.startedAt,
            totalVolume: totalSessionVolume
          };
        })
      );

      chartPointList.sort(
        (firstPoint, secondPoint) => new Date(firstPoint.date).getTime() - new Date(secondPoint.date).getTime()
      );

      setWorkoutVolumePointList(chartPointList);
    } catch (error) {
      console.error('Failed to load workout volume chart data', error);
      setWorkoutVolumePointList([]);
    }
  }, [selectedTemplateId]);

  useEffect(() => {
    void loadWorkoutVolumePointList();
  }, [loadWorkoutVolumePointList]);

  const emptyStateText = useMemo(() => {
    if (isLoadingHistory) {
      return 'Carregando histórico...';
    }

    return 'Você ainda não registrou nenhum treino.';
  }, [isLoadingHistory]);

  const filteredHistorySessionList = useMemo(() => {
    if (selectedTemplateId === 'all') {
      return historySessionList;
    }

    return historySessionList.filter(
      (historySessionItem) => historySessionItem.workoutTemplateId === selectedTemplateId
    );
  }, [historySessionList, selectedTemplateId]);

  const selectedTemplateName = useMemo(() => {
    if (selectedTemplateId === 'all') {
      return null;
    }

    const selectedTemplateOption = templateFilterOptionList.find(
      (templateFilterOption) => templateFilterOption.id === selectedTemplateId
    );

    return selectedTemplateOption?.name ?? 'Treino selecionado';
  }, [selectedTemplateId, templateFilterOptionList]);

  const handleConfirmDeleteWorkoutSession = useCallback(
    (sessionId: number) => {
      Alert.alert('Deseja apagar este treino?', 'Esta ação não pode ser desfeita.', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWorkoutSession(workoutSessionRepository, sessionId);
              await loadWorkoutHistory();
              await loadWorkoutVolumePointList();

              if (selectedTemplateId !== 'all') {
                const selectedTemplateSessionList = await workoutSessionRepository.getRecentSessions(
                  50,
                  selectedTemplateId
                );

                if (selectedTemplateSessionList.length === 0) {
                  setSelectedTemplateId('all');
                }
              }
            } catch (error) {
              console.error('Failed to delete workout session', error);
            }
          }
        }
      ]);
    },
    [loadWorkoutHistory, loadWorkoutVolumePointList, selectedTemplateId]
  );

  return (
    <Screen showBackButton title="Histórico">
      <Text style={styles.screenTitle}>Histórico de treinos</Text>

      <View style={styles.filterBarContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterListContainer}
        >
          <Pressable
            style={[
              styles.filterButton,
              selectedTemplateId === 'all' ? styles.filterButtonActive : styles.filterButtonInactive
            ]}
            onPress={() => setSelectedTemplateId('all')}
          >
            <Text
              style={[
                styles.filterButtonLabel,
                selectedTemplateId === 'all' ? styles.filterButtonLabelActive : styles.filterButtonLabelInactive
              ]}
            >
              Todas
            </Text>
          </Pressable>

          {templateFilterOptionList.map((templateFilterOption) => {
            const isSelectedTemplate = selectedTemplateId === templateFilterOption.id;

            return (
              <Pressable
                key={templateFilterOption.id}
                style={[
                  styles.filterButton,
                  isSelectedTemplate ? styles.filterButtonActive : styles.filterButtonInactive
                ]}
                onPress={() => setSelectedTemplateId(templateFilterOption.id)}
              >
                <Text
                  style={[
                    styles.filterButtonLabel,
                    isSelectedTemplate ? styles.filterButtonLabelActive : styles.filterButtonLabelInactive
                  ]}
                >
                  {templateFilterOption.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filteredHistorySessionList}
        keyExtractor={(historySession) => String(historySession.id)}
        contentContainerStyle={styles.historyListContainer}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          selectedTemplateId === 'all' ? null : (
            <View style={styles.chartSectionContainer}>
              <Text style={styles.chartSectionTitle}>Evolução de volume — {selectedTemplateName}</Text>
              <WorkoutVolumeChart pointList={workoutVolumePointList} />
            </View>
          )
        }
        ListEmptyComponent={<Text style={styles.emptyStateText}>{emptyStateText}</Text>}
        renderItem={({ item: historySession }) => (
          <Card>
            <View style={styles.cardContentContainer}>
              <Pressable
                style={styles.cardMainButton}
                onPress={() =>
                  router.push({
                    pathname: '/history/[sessionId]',
                    params: { sessionId: String(historySession.id) }
                  })
                }
              >
                <Text style={styles.cardTitle}>{historySession.workoutTemplateName}</Text>
                <Text style={styles.cardSubtitle}>{historySession.startedAtLabel}</Text>
                <View style={styles.cardMetricsContainer}>
                  <Text style={styles.cardVolume}>{historySession.totalVolumeLabel}</Text>
                  <Text style={styles.cardVolume}>{historySession.setCountLabel}</Text>
                </View>
              </Pressable>

              <Pressable
                style={styles.deleteButton}
                onPress={() => handleConfirmDeleteWorkoutSession(historySession.id)}
              >
                <Text style={styles.deleteButtonLabel}>Apagar</Text>
              </Pressable>
            </View>
          </Card>
        )}
      />
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
  historyListContainer: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.md
  },
  chartSectionContainer: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm
  },
  chartSectionTitle: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700'
  },
  filterBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md
  },
  filterListContainer: {
    gap: theme.spacing.xs,
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md
  },
  filterButton: {
    borderRadius: theme.radius.full,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    alignSelf: 'flex-start'
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary
  },
  filterButtonInactive: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border
  },
  filterButtonLabel: {
    fontSize: 13,
    fontWeight: '600'
  },
  filterButtonLabelActive: {
    color: theme.colors.textPrimary
  },
  filterButtonLabelInactive: {
    color: theme.colors.textSecondary
  },
  emptyStateText: {
    color: theme.colors.textSecondary,
    fontSize: 16
  },
  cardTitle: {
    color: theme.colors.textPrimary,
    fontSize: 17,
    fontWeight: '600'
  },
  cardSubtitle: {
    marginTop: theme.spacing.xs,
    color: theme.colors.textSecondary,
    fontSize: 14
  },
  cardVolume: {
    color: theme.colors.textSecondary,
    fontSize: 13
  },
  cardMetricsContainer: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xs
  },
  cardContentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm
  },
  cardMainButton: {
    flex: 1
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.surface
  },
  deleteButtonLabel: {
    color: '#ff6b6b',
    fontSize: 13,
    fontWeight: '700'
  }
});
