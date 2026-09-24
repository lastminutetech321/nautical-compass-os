import { logger } from '../utils/logger';
import { DatabaseService } from './DatabaseService';
import { SyncService } from './SyncService';

interface IntegrityCheckResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalRecords: number;
    duplicates: number;
    staleRecords: number;
    orphanedRecords: number;
  };
}

interface FreshnessConfig {
  maxAgeMs: number;
  warnAgeMs: number;
}

export class DataIntegrityService {
  private db: DatabaseService;
  private sync: SyncService;
  private freshnessConfig: Map<string, FreshnessConfig> = new Map();

  constructor(db: DatabaseService, sync: SyncService) {
    this.db = db;
    this.sync = sync;
    this.initializeFreshnessConfig();
  }

  private initializeFreshnessConfig(): void {
    this.freshnessConfig.set('tasks', { maxAgeMs: 24 * 60 * 60 * 1000, warnAgeMs: 12 * 60 * 60 * 1000 });
    this.freshnessConfig.set('notes', { maxAgeMs: 7 * 24 * 60 * 60 * 1000, warnAgeMs: 3 * 24 * 60 * 60 * 1000 });
    this.freshnessConfig.set('contexts', { maxAgeMs: 30 * 24 * 60 * 60 * 1000, warnAgeMs: 14 * 24 * 60 * 60 * 1000 });
  }

  async runIntegrityCheck(): Promise<IntegrityCheckResult> {
    logger.info('Starting data integrity check');
    const result: IntegrityCheckResult = {
      passed: true,
      errors: [],
      warnings: [],
      stats: { totalRecords: 0, duplicates: 0, staleRecords: 0, orphanedRecords: 0 }
    };

    try {
      const freshnessResult = await this.checkFreshness();
      result.stats.staleRecords = freshnessResult.staleCount;
      result.warnings.push(...freshnessResult.warnings);
      result.errors.push(...freshnessResult.errors);
      if (freshnessResult.errors.length > 0) result.passed = false;

      const duplicationResult = await this.checkDuplication();
      result.stats.duplicates = duplicationResult.duplicateCount;
      result.warnings.push(...duplicationResult.warnings);
      result.errors.push(...duplicationResult.errors);
      if (duplicationResult.errors.length > 0) result.passed = false;

      const syncResult = await this.checkSyncIntegrity();
      result.stats.orphanedRecords = syncResult.orphanedCount;
      result.warnings.push(...syncResult.warnings);
      result.errors.push(...syncResult.errors);
      if (syncResult.errors.length > 0) result.passed = false;

      result.stats.totalRecords = await this.getTotalRecordCount();
      logger.info('Data integrity check completed', { result });
    } catch (error) {
      logger.error('Data integrity check failed', { error });
      result.passed = false;
      result.errors.push('Integrity check failed: ' + (error instanceof Error ? error.message : String(error)));
    }
    return result;
  }

  private async checkFreshness(): Promise<{ staleCount: number; warnings: string[]; errors: string[]; }> {
    const warnings: string[] = [];
    const errors: string[] = [];
    let staleCount = 0;

    for (const [entityType, config] of this.freshnessConfig.entries()) {
      try {
        const now = Date.now();
        const maxAge = now - config.maxAgeMs;
        const warnAge = now - config.warnAgeMs;
        const staleRecords = await this.db.query('SELECT id FROM ' + entityType + ' WHERE updated_at < ?', [new Date(maxAge).toISOString()]);
        if (staleRecords.length > 0) {
          staleCount += staleRecords.length;
          errors.push('Found ' + staleRecords.length + ' stale ' + entityType);
        }
        const warningRecords = await this.db.query('SELECT id FROM ' + entityType + ' WHERE updated_at < ? AND updated_at >= ?', [new Date(warnAge).toISOString(), new Date(maxAge).toISOString()]);
        if (warningRecords.length > 0) warnings.push('Found ' + warningRecords.length + ' ' + entityType + ' approaching staleness');
      } catch (error) {
        warnings.push('Failed to check freshness for ' + entityType);
      }
    }
    return { staleCount, warnings, errors };
  }

  private async checkDuplication(): Promise<{ duplicateCount: number; warnings: string[]; errors: string[]; }> {
    const warnings: string[] = [];
    const errors: string[] = [];
    let duplicateCount = 0;
    const checks = [
      { table: 'tasks', query: 'SELECT title, context_id, status, COUNT(*) as count FROM tasks WHERE deleted_at IS NULL GROUP BY title, context_id, status HAVING count > 1' },
      { table: 'notes', query: 'SELECT title, context_id, COUNT(*) as count FROM notes WHERE deleted_at IS NULL GROUP BY title, context_id HAVING count > 1' },
      { table: 'contexts', query: 'SELECT name, parent_id, COUNT(*) as count FROM contexts WHERE deleted_at IS NULL GROUP BY name, parent_id HAVING count > 1' }
    ];
    for (const check of checks) {
      try {
        const duplicates = await this.db.query(check.query);
        if (duplicates.length > 0) {
          const total = duplicates.reduce((sum: number, row: any) => sum + (row.count - 1), 0);
          duplicateCount += total;
          warnings.push('Found ' + total + ' duplicate ' + check.table);
        }
      } catch (error) {
        warnings.push('Failed to check duplicates for ' + check.table);
      }
    }
    return { duplicateCount, warnings, errors };
  }

  private async checkSyncIntegrity(): Promise<{ orphanedCount: number; warnings: string[]; errors: string[]; }> {
    const warnings: string[] = [];
    const errors: string[] = [];
    let orphanedCount = 0;
    try {
      const orphanedSyncRecords = await this.db.query('SELECT sm.entity_type, sm.entity_id FROM sync_metadata sm LEFT JOIN tasks t ON sm.entity_type = "tasks" AND sm.entity_id = t.id LEFT JOIN notes n ON sm.entity_type = "notes" AND sm.entity_id = n.id LEFT JOIN contexts c ON sm.entity_type = "contexts" AND sm.entity_id = c.id WHERE t.id IS NULL AND n.id IS NULL AND c.id IS NULL');
      if (orphanedSyncRecords.length > 0) {
        orphanedCount += orphanedSyncRecords.length;
        warnings.push('Found ' + orphanedSyncRecords.length + ' orphaned sync metadata records');
      }
      const recordsWithoutSync = await this.db.query('SELECT "tasks" as entity_type, t.id FROM tasks t LEFT JOIN sync_metadata sm ON sm.entity_type = "tasks" AND sm.entity_id = t.id WHERE sm.id IS NULL AND t.deleted_at IS NULL UNION ALL SELECT "notes", n.id FROM notes n LEFT JOIN sync_metadata sm ON sm.entity_type = "notes" AND sm.entity_id = n.id WHERE sm.id IS NULL AND n.deleted_at IS NULL');
      if (recordsWithoutSync.length > 0) errors.push('Found ' + recordsWithoutSync.length + ' records without sync metadata');
    } catch (error) {
      errors.push('Failed to check sync integrity');
    }
    return { orphanedCount, warnings, errors };
  }

  private async getTotalRecordCount(): Promise<number> {
    try {
      const results = await this.db.query('SELECT (SELECT COUNT(*) FROM tasks WHERE deleted_at IS NULL) + (SELECT COUNT(*) FROM notes WHERE deleted_at IS NULL) + (SELECT COUNT(*) FROM contexts WHERE deleted_at IS NULL) as total');
      return results[0]?.total || 0;
    } catch (error) {
      return 0;
    }
  }
}
