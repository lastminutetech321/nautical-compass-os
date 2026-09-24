import { SubscriberHandoffService } from '../subscriber-handoff';
import { SubscriberState } from '../types';
import { metrics } from '../../../utils/metrics';

jest.mock('../../../utils/metrics');
jest.mock('../../../utils/logger');

describe('SubscriberHandoffService', () => {
  let service: SubscriberHandoffService;

  beforeEach(() => {
    service = new SubscriberHandoffService();
    jest.clearAllMocks();
  });

  it('should successfully complete a handoff', async () => {
    const outcome = await service.initiateHandoff('sub-123', SubscriberState.ACTIVE, {});
    expect(outcome.success).toBe(true);
    expect(outcome.handoffId).toContain('sub-123');
    expect(metrics.increment).toHaveBeenCalledWith('handoff.success');
  });

  it('should reject concurrent handoffs', async () => {
    const p1 = service.initiateHandoff('sub-456', SubscriberState.ACTIVE, {});
    const o2 = await service.initiateHandoff('sub-456', SubscriberState.SUSPENDED, {});
    expect(o2.success).toBe(false);
    expect(o2.error).toBe('CONCURRENT_HANDOFF');
    await p1;
  });

  it('should retry failed handoffs', async () => {
    jest.spyOn(service as any, 'performHandoff').mockResolvedValueOnce({ success: false, error: 'TRANSIENT' }).mockResolvedValueOnce({ success: true });
    const outcome = await service.initiateHandoff('sub-retry', SubscriberState.ACTIVE, {});
    expect(outcome.success).toBe(true);
    expect(outcome.attempts).toBe(2);
  });

  it('should clear stale handoffs', () => {
    const ctx = { handoffId: 'stale-1', subscriberId: 'sub-stale', targetState: SubscriberState.ACTIVE, attempts: 1, startedAt: new Date(Date.now() - 400000) };
    (service as any).activeHandoffs.set('sub-stale', ctx);
    const cleared = service.clearStaleHandoffs(300000);
    expect(cleared).toBe(1);
  });
});
