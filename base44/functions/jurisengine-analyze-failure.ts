/**
 * JurisEngine Failure Analysis Function
 * Analyzes JurisEngine v1 module failures and categorizes them for repair dispatch
 */

import { Context } from "https://deno.land/x/base44@latest/mod.ts";

interface AnalyzeFailureInput {
  module: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

interface FailureAnalysisResult {
  failure_type: string;
  affected_components: string[];
  severity: "critical" | "high" | "medium" | "low";
  root_cause?: string;
  recommended_actions: string[];
}

export default async function analyzeFailure(
  input: AnalyzeFailureInput,
  ctx: Context
): Promise<FailureAnalysisResult> {
  const { module, timestamp, context = {} } = input;

  // Log the failure analysis request
  await ctx.entities.create("system_logs", {
    event_type: "jurisengine_failure_analysis",
    module,
    timestamp,
    context,
  });

  // Analyze failure patterns
  const failureType = detectFailureType(context);
  const affectedComponents = identifyAffectedComponents(context);
  const severity = calculateSeverity(failureType, affectedComponents);
  const rootCause = await investigateRootCause(ctx, failureType, context);
  const recommendedActions = generateRecommendedActions(
    failureType,
    affectedComponents
  );

  return {
    failure_type: failureType,
    affected_components: affectedComponents,
    severity,
    root_cause: rootCause,
    recommended_actions: recommendedActions,
  };
}

function detectFailureType(context: Record<string, unknown>): string {
  // Analyze context to determine failure type
  if (context.error_code === "SCHEMA_VALIDATION_ERROR") {
    return "schema_mismatch";
  }
  if (context.error_code === "LOGIC_EXECUTION_ERROR") {
    return "logic_failure";
  }
  if (context.error_code === "INTEGRATION_ERROR") {
    return "integration_failure";
  }
  if (context.error_code === "DATA_CORRUPTION") {
    return "data_integrity_issue";
  }
  return "unknown_failure";
}

function identifyAffectedComponents(
  context: Record<string, unknown>
): string[] {
  const components: string[] = [];

  if (context.failed_entity || context.schema_error) {
    components.push("schema");
  }
  if (context.function_error || context.workflow_error) {
    components.push("logic");
  }
  if (context.api_error || context.connector_error) {
    components.push("integration");
  }
  if (context.database_error) {
    components.push("data_layer");
  }

  return components.length > 0 ? components : ["unknown"];
}

function calculateSeverity(
  failureType: string,
  affectedComponents: string[]
): "critical" | "high" | "medium" | "low" {
  if (failureType === "data_integrity_issue") return "critical";
  if (affectedComponents.includes("data_layer")) return "high";
  if (affectedComponents.length > 2) return "high";
  if (failureType === "integration_failure") return "medium";
  return "low";
}

async function investigateRootCause(
  ctx: Context,
  failureType: string,
  context: Record<string, unknown>
): Promise<string | undefined> {
  try {
    // Query recent similar failures
    const recentFailures = await ctx.entities.list("system_logs", {
      filters: {
        event_type: "jurisengine_failure_analysis",
        created_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      limit: 10,
    });

    // Pattern detection logic
    if (recentFailures.items.length > 5) {
      return "Recurring failure pattern detected - possible systemic issue";
    }

    return `Isolated ${failureType} incident`;
  } catch (error) {
    return `Root cause investigation failed: ${error.message}`;
  }
}

function generateRecommendedActions(
  failureType: string,
  affectedComponents: string[]
): string[] {
  const actions: string[] = [];

  if (affectedComponents.includes("schema")) {
    actions.push("Run schema repair agent");
    actions.push("Validate entity definitions");
  }
  if (affectedComponents.includes("logic")) {
    actions.push("Analyze function execution logs");
    actions.push("Run logic repair agent");
  }
  if (affectedComponents.includes("integration")) {
    actions.push("Verify external API connectivity");
    actions.push("Run integration repair agent");
  }
  if (affectedComponents.includes("data_layer")) {
    actions.push("Run data integrity check");
    actions.push("Backup current state");
  }

  actions.push("Monitor for recurrence");
  actions.push("Update failure knowledge base");

  return actions;
}
