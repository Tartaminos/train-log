export type WorkoutSet = {
  id: number;
  workoutSessionId: number;
  templateExerciseId: number | null;
  exerciseName: string;
  load: number;
  reps: number;
  setIndex: number;
  notes: string | null;
};

export type CreateWorkoutSetInput = {
  workoutSessionId: number;
  templateExerciseId?: number | null;
  exerciseName: string;
  load: number;
  reps: number;
  setIndex: number;
  notes?: string | null;
};
