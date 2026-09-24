-- Tenant Isolation and Service Role Corrections
-- This migration implements verified Row Level Security (RLS) policies
-- to ensure strict tenant isolation and corrects service role permissions.

-- Enable RLS on all tenant-scoped tables
ALTER TABLE case_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE foia_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_canon ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS case_files_tenant_isolation ON case_files;
DROP POLICY IF EXISTS case_files_service_role ON case_files;
DROP POLICY IF EXISTS evidence_items_tenant_isolation ON evidence_items;
DROP POLICY IF EXISTS evidence_items_service_role ON evidence_items;
DROP POLICY IF EXISTS foia_requests_tenant_isolation ON foia_requests;
DROP POLICY IF EXISTS foia_requests_service_role ON foia_requests;
DROP POLICY IF EXISTS legal_canon_tenant_isolation ON legal_canon;
DROP POLICY IF EXISTS legal_canon_service_role ON legal_canon;
DROP POLICY IF EXISTS agent_sessions_tenant_isolation ON agent_sessions;
DROP POLICY IF EXISTS agent_sessions_service_role ON agent_sessions;
DROP POLICY IF EXISTS agent_logs_tenant_isolation ON agent_logs;
DROP POLICY IF EXISTS agent_logs_service_role ON agent_logs;

-- Helper function to get current user's organization_id from JWT
CREATE OR REPLACE FUNCTION auth.user_organization_id()
RETURNS TEXT AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'organization_id',
    current_setting('request.jwt.claims', true)::json->'user_metadata'->>'organization_id'
  );
$$ LANGUAGE SQL STABLE;

-- CASE_FILES Policies
CREATE POLICY case_files_tenant_isolation ON case_files
  FOR ALL
  TO authenticated
  USING (organization_id = auth.user_organization_id())
  WITH CHECK (organization_id = auth.user_organization_id());

CREATE POLICY case_files_service_role ON case_files
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- EVIDENCE_ITEMS Policies
CREATE POLICY evidence_items_tenant_isolation ON evidence_items
  FOR ALL
  TO authenticated
  USING (organization_id = auth.user_organization_id())
  WITH CHECK (organization_id = auth.user_organization_id());

CREATE POLICY evidence_items_service_role ON evidence_items
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- FOIA_REQUESTS Policies
CREATE POLICY foia_requests_tenant_isolation ON foia_requests
  FOR ALL
  TO authenticated
  USING (organization_id = auth.user_organization_id())
  WITH CHECK (organization_id = auth.user_organization_id());

CREATE POLICY foia_requests_service_role ON foia_requests
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- LEGAL_CANON Policies
CREATE POLICY legal_canon_tenant_isolation ON legal_canon
  FOR ALL
  TO authenticated
  USING (organization_id = auth.user_organization_id())
  WITH CHECK (organization_id = auth.user_organization_id());

CREATE POLICY legal_canon_service_role ON legal_canon
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- AGENT_SESSIONS Policies
CREATE POLICY agent_sessions_tenant_isolation ON agent_sessions
  FOR ALL
  TO authenticated
  USING (organization_id = auth.user_organization_id())
  WITH CHECK (organization_id = auth.user_organization_id());

CREATE POLICY agent_sessions_service_role ON agent_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- AGENT_LOGS Policies
CREATE POLICY agent_logs_tenant_isolation ON agent_logs
  FOR ALL
  TO authenticated
  USING (organization_id = auth.user_organization_id())
  WITH CHECK (organization_id = auth.user_organization_id());

CREATE POLICY agent_logs_service_role ON agent_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create indexes to optimize RLS policy checks
CREATE INDEX IF NOT EXISTS idx_case_files_org_id ON case_files(organization_id);
CREATE INDEX IF NOT EXISTS idx_evidence_items_org_id ON evidence_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_foia_requests_org_id ON foia_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_legal_canon_org_id ON legal_canon(organization_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_org_id ON agent_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_org_id ON agent_logs(organization_id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.user_organization_id() TO authenticated, service_role;
