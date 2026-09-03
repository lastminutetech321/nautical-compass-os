import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { legalPilotGateway } from "@/api/pilotGateways";
import { isLegalAccessAllowed } from "@/lib/pilotFlow";

export default function LegalPilotGuard() {
  const [state, setState] = useState({ loading: true, allowed: false });

  useEffect(() => {
    let active = true;
    legalPilotGateway.getAccess()
      .then((result) => active && setState({ loading: false, allowed: isLegalAccessAllowed(result) }))
      .catch(() => active && setState({ loading: false, allowed: false }));
    return () => { active = false; };
  }, []);

  if (state.loading) return <div className="flex h-64 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  if (!state.allowed) return <Navigate to="/nc-legal" replace />;
  return <Outlet />;
}
