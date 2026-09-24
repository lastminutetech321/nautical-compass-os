import { prisma } from '../lib/prisma';
import { DispatchStatus, WorkerStatus } from '@prisma/client';
import { AppError } from '../utils/errors';

export interface DispatchMatchCriteria {
  skillsRequired: string[];
  locationId: string;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  estimatedDuration?: number;
}

export interface WorkerMatch {
  workerId: string;
  matchScore: number;
  availableAt: Date;
  skillMatch: string[];
  distance?: number;
}

export async function findMatchingWorkers(
  criteria: DispatchMatchCriteria,
  limit: number = 10
): Promise<WorkerMatch[]> {
  const workers = await prisma.worker.findMany({
    where: {
      status: WorkerStatus.AVAILABLE,
      skills: { hasSome: criteria.skillsRequired },
      locationId: criteria.locationId,
    },
    include: {
      currentAssignments: {
        where: { status: { in: ['ASSIGNED', 'IN_PROGRESS'] } },
      },
    },
  });

  const matches: WorkerMatch[] = workers
    .map((worker) => {
      if (worker.currentAssignments.length > 0) return null;
      const workerSkills = Array.isArray(worker.skills) ? worker.skills : [];
      const matchedSkills = criteria.skillsRequired.filter((s) => workerSkills.includes(s));
      const skillMatchRate = matchedSkills.length / criteria.skillsRequired.length;
      if (skillMatchRate < 0.5) return null;
      let matchScore = skillMatchRate * 100;
      if (skillMatchRate === 1.0) matchScore += 20;
      return {
        workerId: worker.id,
        matchScore: Math.min(matchScore, 100),
        availableAt: new Date(),
        skillMatch: matchedSkills,
        distance: 0,
      };
    })
    .filter((m): m is WorkerMatch => m !== null)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
  return matches;
}

export async function createDispatch(data: {
  requestId: string;
  workerId: string;
  scheduledFor: Date;
  estimatedDuration: number;
}) {
  const worker = await prisma.worker.findUnique({
    where: { id: data.workerId },
    include: { currentAssignments: { where: { status: { in: ['ASSIGNED', 'IN_PROGRESS'] } } } },
  });
  if (!worker) throw new AppError('Worker not found', 404);
  if (worker.status !== WorkerStatus.AVAILABLE) throw new AppError('Worker not available', 400);
  if (worker.currentAssignments.length > 0) throw new AppError('Worker has active assignments', 400);

  const request = await prisma.serviceRequest.findUnique({ where: { id: data.requestId } });
  if (!request) throw new AppError('Service request not found', 404);
  if (request.status !== 'PENDING') throw new AppError('Request not pending', 400);

  const dispatch = await prisma.dispatch.create({
    data: {
      requestId: data.requestId,
      workerId: data.workerId,
      status: DispatchStatus.PENDING,
      scheduledFor: data.scheduledFor,
      estimatedDuration: data.estimatedDuration,
      assignedAt: new Date(),
    },
    include: { worker: true, request: { include: { client: true } } },
  });

  await prisma.worker.update({ where: { id: data.workerId }, data: { status: WorkerStatus.ASSIGNED } });
  return dispatch;
}

export async function confirmDispatch(dispatchId: string, clientId: string) {
  const dispatch = await prisma.dispatch.findUnique({
    where: { id: dispatchId },
    include: { request: true, worker: true },
  });
  if (!dispatch) throw new AppError('Dispatch not found', 404);
  if (dispatch.request.clientId !== clientId) throw new AppError('Unauthorized', 403);
  if (dispatch.status !== DispatchStatus.PENDING) throw new AppError('Can only confirm PENDING dispatches', 400);

  const confirmed = await prisma.dispatch.update({
    where: { id: dispatchId },
    data: { status: DispatchStatus.ASSIGNED, confirmedAt: new Date() },
    include: { worker: true, request: { include: { client: true } } },
  });

  await prisma.serviceRequest.update({ where: { id: dispatch.requestId }, data: { status: 'ASSIGNED' } });
  return confirmed;
}

export async function rejectDispatch(dispatchId: string, clientId: string, reason?: string) {
  const dispatch = await prisma.dispatch.findUnique({
    where: { id: dispatchId },
    include: { request: true, worker: true },
  });
  if (!dispatch) throw new AppError('Dispatch not found', 404);
  if (dispatch.request.clientId !== clientId) throw new AppError('Unauthorized', 403);
  if (dispatch.status !== DispatchStatus.PENDING) throw new AppError('Can only reject PENDING dispatches', 400);

  const rejected = await prisma.dispatch.update({
    where: { id: dispatchId },
    data: { status: DispatchStatus.REJECTED, rejectedAt: new Date(), rejectionReason: reason },
  });

  await prisma.worker.update({ where: { id: dispatch.workerId }, data: { status: WorkerStatus.AVAILABLE } });
  return rejected;
}

export async function startDispatch(dispatchId: string, workerId: string) {
  const dispatch = await prisma.dispatch.findUnique({ where: { id: dispatchId }, include: { worker: true } });
  if (!dispatch) throw new AppError('Dispatch not found', 404);
  if (dispatch.workerId !== workerId) throw new AppError('Unauthorized', 403);
  if (dispatch.status !== DispatchStatus.ASSIGNED) throw new AppError('Dispatch must be client-confirmed (ASSIGNED)', 400);

  const started = await prisma.dispatch.update({
    where: { id: dispatchId },
    data: { status: DispatchStatus.IN_PROGRESS, startedAt: new Date() },
  });

  await prisma.worker.update({ where: { id: workerId }, data: { status: WorkerStatus.ASSIGNED } });
  await prisma.serviceRequest.update({ where: { id: dispatch.requestId }, data: { status: 'IN_PROGRESS' } });
  return started;
}

export async function completeDispatch(dispatchId: string, workerId: string, completionNotes?: string) {
  const dispatch = await prisma.dispatch.findUnique({ where: { id: dispatchId } });
  if (!dispatch) throw new AppError('Dispatch not found', 404);
  if (dispatch.workerId !== workerId) throw new AppError('Unauthorized', 403);
  if (dispatch.status !== DispatchStatus.IN_PROGRESS) throw new AppError('Dispatch must be IN_PROGRESS', 400);

  const completed = await prisma.dispatch.update({
    where: { id: dispatchId },
    data: { status: DispatchStatus.COMPLETED, completedAt: new Date(), completionNotes },
  });

  await prisma.worker.update({ where: { id: workerId }, data: { status: WorkerStatus.AVAILABLE } });
  await prisma.serviceRequest.update({ where: { id: dispatch.requestId }, data: { status: 'COMPLETED' } });
  return completed;
}
