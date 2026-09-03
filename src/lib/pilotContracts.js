export const ACCOUNT_ENTRY_OPERATIONS = Object.freeze([
  "get_or_create_profile", "acknowledge_terms", "select_service", "update_profile",
  "set_channel_consent", "delete_optional_data", "get_profile_status",
]);

export const LEGAL_PILOT_OPERATIONS = Object.freeze([
  "get_pilot_status", "create_case", "create_evidence", "create_timeline_event",
  "create_legal_issue", "create_witness", "create_foia_request", "create_document",
  "get_signed_download", "get_my_cases", "get_my_case_detail", "assign_staff",
  "break_glass_access",
]);

function unwrap(response) {
  return response?.data ?? response ?? {};
}

export function createPilotGateways({ invoke, uploadPrivateFile }) {
  const call = async (contract, operation, params = {}) => {
    const supported = contract === "ncAccountEntry" ? ACCOUNT_ENTRY_OPERATIONS : LEGAL_PILOT_OPERATIONS;
    if (!supported.includes(operation)) throw new Error(`Unsupported ${contract} operation: ${operation}`);
    return unwrap(await invoke(contract, { operation, params }));
  };

  return {
    accountEntryGateway: {
      getOrCreateProfile: () => call("ncAccountEntry", "get_or_create_profile"),
      acknowledgeTerms: () => call("ncAccountEntry", "acknowledge_terms", { terms_accepted: true, privacy_acknowledged: true }),
      selectService: (service) => call("ncAccountEntry", "select_service", { service }),
      updateProfile: ({ preferred_name, phone }) => call("ncAccountEntry", "update_profile", { preferred_name, phone }),
      setSmsConsent: (consented) => call("ncAccountEntry", "set_channel_consent", { channel: "sms", consented }),
      deleteOptionalData: (fields) => call("ncAccountEntry", "delete_optional_data", { fields }),
      getProfileStatus: () => call("ncAccountEntry", "get_profile_status"),
    },
    legalPilotGateway: {
      getPilotStatus: () => call("ncLegalPilotGateway", "get_pilot_status"),
      getMyCases: () => call("ncLegalPilotGateway", "get_my_cases"),
      getMyCaseDetail: (caseId) => call("ncLegalPilotGateway", "get_my_case_detail", { case_id: caseId }),
      createCase: (caseData) => call("ncLegalPilotGateway", "create_case", { case_data: caseData }),
      createEvidence: async (file, { case_id, ...evidenceData }) => {
        if (!file) throw new Error("A file is required for private evidence upload.");
        const upload = await uploadPrivateFile({ file });
        if (!upload?.file_uri) throw new Error("Private upload did not return a file URI.");
        return call("ncLegalPilotGateway", "create_evidence", { case_id, evidence_data: { ...evidenceData, file_uri: upload.file_uri } });
      },
      createTimelineEvent: (caseId, eventData) => call("ncLegalPilotGateway", "create_timeline_event", { case_id: caseId, event_data: eventData }),
      createLegalIssue: (caseId, issueData) => call("ncLegalPilotGateway", "create_legal_issue", { case_id: caseId, issue_data: issueData }),
      getSignedDownload: (recordType, recordId) => call("ncLegalPilotGateway", "get_signed_download", { record_type: recordType, record_id: recordId }),
    },
  };
}

export function listFrom(result, key) {
  const value = result?.[key] ?? result?.items ?? result?.records ?? result;
  if (!Array.isArray(value)) throw new Error(`Gateway response did not include ${key}`);
  return value;
}

export async function getMyCaseCollection(gateway, key) {
  const cases = listFrom(await gateway.getMyCases(), "cases");
  const details = await Promise.all(cases.map((caseFile) => gateway.getMyCaseDetail(caseFile.id)));
  const aliases = { evidence: ["evidence"], timeline_events: ["timeline_events", "timeline_entries", "timeline"], legal_issues: ["legal_issues"] };
  const keys = aliases[key] || [key];
  return {
    cases,
    records: details.flatMap((result) => {
      const detail = result?.case_detail ?? result;
      const collectionKey = keys.find((candidate) => Array.isArray(detail?.[candidate]));
      return collectionKey ? detail[collectionKey] : [];
    }),
  };
}
