import { executeSql, initDatabase } from '../../database';
import type {
  CreateWorkoutSessionInput,
  FinishWorkoutSessionInput,
  WorkoutSession,
  WorkoutSessionWithSets
} from '../../../domain/entities/workout-session';
import type { WorkoutSessionSummary } from '../../../domain/entities/workout-session-summary';
import type { WorkoutSessionRepository } from '../../../domain/repositories/workout-session-repository';
import { WorkoutSetRepositorySQLite } from './workout-set-repository-sqlite';

type WorkoutSessionRow = {
  id: number;
  workout_template_id: number | null;
  started_at: string;
  ended_at: string | null;
  notes: string | null;
};

type WorkoutSummaryTotalsRow = {
  sets_count: number;
  exercises_count: number;
  total_volume: number | null;
};

type WorkoutPerExerciseVolumeRow = {
  exercise_id: number | null;
  exercise_name: string;
  total_volume: number;
};

type RunResult = {
  changes: number;
  lastInsertRowId: number;
};

function mapRow(row: WorkoutSessionRow): WorkoutSession {
  return {
    id: row.id,
    workoutTemplateId: row.workout_template_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    notes: row.notes
  };
}

function calculateDurationInMinutes(startedAt: string, endedAt: string | null): number {
  const startedTimestamp = new Date(startedAt).getTime();
  const finishedTimestamp = new Date(endedAt ?? new Date().toISOString()).getTime();

  if (Number.isNaN(startedTimestamp) || Number.isNaN(finishedTimestamp) || finishedTimestamp < startedTimestamp) {
    return 0;
  }

  const elapsedMilliseconds = finishedTimestamp - startedTimestamp;
  const elapsedMinutes = Math.floor(elapsedMilliseconds / (1000 * 60));

  if (endedAt && elapsedMilliseconds > 0 && elapsedMinutes === 0) {
    return 1;
  }

  return elapsedMinutes;
}

export class WorkoutSessionRepositorySQLite implements WorkoutSessionRepository {
  private readonly workoutSetRepository = new WorkoutSetRepositorySQLite();

  async createSession(input: CreateWorkoutSessionInput): Promise<WorkoutSession> {
    await initDatabase();

    const startedAt = input.startedAt ?? new Date().toISOString();
    const result = (await executeSql(
      'INSERT INTO workout_sessions (workout_template_id, started_at, ended_at, notes) VALUES (?, ?, ?, ?)',
      [input.workoutTemplateId ?? null, startedAt, null, input.notes ?? null]
    )) as RunResult;

    const created = await this.getSessionById(result.lastInsertRowId);

    if (!created) {
      throw new Error('Failed to create workout session.');
    }

    return created;
  }

  async finishSession(input: FinishWorkoutSessionInput): Promise<WorkoutSession | null> {
    await initDatabase();

    const current = await this.getSessionById(input.id);

    if (!current) {
      return null;
    }

    await executeSql('UPDATE workout_sessions SET ended_at = ?, notes = ? WHERE id = ?', [
      input.endedAt ?? new Date().toISOString(),
      input.notes ?? current.notes,
      input.id
    ]);

    return this.getSessionById(input.id);
  }


  async getActiveSessionByTemplateId(workoutTemplateId: number): Promise<WorkoutSession | null> {
    await initDatabase();

    const rows = (await executeSql(
      `SELECT id, workout_template_id, started_at, ended_at, notes
       FROM workout_sessions
       WHERE workout_template_id = ? AND ended_at IS NULL
       ORDER BY datetime(started_at) DESC, id DESC
       LIMIT 1`,
      [workoutTemplateId]
    )) as WorkoutSessionRow[];

    if (rows.length === 0) {
      return null;
    }

    return mapRow(rows[0]);
  }

  async getRecentSessions(limit = 10, workoutTemplateId?: number): Promise<WorkoutSession[]> {
    await initDatabase();

    const shouldFilterByTemplate = typeof workoutTemplateId === 'number';
    const sessionQuery = shouldFilterByTemplate
      ? `SELECT id, workout_template_id, started_at, ended_at, notes
         FROM workout_sessions
         WHERE workout_template_id = ?
         ORDER BY datetime(started_at) DESC, id DESC
         LIMIT ?`
      : `SELECT id, workout_template_id, started_at, ended_at, notes
         FROM workout_sessions
         ORDER BY datetime(started_at) DESC, id DESC
         LIMIT ?`;

    const queryParams = shouldFilterByTemplate ? [workoutTemplateId, limit] : [limit];

    const rows = (await executeSql(sessionQuery, queryParams)) as WorkoutSessionRow[];

    return rows.map(mapRow);
  }

  async getSessionWithSets(sessionId: number): Promise<WorkoutSessionWithSets | null> {
    await initDatabase();

    const session = await this.getSessionById(sessionId);

    if (!session) {
      return null;
    }

    const sets = await this.workoutSetRepository.getSetsBySessionId(sessionId);

    return {
      ...session,
      sets
    };
  }

  async getWorkoutSessionSummary(sessionId: number): Promise<WorkoutSessionSummary | null> {
    await initDatabase();

    const session = await this.getSessionById(sessionId);

    if (!session) {
      return null;
    }

    const [totalsRow] = (await executeSql(
      `SELECT
         COUNT(workout_sets.id) AS sets_count,
         COUNT(DISTINCT workout_sets.exercise_name) AS exercises_count,
         COALESCE(SUM(workout_sets.load * workout_sets.reps), 0) AS total_volume
       FROM workout_sessions
       LEFT JOIN workout_sets ON workout_sets.workout_session_id = workout_sessions.id
       WHERE workout_sessions.id = ?`,
      [sessionId]
    )) as WorkoutSummaryTotalsRow[];

    const perExerciseRows = (await executeSql(
      `SELECT
         MIN(template_exercise_id) AS exercise_id,
         exercise_name,
         COALESCE(SUM(load * reps), 0) AS total_volume
       FROM workout_sets
       WHERE workout_session_id = ?
       GROUP BY exercise_name
       ORDER BY total_volume DESC, exercise_name ASC`,
      [sessionId]
    )) as WorkoutPerExerciseVolumeRow[];

    return {
      sessionId: session.id,
      startedAt: new Date(session.startedAt),
      finishedAt: session.endedAt ? new Date(session.endedAt) : null,
      durationInMinutes: calculateDurationInMinutes(session.startedAt, session.endedAt),
      totalVolume: Number(totalsRow?.total_volume ?? 0),
      exercisesCount: totalsRow?.exercises_count ?? 0,
      setsCount: totalsRow?.sets_count ?? 0,
      perExerciseVolume: perExerciseRows.map((row, index) => ({
        exerciseId: row.exercise_id ?? -(index + 1),
        exerciseName: row.exercise_name,
        totalVolume: row.total_volume
      }))
    };
  }

  private async getSessionById(sessionId: number): Promise<WorkoutSession | null> {
    const rows = (await executeSql(
      `SELECT id, workout_template_id, started_at, ended_at, notes
       FROM workout_sessions
       WHERE id = ?`,
      [sessionId]
    )) as WorkoutSessionRow[];

    if (rows.length === 0) {
      return null;
    }

    return mapRow(rows[0]);
  }
}
