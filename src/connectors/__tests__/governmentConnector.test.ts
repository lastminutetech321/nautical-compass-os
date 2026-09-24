import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GovernmentConnector } from '../governmentConnector';
import { IntegrationConfig } from '../../types/integration';

describe('GovernmentConnector', () => {
  let connector: GovernmentConnector;
  let mockConfig: IntegrationConfig;

  beforeEach(() => {
    mockConfig = {
      id: 'test-gov-1',
      type: 'government',
      name: 'Test Government Portal',
      enabled: true,
      config: {
        apiEndpoint: 'https://api.gov.test',
        apiKey: 'test-key-123',
        jurisdiction: 'TEST_STATE',
        timeout: 30000
      }
    };
    connector = new GovernmentConnector(mockConfig);
  });

  describe('initialization', () => {
    it('should initialize with valid config', () => {
      expect(connector).toBeDefined();
      expect(connector.getConfig()).toEqual(mockConfig);
    });

    it('should reject config without apiEndpoint', () => {
      const invalidConfig = { ...mockConfig, config: { ...mockConfig.config, apiEndpoint: '' } };
      expect(() => new GovernmentConnector(invalidConfig)).toThrow('apiEndpoint is required');
    });

    it('should handle connection errors', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      global.fetch = mockFetch;
      const result = await connector.connect();
      expect(result.success).toBe(false);
    });
  });
});
