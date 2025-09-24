export interface ProfilingRun {
  runId: string;
  profileId: string;
  organizationId: string;
  userId: string;
  userEmail: string;
  status: ProfilingStatus;
  metadata?: Record<string, any>;
  retryCount?: number;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
}

export enum ProfilingStatus {
  PENDING = 'PENDING',
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}
