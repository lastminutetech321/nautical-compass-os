import { AlertTriangle, BookOpen, Scale } from "lucide-react";
import LegalDisclaimer from "@/components/legal/LegalDisclaimer";
import { Card } from "@/components/ui/card";

export default function JurisEngine() {
  return (
    <div className="mx-auto max-w-3xl py-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">NCOS · Legal AI</p>
      <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold"><Scale className="h-6 w-6 text-amber-500" />Authority and Canon tools</h1>
      <p className="mt-2 text-sm text-muted-foreground">Canon-backed research and saved research memos are intentionally disabled.</p>

      <Card className="my-5 border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-none text-amber-700" />
          <div>
            <h2 className="font-semibold text-amber-950">Not available in this internal pilot</h2>
            <p className="mt-2 text-sm text-amber-900">The current backend contract does not provide Canon status, research memo listing, or Canon analysis operations. These features will remain unavailable rather than using direct entity access or an invented replacement.</p>
          </div>
        </div>
      </Card>

      <div className="mb-5 flex items-center gap-2 text-sm text-muted-foreground"><BookOpen className="h-4 w-4" />Missing backend operations: Canon status, memo retrieval, and authority analysis.</div>
      <LegalDisclaimer />
    </div>
  );
}
