import type {
  CreateTemplateExerciseInput,
  TemplateExercise,
  UpdateTemplateExerciseInput
} from '../entities/template-exercise';

export interface TemplateExerciseRepository {
  createExercise(input: CreateTemplateExerciseInput): Promise<TemplateExercise>;
  updateExercise(input: UpdateTemplateExerciseInput): Promise<TemplateExercise | null>;
  deleteExercise(exerciseId: number): Promise<boolean>;
  getExercisesByTemplateId(templateId: number): Promise<TemplateExercise[]>;
}
