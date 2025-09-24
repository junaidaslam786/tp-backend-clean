import { Injectable, Logger } from '@nestjs/common';
import {
  ProfilingRun,
  ProfilingStatus,
} from '../interfaces/profiling.interface';

export interface ProfilingRunCreateDto {
  organizationId: string;
  clientName: string;
  userEmail: string;
  runType: 'SCHEDULED' | 'ON_DEMAND' | 'API_TRIGGERED';
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
}

@Injectable()
export class ProfilingRunLifecycleService {
  private readonly logger = new Logger(ProfilingRunLifecycleService.name);

  async createProfilingRun(
    createDto: ProfilingRunCreateDto,
  ): Promise<ProfilingRun> {
    this.logger.log('Creating profiling run (mock implementation)');

    return {
      runId: `run_${Date.now()}`,
      profileId: `profile_${Date.now()}`,
      organizationId: createDto.organizationId,
      userId: 'mock-user',
      userEmail: createDto.userEmail,
      status: ProfilingStatus.QUEUED,
      startedAt: new Date().toISOString(),
    };
  }

  async startProfilingRun(runId: string): Promise<ProfilingRun> {
    return this.createMockRun(runId, ProfilingStatus.RUNNING);
  }

  async completeProfilingRun(runId: string): Promise<ProfilingRun> {
    return this.createMockRun(runId, ProfilingStatus.COMPLETED);
  }

  async failProfilingRun(
    runId: string,
    errorMessage: string,
  ): Promise<ProfilingRun> {
    const run = this.createMockRun(runId, ProfilingStatus.FAILED);
    run.errorMessage = errorMessage;
    return run;
  }

  async cancelProfilingRun(runId: string): Promise<ProfilingRun> {
    return this.createMockRun(runId, ProfilingStatus.CANCELLED);
  }

  async getProfilingRun(runId: string): Promise<ProfilingRun> {
    return this.createMockRun(runId, ProfilingStatus.COMPLETED);
  }

  async listProfilingRuns(
    organizationId: string,
    status?: ProfilingStatus,
    limit = 50,
  ) {
    return { runs: [], hasMore: false };
  }

  async getRunStatistics(organizationId: string) {
    return { totalRuns: 0, completedRuns: 0, failedRuns: 0, averageRunTime: 0 };
  }

  async retryProfilingRun(runId: string): Promise<ProfilingRun> {
    const run = this.createMockRun(runId, ProfilingStatus.QUEUED);
    run.retryCount = 1;
    return run;
  }

  private createMockRun(runId: string, status: ProfilingStatus): ProfilingRun {
    return {
      runId,
      profileId: `profile_${Date.now()}`,
      organizationId: 'mock-org',
      userId: 'mock-user',
      userEmail: 'mock@example.com',
      status,
      startedAt: new Date().toISOString(),
    };
  }
}
