import type { HealthWorkoutData } from '../../domain/health/HealthData';

export interface HealthDataService {
  isHealthIntegrationEnabled(): Promise<boolean>;
  getHealthDataForSession(sessionId: number): Promise<HealthWorkoutData | null>;
}

export class MockHealthDataService implements HealthDataService {
  async isHealthIntegrationEnabled(): Promise<boolean> {
    return false;
  }

  async getHealthDataForSession(sessionId: number): Promise<HealthWorkoutData | null> {
    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      return null;
    }

    // TODO: Integrate with Apple Health / Google Fit provider and return real session health data.
    return null;
  }
}
