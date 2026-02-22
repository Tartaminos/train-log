export type TemplateExercise = {
  id: number;
  workoutTemplateId: number;
  name: string;
  machine: string | null;
  defaultLoad: number | null;
  defaultReps: number | null;
  sortOrder: number | null;
};

export type CreateTemplateExerciseInput = {
  workoutTemplateId: number;
  name: string;
  machine?: string | null;
  defaultLoad?: number | null;
  defaultReps?: number | null;
  sortOrder?: number | null;
};

export type UpdateTemplateExerciseInput = {
  id: number;
  name?: string;
  machine?: string | null;
  defaultLoad?: number | null;
  defaultReps?: number | null;
  sortOrder?: number | null;
};
