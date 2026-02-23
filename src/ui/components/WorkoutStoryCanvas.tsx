import { Image, StyleSheet, Text, View } from 'react-native';

import type { WorkoutSessionSummary } from '../../domain/entities';
import type { HealthWorkoutData } from '../../domain/health/HealthData';
import { theme } from '../theme';

type WorkoutStoryCanvasProps = {
  summary: WorkoutSessionSummary;
  photoUri?: string;
  healthData?: HealthWorkoutData | null;
  isHealthIntegrationEnabled?: boolean;
};

type MetricCardData = {
  key: string;
  label: string;
  value: string;
  valueStyle?: 'default' | 'health';
};

function formatWorkoutDate(workoutDate: Date): string {
  const parsedDate = workoutDate instanceof Date ? workoutDate : new Date(workoutDate);

  return parsedDate.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function formatTotalVolume(totalVolume: number): string {
  return totalVolume.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

function hasHealthData(healthData?: HealthWorkoutData | null): boolean {
  return Boolean(
    healthData &&
      (healthData.estimatedCalories !== undefined ||
        healthData.averageHeartRate !== undefined ||
        healthData.maxHeartRate !== undefined)
  );
}

function buildHealthSummaryText(healthData: HealthWorkoutData): string {
  return [
    healthData.estimatedCalories !== undefined ? `Calorias: ${healthData.estimatedCalories} kcal` : null,
    healthData.averageHeartRate !== undefined || healthData.maxHeartRate !== undefined
      ? `FC méd/máx: ${healthData.averageHeartRate ?? '-'} / ${healthData.maxHeartRate ?? '-'} bpm`
      : null
  ]
    .filter(Boolean)
    .join(' • ');
}

export function WorkoutStoryCanvas({
  summary,
  photoUri,
  healthData,
  isHealthIntegrationEnabled = false
}: WorkoutStoryCanvasProps) {
  const shouldRenderPostWorkoutPhoto = Boolean(photoUri);
  const shouldRenderHealthCard = isHealthIntegrationEnabled && hasHealthData(healthData);

  const metricCards: MetricCardData[] = [
    {
      key: 'duration',
      label: 'Duração',
      value: `${summary.durationInMinutes} min`
    },
    {
      key: 'volume',
      label: 'Volume',
      value: `${formatTotalVolume(summary.totalVolume)} kg`
    },
    {
      key: 'date',
      label: 'Data',
      value: formatWorkoutDate(summary.startedAt)
    }
  ];

  if (shouldRenderHealthCard && healthData) {
    metricCards.push({
      key: 'health',
      label: 'Saúde',
      value: buildHealthSummaryText(healthData),
      valueStyle: 'health'
    });
  }

  return (
    <View style={styles.canvasContainer}>
      <View style={styles.headerContainer}>
        <Text style={styles.brandTitle}>IRON RECORD</Text>
        <Text style={styles.brandSubtitle}>Treino registrado. Evolução constante.</Text>
      </View>

      <View style={styles.mainSectionContainer}>
        <View style={styles.metricsGrid}>
          {metricCards.map((metricCard) => {
            const metricValueStyle =
              metricCard.valueStyle === 'health' ? styles.healthDataValue : styles.metricValue;

            return (
              <View key={metricCard.key} style={styles.metricCard}>
                <Text style={styles.metricLabel}>{metricCard.label}</Text>
                <Text style={metricValueStyle}>{metricCard.value}</Text>
              </View>
            );
          })}
        </View>

        {shouldRenderPostWorkoutPhoto && (
          <View style={styles.photoContainer}>
            <Image source={{ uri: photoUri }} resizeMode="cover" style={styles.photoImage} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  canvasContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
    overflow: 'hidden'
  },
  headerContainer: {
    gap: theme.spacing.xs
  },
  brandTitle: {
    color: theme.colors.primary,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 1.2
  },
  brandSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '500'
  },
  mainSectionContainer: {
    flex: 1,
    gap: theme.spacing.md
  },
  metricsGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md
  },
  metricCard: {
    width: '47%',
    minHeight: 120,
    flexGrow: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    justifyContent: 'space-between',
    gap: theme.spacing.xs
  },
  metricLabel: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '500'
  },
  metricValue: {
    color: theme.colors.textPrimary,
    fontSize: 24,
    fontWeight: '700'
  },
  healthDataValue: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20
  },
  photoContainer: {
    flex: 0.45,
    minHeight: 180,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden'
  },
  photoImage: {
    width: '100%',
    height: '100%'
  }
});
