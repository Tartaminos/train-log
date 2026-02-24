import type { CreateSessionExerciseInput, SessionExercise, TemplateExercise } from '../entities';

export interface SessionExerciseRepository {
  getExercisesBySessionId(workoutSessionId: number): Promise<SessionExercise[]>;
  ensureExercisesForSession(workoutSessionId: number, templateExerciseList: TemplateExercise[]): Promise<void>;
  createSessionExercise(input: CreateSessionExerciseInput): Promise<SessionExercise>;
  deleteSessionExercise(sessionExerciseId: number): Promise<void>;
}
