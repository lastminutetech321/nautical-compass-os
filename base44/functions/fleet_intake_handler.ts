import { Base44 } from 'https://deno.land/x/base44/mod.ts';

interface FleetIntakePayload {
  user_id: string;
  company_name: string;
  legal_entity_name?: string;
  person_roles: string[];
  company_type: 'production_company' | 'labor_company' | 'vendor';
  staffable_roles: string[];
  crew_capacity?: number;
  lead_time_days?: number;
  equipment: Array<{ item_name: string; model?: string; quantity?: number }>;
  preferred_structures: string[];
  government_teaming_interest: boolean;
  email_domain?: string;
}

export async function handler(req: Request) {
  const base44 = new Base44();
  try {
    const payload: FleetIntakePayload = await req.json();
    const flags = await base44.entity('feature_flags').list({ filter: { flag_name: 'fleet_intake' } });
    const fleetIntakeEnabled = flags.data?.[0]?.enabled || false;
    if (!fleetIntakeEnabled) {
      return new Response(JSON.stringify({ error: 'Fleet intake is not enabled' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }
    let existingOrg = null;
    const dedupeFilters: any[] = [{ name: payload.company_name }];
    if (payload.email_domain) { dedupeFilters.push({ email_domain: payload.email_domain }); }
    const existingOrgs = await base44.entity('organizations').list({ filter: { $or: dedupeFilters }, limit: 1 });
    if (existingOrgs.data && existingOrgs.data.length > 0) { existingOrg = existingOrgs.data[0]; }
    let organization;
    if (existingOrg) {
      organization = existingOrg;
    } else {
      const orgTags = ['fleet', payload.company_type];
      organization = await base44.entity('organizations').create({ name: payload.company_name, legal_name: payload.legal_entity_name || payload.company_name, type: 'partner', email_domain: payload.email_domain, tags: orgTags, fleet_company_type: payload.company_type });
    }
    const existingMemberships = await base44.entity('organization_memberships').list({ filter: { organization_id: organization.id, user_id: payload.user_id }, limit: 1 });
    let membership;
    if (existingMemberships.data && existingMemberships.data.length > 0) {
      membership = await base44.entity('organization_memberships').update(existingMemberships.data[0].id, { role: 'admin', person_role_in_company: payload.person_roles });
    } else {
      membership = await base44.entity('organization_memberships').create({ organization_id: organization.id, user_id: payload.user_id, role: 'admin', person_role_in_company: payload.person_roles });
    }
    const existingCapabilities = await base44.entity('company_capabilities').list({ filter: { organization_id: organization.id }, limit: 1 });
    let capability;
    if (existingCapabilities.data && existingCapabilities.data.length > 0) {
      capability = await base44.entity('company_capabilities').update(existingCapabilities.data[0].id, { staffable_roles: payload.staffable_roles, crew_capacity: payload.crew_capacity, lead_time_days: payload.lead_time_days, preferred_structures: payload.preferred_structures, government_teaming_interest: payload.government_teaming_interest });
    } else {
      capability = await base44.entity('company_capabilities').create({ organization_id: organization.id, staffable_roles: payload.staffable_roles, crew_capacity: payload.crew_capacity, lead_time_days: payload.lead_time_days, preferred_structures: payload.preferred_structures, government_teaming_interest: payload.government_teaming_interest });
    }
    const equipmentRecords = [];
    for (const eq of payload.equipment) {
      const equipmentRecord = await base44.entity('equipment_inventory').create({ organization_id: organization.id, item_name: eq.item_name, model: eq.model, quantity: eq.quantity || 1, available_for_rent: true });
      equipmentRecords.push(equipmentRecord);
    }
    const founderUsers = await base44.entity('users').list({ filter: { role: 'founder' }, limit: 1 });
    if (founderUsers.data && founderUsers.data.length > 0) {
      await base44.function('send_notification').call({ user_id: founderUsers.data[0].id, title: 'New Fleet Company', message: `New Fleet company: ${payload.company_name}`, link: `/organizations/${organization.id}`, type: 'fleet_intake' });
    }
    return new Response(JSON.stringify({ success: true, organization, membership, capability, equipment_count: equipmentRecords.length, is_new_organization: !existingOrg }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Fleet intake handler error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
