import type {
  CreateWorkoutSessionInput,
  FinishWorkoutSessionInput,
  WorkoutSession,
  WorkoutSessionWithSets
} from '../entities/workout-session';
import type { WorkoutSessionSummary } from '../entities/workout-session-summary';

export interface WorkoutSessionRepository {
  createSession(input: CreateWorkoutSessionInput): Promise<WorkoutSession>;
  finishSession(input: FinishWorkoutSessionInput): Promise<WorkoutSession | null>;
  getActiveSessionByTemplateId(workoutTemplateId: number): Promise<WorkoutSession | null>;
  getRecentSessions(limit?: number, workoutTemplateId?: number): Promise<WorkoutSession[]>;
  getSessionWithSets(sessionId: number): Promise<WorkoutSessionWithSets | null>;
  getWorkoutSessionSummary(sessionId: number): Promise<WorkoutSessionSummary | null>;
}
