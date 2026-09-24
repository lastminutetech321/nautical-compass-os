import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommunityConnector } from '../communityConnector';
import { IntegrationConfig } from '../../types/integration';

describe('CommunityConnector', () => {
  let connector: CommunityConnector;
  let mockConfig: IntegrationConfig;

  beforeEach(() => {
    mockConfig = {
      id: 'test-comm-1',
      type: 'community',
      name: 'Test Community Platform',
      enabled: true,
      config: {
        platformUrl: 'https://community.test',
        apiToken: 'token-xyz-789',
        webhookSecret: 'webhook-secret-456',
        syncInterval: 300000
      }
    };
    connector = new CommunityConnector(mockConfig);
  });

  describe('initialization', () => {
    it('should initialize with valid config', () => {
      expect(connector).toBeDefined();
      expect(connector.getConfig()).toEqual(mockConfig);
    });

    it('should reject config without platformUrl', () => {
      const invalidConfig = { ...mockConfig, config: { ...mockConfig.config, platformUrl: '' } };
      expect(() => new CommunityConnector(invalidConfig)).toThrow('platformUrl is required');
    });

    it('should handle webhook validation', async () => {
      const result = await connector.validateWebhook({ signature: 'invalid' });
      expect(result).toBe(false);
    });
  });
});
