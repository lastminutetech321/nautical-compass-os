import { describe, it, expect, beforeEach } from '@jest/globals';
import * as dispatchService from '../src/services/dispatchService';
import { prisma } from '../src/lib/prisma';
import { DispatchStatus, WorkerStatus } from '@prisma/client';

describe('Dispatch Matching and Client Confirmation Flow', () => {
  let testClient: any;
  let testWorker: any;
  let testRequest: any;

  beforeEach(async () => {
    testClient = await prisma.client.create({ data: { name: 'Test Client', email: 'client@test.com' } });
    testWorker = await prisma.worker.create({
      data: {
        name: 'Test Worker',
        email: 'worker@test.com',
        status: WorkerStatus.AVAILABLE,
        skills: ['plumbing', 'electrical'],
        locationId: 'loc-1',
      },
    });
    testRequest = await prisma.serviceRequest.create({
      data: {
        clientId: testClient.id,
        serviceType: 'plumbing',
        status: 'PENDING',
        description: 'Test request',
        locationId: 'loc-1',
      },
    });
  });

  it('should match workers based on skills and availability', async () => {
    const matches = await dispatchService.findMatchingWorkers({
      skillsRequired: ['plumbing'],
      locationId: 'loc-1',
      urgencyLevel: 'medium',
    });
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].workerId).toBe(testWorker.id);
    expect(matches[0].skillMatch).toContain('plumbing');
  });

  it('should create dispatch in PENDING status requiring client confirmation', async () => {
    const dispatch = await dispatchService.createDispatch({
      requestId: testRequest.id,
      workerId: testWorker.id,
      scheduledFor: new Date(),
      estimatedDuration: 60,
    });
    expect(dispatch.status).toBe(DispatchStatus.PENDING);
    expect(dispatch.confirmedAt).toBeNull();
  });

  it('should allow client to confirm dispatch', async () => {
    const dispatch = await dispatchService.createDispatch({
      requestId: testRequest.id,
      workerId: testWorker.id,
      scheduledFor: new Date(),
      estimatedDuration: 60,
    });
    const confirmed = await dispatchService.confirmDispatch(dispatch.id, testClient.id);
    expect(confirmed.status).toBe(DispatchStatus.ASSIGNED);
    expect(confirmed.confirmedAt).not.toBeNull();
  });

  it('should prevent non-owner from confirming dispatch', async () => {
    const dispatch = await dispatchService.createDispatch({
      requestId: testRequest.id,
      workerId: testWorker.id,
      scheduledFor: new Date(),
      estimatedDuration: 60,
    });
    await expect(dispatchService.confirmDispatch(dispatch.id, 'wrong-client-id')).rejects.toThrow('Unauthorized');
  });

  it('should allow client to reject dispatch and return worker to available', async () => {
    const dispatch = await dispatchService.createDispatch({
      requestId: testRequest.id,
      workerId: testWorker.id,
      scheduledFor: new Date(),
      estimatedDuration: 60,
    });
    const rejected = await dispatchService.rejectDispatch(dispatch.id, testClient.id, 'Not suitable');
    expect(rejected.status).toBe(DispatchStatus.REJECTED);
    const worker = await prisma.worker.findUnique({ where: { id: testWorker.id } });
    expect(worker?.status).toBe(WorkerStatus.AVAILABLE);
  });

  it('should prevent starting dispatch before client confirmation', async () => {
    const dispatch = await dispatchService.createDispatch({
      requestId: testRequest.id,
      workerId: testWorker.id,
      scheduledFor: new Date(),
      estimatedDuration: 60,
    });
    await expect(dispatchService.startDispatch(dispatch.id, testWorker.id)).rejects.toThrow('client-confirmed');
  });

  it('should allow starting dispatch after client confirmation', async () => {
    const dispatch = await dispatchService.createDispatch({
      requestId: testRequest.id,
      workerId: testWorker.id,
      scheduledFor: new Date(),
      estimatedDuration: 60,
    });
    await dispatchService.confirmDispatch(dispatch.id, testClient.id);
    const started = await dispatchService.startDispatch(dispatch.id, testWorker.id);
    expect(started.status).toBe(DispatchStatus.IN_PROGRESS);
  });

  it('should complete full workflow: create -> confirm -> start -> complete', async () => {
    const dispatch = await dispatchService.createDispatch({
      requestId: testRequest.id,
      workerId: testWorker.id,
      scheduledFor: new Date(),
      estimatedDuration: 60,
    });
    expect(dispatch.status).toBe(DispatchStatus.PENDING);
    const confirmed = await dispatchService.confirmDispatch(dispatch.id, testClient.id);
    expect(confirmed.status).toBe(DispatchStatus.ASSIGNED);
    const started = await dispatchService.startDispatch(dispatch.id, testWorker.id);
    expect(started.status).toBe(DispatchStatus.IN_PROGRESS);
    const completed = await dispatchService.completeDispatch(dispatch.id, testWorker.id, 'Work done');
    expect(completed.status).toBe(DispatchStatus.COMPLETED);
    const worker = await prisma.worker.findUnique({ where: { id: testWorker.id } });
    expect(worker?.status).toBe(WorkerStatus.AVAILABLE);
  });
});
