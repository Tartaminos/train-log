import type {
  CreateWorkoutSessionInput,
  FinishWorkoutSessionInput,
  WorkoutSession,
  WorkoutSessionWithSets
} from '../entities/workout-session';

export interface WorkoutSessionRepository {
  createSession(input: CreateWorkoutSessionInput): Promise<WorkoutSession>;
  finishSession(input: FinishWorkoutSessionInput): Promise<WorkoutSession | null>;
  getRecentSessions(limit?: number): Promise<WorkoutSession[]>;
  getSessionWithSets(sessionId: number): Promise<WorkoutSessionWithSets | null>;
}
