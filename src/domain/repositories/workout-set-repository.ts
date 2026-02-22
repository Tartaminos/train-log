import type { CreateWorkoutSetInput, WorkoutSet } from '../entities/workout-set';

export interface WorkoutSetRepository {
  createSet(input: CreateWorkoutSetInput): Promise<WorkoutSet>;
  getSetsBySessionId(sessionId: number): Promise<WorkoutSet[]>;
  getTotalVolumeBySessionId(sessionId: number): Promise<number>;
}
