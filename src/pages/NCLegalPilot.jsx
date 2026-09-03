import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FolderOpen, GitCommitHorizontal, Scale, Shield } from "lucide-react";
import { legalPilotGateway } from "@/api/pilotGateways";
import LegalDisclaimer from "@/components/legal/LegalDisclaimer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { isLegalAccessAllowed, PAYMENT_CONFIG, PILOT_SEAT_LIMIT } from "@/lib/pilotFlow";

const tools = [
  { label: "Case files", path: "/cases", icon: FolderOpen },
  { label: "Evidence", path: "/evidence", icon: Shield },
  { label: "Timeline", path: "/case-timeline", icon: GitCommitHorizontal },
  { label: "Authority and Canon", path: "/jurisengine", icon: Scale },
];

export default function NCLegalPilot() {
  const [state, setState] = useState({ loading: true, allowed: false, error: "" });

  useEffect(() => {
    let active = true;
    legalPilotGateway.getAccess()
      .then((result) => active && setState({ loading: false, allowed: isLegalAccessAllowed(result), error: "" }))
      .catch(() => active && setState({ loading: false, allowed: false, error: "Access could not be verified." }));
    return () => { active = false; };
  }, []);

  if (state.loading) return <div className="flex h-64 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;

  return (
    <div className="mx-auto max-w-4xl py-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Founder-only pilot</p>
      <h1 className="mt-1 text-3xl font-bold">NC Legal</h1>
      <p className="mt-2 text-sm text-muted-foreground">Pilot capacity is limited server-side to {PILOT_SEAT_LIMIT} seats. Enrollment and payments are disabled.</p>
      <div className="my-5"><LegalDisclaimer /></div>
      {!state.allowed ? (
        <Card className="border-red-200 bg-red-50 p-5"><h2 className="font-semibold text-red-900">Access blocked</h2><p className="mt-2 text-sm text-red-800">{state.error || "The backend did not confirm authentication, authorization, an active pilot, available capacity, and the 10-seat limit. Access fails closed."}</p></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">{tools.map(({ label, path, icon: Icon }) => <Card key={path} className="p-5"><Icon className="mb-3 h-6 w-6 text-primary" /><h2 className="font-semibold">{label}</h2><Button asChild className="mt-4 w-full"><Link to={path}>Open</Link></Button></Card>)}</div>
      )}
      <p className="mt-5 text-xs text-muted-foreground">Stripe is disabled. Reserved lookup key: <code>{PAYMENT_CONFIG.ncLegalLookupKey}</code>.</p>
    </div>
  );
}
