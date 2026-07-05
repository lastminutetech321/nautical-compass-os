import React from "react";
import { Zap, CheckCircle, Clock, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/shared/PageHeader";

const capabilities = [
  { id: "invoke_llm", name: "Invoke LLM", description: "Call any AI language model with a prompt and receive structured or text responses.", status: "active", category: "AI", provider: "Built-in" },
  { id: "upload_file", name: "Upload File", description: "Upload any file type to secure cloud storage and receive a URL.", status: "active", category: "Storage", provider: "Built-in" },
  { id: "extract_data", name: "Extract Data from Files", description: "Parse and extract structured data from CSV, Excel, PDF, and image files.", status: "active", category: "AI", provider: "Built-in" },
  { id: "send_email", name: "Send Email", description: "Send transactional or notification emails to any address.", status: "active", category: "Communication", provider: "Built-in" },
  { id: "generate_image", name: "Generate Image", description: "Create AI-generated images from text prompts.", status: "active", category: "AI", provider: "Built-in" },
  { id: "generate_video", name: "Generate Video", description: "Create AI-generated short videos from text prompts.", status: "active", category: "AI", provider: "Built-in" },
  { id: "generate_speech", name: "Generate Speech", description: "Convert text to natural-sounding speech audio.", status: "active", category: "AI", provider: "Built-in" },
  { id: "whatsapp", name: "WhatsApp", description: "Send and receive WhatsApp messages via agents. Connect in Agent settings.", status: "active", category: "Communication", provider: "Built-in" },
  { id: "telegram", name: "Telegram", description: "Create Telegram bot integrations for agent conversations.", status: "active", category: "Communication", provider: "Built-in" },
  { id: "github", name: "GitHub", description: "Access repositories, commits, PRs, and code review workflows.", status: "placeholder", category: "Development", provider: "GitHub API" },
  { id: "stripe", name: "Stripe", description: "Accept payments, manage subscriptions, and handle billing.", status: "placeholder", category: "Finance", provider: "Stripe" },
  { id: "twilio", name: "Twilio", description: "Send SMS, make calls, and manage phone number routing.", status: "placeholder", category: "Communication", provider: "Twilio" },
  { id: "google_workspace", name: "Google Workspace", description: "Integrate with Gmail, Drive, Calendar, Docs, and Sheets.", status: "placeholder", category: "Productivity", provider: "Google" },
  { id: "mercury", name: "Mercury Banking", description: "Read account balances, transactions, and initiate transfers.", status: "placeholder", category: "Finance", provider: "Mercury" },
];

const categoryColors = {
  AI: "bg-violet-50 text-violet-700 border-violet-200",
  Storage: "bg-blue-50 text-blue-700 border-blue-200",
  Communication: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Development: "bg-slate-50 text-slate-700 border-slate-200",
  Finance: "bg-amber-50 text-amber-700 border-amber-200",
  Productivity: "bg-orange-50 text-orange-700 border-orange-200",
};

export default function CapabilityRegistry() {
  const grouped = capabilities.reduce((acc, cap) => {
    if (!acc[cap.category]) acc[cap.category] = [];
    acc[cap.category].push(cap);
    return acc;
  }, {});

  return (
    <div>
      <PageHeader title="Capability Registry" subtitle="Reusable building blocks available to all agents and automations" />
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 mb-6 text-xs text-blue-700">
        Agents request capabilities from this registry instead of hard-coding tools. Active capabilities are immediately available; placeholders require configuration.
      </div>

      <div className="space-y-8">
        {Object.entries(grouped).map(([category, caps]) => (
          <div key={category}>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{category}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {caps.map(cap => (
                <Card key={cap.id} className={`p-4 border transition-shadow hover:shadow-md ${cap.status === "placeholder" ? "opacity-70 border-dashed" : "border-border/60"}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cap.status === "active" ? "bg-primary/10" : "bg-muted"}`}>
                        <Zap className={`w-4 h-4 ${cap.status === "active" ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{cap.name}</p>
                        <p className="text-[10px] text-muted-foreground">{cap.provider}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {cap.status === "active" ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 border text-[10px]"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground"><Clock className="w-3 h-3 mr-1" />Placeholder</Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{cap.description}</p>
                  <Badge variant="outline" className={`mt-2 text-[10px] ${categoryColors[cap.category] || ""}`}>{cap.category}</Badge>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}