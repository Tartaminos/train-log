export type PerExerciseVolumeSummary = {
  exerciseId: number;
  exerciseName: string;
  totalVolume: number;
};

export type WorkoutSessionSummary = {
  sessionId: number;
  startedAt: Date;
  finishedAt: Date | null;
  durationInMinutes: number;
  totalVolume: number;
  exercisesCount: number;
  setsCount: number;
  perExerciseVolume: PerExerciseVolumeSummary[];
};
