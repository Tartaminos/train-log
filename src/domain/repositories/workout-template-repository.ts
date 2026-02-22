import type {
  CreateWorkoutTemplateInput,
  UpdateWorkoutTemplateInput,
  WorkoutTemplate
} from '../entities/workout-template';

export interface WorkoutTemplateRepository {
  createTemplate(input: CreateWorkoutTemplateInput): Promise<WorkoutTemplate>;
  updateTemplate(input: UpdateWorkoutTemplateInput): Promise<WorkoutTemplate | null>;
  deleteTemplate(templateId: number): Promise<boolean>;
  getTemplateById(templateId: number): Promise<WorkoutTemplate | null>;
  getAllTemplates(): Promise<WorkoutTemplate[]>;
}
