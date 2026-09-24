import { WorkerProfile } from './types';
import { v4 as uuidv4 } from 'uuid';

export class WorkforceService {
  private profiles: Map<string, WorkerProfile> = new Map();

  async createProfile(data: Partial<WorkerProfile>): Promise<WorkerProfile> {
    if (!data.full_name) {
      throw new Error('full_name is required');
    }

    const profile: WorkerProfile = {
      id: uuidv4(),
      full_name: data.full_name,
      email: data.email || '',
      phone: data.phone || '',
      location: data.location || '',
      city: data.city || '',
      state: data.state || '',
      zip: data.zip || '',
      worker_type: data.worker_type || 'contractor',
      headline: data.headline || '',
      bio: data.bio || '',
      avatar_url: data.avatar_url || '',
      industries: data.industries || [],
      primary_trade: data.primary_trade || '',
      years_experience: data.years_experience || 0,
      hourly_rate: data.hourly_rate || 0,
      day_rate: data.day_rate || 0,
      salary_target: data.salary_target || 0,
      rate_currency: data.rate_currency || 'USD',
      availability_status: data.availability_status || 'available',
      available_from: data.available_from || '',
      preferred_schedule: data.preferred_schedule || '',
      remote_ok: data.remote_ok !== undefined ? data.remote_ok : true,
      travel_ok: data.travel_ok !== undefined ? data.travel_ok : false,
      travel_radius_miles: data.travel_radius_miles || 25,
      linkedin_url: data.linkedin_url || '',
      portfolio_url: data.portfolio_url || '',
      resume_url: data.resume_url || '',
      status: data.status || 'active',
      rating_avg: data.rating_avg || 0,
      rating_count: data.rating_count || 0,
      jobs_completed: data.jobs_completed || 0,
      union_member: data.union_member !== undefined ? data.union_member : false,
      union_id: data.union_id || '',
      tags: data.tags || [],
      notes: data.notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.profiles.set(profile.id, profile);
    return profile;
  }

  async getProfile(id: string): Promise<WorkerProfile | null> {
    return this.profiles.get(id) || null;
  }

  async updateProfile(id: string, data: Partial<WorkerProfile>): Promise<WorkerProfile> {
    const existing = this.profiles.get(id);
    if (!existing) {
      throw new Error(`Profile ${id} not found`);
    }

    const updated: WorkerProfile = {
      ...existing,
      ...data,
      id: existing.id,
      created_at: existing.created_at,
      updated_at: new Date().toISOString()
    };

    this.profiles.set(id, updated);
    return updated;
  }

  async searchProfiles(filters: any): Promise<WorkerProfile[]> {
    let results = Array.from(this.profiles.values());

    if (filters.worker_type) {
      results = results.filter(p => p.worker_type === filters.worker_type);
    }
    if (filters.availability_status) {
      results = results.filter(p => p.availability_status === filters.availability_status);
    }
    if (filters.primary_trade) {
      results = results.filter(p => p.primary_trade === filters.primary_trade);
    }
    if (filters.remote_ok !== undefined) {
      results = results.filter(p => p.remote_ok === filters.remote_ok);
    }
    if (filters.city) {
      results = results.filter(p => p.city.toLowerCase().includes(filters.city.toLowerCase()));
    }
    if (filters.state) {
      results = results.filter(p => p.state === filters.state);
    }

    return results;
  }

  async deleteProfile(id: string): Promise<void> {
    if (!this.profiles.has(id)) {
      throw new Error(`Profile ${id} not found`);
    }
    this.profiles.delete(id);
  }
}
