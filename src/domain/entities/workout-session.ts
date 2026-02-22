import type { WorkoutSet } from './workout-set';

export type WorkoutSession = {
  id: number;
  workoutTemplateId: number | null;
  startedAt: string;
  endedAt: string | null;
  notes: string | null;
};

export type WorkoutSessionWithSets = WorkoutSession & {
  sets: WorkoutSet[];
};

export type CreateWorkoutSessionInput = {
  workoutTemplateId?: number | null;
  startedAt?: string;
  notes?: string | null;
};

export type FinishWorkoutSessionInput = {
  id: number;
  endedAt?: string;
  notes?: string | null;
};
