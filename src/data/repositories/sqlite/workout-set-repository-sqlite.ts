import { executeSql, initDatabase } from '../../database';
import type { CreateWorkoutSetInput, WorkoutSet } from '../../../domain/entities/workout-set';
import type {
  ExercisePerformanceSummary,
  WorkoutSetRepository
} from '../../../domain/repositories/workout-set-repository';

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

type ExercisePerformanceRow = {
  workout_set_id: number;
  workout_session_id: number;
  template_exercise_id: number | null;
  exercise_name: string;
  load: number;
  reps: number;
  set_index: number;
  session_started_at: string;
};

type ExerciseSummaryRow = {
  exercise_name: string;
  best_load: number | null;
  total_accumulated_volume: number | null;
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

  async getExercisePerformanceSummaryList(): Promise<ExercisePerformanceSummary[]> {
    await initDatabase();

    const exerciseSummaryRowList = (await executeSql(
      `SELECT
         exercise_name,
         MAX(load) AS best_load,
         SUM(load * reps) AS total_accumulated_volume
       FROM workout_sets
       GROUP BY exercise_name
       ORDER BY exercise_name COLLATE NOCASE ASC`
    )) as ExerciseSummaryRow[];

    const exerciseHistoryRowList = (await executeSql(
      `SELECT
         workout_sets.id AS workout_set_id,
         workout_sets.workout_session_id,
         workout_sets.template_exercise_id,
         workout_sets.exercise_name,
         workout_sets.load,
         workout_sets.reps,
         workout_sets.set_index,
         workout_sessions.started_at AS session_started_at
       FROM workout_sets
       INNER JOIN workout_sessions ON workout_sessions.id = workout_sets.workout_session_id
       ORDER BY workout_sessions.started_at DESC, workout_sets.set_index ASC, workout_sets.id DESC`
    )) as ExercisePerformanceRow[];

    const exerciseHistoryMap = new Map<string, ExercisePerformanceSummary['historyItemList']>();

    exerciseHistoryRowList.forEach((exerciseHistoryRow) => {
      const currentHistoryItemList = exerciseHistoryMap.get(exerciseHistoryRow.exercise_name) ?? [];

      currentHistoryItemList.push({
        workoutSetId: exerciseHistoryRow.workout_set_id,
        workoutSessionId: exerciseHistoryRow.workout_session_id,
        templateExerciseId: exerciseHistoryRow.template_exercise_id,
        exerciseName: exerciseHistoryRow.exercise_name,
        load: exerciseHistoryRow.load,
        reps: exerciseHistoryRow.reps,
        setIndex: exerciseHistoryRow.set_index,
        sessionStartedAt: exerciseHistoryRow.session_started_at
      });

      exerciseHistoryMap.set(exerciseHistoryRow.exercise_name, currentHistoryItemList);
    });

    return exerciseSummaryRowList.map((exerciseSummaryRow) => ({
      exerciseName: exerciseSummaryRow.exercise_name,
      bestLoad: exerciseSummaryRow.best_load ?? 0,
      totalAccumulatedVolume: exerciseSummaryRow.total_accumulated_volume ?? 0,
      historyItemList: exerciseHistoryMap.get(exerciseSummaryRow.exercise_name) ?? []
    }));
  }

  async getExercisePerformanceSummaryByExerciseName(
    exerciseName: string
  ): Promise<ExercisePerformanceSummary | null> {
    await initDatabase();

    const exerciseSummaryRowList = (await executeSql(
      `SELECT
         exercise_name,
         MAX(load) AS best_load,
         SUM(load * reps) AS total_accumulated_volume
       FROM workout_sets
       WHERE exercise_name = ?
       GROUP BY exercise_name`,
      [exerciseName]
    )) as ExerciseSummaryRow[];

    if (exerciseSummaryRowList.length === 0) {
      return null;
    }

    const exerciseHistoryRowList = (await executeSql(
      `SELECT
         workout_sets.id AS workout_set_id,
         workout_sets.workout_session_id,
         workout_sets.template_exercise_id,
         workout_sets.exercise_name,
         workout_sets.load,
         workout_sets.reps,
         workout_sets.set_index,
         workout_sessions.started_at AS session_started_at
       FROM workout_sets
       INNER JOIN workout_sessions ON workout_sessions.id = workout_sets.workout_session_id
       WHERE workout_sets.exercise_name = ?
       ORDER BY workout_sessions.started_at DESC, workout_sets.set_index ASC, workout_sets.id DESC`,
      [exerciseName]
    )) as ExercisePerformanceRow[];

    const exerciseSummaryRow = exerciseSummaryRowList[0];

    return {
      exerciseName: exerciseSummaryRow.exercise_name,
      bestLoad: exerciseSummaryRow.best_load ?? 0,
      totalAccumulatedVolume: exerciseSummaryRow.total_accumulated_volume ?? 0,
      historyItemList: exerciseHistoryRowList.map((exerciseHistoryRow) => ({
        workoutSetId: exerciseHistoryRow.workout_set_id,
        workoutSessionId: exerciseHistoryRow.workout_session_id,
        templateExerciseId: exerciseHistoryRow.template_exercise_id,
        exerciseName: exerciseHistoryRow.exercise_name,
        load: exerciseHistoryRow.load,
        reps: exerciseHistoryRow.reps,
        setIndex: exerciseHistoryRow.set_index,
        sessionStartedAt: exerciseHistoryRow.session_started_at
      }))
    };
  }
}
