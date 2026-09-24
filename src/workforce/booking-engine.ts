import { Agent, Shift, Assignment, BookingRequest, BookingResult } from './types';
import { WorkforceConfig } from './config';
import { AvailabilityChecker } from './availability-checker';
import { SkillMatcher } from './skill-matcher';
import { ValidationError, BookingError, ConflictError } from '../errors';

export class BookingEngine {
  constructor(
    private config: WorkforceConfig,
    private availabilityChecker: AvailabilityChecker,
    private skillMatcher: SkillMatcher
  ) {}

  async book(request: BookingRequest): Promise<BookingResult> {
    this.validateBookingRequest(request);
    const agent = await this.getAgent(request.agentId);
    if (!agent || !agent.active) {
      throw new BookingError(`Agent ${request.agentId} not found or inactive`);
    }
    const isAvailable = await this.availabilityChecker.check(agent, request.shift, { strictMode: true });
    if (!isAvailable) {
      throw new ConflictError(`Agent ${request.agentId} unavailable for requested shift`);
    }
    const hasRequiredSkills = await this.skillMatcher.verify(agent, request.requiredSkills || []);
    if (!hasRequiredSkills) {
      throw new BookingError(`Agent ${request.agentId} lacks required skills`);
    }
    const assignment = await this.createAssignment(agent, request);
    await this.lockTimeSlot(agent.id, request.shift);
    return {
      success: true,
      assignmentId: assignment.id,
      agentId: agent.id,
      shift: request.shift,
      confirmedAt: new Date().toISOString()
    };
  }

  private validateBookingRequest(request: BookingRequest): void {
    if (!request.agentId) throw new ValidationError('agentId is required');
    if (!request.shift) throw new ValidationError('shift is required');
    if (!request.shift.start || !request.shift.end) throw new ValidationError('shift must have start and end times');
    const start = new Date(request.shift.start);
    const end = new Date(request.shift.end);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) throw new ValidationError('Invalid shift times');
    if (end <= start) throw new ValidationError('Shift end must be after start');
    const durationHours = (end.getTime() - start.getTime()) / 3600000;
    if (durationHours > this.config.maxShiftDurationHours) throw new ValidationError(`Shift exceeds max duration`);
    const now = new Date();
    const hoursUntilStart = (start.getTime() - now.getTime()) / 3600000;
    if (hoursUntilStart < this.config.minAdvanceBookingHours) throw new ValidationError(`Booking must be ${this.config.minAdvanceBookingHours}h in advance`);
  }

  private async getAgent(agentId: string): Promise<Agent | null> { throw new Error('Not implemented'); }
  private async createAssignment(agent: Agent, request: BookingRequest): Promise<Assignment> { throw new Error('Not implemented'); }
  private async lockTimeSlot(agentId: string, shift: Shift): Promise<void> { throw new Error('Not implemented'); }
}
