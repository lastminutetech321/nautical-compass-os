import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

interface TestUser {
  id: string;
  email: string;
  organization_id: string;
  client: SupabaseClient;
}

let org1User: TestUser;
let org2User: TestUser;
let serviceClient: SupabaseClient;
let testCaseId1: string;
let testCaseId2: string;

describe('Tenant Isolation Security', () => {
  beforeAll(async () => {
    serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const org1Id = 'test-org-1-' + Date.now();
    const org2Id = 'test-org-2-' + Date.now();
    const user1Email = `test-user-1-${Date.now()}@example.com`;
    const user2Email = `test-user-2-${Date.now()}@example.com`;

    const { data: user1Data } = await serviceClient.auth.admin.createUser({
      email: user1Email,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: { organization_id: org1Id }
    });

    const { data: user2Data } = await serviceClient.auth.admin.createUser({
      email: user2Email,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: { organization_id: org2Id }
    });

    const client1 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: session1 } = await client1.auth.signInWithPassword({
      email: user1Email,
      password: 'TestPassword123!'
    });

    const client2 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: session2 } = await client2.auth.signInWithPassword({
      email: user2Email,
      password: 'TestPassword123!'
    });

    org1User = { id: user1Data!.user!.id, email: user1Email, organization_id: org1Id, client: client1 };
    org2User = { id: user2Data!.user!.id, email: user2Email, organization_id: org2Id, client: client2 };

    const { data: case1 } = await serviceClient.from('case_files').insert({
      title: 'Test Case Org 1',
      case_type: 'civil_rights',
      organization_id: org1Id,
      client_name: 'Client A'
    }).select().single();

    const { data: case2 } = await serviceClient.from('case_files').insert({
      title: 'Test Case Org 2',
      case_type: 'civil_rights',
      organization_id: org2Id,
      client_name: 'Client B'
    }).select().single();

    testCaseId1 = case1!.id;
    testCaseId2 = case2!.id;
  });

  afterAll(async () => {
    if (testCaseId1) await serviceClient.from('case_files').delete().eq('id', testCaseId1);
    if (testCaseId2) await serviceClient.from('case_files').delete().eq('id', testCaseId2);
    if (org1User) await serviceClient.auth.admin.deleteUser(org1User.id);
    if (org2User) await serviceClient.auth.admin.deleteUser(org2User.id);
  });

  it('should allow user to read their own organization cases', async () => {
    const { data, error } = await org1User.client.from('case_files').select('*').eq('id', testCaseId1);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].organization_id).toBe(org1User.organization_id);
  });

  it('should prevent user from reading other organization cases', async () => {
    const { data, error } = await org1User.client.from('case_files').select('*').eq('id', testCaseId2);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it('should allow service role full access', async () => {
    const { data, error } = await serviceClient.from('case_files').select('*').in('id', [testCaseId1, testCaseId2]);
    expect(error).toBeNull();
    expect(data).toHaveLength(2);
  });
});
