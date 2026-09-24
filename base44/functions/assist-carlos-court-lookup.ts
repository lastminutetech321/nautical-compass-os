/**
 * Assist Carlos — CourtListener Case Lookup & Legal Guidance
 */

import type { FunctionEvent } from "https://deno.land/x/b44_sdk@latest/mod.ts";
import { getBase44Client } from "https://deno.land/x/b44_sdk@latest/mod.ts";

interface AssistCarlosPayload {
  trigger?: "initial" | "name_received";
  carlos_full_name?: string;
}

export default async function assistCarlosCourtLookup(event: FunctionEvent<AssistCarlosPayload>) {
  const client = getBase44Client();
  const payload = event.payload || {};
  const trigger = payload.trigger || "initial";
  const caseTimelineId = "6ab322b10347f195f061b93b";
  const carlosPhone = "+12029109980";

  try {
    if (trigger === "initial") {
      await client.callFunction("ncSendTwilioSMS", {
        to: carlosPhone,
        message: "Hi Carlos, this is NC (Nautical Compass). I'm here to help you with a legal matter. To get started, please reply with your full legal name (first and last)."
      });

      await client.createRecord("CaseTimeline", {
        case_id: caseTimelineId,
        timestamp: new Date().toISOString(),
        actor: "NC System",
        event_type: "outreach_initiated",
        description: "Initial SMS sent to Carlos requesting full name",
        metadata: { phone: carlosPhone, trigger: "assist_carlos_task" }
      });

      return { success: true, step: "initial_sms_sent", message: "SMS sent to Carlos asking for full name" };
    }

    if (trigger === "name_received" && payload.carlos_full_name) {
      const fullName = payload.carlos_full_name.trim();

      await client.createRecord("CaseTimeline", {
        case_id: caseTimelineId,
        timestamp: new Date().toISOString(),
        actor: "Carlos",
        event_type: "name_provided",
        description: `Carlos provided full name: ${fullName}`,
        metadata: { name: fullName }
      });

      const searchResult = await client.callFunction("ncCourtListener", {
        operation: "search_dockets",
        params: { q: fullName, type: "r" }
      });

      if (!searchResult.results || searchResult.results.length === 0) {
        await client.callFunction("ncSendTwilioSMS", {
          to: carlosPhone,
          message: "I searched for your name in court records but didn't find any active cases. If you believe there should be a case, please double-check the spelling of your name or contact me for further assistance."
        });

        await client.createRecord("CaseTimeline", {
          case_id: caseTimelineId,
          timestamp: new Date().toISOString(),
          actor: "NC System",
          event_type: "search_no_results",
          description: "CourtListener search returned no results",
          metadata: { search_name: fullName }
        });

        return { success: true, step: "no_cases_found", message: "No cases found for Carlos" };
      }

      const firstCase = searchResult.results[0];

      const legalCaseRecord = await client.createRecord("LegalCase", {
        case_name: firstCase.case_name,
        case_number: firstCase.docket_number,
        court: firstCase.court,
        filing_date: firstCase.date_filed,
        status: "active",
        client_name: fullName,
        client_phone: carlosPhone,
        case_type: "court_listener_discovery",
        source_url: firstCase.absolute_url,
        courtlistener_id: firstCase.id.toString(),
        metadata: { discovered_via: "assist_carlos_task", courtlistener_data: firstCase }
      });

      await client.createRecord("CaseTimeline", {
        case_id: caseTimelineId,
        timestamp: new Date().toISOString(),
        actor: "NC System",
        event_type: "case_found",
        description: `Case found and ingested: ${firstCase.case_name}`,
        metadata: { legal_case_id: legalCaseRecord.id, case_number: firstCase.docket_number, court: firstCase.court }
      });

      const guidanceMessage = `Hi Carlos, I found a legal case involving you:\n\nCase Name: ${firstCase.case_name}\nCase Number: ${firstCase.docket_number}\nCourt: ${firstCase.court}\nFiled: ${firstCase.date_filed}\n\nThis means there is an active legal proceeding on record. I recommend:\n1. Review the case details at ${firstCase.absolute_url}\n2. Contact a local attorney if you haven't already\n3. Respond to any court notices immediately\n\nI'm here to help guide you through this. Reply with any questions.`;

      await client.callFunction("ncSendTwilioSMS", { to: carlosPhone, message: guidanceMessage });

      await client.createRecord("CaseTimeline", {
        case_id: caseTimelineId,
        timestamp: new Date().toISOString(),
        actor: "NC System",
        event_type: "guidance_sent",
        description: "Case details and guidance SMS sent to Carlos",
        metadata: { legal_case_id: legalCaseRecord.id }
      });

      await client.createRecord("Notification", {
        recipient_type: "founder",
        title: "Carlos Case Assistance Complete",
        message: `Successfully found and ingested case for Carlos: ${firstCase.case_name}. Guidance SMS sent.`,
        priority: "high",
        category: "legal_assistance",
        metadata: { legal_case_id: legalCaseRecord.id, case_timeline_id: caseTimelineId }
      });

      return { success: true, step: "case_found_and_guided", legal_case_id: legalCaseRecord.id, case_details: firstCase, message: "Case found, ingested, and guidance sent to Carlos" };
    }

    throw new Error(`Unknown trigger: ${trigger}`);
  } catch (error) {
    await client.createRecord("CaseTimeline", {
      case_id: caseTimelineId,
      timestamp: new Date().toISOString(),
      actor: "NC System",
      event_type: "error",
      description: `Error in assist-carlos function: ${error.message}`,
      metadata: { error: error.message, stack: error.stack, trigger }
    });
    throw error;
  }
}
