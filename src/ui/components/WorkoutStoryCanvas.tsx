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
  const workoutInfoText = `Duração: ${summary.durationInMinutes} min
  Volume: ${formatTotalVolume(summary.totalVolume)} kg
  Data: ${formatWorkoutDate(summary.startedAt)}`;
  const shouldRenderHealthSummary = isHealthIntegrationEnabled && hasHealthData(healthData);

  return (
    <View style={styles.canvasContainer}>
      <View style={styles.headerContainer}>
        <Text style={styles.brandTitle}>IRON RECORD</Text>
        <Text style={styles.brandSubtitle}>Treino registrado. Evolução constante.</Text>
      </View>

      <View style={styles.mainSectionContainer}>
        <View style={styles.workoutInfoCard}>
          <Text style={styles.workoutInfoText}>{workoutInfoText}</Text>
          {shouldRenderHealthSummary && healthData ? (
            <Text style={styles.healthInfoText}>{buildHealthSummaryText(healthData)}</Text>
          ) : null}
        </View>

        <View style={styles.postWorkoutPhotoContainer}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} resizeMode="cover" style={styles.postWorkoutPhotoImage} />
          ) : (
            <View style={styles.postWorkoutPhotoPlaceholder}>
              <Text style={styles.postWorkoutPhotoPlaceholderText}>Foto pós-treino</Text>
            </View>
          )}
        </View>
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
    gap: theme.spacing.md,
    overflow: 'hidden'
  },
  headerContainer: {
    gap: theme.spacing.xs
  },
  brandTitle: {
    color: theme.colors.primary,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 1.1
  },
  brandSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '500'
  },
  mainSectionContainer: {
    flex: 1,
    alignItems: 'center',
    gap: theme.spacing.md
  },
  workoutInfoCard: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.xs
  },
  workoutInfoText: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    textAlign: 'center'
  },
  healthInfoText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
    textAlign: 'center'
  },
  postWorkoutPhotoContainer: {
    width: '74%',
    aspectRatio: 9 / 16,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden'
  },
  postWorkoutPhotoImage: {
    width: '100%',
    height: '100%'
  },
  postWorkoutPhotoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.textSecondary,
    borderStyle: 'dashed'
  },
  postWorkoutPhotoPlaceholderText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '500'
  }
});
