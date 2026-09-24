import { ReplacementEngine } from '../../src/workforce/replacement-engine';
import { ValidationError, ReplacementError } from '../../src/errors';

describe('ReplacementEngine', () => {
  let engine: ReplacementEngine;
  let mockConfig: any;
  let mockSkillMatcher: any;
  let mockNotificationService: any;

  beforeEach(() => {
    mockConfig = { minReplacementNoticeHours: 4, escalateOnNoReplacement: true };
    mockSkillMatcher = { scoreMatch: jest.fn() };
    mockNotificationService = { escalate: jest.fn(), notify: jest.fn() };
    engine = new ReplacementEngine(mockConfig, mockSkillMatcher, mockNotificationService);
  });

  describe('validation', () => {
    it('should require assignmentId', async () => {
      await expect(engine.findReplacement({ assignmentId: '', reason: 'sick' } as any)).rejects.toThrow(ValidationError);
    });

    it('should require reason', async () => {
      await expect(engine.findReplacement({ assignmentId: 'a1', reason: '' } as any)).rejects.toThrow(ValidationError);
    });
  });
});
