# Tenant Isolation Security Implementation

## Overview
This document describes the tenant isolation security measures implemented to prevent cross-tenant data access.

## Row Level Security (RLS) Policies

### Covered Tables
- `case_files`
- `evidence_items`
- `foia_requests`
- `legal_canon`
- `agent_sessions`
- `agent_logs`

### Policy Structure
Each table has two policies:

1. **Tenant Isolation Policy** (`{table}_tenant_isolation`)
   - Applied to: `authenticated` role
   - Filter: `organization_id = auth.user_organization_id()`
   - Ensures users only access data from their organization

2. **Service Role Policy** (`{table}_service_role`)
   - Applied to: `service_role`
   - Filter: `true` (full access)
   - Allows backend operations across all tenants

## Helper Functions

### `auth.user_organization_id()`
Extracts the organization_id from the JWT token:
- Checks `claims.organization_id`
- Falls back to `user_metadata.organization_id`
- Returns TEXT or NULL

## Performance Optimization
Indexes created on `organization_id` columns for all RLS-protected tables to ensure fast policy evaluation.

## Testing
See `tests/security/tenant-isolation.test.ts` for verification tests.

## Migration
Run migration: `supabase/migrations/20240115000000_tenant_isolation_rls.sql`
