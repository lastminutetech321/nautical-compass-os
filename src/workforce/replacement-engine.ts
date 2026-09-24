import { Agent, Assignment, ReplacementRequest, ReplacementResult } from './types';
import { WorkforceConfig } from './config';
import { SkillMatcher } from './skill-matcher';
import { NotificationService } from '../notifications/notification-service';
import { ValidationError, ReplacementError } from '../errors';

export class ReplacementEngine {
  constructor(
    private config: WorkforceConfig,
    private skillMatcher: SkillMatcher,
    private notificationService: NotificationService
  ) {}

  async findReplacement(request: ReplacementRequest): Promise<ReplacementResult> {
    this.validateReplacementRequest(request);
    const originalAssignment = await this.getAssignment(request.assignmentId);
    if (!originalAssignment) throw new ReplacementError(`Assignment ${request.assignmentId} not found`);
    this.validateReplacementAllowed(originalAssignment);
    const candidates = await this.findQualifiedCandidates(originalAssignment, request.excludeAgentIds || []);
    if (candidates.length === 0) {
      if (this.config.escalateOnNoReplacement) {
        await this.notificationService.escalate({ type: 'NO_REPLACEMENT_FOUND', assignmentId: request.assignmentId, shift: originalAssignment.shift });
      }
      throw new ReplacementError('No qualified replacement agents available');
    }
    const rankedCandidates = this.rankCandidates(candidates, originalAssignment);
    for (const candidate of rankedCandidates) {
      try {
        const replacement = await this.bookReplacement(originalAssignment, candidate, request.reason);
        await this.notifyReplacementSuccess(originalAssignment, replacement);
        return { success: true, replacementAssignmentId: replacement.id, replacementAgentId: candidate.id, originalAssignmentId: originalAssignment.id, confirmedAt: new Date().toISOString() };
      } catch (error) {
        continue;
      }
    }
    throw new ReplacementError('Failed to book any replacement candidate');
  }

  private validateReplacementRequest(request: ReplacementRequest): void {
    if (!request.assignmentId) throw new ValidationError('assignmentId is required');
    if (!request.reason) throw new ValidationError('reason is required for replacement');
  }

  private validateReplacementAllowed(assignment: Assignment): void {
    const now = new Date();
    const shiftStart = new Date(assignment.shift.start);
    const hoursUntilStart = (shiftStart.getTime() - now.getTime()) / 3600000;
    if (hoursUntilStart < this.config.minReplacementNoticeHours) throw new ReplacementError(`Replacement requires ${this.config.minReplacementNoticeHours}h notice`);
    if (now >= shiftStart) throw new ReplacementError('Cannot replace agent for shift that has already started');
    if (assignment.status === 'CANCELLED' || assignment.status === 'REPLACED') throw new ReplacementError(`Assignment is already ${assignment.status.toLowerCase()}`);
  }

  private rankCandidates(candidates: Agent[], assignment: Assignment): Agent[] {
    return candidates.sort((a, b) => this.calculateCandidateScore(b, assignment) - this.calculateCandidateScore(a, assignment));
  }

  private calculateCandidateScore(agent: Agent, assignment: Assignment): number {
    return this.skillMatcher.scoreMatch(agent, assignment.requiredSkills || []) + (agent.availabilityScore || 0);
  }

  private async notifyReplacementSuccess(originalAssignment: Assignment, replacement: Assignment): Promise<void> {
    await Promise.all([
      this.notificationService.notify({ type: 'REPLACEMENT_CONFIRMED', recipientId: originalAssignment.agentId, assignmentId: originalAssignment.id }),
      this.notificationService.notify({ type: 'NEW_ASSIGNMENT', recipientId: replacement.agentId, assignmentId: replacement.id })
    ]);
  }

  private async getAssignment(assignmentId: string): Promise<Assignment | null> { throw new Error('Not implemented'); }
  private async findQualifiedCandidates(assignment: Assignment, excludeIds: string[]): Promise<Agent[]> { throw new Error('Not implemented'); }
  private async bookReplacement(originalAssignment: Assignment, replacementAgent: Agent, reason: string): Promise<Assignment> { throw new Error('Not implemented'); }
}
