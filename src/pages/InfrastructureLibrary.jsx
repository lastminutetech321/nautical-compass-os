import React from "react";
import { Library, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/shared/PageHeader";

const blocks = [
  { name: "Login & Auth", description: "Email/password, Google OAuth, OTP verification, password reset.", status: "active", tags: ["security", "auth"] },
  { name: "User Roles", description: "Admin, manager, member, viewer role system with permission gating.", status: "active", tags: ["security", "rbac"] },
  { name: "Billing", description: "Stripe and Wix Payments integration for subscriptions and one-time payments.", status: "available", tags: ["payments"] },
  { name: "Notifications", description: "In-app, email, WhatsApp, and Telegram notification delivery.", status: "active", tags: ["communication"] },
  { name: "File Upload", description: "Secure file upload with URL storage, type detection, and size validation.", status: "active", tags: ["storage"] },
  { name: "Evidence Vault", description: "Chain-of-custody file management with SHA-256 integrity hashing.", status: "active", tags: ["evidence", "legal"] },
  { name: "AI Chat", description: "Conversational AI interface with context injection and streaming.", status: "active", tags: ["ai", "chat"] },
  { name: "Search", description: "Full-text search across entities with filter and sort capabilities.", status: "active", tags: ["ux"] },
  { name: "Audit Logs", description: "Immutable activity tracking for all entity CRUD operations.", status: "active", tags: ["compliance", "security"] },
  { name: "Reporting", description: "Charts, metrics, and exportable data summaries.", status: "active", tags: ["analytics"] },
  { name: "Calendar", description: "Date-based event scheduling and timeline visualization.", status: "available", tags: ["scheduling"] },
  { name: "Case Timeline", description: "Chronological event reconstruction with confidence levels.", status: "active", tags: ["legal", "evidence"] },
  { name: "Client Portal", description: "External-facing organization and contact management.", status: "active", tags: ["crm"] },
  { name: "Admin Dashboard", description: "Metrics overview, user management, and system health.", status: "active", tags: ["admin"] },
];

const statusConfig = {
  active: { label: "Active in NCOS", className: "bg-emerald-50 text-emerald-700 border-emerald-200 border" },
  available: { label: "Available to use", className: "bg-blue-50 text-blue-700 border-blue-200 border" },
  planned: { label: "Planned", className: "bg-slate-50 text-slate-500 border border-slate-200" },
};

export default function InfrastructureLibrary() {
  return (
    <div>
      <PageHeader title="Infrastructure Library" subtitle="Reusable building blocks for every platform we build" />
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 mb-6 text-xs text-blue-700">
        These blocks are production-ready and can be composed into any internal or client-facing platform built on Nautical Compass OS.
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {blocks.map(block => {
          const config = statusConfig[block.status] || statusConfig.planned;
          return (
            <Card key={block.name} className="p-4 border border-border/60 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Library className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-sm font-semibold">{block.name}</p>
                </div>
                <Badge className={`text-[10px] flex-shrink-0 ${config.className}`}>{config.label}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{block.description}</p>
              <div className="flex flex-wrap gap-1">
                {block.tags.map(tag => <Badge key={tag} variant="secondary" className="text-[10px] px-1.5">{tag}</Badge>)}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}