import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Activity, CheckCircle, AlertTriangle, Zap, RefreshCw, Clock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import moment from "moment";

const services = [
  { id: "database", label: "Database / Entities", category: "database", description: "Entity read/write operations" },
  { id: "canon", label: "NC Canon", category: "canon", description: "Canon entry availability" },
  { id: "jurisengine", label: "JurisEngine", category: "ai_service", description: "Legal AI query service" },
  { id: "evidence_vault", label: "Evidence Vault", category: "evidence", description: "File storage and integrity" },
  { id: "agents", label: "AI Agent Fleet", category: "agents", description: "Agent deployment status" },
  { id: "self_diagnosis", label: "Self-Diagnosis Engine", category: "api", description: "Platform health scanning" },
  { id: "integrations", label: "LLM / AI Integrations", category: "integration", description: "External AI API calls" },
  { id: "auth", label: "Authentication", category: "api", description: "User auth and sessions" },
];

const statusDot = { healthy: "bg-emerald-500", degraded: "bg-amber-500", down: "bg-red-500", unknown: "bg-slate-300" };
const statusText = { healthy: "text-emerald-700", degraded: "text-amber-700", down: "text-red-700", unknown: "text-slate-500" };
const statusBg = { healthy: "bg-emerald-50 border-emerald-200", degraded: "bg-amber-50 border-amber-200", down: "bg-red-50 border-red-200", unknown: "bg-slate-50 border-slate-200" };

