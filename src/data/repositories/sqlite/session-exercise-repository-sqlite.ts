import { executeSql, initDatabase } from '../../database';
import type { CreateSessionExerciseInput, SessionExercise, TemplateExercise } from '../../../domain/entities';
import type { SessionExerciseRepository } from '../../../domain/repositories';

type SessionExerciseRow = {
  id: number;
  workout_session_id: number;
  template_exercise_id: number | null;
  name: string;
  machine: string | null;
  default_load: number | null;
  default_reps: number | null;
  sort_order: number | null;
};

type RunResult = {
  lastInsertRowId: number;
};

function mapRow(row: SessionExerciseRow): SessionExercise {
  return {
    id: row.id,
    workoutSessionId: row.workout_session_id,
    templateExerciseId: row.template_exercise_id,
    name: row.name,
    machine: row.machine,
    defaultLoad: row.default_load,
    defaultReps: row.default_reps,
    sortOrder: row.sort_order
  };
}

export class SessionExerciseRepositorySQLite implements SessionExerciseRepository {
  async getExercisesBySessionId(workoutSessionId: number): Promise<SessionExercise[]> {
    await initDatabase();

    const rowList = (await executeSql(
      `SELECT id, workout_session_id, template_exercise_id, name, machine, default_load, default_reps, sort_order
       FROM session_exercises
       WHERE workout_session_id = ?
       ORDER BY COALESCE(sort_order, 2147483647) ASC, id ASC`,
      [workoutSessionId]
    )) as SessionExerciseRow[];

    return rowList.map(mapRow);
  }

  async ensureExercisesForSession(
    workoutSessionId: number,
    templateExerciseList: TemplateExercise[]
  ): Promise<void> {
    await initDatabase();

    const existingSessionExerciseList = await this.getExercisesBySessionId(workoutSessionId);

    if (existingSessionExerciseList.length > 0) {
      return;
    }

    const insertPromises = templateExerciseList.map((templateExercise, index) =>
      executeSql(
        `INSERT INTO session_exercises
         (workout_session_id, template_exercise_id, name, machine, default_load, default_reps, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          workoutSessionId,
          templateExercise.id,
          templateExercise.name,
          templateExercise.machine ?? null,
          templateExercise.defaultLoad ?? null,
          templateExercise.defaultReps ?? null,
          templateExercise.sortOrder ?? index
        ]
      )
    );

    await Promise.all(insertPromises);
  }

  async createSessionExercise(input: CreateSessionExerciseInput): Promise<SessionExercise> {
    await initDatabase();

    const existingSessionExerciseList = await this.getExercisesBySessionId(input.workoutSessionId);

    const result = (await executeSql(
      `INSERT INTO session_exercises
       (workout_session_id, template_exercise_id, name, machine, default_load, default_reps, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        input.workoutSessionId,
        input.templateExerciseId ?? null,
        input.name,
        input.machine ?? null,
        input.defaultLoad ?? null,
        input.defaultReps ?? null,
        input.sortOrder ?? existingSessionExerciseList.length
      ]
    )) as RunResult;

    const createdRowList = (await executeSql(
      `SELECT id, workout_session_id, template_exercise_id, name, machine, default_load, default_reps, sort_order
       FROM session_exercises
       WHERE id = ?`,
      [result.lastInsertRowId]
    )) as SessionExerciseRow[];

    if (createdRowList.length === 0) {
      throw new Error('Failed to create session exercise.');
    }

    return mapRow(createdRowList[0]);
  }

  async deleteSessionExercise(sessionExerciseId: number): Promise<void> {
    await initDatabase();

    await executeSql('DELETE FROM session_exercises WHERE id = ?', [sessionExerciseId]);
  }
}
