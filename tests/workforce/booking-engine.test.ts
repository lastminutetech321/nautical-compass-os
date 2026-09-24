import { BookingEngine } from '../../src/workforce/booking-engine';
import { ValidationError, BookingError, ConflictError } from '../../src/errors';

describe('BookingEngine', () => {
  let engine: BookingEngine;
  let mockConfig: any;
  let mockAvailabilityChecker: any;
  let mockSkillMatcher: any;

  beforeEach(() => {
    mockConfig = { maxShiftDurationHours: 12, minAdvanceBookingHours: 2 };
    mockAvailabilityChecker = { check: jest.fn() };
    mockSkillMatcher = { verify: jest.fn() };
    engine = new BookingEngine(mockConfig, mockAvailabilityChecker, mockSkillMatcher);
  });

  describe('validation', () => {
    it('should reject booking without agentId', async () => {
      await expect(engine.book({ agentId: '', shift: { start: '2024-01-01T10:00:00Z', end: '2024-01-01T18:00:00Z' } } as any)).rejects.toThrow(ValidationError);
    });

    it('should reject booking with end before start', async () => {
      await expect(engine.book({ agentId: 'agent1', shift: { start: '2024-01-01T18:00:00Z', end: '2024-01-01T10:00:00Z' } })).rejects.toThrow(ValidationError);
    });

    it('should reject booking exceeding max shift duration', async () => {
      const start = new Date('2024-12-31T10:00:00Z');
      const end = new Date(start.getTime() + 13 * 3600000);
      await expect(engine.book({ agentId: 'agent1', shift: { start: start.toISOString(), end: end.toISOString() } })).rejects.toThrow(ValidationError);
    });

    it('should reject booking with insufficient advance notice', async () => {
      const start = new Date(Date.now() + 3600000);
      const end = new Date(start.getTime() + 8 * 3600000);
      await expect(engine.book({ agentId: 'agent1', shift: { start: start.toISOString(), end: end.toISOString() } })).rejects.toThrow(ValidationError);
    });
  });
});
