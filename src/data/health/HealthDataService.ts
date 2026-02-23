import type { HealthWorkoutData } from '../../domain/health/HealthData';

export interface HealthDataService {
  getHealthDataForSession(sessionId: number): Promise<HealthWorkoutData | null>;
}

export class MockHealthDataService implements HealthDataService {
  async getHealthDataForSession(sessionId: number): Promise<HealthWorkoutData | null> {
    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      return null;
    }

    // TODO: Integrate with Apple Health / Google Fit provider.
    return {
      estimatedCalories: 482,
      averageHeartRate: 138,
      maxHeartRate: 171
    };
  }
}
