import type { CreateWorkoutSetInput, WorkoutSet } from '../entities/workout-set';

export type ExercisePerformanceHistoryItem = {
  workoutSetId: number;
  workoutSessionId: number;
  templateExerciseId: number | null;
  exerciseName: string;
  load: number;
  reps: number;
  setIndex: number;
  sessionStartedAt: string;
};

export type ExercisePerformanceSummary = {
  exerciseName: string;
  bestLoad: number;
  totalAccumulatedVolume: number;
  historyItemList: ExercisePerformanceHistoryItem[];
};

export interface WorkoutSetRepository {
  createSet(input: CreateWorkoutSetInput): Promise<WorkoutSet>;
  getSetsBySessionId(sessionId: number): Promise<WorkoutSet[]>;
  getTotalVolumeBySessionId(sessionId: number): Promise<number>;
  getExercisePerformanceSummaryList(): Promise<ExercisePerformanceSummary[]>;
  getExercisePerformanceSummaryByExerciseName(
    exerciseName: string
  ): Promise<ExercisePerformanceSummary | null>;
}
