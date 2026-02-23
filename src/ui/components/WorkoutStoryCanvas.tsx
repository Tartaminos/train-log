import { Image, StyleSheet, Text, View } from 'react-native';

import type { WorkoutSessionSummary } from '../../domain/entities';
import { theme } from '../theme';

type WorkoutStoryCanvasProps = {
  summary: WorkoutSessionSummary;
  photoUri?: string;
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

export function WorkoutStoryCanvas({ summary, photoUri }: WorkoutStoryCanvasProps) {
  return (
    <View style={styles.canvasContainer}>
      <View style={styles.headerContainer}>
        <Text style={styles.brandTitle}>IRON RECORD</Text>
        <Text style={styles.brandSubtitle}>Treino registrado. Evolução constante.</Text>
      </View>

      <View style={styles.contentContainer}>
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
      </View>

      <View style={styles.photoContainer}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} resizeMode="cover" style={styles.photoImage} />
        ) : (
          <Text style={styles.photoPlaceholderText}>Foto pós-treino aqui</Text>
        )}
      </View>
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
  photoContainer: {
    height: 190,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  photoImage: {
    width: '100%',
    height: '100%'
  },
  photoPlaceholderText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    fontWeight: '600'
  }
});
