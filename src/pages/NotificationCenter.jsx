import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Bell, CheckCheck, Trash2, AlertTriangle, CheckCircle, Info, DollarSign, Bot, BookOpen, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import moment from "moment";

const typeIcon = {
  info: Info, success: CheckCircle, warning: AlertTriangle, error: AlertTriangle,
  approval_needed: Zap, canon_gap: BookOpen, revenue_alert: DollarSign,
  build_blocked: AlertTriangle, agent_alert: Bot, system: Bell,
};
const typeColor = {
  info: "text-blue-600 bg-blue-50 border-blue-200",
  success: "text-emerald-600 bg-emerald-50 border-emerald-200",
  warning: "text-amber-600 bg-amber-50 border-amber-200",
  error: "text-red-600 bg-red-50 border-red-200",
  approval_needed: "text-violet-600 bg-violet-50 border-violet-200",
  canon_gap: "text-amber-600 bg-amber-50 border-amber-200",
  revenue_alert: "text-emerald-600 bg-emerald-50 border-emerald-200",
  build_blocked: "text-red-600 bg-red-50 border-red-200",
  agent_alert: "text-violet-600 bg-violet-50 border-violet-200",
  system: "text-slate-600 bg-slate-50 border-slate-200",
};

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [readFilter, setReadFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.Notification.list("-created_date", 200).catch(() => []);
    setNotifications(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const markRead = async (n) => {
    await base44.entities.Notification.update(n.id, { read: true, read_at: new Date().toISOString() });
    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { read: true, read_at: new Date().toISOString() })));
    setNotifications(prev => prev.map(x => ({ ...x, read: true })));
  };

  const deleteN = async (n) => {
    await base44.entities.Notification.delete(n.id);
    setNotifications(prev => prev.filter(x => x.id !== n.id));
  };

  const createSample = async () => {
    const samples = [
      { title: "Canon Gap Detected", message: "NC Canon has zero verified entries. JurisEngine is non-functional.", type: "canon_gap", severity: "critical", action_url: "/canon-ingestion", action_label: "Add Canon Entries" },
      { title: "Zero MRR Alert", message: "Platform has no active subscriptions. Revenue activation required.", type: "revenue_alert", severity: "critical", action_url: "/business-platform", action_label: "Activate Revenue" },
      { title: "3 Builds Blocked", message: "JurisEngine, Resource Compass builds are blocked. Review dependencies.", type: "build_blocked", severity: "high", action_url: "/build-registry", action_label: "View Build Registry" },
      { title: "Approval Required", message: "Revenue engine activation requires founder approval.", type: "approval_needed", severity: "high", action_url: "/self-governance", action_label: "Review Approval" },
      { title: "Self-Diagnosis Complete", message: "9 issues found, 6 improvement items created. Review recommended.", type: "info", severity: "medium", action_url: "/diagnosis", action_label: "View Report" },
    ];
    await Promise.all(samples.map(s => base44.entities.Notification.create(s)));
    load();
  };

  const filtered = notifications.filter(n => {
    if (filter !== "all" && n.type !== filter) return false;
    if (readFilter === "unread" && n.read) return false;
    if (readFilter === "read" && !n.read) return false;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;
  const critCount = notifications.filter(n => n.severity === "critical" && !n.read).length;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Platform Intelligence</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" />Notification Center
            {unreadCount > 0 && <span className="ml-1 w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">{unreadCount}</span>}
          </h1>
          <p className="text-sm text-muted-foreground">Platform alerts, approvals needed, and intelligence signals</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {unreadCount > 0 && (
            <Button size="sm" variant="outline" onClick={markAllRead} className="gap-1.5 text-xs">
              <CheckCheck className="w-3.5 h-3.5" />Mark All Read
            </Button>
          )}
          {notifications.length === 0 && (
            <Button size="sm" variant="outline" onClick={createSample} className="text-xs">Create Sample Notifications</Button>
          )}
        </div>
      </div>

      {critCount > 0 && (
        <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <strong>{critCount} critical unread notification{critCount > 1 ? "s" : ""} require attention.</strong>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Unread", value: unreadCount, color: unreadCount > 0 ? "text-red-600 bg-red-50" : "text-emerald-600 bg-emerald-50" },
          { label: "Critical", value: notifications.filter(n=>n.severity==="critical").length, color: "text-red-600 bg-red-50" },
          { label: "Approvals Needed", value: notifications.filter(n=>n.type==="approval_needed"&&!n.read).length, color: "text-violet-600 bg-violet-50" },
          { label: "Total", value: notifications.length, color: "text-slate-600 bg-slate-50" },
        ].map(k => (
          <Card key={k.label} className="p-3 border border-border/60">
            <p className="text-xs text-muted-foreground mb-1">{k.label}</p>
            <p className={`text-2xl font-bold ${k.color.split(" ")[0]}`}>{k.value}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="h-8 text-xs w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {["approval_needed","canon_gap","revenue_alert","build_blocked","agent_alert","warning","error","success","info","system"].map(t => (
              <SelectItem key={t} value={t} className="text-xs capitalize">{t.replace(/_/g," ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={readFilter} onValueChange={setReadFilter}>
          <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unread">Unread only</SelectItem>
            <SelectItem value="read">Read only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <Bell className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground">
            {notifications.length === 0 ? "No notifications yet. Run Self-Diagnosis to generate platform alerts." : "No notifications match current filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(n => {
            const Icon = typeIcon[n.type] || Bell;
            const colorClass = typeColor[n.type] || typeColor.info;
            return (
              <Card key={n.id} className={`p-4 border transition-all ${n.read ? "opacity-60 border-border/40" : `border ${colorClass.split(" ")[2]}`}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass.split(" ").slice(1).join(" ")}`}>
                    <Icon className={`w-4 h-4 ${colorClass.split(" ")[0]}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <p className={`text-sm font-semibold ${n.read ? "text-muted-foreground" : ""}`}>{n.title}</p>
                          {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
                          {n.severity && <Badge variant="outline" className={`text-[9px] capitalize ${n.severity==="critical"?"text-red-600 border-red-300":n.severity==="high"?"text-orange-600 border-orange-300":""}`}>{n.severity}</Badge>}
                        </div>
                        {n.message && <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>}
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span className="text-[10px] text-muted-foreground">{moment(n.created_date).fromNow()}</span>
                          {n.action_url && (
                            <Link to={n.action_url} onClick={() => markRead(n)} className="text-[10px] text-primary hover:underline font-medium">{n.action_label || "View →"}</Link>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {!n.read && <button onClick={() => markRead(n)} className="text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-1 rounded hover:bg-muted">Mark read</button>}
                        <button onClick={() => deleteN(n)} className="text-[10px] text-muted-foreground hover:text-red-600 p-1 rounded hover:bg-muted">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}