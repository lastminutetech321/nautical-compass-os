import { Rail } from '../../core/rail';
import { WorkforceService } from './workforce.service';
import { WorkerProfile } from './types';

export class WorkforceRail extends Rail {
  name = 'workforce';
  version = '1.0.0';
  private service: WorkforceService;

  constructor() {
    super();
    this.service = new WorkforceService();
  }

  async initialize(): Promise<void> {
    this.log('Workforce Rail initialized');
  }

  async createProfile(data: Partial<WorkerProfile>): Promise<WorkerProfile> {
    return this.service.createProfile(data);
  }

  async getProfile(id: string): Promise<WorkerProfile | null> {
    return this.service.getProfile(id);
  }

  async updateProfile(id: string, data: Partial<WorkerProfile>): Promise<WorkerProfile> {
    return this.service.updateProfile(id, data);
  }

  async searchProfiles(filters: any): Promise<WorkerProfile[]> {
    return this.service.searchProfiles(filters);
  }

  async deleteProfile(id: string): Promise<void> {
    return this.service.deleteProfile(id);
  }
}
