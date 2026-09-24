export enum SubscriberState {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED',
  PENDING = 'PENDING'
}

export interface HandoffContext {
  handoffId: string;
  subscriberId: string;
  targetState: SubscriberState;
  attempts: number;
  startedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface HandoffOutcome {
  success: boolean;
  handoffId: string;
  error?: string;
  attempts?: number;
  duration: number;
  metadata?: Record<string, unknown>;
}
