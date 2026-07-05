import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users2, MessageCircle, TrendingUp, Loader2, Shield } from "lucide-react";

export default function CommunityDashboard() {
  const [communities, setCommunities] = useState([]);
  const [fanClubs, setFanClubs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [c, f] = await Promise.all([
        base44.entities.Community.list('-created_date', 100).catch(() => []),
        base44.entities.FanClub.list('-created_date', 50).catch(() => []),
      ]);
      setCommunities(c); setFanClubs(f);
      setLoading(false);
    };
    load();
  }, []);

  const totalMembers = communities.reduce((s, c) => s + (c.member_count || 0), 0);
  const totalPosts = communities.reduce((s, c) => s + (c.posts_count || 0), 0);
  const avgEngagement = communities.length > 0 ? Math.round(communities.reduce((s, c) => s + (c.engagement_score || 0), 0) / communities.length) : 0;
  const totalFanClubMembers = fanClubs.reduce((s, f) => s + (f.member_count || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto" style={{ background: "linear-gradient(135deg, #0a0a0a 0%, #1a1505 100%)", minHeight: "100vh", padding: "24px" }}>
      <div>
        <p className="text-xs uppercase tracking-[0.3em] font-semibold mb-1" style={{ color: "rgba(201,151,58,0.6)" }}>Culture Rail</p>
        <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: "#f5e9c8" }}><Users2 className="w-6 h-6" style={{ color: "#c9973a" }} />Community Dashboard</h1>
      </div>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#c9973a" }} /></div> : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3 border" style={{ background: "rgba(201,151,58,0.05)", borderColor: "rgba(201,151,58,0.2)" }}><Users2 className="w-4 h-4 mb-1" style={{ color: "#c9973a" }} /><p className="text-xl font-black" style={{ color: "#f5e9c8" }}>{totalMembers.toLocaleString()}</p><p className="text-[10px]" style={{ color: "rgba(201,151,58,0.5)" }}>Community Members</p></Card>
          <Card className="p-3 border" style={{ background: "rgba(201,151,58,0.05)", borderColor: "rgba(201,151,58,0.2)" }}><MessageCircle className="w-4 h-4 mb-1" style={{ color: "#c9973a" }} /><p className="text-xl font-black" style={{ color: "#f5e9c8" }}>{totalPosts.toLocaleString()}</p><p className="text-[10px]" style={{ color: "rgba(201,151,58,0.5)" }}>Total Posts</p></Card>
          <Card className="p-3 border" style={{ background: "rgba(201,151,58,0.05)", borderColor: "rgba(201,151,58,0.2)" }}><TrendingUp className="w-4 h-4 mb-1" style={{ color: "#c9973a" }} /><p className="text-xl font-black" style={{ color: "#f5e9c8" }}>{avgEngagement}/100</p><p className="text-[10px]" style={{ color: "rgba(201,151,58,0.5)" }}>Avg Engagement</p></Card>
          <Card className="p-3 border" style={{ background: "rgba(201,151,58,0.05)", borderColor: "rgba(201,151,58,0.2)" }}><Shield className="w-4 h-4 mb-1" style={{ color: "#c9973a" }} /><p className="text-xl font-black" style={{ color: "#f5e9c8" }}>{totalFanClubMembers.toLocaleString()}</p><p className="text-[10px]" style={{ color: "rgba(201,151,58,0.5)" }}>Fan Club Members</p></Card>
        </div>
      )}

      <Tabs defaultValue="communities">
        <TabsList className="flex-wrap h-auto" style={{ background: "rgba(201,151,58,0.05)" }}>
          <TabsTrigger value="communities" style={{ color: "#c9973a" }}>Communities ({communities.length})</TabsTrigger>
          <TabsTrigger value="fanclubs" style={{ color: "#c9973a" }}>Fan Clubs ({fanClubs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="communities" className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          {communities.map(c => (
            <Card key={c.id} className="p-4 border" style={{ background: "rgba(201,151,58,0.03)", borderColor: "rgba(201,151,58,0.15)" }}>
              <div className="flex items-center justify-between mb-2">
                <div><p className="text-sm font-bold" style={{ color: "#f5e9c8" }}>{c.name}</p><p className="text-[10px]" style={{ color: "rgba(201,151,58,0.4)" }}>{c.community_type?.replace(/_/g, " ")}</p></div>
                {c.is_official && <Badge style={{ background: "#c9973a", color: "#0a0a0a" }}>Official</Badge>}
              </div>
              <p className="text-[10px] mb-2" style={{ color: "rgba(201,151,58,0.4)" }}>{c.description}</p>
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                <div><p className="font-bold" style={{ color: "#f5e9c8" }}>{c.member_count || 0}</p><p style={{ color: "rgba(201,151,58,0.4)" }}>Members</p></div>
                <div><p className="font-bold" style={{ color: "#f5e9c8" }}>{c.posts_count || 0}</p><p style={{ color: "rgba(201,151,58,0.4)" }}>Posts</p></div>
                <div><p className="font-bold" style={{ color: "#c9973a" }}>{c.engagement_score || 0}</p><p style={{ color: "rgba(201,151,58,0.4)" }}>Engagement</p></div>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="fanclubs" className="space-y-2 mt-4">
          {fanClubs.map(f => (
            <Card key={f.id} className="p-3 border flex items-center justify-between" style={{ background: "rgba(201,151,58,0.03)", borderColor: "rgba(201,151,58,0.15)" }}>
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ color: "#f5e9c8" }}>{f.name}</p>
                <p className="text-[10px]" style={{ color: "rgba(201,151,58,0.4)" }}>{f.artist_name} · {f.tier} tier · {f.member_count} members</p>
                {f.benefits?.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{f.benefits.slice(0, 3).map((b, i) => <Badge key={i} style={{ background: "rgba(201,151,58,0.1)", color: "#c9973a" }} className="text-[8px]">{b}</Badge>)}</div>}
              </div>
              <div className="text-right"><p className="text-sm font-black" style={{ color: "#c9973a" }}>${f.monthly_revenue}/mo</p></div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}