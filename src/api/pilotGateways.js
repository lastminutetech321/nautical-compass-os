import { base44 } from "@/api/base44Client";
import { createPilotGateways } from "@/lib/pilotContracts";

const gateways = createPilotGateways({
  invoke: (name, payload) => base44.functions.invoke(name, payload),
  uploadPrivateFile: (payload) => base44.integrations.Core.UploadPrivateFile(payload),
});

export const accountEntryGateway = gateways.accountEntryGateway;
export const legalPilotGateway = gateways.legalPilotGateway;
export { getMyCaseCollection, listFrom } from "@/lib/pilotContracts";
