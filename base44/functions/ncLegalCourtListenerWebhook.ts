import { base44, getSecrets } from '@base44/sdk';
import { sendCourtDateReminder, logLegalAPICall } from '../shared/legal.ts';

export async function handler(event: any) {
  const { payload } = event;
  try {
    const flags = await base44.getEntity('nc_feature_flags', 'nc_legal_courtlistener');
    if (!flags || !flags.enabled) return { statusCode: 200, body: 'Feature disabled' };
    const { docket_id, court, case_name, docket_entries } = payload;
    const subscriptions = await base44.findEntities('nc_legal_docket_subscription', {
      filters: [{ field: 'docket_id', operator: 'equals', value: docket_id }]
    });
    if (!subscriptions.items || subscriptions.items.length === 0) {
      await logLegalAPICall('CourtListener', '/webhook', 200, 'NO_SUBSCRIBERS');
      return { statusCode: 200, body: 'No subscribers' };
    }
    for (const sub of subscriptions.items) {
      const userId = sub.user_id;
      await base44.createEntity('nc_notification', {
        user_id: userId,
        type: 'legal_docket_update',
        title: `New filing in ${case_name}`,
        message: `New entries in ${court} case ${case_name}.`,
        metadata: { docket_id, court, case_name, entries: docket_entries },
        read: false,
        created_at: new Date().toISOString()
      });
      if (sub.sms_enabled) {
        const user = await base44.getEntity('users', userId);
        const phone = user?.phone;
        const consented = user?.sms_consent === true;
        const optedOut = user?.sms_opted_out === true;
        if (phone && consented && !optedOut) {
          await sendCourtDateReminder(phone, docket_entries?.[0]?.date_filed || 'TBD', court, case_name, consented, optedOut);
        }
      }
    }
    await logLegalAPICall('CourtListener', '/webhook', 200, null, subscriptions.items[0].user_id);
    return { statusCode: 200, body: 'Alerts sent' };
  } catch (error) {
    await logLegalAPICall('CourtListener', '/webhook', 500, error.message);
    throw error;
  }
}
