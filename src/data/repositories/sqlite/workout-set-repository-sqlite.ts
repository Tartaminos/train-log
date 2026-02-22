import { executeSql, initDatabase } from '../../database';
import type { CreateWorkoutSetInput, WorkoutSet } from '../../../domain/entities/workout-set';
import type { WorkoutSetRepository } from '../../../domain/repositories/workout-set-repository';

type WorkoutSetRow = {
  id: number;
  workout_session_id: number;
  template_exercise_id: number | null;
  exercise_name: string;
  load: number;
  reps: number;
  set_index: number;
  notes: string | null;
};

type WorkoutSetVolumeRow = {
  total_volume: number | null;
};

type RunResult = {
  lastInsertRowId: number;
};

function mapRow(row: WorkoutSetRow): WorkoutSet {
  return {
    id: row.id,
    workoutSessionId: row.workout_session_id,
    templateExerciseId: row.template_exercise_id,
    exerciseName: row.exercise_name,
    load: row.load,
    reps: row.reps,
    setIndex: row.set_index,
    notes: row.notes
  };
}

export class WorkoutSetRepositorySQLite implements WorkoutSetRepository {
  async createSet(input: CreateWorkoutSetInput): Promise<WorkoutSet> {
    await initDatabase();

    const result = (await executeSql(
      `INSERT INTO workout_sets
      (workout_session_id, template_exercise_id, exercise_name, load, reps, set_index, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        input.workoutSessionId,
        input.templateExerciseId ?? null,
        input.exerciseName,
        input.load,
        input.reps,
        input.setIndex,
        input.notes ?? null
      ]
    )) as RunResult;

    const rows = (await executeSql(
      `SELECT id, workout_session_id, template_exercise_id, exercise_name, load, reps, set_index, notes
      FROM workout_sets WHERE id = ?`,
      [result.lastInsertRowId]
    )) as WorkoutSetRow[];

    if (rows.length === 0) {
      throw new Error('Failed to create workout set.');
    }

    return mapRow(rows[0]);
  }

  async getSetsBySessionId(sessionId: number): Promise<WorkoutSet[]> {
    await initDatabase();

    const rows = (await executeSql(
      `SELECT id, workout_session_id, template_exercise_id, exercise_name, load, reps, set_index, notes
       FROM workout_sets
       WHERE workout_session_id = ?
       ORDER BY set_index ASC, id ASC`,
      [sessionId]
    )) as WorkoutSetRow[];

    return rows.map(mapRow);
  }

  async getTotalVolumeBySessionId(sessionId: number): Promise<number> {
    await initDatabase();

    const rows = (await executeSql(
      'SELECT SUM(load * reps) as total_volume FROM workout_sets WHERE workout_session_id = ?',
      [sessionId]
    )) as WorkoutSetVolumeRow[];

    return rows[0]?.total_volume ?? 0;
  }
}
