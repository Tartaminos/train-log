import { executeSql, initDatabase } from '../../database';
import type {
  CreateWorkoutSessionInput,
  FinishWorkoutSessionInput,
  WorkoutSession,
  WorkoutSessionWithSets
} from '../../../domain/entities/workout-session';
import type { WorkoutSessionRepository } from '../../../domain/repositories/workout-session-repository';
import { WorkoutSetRepositorySQLite } from './workout-set-repository-sqlite';

type WorkoutSessionRow = {
  id: number;
  workout_template_id: number | null;
  started_at: string;
  ended_at: string | null;
  notes: string | null;
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

  async getRecentSessions(limit = 10): Promise<WorkoutSession[]> {
    await initDatabase();

    const rows = (await executeSql(
      `SELECT id, workout_template_id, started_at, ended_at, notes
       FROM workout_sessions
       ORDER BY datetime(started_at) DESC, id DESC
       LIMIT ?`,
      [limit]
    )) as WorkoutSessionRow[];

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
