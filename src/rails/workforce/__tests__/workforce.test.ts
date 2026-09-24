import { WorkforceRail } from '../workforce.rail';
import { WorkerProfile } from '../types';

describe('WorkforceRail', () => {
  let rail: WorkforceRail;

  beforeEach(async () => {
    rail = new WorkforceRail();
    await rail.initialize();
  });

  describe('Profile Creation', () => {
    it('should create a worker profile with required fields', async () => {
      const profile = await rail.createProfile({
        full_name: 'John Doe'
      });

      expect(profile.id).toBeDefined();
      expect(profile.full_name).toBe('John Doe');
      expect(profile.worker_type).toBe('contractor');
      expect(profile.status).toBe('active');
    });

    it('should create profile with all fields', async () => {
      const profile = await rail.createProfile({
        full_name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '555-1234',
        city: 'Austin',
        state: 'TX',
        worker_type: 'freelancer',
        primary_trade: 'Electrician',
        years_experience: 5,
        hourly_rate: 75,
        remote_ok: true,
        availability_status: 'available'
      });

      expect(profile.full_name).toBe('Jane Smith');
      expect(profile.email).toBe('jane@example.com');
      expect(profile.city).toBe('Austin');
      expect(profile.primary_trade).toBe('Electrician');
      expect(profile.hourly_rate).toBe(75);
    });

    it('should throw error when full_name is missing', async () => {
      await expect(rail.createProfile({})).rejects.toThrow('full_name is required');
    });
  });

  describe('Profile Retrieval', () => {
    it('should retrieve profile by id', async () => {
      const created = await rail.createProfile({ full_name: 'Bob Jones' });
      const retrieved = await rail.getProfile(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.full_name).toBe('Bob Jones');
    });

    it('should return null for non-existent profile', async () => {
      const result = await rail.getProfile('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('Profile Update', () => {
    it('should update profile fields', async () => {
      const profile = await rail.createProfile({ full_name: 'Alice Brown' });
      const updated = await rail.updateProfile(profile.id, {
        email: 'alice@example.com',
        hourly_rate: 100
      });

      expect(updated.email).toBe('alice@example.com');
      expect(updated.hourly_rate).toBe(100);
      expect(updated.full_name).toBe('Alice Brown');
    });

    it('should throw error for non-existent profile', async () => {
      await expect(rail.updateProfile('bad-id', { email: 'test@test.com' }))
        .rejects.toThrow('not found');
    });
  });

  describe('Profile Search', () => {
    beforeEach(async () => {
      await rail.createProfile({
        full_name: 'Contractor One',
        worker_type: 'contractor',
        city: 'Austin',
        state: 'TX',
        primary_trade: 'Plumber',
        availability_status: 'available'
      });
      await rail.createProfile({
        full_name: 'Freelancer Two',
        worker_type: 'freelancer',
        city: 'Dallas',
        state: 'TX',
        primary_trade: 'Electrician',
        availability_status: 'busy'
      });
    });

    it('should search by worker_type', async () => {
      const results = await rail.searchProfiles({ worker_type: 'contractor' });
      expect(results.length).toBe(1);
      expect(results[0].worker_type).toBe('contractor');
    });

    it('should search by city', async () => {
      const results = await rail.searchProfiles({ city: 'austin' });
      expect(results.length).toBe(1);
      expect(results[0].city).toBe('Austin');
    });

    it('should search by availability_status', async () => {
      const results = await rail.searchProfiles({ availability_status: 'available' });
      expect(results.length).toBe(1);
      expect(results[0].availability_status).toBe('available');
    });

    it('should return all profiles with empty filter', async () => {
      const results = await rail.searchProfiles({});
      expect(results.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Profile Deletion', () => {
    it('should delete profile', async () => {
      const profile = await rail.createProfile({ full_name: 'To Delete' });
      await rail.deleteProfile(profile.id);
      const retrieved = await rail.getProfile(profile.id);
      expect(retrieved).toBeNull();
    });

    it('should throw error when deleting non-existent profile', async () => {
      await expect(rail.deleteProfile('bad-id')).rejects.toThrow('not found');
    });
  });
});
