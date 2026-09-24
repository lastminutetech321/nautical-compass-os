import { Logger } from '../../utils/logger';
import { metrics } from '../../utils/metrics';
import { SubscriberState, HandoffOutcome, HandoffContext } from './types';

const logger = new Logger('SubscriberHandoff');

export class SubscriberHandoffService {
  private activeHandoffs = new Map<string, HandoffContext>();
  private readonly maxRetries = 3;
  private readonly timeoutMs = 30000;

  async initiateHandoff(
    subscriberId: string,
    targetState: SubscriberState,
    context: Partial<HandoffContext>
  ): Promise<HandoffOutcome> {
    const handoffId = `${subscriberId}-${Date.now()}`;
    const startTime = Date.now();

    if (this.activeHandoffs.has(subscriberId)) {
      logger.warn('Concurrent handoff detected', { subscriberId });
      metrics.increment('handoff.concurrent_rejected');
      return {
        success: false,
        handoffId,
        error: 'CONCURRENT_HANDOFF',
        duration: Date.now() - startTime
      };
    }

    const handoffContext: HandoffContext = {
      handoffId,
      subscriberId,
      targetState,
      attempts: 0,
      startedAt: new Date(),
      ...context
    };

    this.activeHandoffs.set(subscriberId, handoffContext);

    try {
      const outcome = await this.executeHandoffWithRetry(handoffContext);
      return outcome;
    } catch (error) {
      logger.error('Handoff failed', { subscriberId, error });
      metrics.increment('handoff.failed');
      return {
        success: false,
        handoffId,
        error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
        duration: Date.now() - startTime
      };
    } finally {
      this.activeHandoffs.delete(subscriberId);
      const duration = Date.now() - startTime;
      metrics.timing('handoff.duration', duration);
      logger.info('Handoff completed', { subscriberId, handoffId, duration });
    }
  }

  private async executeHandoffWithRetry(
    context: HandoffContext
  ): Promise<HandoffOutcome> {
    const startTime = Date.now();

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      context.attempts = attempt;

      if (Date.now() - startTime > this.timeoutMs) {
        metrics.increment('handoff.timeout');
        return {
          success: false,
          handoffId: context.handoffId,
          error: 'TIMEOUT',
          attempts: attempt,
          duration: Date.now() - startTime
        };
      }

      try {
        const result = await this.performHandoff(context);
        if (result.success) {
          metrics.increment('handoff.success');
          return {
            ...result,
            attempts: attempt,
            duration: Date.now() - startTime
          };
        }

        logger.warn('Handoff attempt failed', {
          subscriberId: context.subscriberId,
          attempt,
          error: result.error
        });
        metrics.increment('handoff.retry');

        if (attempt < this.maxRetries) {
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      } catch (error) {
        logger.error('Handoff attempt error', {
          subscriberId: context.subscriberId,
          attempt,
          error
        });

        if (attempt === this.maxRetries) {
          throw error;
        }

        await this.delay(Math.pow(2, attempt) * 1000);
      }
    }

    metrics.increment('handoff.max_retries_exceeded');
    return {
      success: false,
      handoffId: context.handoffId,
      error: 'MAX_RETRIES_EXCEEDED',
      attempts: this.maxRetries,
      duration: Date.now() - startTime
    };
  }

  private async performHandoff(
    context: HandoffContext
  ): Promise<Omit<HandoffOutcome, 'attempts' | 'duration'>> {
    logger.debug('Performing handoff', {
      subscriberId: context.subscriberId,
      targetState: context.targetState
    });

    return {
      success: true,
      handoffId: context.handoffId
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getActiveHandoffs(): Map<string, HandoffContext> {
    return new Map(this.activeHandoffs);
  }

  clearStaleHandoffs(maxAgeMs: number = 300000): number {
    const now = Date.now();
    let cleared = 0;

    for (const [subscriberId, context] of this.activeHandoffs.entries()) {
      if (now - context.startedAt.getTime() > maxAgeMs) {
        this.activeHandoffs.delete(subscriberId);
        cleared++;
        logger.warn('Cleared stale handoff', { subscriberId, context });
        metrics.increment('handoff.stale_cleared');
      }
    }

    return cleared;
  }
}
