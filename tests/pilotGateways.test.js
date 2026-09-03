import test from "node:test";
import assert from "node:assert/strict";
import {
  ACCOUNT_ENTRY_OPERATIONS,
  LEGAL_PILOT_OPERATIONS,
  createPilotGateways,
} from "../src/lib/pilotContracts.js";

function harness() {
  const calls = [];
  const uploads = [];
  const gateways = createPilotGateways({
    invoke: async (contract, payload) => {
      calls.push({ contract, payload });
      return { data: { ok: true } };
    },
    uploadPrivateFile: async (payload) => {
      uploads.push(payload);
      return { file_uri: "private/test/evidence.pdf" };
    },
  });
  return { ...gateways, calls, uploads };
}

test("account entry calls only supported operations with params payloads", async () => {
  const { accountEntryGateway, calls } = harness();
  await accountEntryGateway.getOrCreateProfile();
  await accountEntryGateway.acknowledgeTerms();
  await accountEntryGateway.updateProfile({ preferred_name: "Founder", phone: null });
  await accountEntryGateway.setSmsConsent(false);
  await accountEntryGateway.selectService("legal");

  assert.deepEqual(calls, [
    { contract: "ncAccountEntry", payload: { operation: "get_or_create_profile", params: {} } },
    { contract: "ncAccountEntry", payload: { operation: "acknowledge_terms", params: { terms_accepted: true, privacy_acknowledged: true } } },
    { contract: "ncAccountEntry", payload: { operation: "update_profile", params: { preferred_name: "Founder", phone: null } } },
    { contract: "ncAccountEntry", payload: { operation: "set_channel_consent", params: { channel: "sms", consented: false } } },
    { contract: "ncAccountEntry", payload: { operation: "select_service", params: { service: "legal" } } },
  ]);
  assert.ok(calls.every(({ payload }) => ACCOUNT_ENTRY_OPERATIONS.includes(payload.operation)));
});

test("legal pilot calls only supported operations with contract-shaped params", async () => {
  const { legalPilotGateway, calls } = harness();
  await legalPilotGateway.getPilotStatus();
  await legalPilotGateway.getMyCases();
  await legalPilotGateway.getMyCaseDetail("case-1");
  await legalPilotGateway.createCase({ title: "Synthetic case" });
  await legalPilotGateway.createTimelineEvent("case-1", { title: "Synthetic event" });
  await legalPilotGateway.createLegalIssue("case-1", { title: "Synthetic issue" });
  await legalPilotGateway.getSignedDownload("evidence", "evidence-1");

  assert.deepEqual(calls.map(({ payload }) => payload), [
    { operation: "get_pilot_status", params: {} },
    { operation: "get_my_cases", params: {} },
    { operation: "get_my_case_detail", params: { case_id: "case-1" } },
    { operation: "create_case", params: { case_data: { title: "Synthetic case" } } },
    { operation: "create_timeline_event", params: { case_id: "case-1", event_data: { title: "Synthetic event" } } },
    { operation: "create_legal_issue", params: { case_id: "case-1", issue_data: { title: "Synthetic issue" } } },
    { operation: "get_signed_download", params: { record_type: "evidence", record_id: "evidence-1" } },
  ]);
  assert.ok(calls.every(({ payload }) => LEGAL_PILOT_OPERATIONS.includes(payload.operation)));
});

test("evidence uses private upload before create_evidence", async () => {
  const { legalPilotGateway, calls, uploads } = harness();
  const file = { name: "synthetic.pdf" };
  await legalPilotGateway.createEvidence(file, { case_id: "case-1", title: "Synthetic evidence" });

  assert.deepEqual(uploads, [{ file }]);
  assert.deepEqual(calls, [{
    contract: "ncLegalPilotGateway",
    payload: {
      operation: "create_evidence",
      params: {
        case_id: "case-1",
        evidence_data: { title: "Synthetic evidence", file_uri: "private/test/evidence.pdf" },
      },
    },
  }]);
});

test("unsupported operation names are absent", () => {
  const forbidden = ["save_entry", "get_access", "list_case_files", "create_case_file", "upload_evidence", "get_evidence_download", "create_timeline_entry", "list_evidence", "list_timeline", "list_legal_issues", "update_case_file", "scan_legal_issues", "get_canon_status", "list_research_memos", "run_canon_analysis"];
  assert.equal(forbidden.some((operation) => ACCOUNT_ENTRY_OPERATIONS.includes(operation) || LEGAL_PILOT_OPERATIONS.includes(operation)), false);
});
