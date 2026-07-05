import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Crown, Bot, Hammer, Zap, Brain, Shield, TrendingUp, BookOpen,
  Sparkles, LogOut, Compass, ChevronDown, ChevronRight, Menu, X,
  FolderKanban, Building2, FileText, Activity, Settings, Library, Music,
  Bell, Map, FolderOpen, ClipboardList, Server, Scale, Briefcase, Factory, Store, Network, HeartHandshake, Wallet, Dna, Navigation
} from "lucide-react";
import { base44 } from "@/api/base44Client";

const navGroups = [
  {
    label: "Executive Intelligence",
    icon: Crown,
    color: "text-amber-400",
    items: [
      { label: "🧭 Daily Compass", path: "/" },
      { label: "🧭 Director Assistant", path: "/director-assistant" },
      { label: "👑 Executive Command", path: "/executive-command" },
      { label: "👑 Founder Dashboard", path: "/founder-dashboard" },
      { label: "🔀 Critical Path", path: "/critical-path" },
      { label: "🤖 Resource Allocation", path: "/resource-allocation" },
      { label: "🧠 Mission Control v2", path: "/mission-control" },
      { label: "🧬 NIOC — Intelligence Ops", path: "/nc-intelligence-ops" },
      { label: "🛰️ Build NC — Orchestrator", path: "/build-nc" },
      { label: "🏢 NOOS — Org Operating System", path: "/noos" },
      { label: "🧬 NAIL — Autonomous Intelligence", path: "/nail" },
      { label: "💬 NCICE — Intelligence & Comms Engine", path: "/ncice" },
      { label: "⚡ Execution Command", path: "/execution" },
      { label: "🔮 Enterprise Simulator", path: "/enterprise-simulator" },
      { label: "🎓 Engineering Academy", path: "/engineering-academy" },
    ]
  },
  {
    label: "AI Workforce",
    icon: Bot,
    color: "text-violet-400",
    items: [
      { label: "AI Employees", path: "/workforce" },
      { label: "🧠 Founder Brain", path: "/founder-brain" },
      { label: "🏛 Executive AI Workforce", path: "/executive-workforce" },
      { label: "Agent Roster", path: "/agent-roster" },
      { label: "Agent Work Queue", path: "/agent-queue" },
      { label: "Agent Center", path: "/agents" },
      { label: "Capabilities", path: "/capabilities" },
    ]
  },
  {
    label: "Build Studio",
    icon: Hammer,
    color: "text-blue-400",
    items: [
      { label: "Build Registry", path: "/build-registry" },
      { label: "🗺 Product Roadmap", path: "/roadmap" },
      { label: "Build Projects", path: "/build-studio" },
      { label: "Sprint Board", path: "/sprint-board" },
      { label: "Feature Builder", path: "/features" },
      { label: "Blueprints", path: "/blueprints" },
      { label: "🏭 Blueprint Factory", path: "/blueprint-factory" },
      { label: "🖨️ Clone Engine", path: "/clone-engine" },
      { label: "Infrastructure", path: "/infrastructure" },
      { label: "🎯 Build Director", path: "/build-director" },
    ]
  },
  {
    label: "Evidence Command",
    icon: Shield,
    color: "text-red-400",
    items: [
      { label: "Case Files", path: "/cases" },
      { label: "Evidence Vault", path: "/evidence" },
      { label: "📋 Checklist Engine", path: "/evidence-checklist" },
      { label: "Video Review", path: "/video-evidence" },
      { label: "Case Timeline", path: "/case-timeline" },
      { label: "Witnesses", path: "/witnesses" },
      { label: "Legal Issues", path: "/legal-issues" },
      { label: "FOIA Tracker", path: "/foia" },
    ]
  },
  {
    label: "Knowledge Graph",
    icon: Brain,
    color: "text-cyan-400",
    items: [
      { label: "Knowledge Graph", path: "/knowledge" },
      { label: "🧠 NC Intelligence", path: "/nc-intelligence" },
      { label: "📓 Development Memory", path: "/nc-dev-memory" },
      { label: "💾 NCOS Memory", path: "/ncos-memory" },
    ]
  },
  {
    label: "Automation",
    icon: Zap,
    color: "text-emerald-400",
    items: [
      { label: "Automation Center", path: "/automations" },
    ]
  },
  {
    label: "Resource Compass",
    icon: Compass,
    color: "text-cyan-400",
    items: [
      { label: "🧭 Resource Compass", path: "/resource-compass" },
      { label: "🔍 Resource Search", path: "/resource-search" },
      { label: "🧮 Eligibility Engine", path: "/resource-eligibility" },
      { label: "👥 Case Manager", path: "/resource-cases" },
      { label: "📋 Application Tracker", path: "/resource-applications" },
      { label: "🗂 Benefit Planner", path: "/resource-planner" },
      { label: "📁 Document Checklist", path: "/resource-docs" },
      { label: "📅 Appointments", path: "/resource-appointments" },
      { label: "⏰ Deadline Engine", path: "/resource-reminders" },
    ]
  },
  {
    label: "Culture Rail",
    icon: Music,
    color: "text-violet-400",
    items: [
      { label: "🎵 Culture Rail", path: "/culture-rail" },
    ]
  },
  {
    label: "Enterprise CRM",
    icon: TrendingUp,
    color: "text-rose-400",
    items: [
      { label: "🏦 CRM Command", path: "/crm" },
      { label: "🎯 Sales Pipeline", path: "/crm-pipeline" },
      { label: "👤 Leads", path: "/crm-leads" },
      { label: "🏢 Contacts & Orgs", path: "/crm-contacts" },
      { label: "💰 Revenue", path: "/crm-revenue" },
      { label: "🤝 Partners", path: "/crm-partners" },
      { label: "💬 Communications", path: "/crm-communications" },
    ]
  },
  {
    label: "Business Ops",
    icon: TrendingUp,
    color: "text-orange-400",
    items: [
      { label: "Projects", path: "/projects" },
      { label: "Clients", path: "/clients" },
      { label: "Team", path: "/team" },
      { label: "Documents", path: "/documents" },
      { label: "Activity Log", path: "/activity" },
    ]
  },
  {
    label: "Workforce Rail",
    icon: Briefcase,
    color: "text-orange-400",
    items: [
      { label: "⚙️ Workforce Hub", path: "/workforce" },
      { label: "👤 Worker Profiles", path: "/workforce/profiles" },
      { label: "🎓 Skills & Certs", path: "/workforce/skills" },
      { label: "📄 Resume Builder", path: "/workforce/resume" },
      { label: "📅 Scheduling", path: "/workforce/schedule" },
      { label: "📝 Contracts", path: "/workforce/contracts" },
      { label: "⏱ Time Tracking", path: "/workforce/time" },
      { label: "🧾 Invoices", path: "/workforce/invoices" },
      { label: "🏗 Vendor Registry", path: "/workforce/vendors" },
      { label: "✊ Union Tracking", path: "/workforce/unions" },
      { label: "🎯 Gig Marketplace", path: "/workforce/gigs" },
      { label: "📚 Training Library", path: "/workforce/training" },
      { label: "🗺 Career Planner", path: "/workforce/career" },
      { label: "🔗 Opportunity Matching", path: "/workforce/matching" },
      { label: "⭐ Ratings", path: "/workforce/ratings" },
      { label: "⚠️ Safety Reports", path: "/workforce/safety" },
      { label: "💰 Payroll Dashboard", path: "/workforce/payroll" },
      { label: "📈 Income Forecast", path: "/workforce/income" },
      { label: "🎯 Executive Dashboard", path: "/workforce/dashboard" },
    ]
  },
  {
    label: "Authority Compass",
    icon: Shield,
    color: "text-indigo-400",
    items: [
      { label: "🏛 Authority Compass", path: "/authority/compass" },
      { label: "📥 Log Interaction", path: "/authority/intake" },
      { label: "📅 Timeline", path: "/authority/timeline" },
      { label: "✅ Validation Engine", path: "/authority/validation" },
      { label: "🗂 Evidence Checklist", path: "/authority/evidence" },
      { label: "📄 Document Requests", path: "/authority/documents" },
      { label: "🔍 FOIA Requests", path: "/authority/foia" },
      { label: "📝 Complaint Builder", path: "/authority/complaints" },
      { label: "📊 Appeal Tracker", path: "/authority/appeals" },
      { label: "🔺 Escalation Planner", path: "/authority/escalation" },
      { label: "👁 Public Accountability", path: "/authority/accountability" },
      { label: "🎯 Executive Dashboard", path: "/authority/dashboard" },
    ]
  },
  {
    label: "Culture Rail",
    icon: Music,
    color: "text-amber-400",
    items: [
      { label: "🎭 Culture Hub", path: "/culture" },
      { label: "🎧 Streaming", path: "/culture-rail" },
      { label: "🎤 Artists", path: "/culture/artists" },
      { label: "💿 Albums", path: "/culture/albums" },
      { label: "🎵 Songs", path: "/culture/songs" },
      { label: "✨ Creators", path: "/culture/creators" },
      { label: "🎙 Podcasts", path: "/culture/podcasts" },
      { label: "📹 Videos", path: "/culture/videos" },
      { label: "📅 Events", path: "/culture/calendar" },
      { label: "🛍 Merch", path: "/culture/merch" },
      { label: "👥 Communities", path: "/culture/community-dashboard" },
      { label: "⭐ Fan Clubs", path: "/culture/fan-clubs" },
      { label: "📻 Radio", path: "/culture/radio" },
      { label: "📋 Playlists", path: "/culture/playlists" },
      { label: "📄 Licensing", path: "/culture/licensing" },
      { label: "💰 Royalties", path: "/culture/royalties" },
      { label: "🏪 Marketplace", path: "/culture/marketplace" },
      { label: "📢 Advertising", path: "/culture/advertising" },
      { label: "📊 Analytics", path: "/culture/analytics" },
      { label: "🛡 Verification", path: "/culture/profiles" },
      { label: "👑 Executive", path: "/culture/executive" },
    ]
  },
  {
    label: "JurisEngine",
    icon: BookOpen,
    color: "text-amber-400",
    items: [
      { label: "⚖️ JurisEngine", path: "/jurisengine" },
      { label: "🧪 Test Library", path: "/juris-tests" },
      { label: "🧭 Decision Compass", path: "/decision-compass" },
    ]
  },
  {
    label: "Business Platform",
    icon: FolderKanban,
    color: "text-emerald-400",
    items: [
      { label: "Business Platform", path: "/business-platform" },
    ]
  },
  {
    label: "Architecture",
    icon: Library,
    color: "text-slate-300",
    items: [
      { label: "Founder Vision", path: "/founder-vision" },
      { label: "NC Canon", path: "/canon" },
      { label: "📥 Canon Import", path: "/canon-ingestion" },
      { label: "📋 Import Queue", path: "/canon-import-queue" },
      { label: "🔗 JurisEngine Deps", path: "/canon-juris-deps" },
      { label: "🏗 Entry Builder", path: "/canon-entry-builder" },
      { label: "⚠️ Gap Resolver", path: "/canon-gap-resolver" },
      { label: "✅ Review Queue", path: "/canon-review" },
      { label: "🛡 Verification Engine", path: "/canon-verification" },
      { label: "📊 Coverage Map", path: "/canon-dashboard" },
      { label: "AI Services", path: "/ai-services" },
      { label: "Applications", path: "/applications" },
    ]
  },
  {
    label: "Self Improvement",
    icon: Sparkles,
    color: "text-yellow-400",
    items: [
      { label: "🚀 Activation Center", path: "/activation" },
      { label: "🧭 EvoSystem", path: "/evosystem" },
      { label: "🧠 Self-Governance", path: "/self-governance" },
      { label: "⚡ Autonomous Improvement", path: "/autonomous-improvement" },
      { label: "📊 Diagnosis", path: "/diagnosis" },
      { label: "💰 Survival", path: "/survival" },
      { label: "🧬 NCOS Memory", path: "/ncos-memory" },
      { label: "🕸️ Technical Debt", path: "/technical-debt" },
      { label: "Idea Engine", path: "/self-improvement" },
      { label: "AI Assistant", path: "/ai" },
    ]
  },
  {
    label: "Enterprise",
    icon: Building2,
    color: "text-indigo-400",
    items: [
      { label: "🏢 Enterprise Orgs", path: "/enterprise" },
      { label: "🔔 Notifications", path: "/notifications" },
      { label: "🛡 Audit Log", path: "/audit-log" },
      { label: "❤ Health Monitor", path: "/health" },
      { label: "⚙ Platform Config", path: "/platform-config" },
    ]
  },
  {
    label: "Payment Fabric",
    icon: Wallet,
    color: "text-emerald-400",
    items: [
      { label: "💰 Payment Fabric", path: "/payment-fabric" },
      { label: "🏦 Payout Center", path: "/payouts" },
      { label: "✨ Contribution Economy", path: "/contribution-economy" },
      { label: "🧪 Payment Sandbox", path: "/payment-sandbox" },
      { label: "✅ Verification Center", path: "/payment-verification" },
      { label: "🔗 Webhook Testing", path: "/webhook-testing" },
    ]
  },
  {
    label: "Marketplace",
    icon: Store,
    color: "text-cyan-400",
    items: [
      { label: "🛒 Enterprise Marketplace", path: "/enterprise-marketplace" },
      { label: "🌐 Global Operations", path: "/global-operations" },
      { label: "🤝 NC Customer Success", path: "/customer-success" },
      { label: "💰 NC Financial Intelligence", path: "/financial-intelligence" },
      { label: "🧬 NC Evolution Engine", path: "/evolution-engine" },
    ]
  },
  {
    label: "NC Workforce Gateway",
    icon: Briefcase,
    color: "text-teal-400",
    items: [
      { label: "🚪 Workforce Gateway", path: "/workforce-gateway" },
      { label: "🤝 Talent Partnership", path: "/talent-partnership" },
      { label: "📋 Director Workspace", path: "/workforce-director" },
      { label: "🛡 Industry Templates", path: "/workforce-templates" },
    ]
  },
  {
    label: "NC Experience Network",
    icon: Sparkles,
    color: "text-pink-400",
    items: [
      { label: "⭐ Experience Network", path: "/experience" },
      { label: "🏢 Venue Optimization", path: "/experience/venues" },
      { label: "🛡 Event Readiness", path: "/experience/readiness" },
      { label: "👥 Provider Profiles", path: "/experience/providers" },
      { label: "📅 Operations Room", path: "/experience/operations" },
      { label: "📊 Event Intelligence", path: "/experience/intelligence" },
    ]
  },
  {
    label: "Knowledge Graph",
    icon: Network,
    color: "text-violet-400",
    items: [
      { label: "🕸️ NC Knowledge Graph", path: "/knowledge-graph" },
      { label: "🔗 NC Dependency Engine", path: "/dependency-engine" },
      { label: "📋 NC Project Director", path: "/project-director" },
      { label: "🧠 NC Intelligence", path: "/nc-intelligence" },
    ]
  },
  {
    label: "System",
    icon: Settings,
    color: "text-slate-400",
    items: [
      { label: "Settings", path: "/settings" },
    ]
  }
];

