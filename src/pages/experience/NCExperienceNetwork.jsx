import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Building2, Star, Calendar, BarChart3, Users, MapPin, TrendingUp, Loader2, DollarSign, Award, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function NCExperienceNetwork() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.functions.invoke("ncExperienceNetwork", { operation: "dashboard" })
      .then(res => setData(res.data))
      .catch(() => setData({ venues: { total: 0 }, providers: { total: 0 }, events: { total: 0 }, revenue: { total_event_revenue: 0 }, reports: 0 }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const modules = [
    { title: "Venue Optimization", desc: "Evaluate spaces and identify event revenue potential", icon: Building2, path: "/experience/venues", color: "text-blue-500" },
    { title: "Event Readiness Score", desc: "Measure readiness across 15 operational criteria", icon: Shield, path: "/experience/readiness", color: "text-green-500" },
    { title: "Provider Profiles", desc: "Marketplace for promoters, DJs, techs, security, and more", icon: Users, path: "/experience/providers", color: "text-violet-500" },
    { title: "Event Operations Room", desc: "Shared live workspace with role-based views", icon: Calendar, path: "/experience/operations", color: "text-orange-500" },
    { title: "Event Intelligence", desc: "Post-event reports with revenue impact and recommendations", icon: BarChart3, path: "/experience/intelligence", color: "text-amber-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NC Experience Network</p>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Star className="w-6 h-6 text-amber-500" />NC Experience Network
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Turn underutilized spaces into event-capable venues. Reveal value. Protect implementation.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Venues", value: data?.venues?.total || 0, sub: `${data?.venues?.event_ready || 0} event-ready`, icon: Building2, color: "text-blue-500" },
          { label: "Providers", value: data?.providers?.total || 0, sub: `${data?.providers?.verified || 0} verified`, icon: Users, color: "text-violet-500" },
          { label: "Events", value: data?.events?.total || 0, sub: `${data?.events?.completed || 0} completed`, icon: Calendar, color: "text-orange-500" },
          { label: "Event Revenue", value: `$${(data?.revenue?.total_event_revenue || 0).toLocaleString()}`, sub: `$${(data?.revenue?.total_profit || 0).toLocaleString()} profit`, icon: DollarSign, color: "text-emerald-500" }
        ].map(s => (
          <Card key={s.label} className="p-4 border border-border/60">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">{s.label}</p>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className="text-2xl font-black">{s.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{s.sub}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map(m => (
          <Link key={m.title} to={m.path}>
            <Card className="p-5 border border-border/60 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer h-full">
              <div className="flex items-start gap-3 mb-2">
                <div className="p-2 rounded-lg bg-muted">
                  <m.icon className={`w-5 h-5 ${m.color}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{m.title}</h3>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{m.desc}</p>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="p-4 border border-amber-200 bg-amber-50">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-600" />
          <p className="text-xs font-semibold text-amber-800 uppercase">Trade Secret Protection</p>
        </div>
        <p className="text-sm text-amber-900 mt-1.5">Reveal value. Protect implementation. Internal algorithms, marketplace ranking logic, trust scoring, and optimization formulas are never exposed to public users.</p>
      </Card>
    </div>
  );
}