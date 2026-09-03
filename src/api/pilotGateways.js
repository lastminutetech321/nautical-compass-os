import { base44 } from "@/api/base44Client";

function unwrap(response) {
  return response?.data ?? response ?? {};
}

async function invoke(contract, operation, input = {}) {
  const response = await base44.functions.invoke(contract, { operation, input });
  return unwrap(response);
}

export const accountEntryGateway = {
  saveEntry: (input) => invoke("ncAccountEntry", "save_entry", input),
  selectService: (service) => invoke("ncAccountEntry", "select_service", { service }),
};

export const legalPilotGateway = {
  getAccess: () => invoke("ncLegalPilotGateway", "get_access"),
  listCaseFiles: () => invoke("ncLegalPilotGateway", "list_case_files"),
  createCaseFile: (caseFile) => invoke("ncLegalPilotGateway", "create_case_file", { case_file: caseFile }),
  updateCaseFile: (caseFileId, changes) => invoke("ncLegalPilotGateway", "update_case_file", { case_file_id: caseFileId, changes }),
  listEvidence: () => invoke("ncLegalPilotGateway", "list_evidence"),
  uploadEvidence: (evidence) => invoke("ncLegalPilotGateway", "upload_evidence", { evidence }),
  getEvidenceDownload: (evidenceId) => invoke("ncLegalPilotGateway", "get_evidence_download", { evidence_id: evidenceId }),
  listTimeline: () => invoke("ncLegalPilotGateway", "list_timeline"),
  createTimelineEntry: (entry) => invoke("ncLegalPilotGateway", "create_timeline_entry", { entry }),
  listLegalIssues: () => invoke("ncLegalPilotGateway", "list_legal_issues"),
  createLegalIssue: (issue) => invoke("ncLegalPilotGateway", "create_legal_issue", { issue }),
  scanLegalIssues: (caseName, text) => invoke("ncLegalPilotGateway", "scan_legal_issues", { case_name: caseName, text }),
  getCanonStatus: () => invoke("ncLegalPilotGateway", "get_canon_status"),
  listResearchMemos: () => invoke("ncLegalPilotGateway", "list_research_memos"),
  runCanonAnalysis: (input) => invoke("ncLegalPilotGateway", "run_canon_analysis", input),
};

export function listFrom(result, key) {
  const value = result?.[key] ?? result?.items ?? result?.records ?? result;
  if (!Array.isArray(value)) throw new Error(`Gateway response did not include ${key}`);
  return value;
}
