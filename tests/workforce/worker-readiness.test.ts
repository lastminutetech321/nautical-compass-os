import { describe, it, expect } from 'vitest';

type WorkerProfile = {
  full_name: string;
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  is_ready?: boolean;
  availability_status?: 'available' | 'busy' | 'open_to_offers' | 'unavailable' | 'on_leave';
  available_from?: string;
};

function isWorkerReadyForAssignment(worker: WorkerProfile): boolean {
  if (worker.status !== 'active') return false;
  if (!worker.is_ready) return false;
  if (!worker.availability_status || !['available', 'open_to_offers'].includes(worker.availability_status)) return false;
  if (worker.available_from) {
    const availDate = new Date(worker.available_from);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (availDate > today) return false;
  }
  return true;
}

describe('Worker Readiness and Availability', () => {
  it('should require is_ready flag for assignment readiness', () => {
    const worker: WorkerProfile = { full_name: 'John Doe', status: 'active', availability_status: 'available', is_ready: false };
    expect(isWorkerReadyForAssignment(worker)).toBe(false);
    worker.is_ready = true;
    expect(isWorkerReadyForAssignment(worker)).toBe(true);
  });

  it('should check status is active', () => {
    const worker: WorkerProfile = { full_name: 'Jane Smith', status: 'pending', is_ready: true, availability_status: 'available' };
    expect(isWorkerReadyForAssignment(worker)).toBe(false);
    worker.status = 'active';
    expect(isWorkerReadyForAssignment(worker)).toBe(true);
  });

  it('should respect availability_status enum', () => {
    const base: WorkerProfile = { full_name: 'Bob', status: 'active', is_ready: true };
    expect(isWorkerReadyForAssignment({ ...base, availability_status: 'available' })).toBe(true);
    expect(isWorkerReadyForAssignment({ ...base, availability_status: 'open_to_offers' })).toBe(true);
    expect(isWorkerReadyForAssignment({ ...base, availability_status: 'busy' })).toBe(false);
    expect(isWorkerReadyForAssignment({ ...base, availability_status: 'unavailable' })).toBe(false);
  });

  it('should check available_from date', () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const worker: WorkerProfile = { full_name: 'Alice', status: 'active', is_ready: true, availability_status: 'available', available_from: tomorrow.toISOString().split('T')[0] };
    expect(isWorkerReadyForAssignment(worker)).toBe(false);
    worker.available_from = today.toISOString().split('T')[0];
    expect(isWorkerReadyForAssignment(worker)).toBe(true);
  });
});
