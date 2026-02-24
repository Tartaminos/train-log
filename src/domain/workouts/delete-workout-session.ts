import type { WorkoutSessionRepository } from '../repositories/workout-session-repository';

export async function deleteWorkoutSession(
  workoutSessionRepository: WorkoutSessionRepository,
  sessionId: number
): Promise<void> {
  await workoutSessionRepository.deleteWorkoutSession(sessionId);
}
