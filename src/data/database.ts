import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'train_log.db';

const databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME);
let initializationPromise: Promise<void> | null = null;

type ForeignKeyRow = {
  id: number;
  seq: number;
  table: string;
  from: string;
  to: string;
  on_update: string;
  on_delete: string;
  match: string;
};

type TableInfoRow = {
  name: string;
};

async function getDatabase() {
  return databasePromise;
}

export async function executeSql(query: string, params: any[] = []) {
  const db = await getDatabase();
  const normalizedQuery = query.trim().toUpperCase();

  if (normalizedQuery.startsWith('SELECT') || normalizedQuery.startsWith('PRAGMA')) {
    return db.getAllAsync(query, params);
  }

  return db.runAsync(query, params);
}

export async function initDatabase() {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      const db = await getDatabase();

      await db.execAsync('PRAGMA foreign_keys = ON;');

      await db.withTransactionAsync(async () => {
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS workout_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            notes TEXT,
            created_at TEXT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS template_exercises (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workout_template_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            machine TEXT,
            default_load REAL,
            default_reps INTEGER,
            sort_order INTEGER,
            FOREIGN KEY(workout_template_id) REFERENCES workout_templates(id) ON DELETE CASCADE
          );

          CREATE TABLE IF NOT EXISTS workout_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workout_template_id INTEGER,
            started_at TEXT NOT NULL,
            ended_at TEXT,
            notes TEXT,
            FOREIGN KEY(workout_template_id) REFERENCES workout_templates(id) ON DELETE SET NULL
          );

          CREATE TABLE IF NOT EXISTS workout_sets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workout_session_id INTEGER NOT NULL,
            template_exercise_id INTEGER,
            session_exercise_id INTEGER,
            exercise_name TEXT NOT NULL,
            load REAL NOT NULL,
            reps INTEGER NOT NULL,
            set_index INTEGER NOT NULL,
            notes TEXT,
            FOREIGN KEY(workout_session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE
          );

          CREATE TABLE IF NOT EXISTS session_exercises (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workout_session_id INTEGER NOT NULL,
            template_exercise_id INTEGER,
            name TEXT NOT NULL,
            machine TEXT,
            default_load REAL,
            default_reps INTEGER,
            sort_order INTEGER,
            FOREIGN KEY(workout_session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE,
            FOREIGN KEY(template_exercise_id) REFERENCES template_exercises(id) ON DELETE SET NULL
          );
        `);
      });

      const workoutSetTableInfo = (await db.getAllAsync('PRAGMA table_info(workout_sets)')) as TableInfoRow[];
      const hasSessionExerciseColumn = workoutSetTableInfo.some(
        (tableInfoRow) => tableInfoRow.name === 'session_exercise_id'
      );

      if (!hasSessionExerciseColumn) {
        await db.execAsync(
          'ALTER TABLE workout_sets ADD COLUMN session_exercise_id INTEGER'
        );
      }

      const workoutSessionForeignKeys = (await db.getAllAsync(
        'PRAGMA foreign_key_list(workout_sessions)'
      )) as ForeignKeyRow[];

      const workoutTemplateForeignKey = workoutSessionForeignKeys.find(
        (foreignKey) =>
          foreignKey.table === 'workout_templates' &&
          foreignKey.from === 'workout_template_id' &&
          foreignKey.to === 'id'
      );

      if (workoutTemplateForeignKey?.on_delete?.toUpperCase() !== 'SET NULL') {
        await db.execAsync('PRAGMA foreign_keys = OFF;');

        await db.withTransactionAsync(async () => {
          await db.execAsync(`
            CREATE TABLE workout_sessions_new (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              workout_template_id INTEGER,
              started_at TEXT NOT NULL,
              ended_at TEXT,
              notes TEXT,
              FOREIGN KEY(workout_template_id) REFERENCES workout_templates(id) ON DELETE SET NULL
            );

            INSERT INTO workout_sessions_new (id, workout_template_id, started_at, ended_at, notes)
            SELECT id, workout_template_id, started_at, ended_at, notes
            FROM workout_sessions;

            DROP TABLE workout_sessions;
            ALTER TABLE workout_sessions_new RENAME TO workout_sessions;
          `);
        });

        await db.execAsync('PRAGMA foreign_keys = ON;');
      }
    })();
  }

  return initializationPromise;
}
