import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, Music, Users2, Loader2, Star, Megaphone, Store, Calendar, Radio, RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#c9973a", "#8b6f1e", "#f5e9c8", "#d4a942", "#a07820", "#e8d5a0", "#6b5210", "#b8860b"];

export default function CultureExecutiveDashboard() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('cultureEngine', { operation: 'overview', params: {} });
      setOverview(res.data);
    } catch (e) { /* fallback */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const s = overview?.stats || {};
  const revenueBreakdown = [
    { name: "Merch", value: s.totalMerchRev || 0 },
    { name: "Events", value: s.totalEventRev || 0 },
    { name: "Royalties", value: s.totalRoyaltyRev || 0 },
    { name: "Marketplace", value: s.totalMarketRev || 0 },
    { name: "Ads", value: s.totalAdRev || 0 },
    { name: "Fan Clubs", value: s.totalFanClubRev || 0 },
  ].filter(r => r.value > 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto" style={{ background: "linear-gradient(135deg, #0a0a0a 0%, #1a1505 100%)", minHeight: "100vh", padding: "24px" }}>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] font-semibold mb-1" style={{ color: "rgba(201,151,58,0.6)" }}>Culture Rail · Executive</p>
          <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: "#f5e9c8" }}><Star className="w-6 h-6" style={{ color: "#c9973a" }} />Culture Executive Dashboard</h1>
        </div>
        <Button onClick={load} variant="outline" size="sm" style={{ borderColor: "rgba(201,151,58,0.3)", color: "#c9973a" }}><RefreshCw className="w-4 h-4 mr-1.5" />Refresh</Button>
      </div>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#c9973a" }} /></div> : (
        <>
          {/* Top KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { label: "Platform Revenue", value: `$${(s.totalPlatformRev || 0).toLocaleString()}`, icon: DollarSign, highlight: true },
              { label: "Total Streams", value: (s.totalStreams || 0).toLocaleString(), icon: Music },
              { label: "Total Views", value: (s.totalViews || 0).toLocaleString(), icon: TrendingUp },
              { label: "Artists", value: s.artists || 0, icon: Star },
              { label: "Creators", value: s.creators || 0, icon: Users2 },
              { label: "Members", value: (s.totalCommunityMembers || 0).toLocaleString(), icon: Users2 },
            ].map(k => (
              <Card key={k.label} className={`p-3 border ${k.highlight ? "border-2" : ""}`} style={{ background: k.highlight ? "rgba(201,151,58,0.1)" : "rgba(201,151,58,0.05)", borderColor: k.highlight ? "#c9973a" : "rgba(201,151,58,0.2)" }}>
                <k.icon className="w-4 h-4 mb-1" style={{ color: "#c9973a" }} />
                <p className="text-xl font-black" style={{ color: "#f5e9c8" }}>{k.value}</p>
                <p className="text-[10px]" style={{ color: "rgba(201,151,58,0.5)" }}>{k.label}</p>
              </Card>
            ))}
          </div>

          {/* Revenue Breakdown Chart */}
          {revenueBreakdown.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="p-4 border" style={{ background: "rgba(201,151,58,0.03)", borderColor: "rgba(201,151,58,0.15)" }}>
                <p className="text-xs font-bold mb-3" style={{ color: "#f5e9c8" }}>Revenue by Stream</p>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={revenueBreakdown}>
                    <XAxis dataKey="name" tick={{ fill: "rgba(201,151,58,0.5)", fontSize: 10 }} />
                    <YAxis tick={{ fill: "rgba(201,151,58,0.5)", fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: "#1a1505", border: "1px solid rgba(201,151,58,0.3)", color: "#f5e9c8" }} />
                    <Bar dataKey="value" fill="#c9973a" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card className="p-4 border" style={{ background: "rgba(201,151,58,0.03)", borderColor: "rgba(201,151,58,0.15)" }}>
                <p className="text-xs font-bold mb-3" style={{ color: "#f5e9c8" }}>Revenue Distribution</p>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={revenueBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name }) => name} labelLine={{ stroke: "rgba(201,151,58,0.3)" }}>
                      {revenueBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#1a1505", border: "1px solid rgba(201,151,58,0.3)", color: "#f5e9c8" }} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </div>
          )}

          {/* Platform Inventory */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            {[
              { label: "Albums", value: s.albums, icon: Star },
              { label: "Songs", value: s.songs, icon: Music },
              { label: "Podcasts", value: s.podcasts, icon: Radio },
              { label: "Videos", value: s.videos, icon: TrendingUp },
              { label: "Events", value: s.events, icon: Calendar },
              { label: "Merch", value: s.merch, icon: Store },
              { label: "Marketplace", value: s.marketplace, icon: Store },
              { label: "Ads", value: s.ads, icon: Megaphone },
            ].map(k => (
              <Card key={k.label} className="p-2 border text-center" style={{ background: "rgba(201,151,58,0.03)", borderColor: "rgba(201,151,58,0.15)" }}>
                <k.icon className="w-3 h-3 mx-auto mb-0.5" style={{ color: "#c9973a" }} />
                <p className="text-base font-black" style={{ color: "#f5e9c8" }}>{k.value || 0}</p>
                <p className="text-[8px]" style={{ color: "rgba(201,151,58,0.4)" }}>{k.label}</p>
              </Card>
            ))}
          </div>

          {/* Upcoming Events + Trending */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {overview?.upcoming_events?.length > 0 && (
              <Card className="p-4 border" style={{ background: "rgba(201,151,58,0.03)", borderColor: "rgba(201,151,58,0.15)" }}>
                <p className="text-xs font-bold mb-2 flex items-center gap-1" style={{ color: "#f5e9c8" }}><Calendar className="w-3.5 h-3.5" style={{ color: "#c9973a" }} />Upcoming Events</p>
                <div className="space-y-1">
                  {overview.upcoming_events.map((e, i) => (
                    <div key={i} className="text-[10px] p-1.5 rounded" style={{ background: "rgba(201,151,58,0.05)" }}>
                      <p className="font-semibold" style={{ color: "#f5e9c8" }}>{e.title}</p>
                      <p style={{ color: "rgba(201,151,58,0.4)" }}>{e.start_date} · {e.venue_name || e.city || "TBD"}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
            {overview?.trending?.length > 0 && (
              <Card className="p-4 border" style={{ background: "rgba(201,151,58,0.03)", borderColor: "rgba(201,151,58,0.15)" }}>
                <p className="text-xs font-bold mb-2 flex items-center gap-1" style={{ color: "#f5e9c8" }}><TrendingUp className="w-3.5 h-3.5" style={{ color: "#c9973a" }} />Trending Songs</p>
                <div className="space-y-1">
                  {overview.trending.slice(0, 5).map((song, i) => (
                    <div key={song.id || i} className="flex items-center gap-2 text-[10px] p-1.5 rounded" style={{ background: "rgba(201,151,58,0.05)" }}>
                      <span className="font-black w-4" style={{ color: "#c9973a" }}>{i + 1}</span>
                      <div className="flex-1"><p className="font-semibold" style={{ color: "#f5e9c8" }}>{song.title}</p><p style={{ color: "rgba(201,151,58,0.4)" }}>{song.artist_name}</p></div>
                      <Badge style={{ background: "rgba(201,151,58,0.1)", color: "#c9973a" }} className="text-[8px]">{(song.monthly_streams || 0).toLocaleString()}</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}