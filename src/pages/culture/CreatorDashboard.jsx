import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Music, Disc, Mic, Video, DollarSign, TrendingUp, Loader2, Plus, Sparkles, CheckCircle, Users } from "lucide-react";
import moment from "moment";

export default function CreatorDashboard() {
  const [creators, setCreators] = useState([]);
  const [songs, setSongs] = useState([]);
  const [royalties, setRoyalties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true);
    const [c, s, r] = await Promise.all([
      base44.entities.Creator.list('-created_date', 100).catch(() => []),
      base44.entities.Song.list('-created_date', 200).catch(() => []),
      base44.entities.RoyaltyTracking.list('-created_date', 200).catch(() => []),
    ]);
    setCreators(c); setSongs(s); setRoyalties(r);
    if (c[0]) setSelected(c[0]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const mySongs = selected ? songs.filter(s => s.artist_id === selected.id || s.artist_name === selected.name) : [];
  const myRoyalties = selected ? royalties.filter(r => r.artist_id === selected.id || r.artist_name === selected.name) : [];
  const totalRoyalty = myRoyalties.reduce((s, r) => s + (r.artist_payout || 0), 0);
  const totalStreams = mySongs.reduce((s, x) => s + (x.total_streams || 0), 0);
  const totalRevenue = mySongs.reduce((s, x) => s + (x.estimated_revenue || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto" style={{ background: "linear-gradient(135deg, #0a0a0a 0%, #1a1505 100%)", minHeight: "100vh", padding: "24px" }}>
      <div>
        <p className="text-xs uppercase tracking-[0.3em] font-semibold mb-1" style={{ color: "rgba(201,151,58,0.6)" }}>Culture Rail</p>
        <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: "#f5e9c8" }}><Sparkles className="w-6 h-6" style={{ color: "#c9973a" }} />Creator Dashboard</h1>
      </div>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#c9973a" }} /></div> : (
        <>
          {/* Creator Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            {creators.slice(0, 10).map(c => (
              <Button key={c.id} size="sm" variant={selected?.id === c.id ? "default" : "outline"}
                onClick={() => setSelected(c)}
                style={selected?.id === c.id ? { background: "#c9973a", color: "#0a0a0a" } : { borderColor: "rgba(201,151,58,0.3)", color: "#c9973a" }}
                className="text-xs">
                {c.name}
              </Button>
            ))}
          </div>

          {selected && (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Total Streams", value: totalStreams.toLocaleString(), icon: Music },
                  { label: "Royalty Payouts", value: `$${totalRoyalty.toLocaleString()}`, icon: DollarSign },
                  { label: "Followers", value: (selected.follower_count || 0).toLocaleString(), icon: Users },
                  { label: "Est. Revenue", value: `$${totalRevenue.toLocaleString()}`, icon: TrendingUp },
                ].map(k => (
                  <Card key={k.label} className="p-3 border" style={{ background: "rgba(201,151,58,0.05)", borderColor: "rgba(201,151,58,0.2)" }}>
                    <k.icon className="w-4 h-4 mb-1" style={{ color: "#c9973a" }} />
                    <p className="text-xl font-black" style={{ color: "#f5e9c8" }}>{k.value}</p>
                    <p className="text-[10px]" style={{ color: "rgba(201,151,58,0.5)" }}>{k.label}</p>
                  </Card>
                ))}
              </div>

              <Tabs defaultValue="content">
                <TabsList className="flex-wrap h-auto" style={{ background: "rgba(201,151,58,0.05)" }}>
                  <TabsTrigger value="content" style={{ color: "#c9973a" }}>Content ({mySongs.length})</TabsTrigger>
                  <TabsTrigger value="royalties" style={{ color: "#c9973a" }}>Royalties ({myRoyalties.length})</TabsTrigger>
                  <TabsTrigger value="profile" style={{ color: "#c9973a" }}>Profile</TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="space-y-2 mt-4">
                  {mySongs.length === 0 ? <Card className="p-6 text-center text-sm" style={{ color: "rgba(201,151,58,0.4)" }}>No songs yet</Card> :
                    mySongs.map(s => (
                      <Card key={s.id} className="p-3 border flex items-center gap-3" style={{ background: "rgba(201,151,58,0.03)", borderColor: "rgba(201,151,58,0.15)" }}>
                        {s.cover_url && <img src={s.cover_url} className="w-10 h-10 rounded" alt="" />}
                        <div className="flex-1"><p className="text-xs font-semibold" style={{ color: "#f5e9c8" }}>{s.title}</p><p className="text-[9px]" style={{ color: "rgba(201,151,58,0.4)" }}>{s.genre}</p></div>
                        <Badge style={{ background: "rgba(201,151,58,0.15)", color: "#c9973a" }}>{(s.total_streams || 0).toLocaleString()} streams</Badge>
                      </Card>
                    ))
                  }
                </TabsContent>

                <TabsContent value="royalties" className="space-y-2 mt-4">
                  {myRoyalties.length === 0 ? <Card className="p-6 text-center text-sm" style={{ color: "rgba(201,151,58,0.4)" }}>No royalty records yet</Card> :
                    myRoyalties.map(r => (
                      <Card key={r.id} className="p-3 border" style={{ background: "rgba(201,151,58,0.03)", borderColor: "rgba(201,151,58,0.15)" }}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-semibold" style={{ color: "#f5e9c8" }}>{r.song_name}</p>
                          <Badge style={{ background: "rgba(201,151,58,0.15)", color: "#c9973a" }}>{r.source}</Badge>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-[10px]" style={{ color: "rgba(201,151,58,0.4)" }}>
                          <div><p style={{ color: "#f5e9c8" }}>{r.stream_count?.toLocaleString()}</p><p>Streams</p></div>
                          <div><p style={{ color: "#f5e9c8" }}>${r.gross_revenue}</p><p>Gross</p></div>
                          <div><p style={{ color: "#f5e9c8" }}>${r.net_revenue}</p><p>Net</p></div>
                          <div><p className="font-bold" style={{ color: "#c9973a" }}>${r.artist_payout}</p><p>Your Payout</p></div>
                        </div>
                      </Card>
                    ))
                  }
                </TabsContent>

                <TabsContent value="profile" className="mt-4">
                  <Card className="p-4 border" style={{ background: "rgba(201,151,58,0.03)", borderColor: "rgba(201,151,58,0.15)" }}>
                    <div className="flex items-center gap-3 mb-3">
                      {selected.avatar_url && <img src={selected.avatar_url} className="w-16 h-16 rounded-full" alt="" />}
                      <div><p className="text-sm font-bold" style={{ color: "#f5e9c8" }}>{selected.name}</p><p className="text-[10px]" style={{ color: "rgba(201,151,58,0.4)" }}>{selected.creator_type}</p></div>
                      {selected.verified && <Badge style={{ background: "#c9973a", color: "#0a0a0a" }}><CheckCircle className="w-2.5 h-2.5 mr-0.5" />Verified</Badge>}
                    </div>
                    <p className="text-xs mb-2" style={{ color: "rgba(201,151,58,0.4)" }}>{selected.bio || "No bio"}</p>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div><p style={{ color: "rgba(201,151,58,0.4)" }}>Contract</p><p style={{ color: "#f5e9c8" }}>{selected.contract_status}</p></div>
                      <div><p style={{ color: "rgba(201,151,58,0.4)" }}>Revenue Share</p><p style={{ color: "#f5e9c8" }}>{selected.revenue_share_pct}%</p></div>
                    </div>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </>
      )}
    </div>
  );
}