export default function PlatformHealthMonitor() {
  const [checks, setChecks] = useState([]);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState(null);
  const [liveResults, setLiveResults] = useState({});

  const load = async () => {
    const data = await base44.entities.HealthCheck.list("-checked_at", 50).catch(() => []);
    // Get most recent check per service
    const latest = {};
    data.forEach(c => {
      if (!latest[c.service] || new Date(c.checked_at) > new Date(latest[c.service].checked_at)) {
        latest[c.service] = c;
      }
    });
    setChecks(Object.values(latest));
  };

  useEffect(() => { load(); }, []);

  const runHealthCheck = async () => {
    setRunning(true);
    setLiveResults({});
    const now = new Date().toISOString();
    const results = {};

    // Check database
    try {
      const start = Date.now();
      await base44.entities.DiagnosticIssue.list("-created_date", 1);
      results.database = { status: "healthy", response_time_ms: Date.now() - start };
    } catch {
      results.database = { status: "down", error_message: "Entity read failed" };
    }
    setLiveResults({...results});

    // Check Canon
    try {
      const start = Date.now();
      const canon = await base44.entities.CanonEntry.list("-created_date", 1).catch(() => []);
      const verifiedCount = (await base44.entities.CanonEntry.filter({ verified: true, status: "active" }).catch(() => [])).length;
      results.canon = { status: verifiedCount > 0 ? "healthy" : "degraded", response_time_ms: Date.now() - start, metadata: { verified_entries: verifiedCount, status_message: verifiedCount === 0 ? "No verified Canon entries — JurisEngine degraded" : `${verifiedCount} verified entries active` } };
    } catch {
      results.canon = { status: "down" };
    }
    setLiveResults({...results});

    // Check agents
    try {
      const agents = await base44.entities.AgentProfile.list("-created_date", 1).catch(() => []);
      const allAgents = await base44.entities.AgentProfile.list("-created_date", 100).catch(() => []);
      results.agents = { status: allAgents.length > 5 ? "healthy" : "degraded", metadata: { total_agents: allAgents.length } };
    } catch {
      results.agents = { status: "unknown" };
    }
    setLiveResults({...results});

    // Check evidence vault (by reading evidence entities)
    try {
      const ev = await base44.entities.Evidence.list("-created_date", 1).catch(() => []);
      results.evidence_vault = { status: "healthy", metadata: { accessible: true } };
    } catch {
      results.evidence_vault = { status: "degraded" };
    }
    setLiveResults({...results});

    // Self-diagnosis engine — just verify entity exists
    try {
      await base44.entities.DiagnosticIssue.list("-created_date", 1);
      results.self_diagnosis = { status: "healthy" };
    } catch {
      results.self_diagnosis = { status: "down" };
    }

    // Auth check
    try {
      const user = await base44.auth.me();
      results.auth = { status: user ? "healthy" : "down", metadata: { authenticated: !!user } };
    } catch {
      results.auth = { status: "degraded" };
    }

    // Integrations — we can only detect if LLM service is configured; mark unknown
    results.integrations = { status: "unknown", metadata: { note: "LLM availability checked at runtime" } };
    results.jurisengine = { status: results.canon?.status === "healthy" ? "healthy" : "degraded", metadata: { note: results.canon?.status !== "healthy" ? "Degraded — Canon empty" : "Operational" } };

    setLiveResults(results);

    // Persist health checks
    await Promise.all(
      Object.entries(results).map(([serviceId, result]) =>
        base44.entities.HealthCheck.create({
          service: serviceId,
          status: result.status || "unknown",
          checked_at: now,
          response_time_ms: result.response_time_ms,
          error_message: result.error_message,
          metadata: result.metadata,
          category: services.find(s => s.id === serviceId)?.category || "api",
        }).catch(() => null)
      )
    );

    setLastRun(now);
    setRunning(false);
    load();
  };

  const getStatus = (serviceId) => {
    if (liveResults[serviceId]) return liveResults[serviceId].status;
    const found = checks.find(c => c.service === serviceId);
    return found?.status || "unknown";
  };

  const getMeta = (serviceId) => {
    if (liveResults[serviceId]) return liveResults[serviceId];
    return checks.find(c => c.service === serviceId) || {};
  };

  const healthyCt = services.filter(s => getStatus(s.id) === "healthy").length;
  const degradedCt = services.filter(s => getStatus(s.id) === "degraded").length;
  const downCt = services.filter(s => getStatus(s.id) === "down").length;
  const overallStatus = downCt > 0 ? "down" : degradedCt > 0 ? "degraded" : healthyCt === services.length ? "healthy" : "unknown";

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Enterprise Infrastructure</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />Platform Health Monitor
          </h1>
          <p className="text-sm text-muted-foreground">Real-time service health, uptime, and status checks</p>
        </div>
        <Button onClick={runHealthCheck} disabled={running} className="gap-2">
          {running ? <><Zap className="w-4 h-4 animate-pulse" />Checking...</> : <><RefreshCw className="w-4 h-4" />Run Health Check</>}
        </Button>
      </div>

      {/* Overall status banner */}
      <div className={`mb-5 p-4 rounded-xl border flex items-center gap-3 ${statusBg[overallStatus]}`}>
        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${statusDot[overallStatus]} ${overallStatus !== "healthy" ? "animate-pulse" : ""}`} />
        <div>
          <p className={`text-sm font-bold capitalize ${statusText[overallStatus]}`}>
            System {overallStatus === "healthy" ? "Operational" : overallStatus === "degraded" ? "Degraded" : overallStatus === "down" ? "Down" : "Status Unknown"}
          </p>
          <p className="text-xs text-muted-foreground">
            {healthyCt} healthy · {degradedCt} degraded · {downCt} down
            {lastRun && <span className="ml-2">Last check: {moment(lastRun).fromNow()}</span>}
          </p>
        </div>
      </div>

      {/* Service grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {services.map(svc => {
          const status = getStatus(svc.id);
          const meta = getMeta(svc.id);
          return (
            <Card key={svc.id} className={`p-4 border ${statusBg[status]}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${statusDot[status]} ${running ? "animate-pulse" : ""}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{svc.label}</p>
                    <p className="text-xs text-muted-foreground">{svc.description}</p>
                    {meta.metadata?.status_message && (
                      <p className="text-xs text-amber-700 mt-1">{meta.metadata.status_message}</p>
                    )}
                    {meta.metadata?.note && (
                      <p className="text-xs text-muted-foreground mt-1">{meta.metadata.note}</p>
                    )}
                    {meta.error_message && (
                      <p className="text-xs text-red-600 mt-1">{meta.error_message}</p>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <Badge variant="outline" className={`text-[10px] capitalize ${statusText[status]}`}>{status}</Badge>
                  {meta.response_time_ms && <p className="text-[10px] text-muted-foreground mt-1">{meta.response_time_ms}ms</p>}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* History */}
      {checks.length > 0 && (
        <Card className="p-4 border border-border/60">
          <p className="text-xs font-bold text-muted-foreground uppercase mb-3">Recent Check History</p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {checks.sort((a,b) => new Date(b.checked_at) - new Date(a.checked_at)).map(c => (
              <div key={c.id} className="flex items-center justify-between text-xs py-1 border-b border-border/30 last:border-0">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${statusDot[c.status]}`} />
                  <span className="font-medium capitalize">{c.service?.replace(/_/g," ")}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  {c.response_time_ms && <span>{c.response_time_ms}ms</span>}
                  <span>{moment(c.checked_at).fromNow()}</span>
                  <Badge variant="outline" className={`text-[9px] capitalize ${statusText[c.status]}`}>{c.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {checks.length === 0 && !running && (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <Shield className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground mb-3">No health checks run yet.</p>
          <Button size="sm" onClick={runHealthCheck}>Run First Health Check</Button>
        </div>
      )}
    </div>
  );
}