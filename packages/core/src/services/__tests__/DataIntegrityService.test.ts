import { DataIntegrityService } from '../DataIntegrityService';
import { DatabaseService } from '../DatabaseService';
import { SyncService } from '../SyncService';

describe('DataIntegrityService', () => {
  let service: DataIntegrityService;
  let mockDb: jest.Mocked<DatabaseService>;
  let mockSync: jest.Mocked<SyncService>;

  beforeEach(() => {
    mockDb = { query: jest.fn(), execute: jest.fn() } as any;
    mockSync = { getLastSyncTime: jest.fn() } as any;
    service = new DataIntegrityService(mockDb, mockSync);
  });

  describe('runIntegrityCheck', () => {
    it('should return passed result when no issues found', async () => {
      mockDb.query.mockResolvedValue([]);
      const result = await service.runIntegrityCheck();
      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect stale records', async () => {
      mockDb.query.mockImplementation(async (query: string) => {
        if (query.includes('updated_at < ?')) return [{ id: '1' }, { id: '2' }];
        return [];
      });
      const result = await service.runIntegrityCheck();
      expect(result.stats.staleRecords).toBeGreaterThan(0);
    });

    it('should detect duplicate records', async () => {
      mockDb.query.mockImplementation(async (query: string) => {
        if (query.includes('HAVING count > 1')) return [{ count: 3 }];
        return [];
      });
      const result = await service.runIntegrityCheck();
      expect(result.stats.duplicates).toBeGreaterThan(0);
    });

    it('should detect orphaned sync metadata', async () => {
      mockDb.query.mockImplementation(async (query: string) => {
        if (query.includes('sync_metadata sm')) return [{ entity_type: 'tasks', entity_id: '1' }];
        return [];
      });
      const result = await service.runIntegrityCheck();
      expect(result.stats.orphanedRecords).toBeGreaterThan(0);
    });
  });

  describe('checkFreshness', () => {
    it('should warn about records approaching staleness', async () => {
      mockDb.query.mockResolvedValue([{ id: '1' }]);
      const result = await service.runIntegrityCheck();
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('checkDuplication', () => {
    it('should identify duplicates by natural key', async () => {
      mockDb.query.mockImplementation(async (query: string) => {
        if (query.includes('GROUP BY')) return [{ title: 'Test', count: 2 }];
        return [];
      });
      const result = await service.runIntegrityCheck();
      expect(result.warnings.some(w => w.includes('duplicate'))).toBe(true);
    });
  });

  describe('checkSyncIntegrity', () => {
    it('should detect records missing sync metadata', async () => {
      mockDb.query.mockImplementation(async (query: string) => {
        if (query.includes('WHERE sm.id IS NULL')) return [{ entity_type: 'tasks', id: '1' }];
        return [];
      });
      const result = await service.runIntegrityCheck();
      expect(result.errors.some(e => e.includes('without sync metadata'))).toBe(true);
    });
  });
});
