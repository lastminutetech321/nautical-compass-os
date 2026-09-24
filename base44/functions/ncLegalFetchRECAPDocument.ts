import { base44 } from '@base44/sdk';
import { fetchRECAPDocument, logLegalAPICall } from '../shared/legal.ts';

export async function handler(event: any) {
  const { recap_doc_id, user_id, case_id } = event;
  try {
    const flags = await base44.getEntity('nc_feature_flags', 'nc_legal_recap');
    if (!flags || !flags.enabled) return { success: false, error: 'Feature disabled' };
    const doc = await fetchRECAPDocument(recap_doc_id);
    const evidence = await base44.createEntity('nc_evidence_engine', {
      user_id,
      case_id,
      evidence_type: 'court_filing',
      source: 'CourtListener RECAP',
      description: doc.description,
      metadata: { recap_doc_id: doc.id, docket_entry: doc.docket_entry, pacer_doc_id: doc.pacer_doc_id },
      created_at: new Date().toISOString()
    });
    await logLegalAPICall('CourtListener', `/recap-documents/${recap_doc_id}`, 200, null, user_id);
    return { success: true, evidence_id: evidence.id };
  } catch (error) {
    await logLegalAPICall('CourtListener', `/recap-documents/${recap_doc_id}`, 500, error.message, user_id);
    throw error;
  }
}
