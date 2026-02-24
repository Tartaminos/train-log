export type SessionExercise = {
  id: number;
  workoutSessionId: number;
  templateExerciseId: number | null;
  name: string;
  machine: string | null;
  defaultLoad: number | null;
  defaultReps: number | null;
  sortOrder: number | null;
};

export type CreateSessionExerciseInput = {
  workoutSessionId: number;
  templateExerciseId?: number | null;
  name: string;
  machine?: string | null;
  defaultLoad?: number | null;
  defaultReps?: number | null;
  sortOrder?: number | null;
};
