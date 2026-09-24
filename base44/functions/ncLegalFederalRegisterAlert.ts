import { base44 } from '@base44/sdk';
import { searchFederalRegister, logLegalAPICall } from '../shared/legal.ts';
import { twilioSend, resolveTwilioFrom } from '../shared/sms.ts';

export async function handler(event: any) {
  const { user_id, keywords } = event;
  try {
    const flags = await base44.getEntity('nc_feature_flags', 'nc_legal_federal_register');
    if (!flags || !flags.enabled) return { success: false, error: 'Feature disabled' };
    const rules = await searchFederalRegister(keywords, true);
    if (rules.length === 0) {
      await logLegalAPICall('FederalRegister', '/api/v1/documents', 200, 'NO_RESULTS', user_id);
      return { success: true, count: 0 };
    }
    for (const rule of rules) {
      await base44.createEntity('nc_notification', {
        user_id,
        type: 'federal_register_rule',
        title: `New proposed rule: ${rule.title}`,
        message: `Comment deadline: ${rule.comment_end_date || 'TBD'}. ${rule.abstract}`,
        metadata: { document_number: rule.document_number, url: rule.html_url, agencies: rule.agencies },
        read: false,
        created_at: new Date().toISOString()
      });
    }
    const user = await base44.getEntity('users', user_id);
    if (user?.phone && user?.sms_consent && !user?.sms_opted_out) {
      const message = `${rules.length} new Federal Register rule(s) matching your case. Check NC Legal for details.`;
      const from = await resolveTwilioFrom();
      await twilioSend(user.phone, message, from, `fed_reg_${user_id}`);
    }
    await logLegalAPICall('FederalRegister', '/api/v1/documents', 200, null, user_id);
    return { success: true, count: rules.length };
  } catch (error) {
    await logLegalAPICall('FederalRegister', '/api/v1/documents', 500, error.message, user_id);
    throw error;
  }
}
