import { executeSql, initDatabase } from '../../database';
import type {
  CreateTemplateExerciseInput,
  TemplateExercise,
  UpdateTemplateExerciseInput
} from '../../../domain/entities/template-exercise';
import type { TemplateExerciseRepository } from '../../../domain/repositories/template-exercise-repository';

type TemplateExerciseRow = {
  id: number;
  workout_template_id: number;
  name: string;
  machine: string | null;
  default_load: number | null;
  default_reps: number | null;
  sort_order: number | null;
};

type RunResult = {
  changes: number;
  lastInsertRowId: number;
};

function mapRow(row: TemplateExerciseRow): TemplateExercise {
  return {
    id: row.id,
    workoutTemplateId: row.workout_template_id,
    name: row.name,
    machine: row.machine,
    defaultLoad: row.default_load,
    defaultReps: row.default_reps,
    sortOrder: row.sort_order
  };
}

export class TemplateExerciseRepositorySQLite implements TemplateExerciseRepository {
  async createExercise(input: CreateTemplateExerciseInput): Promise<TemplateExercise> {
    await initDatabase();

    const result = (await executeSql(
      `INSERT INTO template_exercises
      (workout_template_id, name, machine, default_load, default_reps, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        input.workoutTemplateId,
        input.name,
        input.machine ?? null,
        input.defaultLoad ?? null,
        input.defaultReps ?? null,
        input.sortOrder ?? null
      ]
    )) as RunResult;

    const rows = (await executeSql(
      `SELECT id, workout_template_id, name, machine, default_load, default_reps, sort_order
       FROM template_exercises WHERE id = ?`,
      [result.lastInsertRowId]
    )) as TemplateExerciseRow[];

    if (rows.length === 0) {
      throw new Error('Failed to create template exercise.');
    }

    return mapRow(rows[0]);
  }

  async updateExercise(input: UpdateTemplateExerciseInput): Promise<TemplateExercise | null> {
    await initDatabase();

    const existingRows = (await executeSql(
      `SELECT id, workout_template_id, name, machine, default_load, default_reps, sort_order
       FROM template_exercises WHERE id = ?`,
      [input.id]
    )) as TemplateExerciseRow[];

    if (existingRows.length === 0) {
      return null;
    }

    const current = existingRows[0];

    await executeSql(
      `UPDATE template_exercises
       SET name = ?, machine = ?, default_load = ?, default_reps = ?, sort_order = ?
       WHERE id = ?`,
      [
        input.name ?? current.name,
        input.machine ?? current.machine,
        input.defaultLoad ?? current.default_load,
        input.defaultReps ?? current.default_reps,
        input.sortOrder ?? current.sort_order,
        input.id
      ]
    );

    const updatedRows = (await executeSql(
      `SELECT id, workout_template_id, name, machine, default_load, default_reps, sort_order
       FROM template_exercises WHERE id = ?`,
      [input.id]
    )) as TemplateExerciseRow[];

    return updatedRows.length > 0 ? mapRow(updatedRows[0]) : null;
  }

  async deleteExercise(exerciseId: number): Promise<boolean> {
    await initDatabase();

    const result = (await executeSql('DELETE FROM template_exercises WHERE id = ?', [
      exerciseId
    ])) as RunResult;

    return result.changes > 0;
  }

  async getExercisesByTemplateId(templateId: number): Promise<TemplateExercise[]> {
    await initDatabase();

    const rows = (await executeSql(
      `SELECT id, workout_template_id, name, machine, default_load, default_reps, sort_order
       FROM template_exercises
       WHERE workout_template_id = ?
       ORDER BY sort_order ASC, id ASC`,
      [templateId]
    )) as TemplateExerciseRow[];

    return rows.map(mapRow);
  }
}
