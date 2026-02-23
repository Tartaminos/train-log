import type { WorkoutSet } from '../entities';

export function calculateExerciseVolumeTotal(workoutSetList: WorkoutSet[]): number {
  return workoutSetList.reduce((volumeTotal, workoutSet) => {
    return volumeTotal + workoutSet.load * workoutSet.reps;
  }, 0);
}
