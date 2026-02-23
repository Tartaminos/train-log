import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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

  useEffect(() => {
    let isCancelled = false;

    const loadWorkoutHistory = async () => {
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

        if (!isCancelled) {
          setHistorySessionList(historyList);
          setTemplateFilterOptionList(availableTemplateFilterOptions);
        }
      } catch (error) {
        console.error('Failed to load workout history', error);
        if (!isCancelled) {
          setHistorySessionList([]);
          setTemplateFilterOptionList([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingHistory(false);
        }
      }
    };

    loadWorkoutHistory();

    return () => {
      isCancelled = true;
    };
  }, []);

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

  const workoutVolumePointList = useMemo(
    () =>
      [...filteredHistorySessionList]
        .sort(
          (firstSession, secondSession) =>
            new Date(firstSession.startedAt).getTime() - new Date(secondSession.startedAt).getTime()
        )
        .map((historySessionItem) => ({
          date: historySessionItem.startedAt,
          totalVolume: historySessionItem.totalVolume
        })),
    [filteredHistorySessionList]
  );

  return (
    <Screen>
      <Pressable style={styles.backButton} onPress={() => router.push('/')}>
        <Text style={styles.backButtonText}>Voltar</Text>
      </Pressable>

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
          <View style={styles.chartSectionContainer}>
            <Text style={styles.chartSectionTitle}>Evolução do volume total (kg)</Text>
            <WorkoutVolumeChart pointList={workoutVolumePointList} />
          </View>
        }
        ListEmptyComponent={<Text style={styles.emptyStateText}>{emptyStateText}</Text>}
        renderItem={({ item: historySession }) => (
          <Card>
            <Pressable
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
          </Card>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.card,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    marginBottom: theme.spacing.md
  },
  backButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '600'
  },
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
  }
});