function NavGroup({ group, isActive, closeMenu }) {
  const [open, setOpen] = useState(true);
  const GroupIcon = group.icon;
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-2 py-1.5 rounded-md hover:bg-sidebar-accent/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <GroupIcon className={`w-3.5 h-3.5 flex-shrink-0 ${group.color}`} />
          <span className="text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/50">{group.label}</span>
        </div>
        {open ? <ChevronDown className="w-3 h-3 text-sidebar-foreground/30" /> : <ChevronRight className="w-3 h-3 text-sidebar-foreground/30" />}
      </button>
      {open && (
        <div className="mt-0.5 space-y-0.5 pl-2">
          {group.items.map(item => {
            const active = item.path === "/" ? isActive("/") : isActive(item.path);
            return (
              <Link
                key={item.path + item.label}
                to={item.path}
                onClick={closeMenu}
                className={`flex items-center px-3 py-1.5 rounded-md text-sm transition-all duration-150 ${
                  active
                    ? "bg-sidebar-primary text-white font-medium"
                    : "text-sidebar-foreground/60 hover:text-white hover:bg-sidebar-accent"
                }`}
              >
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const SidebarContent = ({ closeMenu = () => {} }) => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 h-14 border-b border-sidebar-border flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-sidebar-primary flex items-center justify-center flex-shrink-0">
            <Compass className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-white leading-none">NCOS</p>
            <p className="text-[9px] text-sidebar-foreground/40 leading-none mt-0.5">Operating System</p>
          </div>
        </div>
        {mobileOpen && (
          <button onClick={closeMenu} className="text-sidebar-foreground/60 hover:text-white lg:hidden">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 py-3 px-2 space-y-2 overflow-y-auto">
        {navGroups.map(group => (
          <NavGroup key={group.label} group={group} isActive={isActive} closeMenu={closeMenu} />
        ))}
      </nav>

      <div className="px-2 pb-3 border-t border-sidebar-border pt-2 flex-shrink-0">
        <button
          onClick={() => base44.auth.logout("/login")}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground/60 hover:text-white hover:bg-sidebar-accent transition-all w-full"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 w-9 h-9 rounded-lg bg-sidebar text-white flex items-center justify-center shadow-lg"
      >
        <Menu className="w-5 h-5" />
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
        </div>
      )}

      <aside className={`lg:hidden fixed top-0 left-0 h-screen w-72 bg-sidebar text-sidebar-foreground z-50 transform transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <SidebarContent closeMenu={() => setMobileOpen(false)} />
      </aside>

      <aside className="hidden lg:flex fixed top-0 left-0 h-screen w-[220px] bg-sidebar text-sidebar-foreground flex-col z-40">
        <SidebarContent />
      </aside>
    </>
  );
}