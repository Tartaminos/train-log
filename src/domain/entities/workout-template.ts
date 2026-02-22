export type WorkoutTemplate = {
  id: number;
  name: string;
  notes: string | null;
  createdAt: string;
};

export type CreateWorkoutTemplateInput = {
  name: string;
  notes?: string | null;
  createdAt?: string;
};

export type UpdateWorkoutTemplateInput = {
  id: number;
  name?: string;
  notes?: string | null;
};
