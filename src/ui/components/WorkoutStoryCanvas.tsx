import { Image, StyleSheet, Text, View } from 'react-native';

import type { WorkoutSessionSummary } from '../../domain/entities';
import type { HealthWorkoutData } from '../../domain/health/HealthData';
import { theme } from '../theme';

type WorkoutStoryCanvasProps = {
  summary: WorkoutSessionSummary;
  photoUri?: string;
  healthData?: HealthWorkoutData | null;
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

export function WorkoutStoryCanvas({ summary, photoUri, healthData }: WorkoutStoryCanvasProps) {
  const shouldRenderHealthSection = hasHealthData(healthData);
  const shouldRenderPostWorkoutPhoto = Boolean(photoUri);

  return (
    <View style={styles.canvasContainer}>
      <View style={styles.headerContainer}>
        <Text style={styles.brandTitle}>IRON RECORD</Text>
        <Text style={styles.brandSubtitle}>Treino registrado. Evolução constante.</Text>
      </View>

      <View style={[styles.contentContainer, !shouldRenderPostWorkoutPhoto && styles.contentContainerWithoutPhoto]}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Duração</Text>
          <Text style={styles.metricValue}>{summary.durationInMinutes} min</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Volume total</Text>
          <Text style={styles.metricValue}>{formatTotalVolume(summary.totalVolume)} kg</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Data</Text>
          <Text style={styles.metricValue}>{formatWorkoutDate(summary.startedAt)}</Text>
        </View>

        {shouldRenderHealthSection && (
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Saúde</Text>
            {healthData?.estimatedCalories !== undefined && (
              <Text style={styles.healthDataValue}>Calorias estimadas: {healthData.estimatedCalories} kcal</Text>
            )}
            {(healthData?.averageHeartRate !== undefined || healthData?.maxHeartRate !== undefined) && (
              <Text style={styles.healthDataValue}>
                FC média/máxima: {healthData?.averageHeartRate ?? '-'} / {healthData?.maxHeartRate ?? '-'} bpm
              </Text>
            )}
          </View>
        )}
      </View>

      {shouldRenderPostWorkoutPhoto && (
        <View style={styles.photoContainer}>
          <Image source={{ uri: photoUri }} resizeMode="cover" style={styles.photoImage} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  canvasContainer: {
    width: '100%',
    aspectRatio: 9 / 16,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    justifyContent: 'space-between',
    gap: theme.spacing.lg
  },
  headerContainer: {
    gap: theme.spacing.xs
  },
  brandTitle: {
    color: theme.colors.primary,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 1.2
  },
  brandSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '500'
  },
  contentContainer: {
    gap: theme.spacing.md
  },
  contentContainerWithoutPhoto: {
    flex: 1,
    justifyContent: 'center'
  },
  metricCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.xs
  },
  metricLabel: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '500'
  },
  metricValue: {
    color: theme.colors.textPrimary,
    fontSize: 28,
    fontWeight: '700'
  },
  healthDataValue: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '600'
  },
  photoContainer: {
    height: 190,
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
