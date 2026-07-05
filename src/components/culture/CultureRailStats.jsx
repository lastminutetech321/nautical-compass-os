import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Users, Music, Radio, DollarSign, Rss, Zap, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

const METRIC_CONFIG = {
  artists:          { label: "Artists",        icon: Users,       fmt: (v) => v.toLocaleString() },
  releases:         { label: "Releases",        icon: Music,       fmt: (v) => v.toLocaleString() },
  community_members:{ label: "Community",       icon: Users,       fmt: (v) => v >= 1000 ? `${(v/1000).toFixed(1)}K` : v.toLocaleString() },
  radio_spins:      { label: "Radio Spins",     icon: Radio,       fmt: (v) => v >= 1000 ? `${(v/1000).toFixed(1)}K` : v.toLocaleString() },
  revenue:          { label: "Revenue",         icon: DollarSign,  fmt: (v) => `$${v >= 1000 ? `${(v/1000).toFixed(1)}K` : v.toLocaleString()}` },
  subscribers:      { label: "Subscribers",     icon: Rss,         fmt: (v) => v >= 1000 ? `${(v/1000).toFixed(1)}K` : v.toLocaleString() },
  streams:          { label: "Streams",         icon: Zap,         fmt: (v) => v >= 1000 ? `${(v/1000).toFixed(1)}K` : v.toLocaleString() },
  events:           { label: "Events",          icon: Zap,         fmt: (v) => v.toLocaleString() },
  partners:         { label: "Partners",        icon: Users,       fmt: (v) => v.toLocaleString() },
};

const PRIORITY_METRICS = ["artists","releases","community_members","radio_spins","revenue","subscribers"];

export default function CultureRailStats({ compact = false }) {
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.CultureRailData.list("-created_date", 50)
      .then(data => { setMetrics(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return null;

  // Aggregate by metric_type (sum)
  const aggregated = {};
  for (const m of metrics) {
    if (!aggregated[m.metric_type]) aggregated[m.metric_type] = 0;
    aggregated[m.metric_type] += m.value || 0;
  }

  const hasData = Object.keys(aggregated).length > 0;

  if (!hasData) {
    return (
      <div className="rounded-xl p-4 text-center" style={{ background: "rgba(201,151,58,0.08)", border: "1px solid rgba(201,151,58,0.2)" }}>
        <AlertTriangle className="w-5 h-5 mx-auto mb-2" style={{ color: "#c9973a", opacity: 0.7 }} />
        <p className="text-xs font-semibold mb-1" style={{ color: "#c9973a" }}>No live data yet</p>
        <p className="text-[10px] opacity-50" style={{ color: "#f5e9c8" }}>
          Add artist, release, and revenue records to see real metrics here.
        </p>
        <p className="text-[9px] mt-2 opacity-40" style={{ color: "#c9973a" }}>
          Numbers shown are placeholders until real data is connected.
        </p>
      </div>
    );
  }

  const toShow = compact ? PRIORITY_METRICS.slice(0, 4) : PRIORITY_METRICS;

  return (
    <div className={`grid gap-3 ${compact ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3"}`}>
      {toShow.map(key => {
        const cfg = METRIC_CONFIG[key];
        const val = aggregated[key];
        const Icon = cfg.icon;
        if (val === undefined) return null;
        return (
          <div key={key} className="rounded-xl p-3 text-center" style={{ background: "rgba(201,151,58,0.08)", border: "1px solid rgba(201,151,58,0.15)" }}>
            <Icon className="w-4 h-4 mx-auto mb-1" style={{ color: "#c9973a", opacity: 0.8 }} />
            <p className="text-lg font-black" style={{ color: "#e8b84b" }}>{cfg.fmt(val)}</p>
            <p className="text-[9px] uppercase tracking-widest opacity-50" style={{ color: "#f5e9c8" }}>{cfg.label}</p>
          </div>
        );
      })}
    </div>
  );
}