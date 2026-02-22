import { executeSql, initDatabase } from '../../database';
import type {
  CreateWorkoutTemplateInput,
  UpdateWorkoutTemplateInput,
  WorkoutTemplate
} from '../../../domain/entities/workout-template';
import type { WorkoutTemplateRepository } from '../../../domain/repositories/workout-template-repository';

type WorkoutTemplateRow = {
  id: number;
  name: string;
  notes: string | null;
  created_at: string;
};

type RunResult = {
  changes: number;
  lastInsertRowId: number;
};

function mapRow(row: WorkoutTemplateRow): WorkoutTemplate {
  return {
    id: row.id,
    name: row.name,
    notes: row.notes,
    createdAt: row.created_at
  };
}

export class WorkoutTemplateRepositorySQLite implements WorkoutTemplateRepository {
  async createTemplate(input: CreateWorkoutTemplateInput): Promise<WorkoutTemplate> {
    await initDatabase();

    const createdAt = input.createdAt ?? new Date().toISOString();
    const result = (await executeSql(
      'INSERT INTO workout_templates (name, notes, created_at) VALUES (?, ?, ?)',
      [input.name, input.notes ?? null, createdAt]
    )) as RunResult;

    const created = await this.getTemplateById(result.lastInsertRowId);

    if (!created) {
      throw new Error('Failed to create workout template.');
    }

    return created;
  }

  async updateTemplate(input: UpdateWorkoutTemplateInput): Promise<WorkoutTemplate | null> {
    await initDatabase();

    const current = await this.getTemplateById(input.id);

    if (!current) {
      return null;
    }

    await executeSql('UPDATE workout_templates SET name = ?, notes = ? WHERE id = ?', [
      input.name ?? current.name,
      input.notes ?? current.notes,
      input.id
    ]);

    return this.getTemplateById(input.id);
  }

  async deleteTemplate(templateId: number): Promise<boolean> {
    await initDatabase();

    const result = (await executeSql('DELETE FROM workout_templates WHERE id = ?', [
      templateId
    ])) as RunResult;

    return result.changes > 0;
  }

  async getTemplateById(templateId: number): Promise<WorkoutTemplate | null> {
    await initDatabase();

    const rows = (await executeSql('SELECT id, name, notes, created_at FROM workout_templates WHERE id = ?', [
      templateId
    ])) as WorkoutTemplateRow[];

    if (rows.length === 0) {
      return null;
    }

    return mapRow(rows[0]);
  }

  async getAllTemplates(): Promise<WorkoutTemplate[]> {
    await initDatabase();

    const rows = (await executeSql(
      'SELECT id, name, notes, created_at FROM workout_templates ORDER BY datetime(created_at) DESC, id DESC'
    )) as WorkoutTemplateRow[];

    return rows.map(mapRow);
  }
}
