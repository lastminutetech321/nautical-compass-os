import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Music, Disc, Mic, Video, Calendar, ShoppingBag, Users, Star, Radio, ListMusic, FileText, DollarSign, TrendingUp, Store, Megaphone, Sparkles, Loader2, Users2, Shield, Headphones } from "lucide-react";

const SECTIONS = [
  { label: "Artists", icon: Music, path: "/culture/artists", color: "text-amber-600" },
  { label: "Albums", icon: Disc, path: "/culture/albums", color: "text-violet-600" },
  { label: "Songs", icon: Music, path: "/culture/songs", color: "text-blue-600" },
  { label: "Creators", icon: Sparkles, path: "/culture/creators", color: "text-pink-600" },
  { label: "Podcasts", icon: Mic, path: "/culture/podcasts", color: "text-teal-600" },
  { label: "Videos", icon: Video, path: "/culture/videos", color: "text-red-600" },
  { label: "Live Events", icon: Calendar, path: "/culture/events", color: "text-emerald-600" },
  { label: "Merchandise", icon: ShoppingBag, path: "/culture/merch", color: "text-orange-600" },
  { label: "Communities", icon: Users, path: "/culture/communities", color: "text-cyan-600" },
  { label: "Fan Clubs", icon: Star, path: "/culture/fan-clubs", color: "text-amber-600" },
  { label: "Radio", icon: Radio, path: "/culture/radio", color: "text-indigo-600" },
  { label: "Playlists", icon: ListMusic, path: "/culture/playlists", color: "text-violet-600" },
  { label: "Licensing", icon: FileText, path: "/culture/licensing", color: "text-slate-600" },
  { label: "Royalties", icon: DollarSign, path: "/culture/royalties", color: "text-emerald-600" },
  { label: "Marketplace", icon: Store, path: "/culture/marketplace", color: "text-blue-600" },
  { label: "Advertising", icon: Megaphone, path: "/culture/advertising", color: "text-red-600" },
  { label: "Promotions", icon: TrendingUp, path: "/culture/promotions", color: "text-amber-600" },
];

const DASHBOARDS = [
  { label: "Creator Dashboard", icon: Sparkles, path: "/culture/creator-dashboard", color: "text-amber-600", desc: "Creator analytics, royalties, content management" },
  { label: "Subscriber Dashboard", icon: Headphones, path: "/culture/subscriber-dashboard", color: "text-violet-600", desc: "Subscriptions, playlists, listening history" },
  { label: "Community Dashboard", icon: Users2, path: "/culture/community-dashboard", color: "text-cyan-600", desc: "Community management, engagement, moderation" },
  { label: "Engagement Analytics", icon: TrendingUp, path: "/culture/analytics", color: "text-emerald-600", desc: "Streams, views, demographics, retention" },
  { label: "Event Calendar", icon: Calendar, path: "/culture/calendar", color: "text-red-600", desc: "Upcoming events, ticket sales, scheduling" },
  { label: "Creator Profiles", icon: Shield, path: "/culture/profiles", color: "text-pink-600", desc: "Public profiles, verification, portfolio" },
  { label: "Executive Dashboard", icon: Star, path: "/culture/executive", color: "text-amber-600", desc: "Platform-wide revenue, growth, KPIs" },
];

export default function CultureHub() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await base44.functions.invoke('cultureEngine', { operation: 'overview', params: {} });
        setOverview(res.data);
      } catch (e) { /* fallback */ }
      setLoading(false);
    };
    load();
  }, []);

  const s = overview?.stats || {};

  return (
    <div className="space-y-6 max-w-7xl mx-auto" style={{ background: "linear-gradient(135deg, #0a0a0a 0%, #1a1505 100%)", minHeight: "100vh", padding: "24px" }}>
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-[0.3em] font-semibold mb-1" style={{ color: "rgba(201,151,58,0.6)" }}>NCOS · Culture Rail</p>
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-2" style={{ color: "#f5e9c8" }}>
          <Music className="w-7 h-7" style={{ color: "#c9973a" }} />Culture Rail Command
        </h1>
        <p className="text-sm mt-1" style={{ color: "rgba(201,151,58,0.5)" }}>Artists · Music · Podcasts · Video · Live Events · Merch · Communities · Marketplace · Royalties</p>
      </div>

      {/* KPI Strip */}
      {!loading && overview ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: "Artists", value: s.artists || 0, icon: Music },
            { label: "Total Streams", value: (s.totalStreams || 0).toLocaleString(), icon: Headphones },
            { label: "Creators", value: s.creators || 0, icon: Sparkles },
            { label: "Platform Revenue", value: `$${(s.totalPlatformRev || 0).toLocaleString()}`, icon: DollarSign },
            { label: "Community Members", value: (s.totalCommunityMembers || 0).toLocaleString(), icon: Users2 },
            { label: "Upcoming Events", value: s.upcomingEvents || 0, icon: Calendar },
          ].map(k => (
            <Card key={k.label} className="p-3 border" style={{ background: "rgba(201,151,58,0.05)", borderColor: "rgba(201,151,58,0.2)" }}>
              <k.icon className="w-4 h-4 mb-1" style={{ color: "#c9973a" }} />
              <p className="text-xl font-black" style={{ color: "#f5e9c8" }}>{k.value}</p>
              <p className="text-[10px]" style={{ color: "rgba(201,151,58,0.5)" }}>{k.label}</p>
            </Card>
          ))}
        </div>
      ) : loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#c9973a" }} /></div>
      ) : null}

      {/* Dashboards */}
      <div>
        <p className="text-xs uppercase tracking-[0.2em] font-semibold mb-2" style={{ color: "rgba(201,151,58,0.6)" }}>Dashboards</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {DASHBOARDS.map(d => (
            <Link key={d.path} to={d.path}>
              <Card className="p-4 border transition-all hover:scale-[1.02] cursor-pointer" style={{ background: "rgba(201,151,58,0.05)", borderColor: "rgba(201,151,58,0.2)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <d.icon className={`w-4 h-4 ${d.color}`} />
                  <p className="text-sm font-bold" style={{ color: "#f5e9c8" }}>{d.label}</p>
                </div>
                <p className="text-[10px]" style={{ color: "rgba(201,151,58,0.4)" }}>{d.desc}</p>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Content Sections */}
      <div>
        <p className="text-xs uppercase tracking-[0.2em] font-semibold mb-2" style={{ color: "rgba(201,151,58,0.6)" }}>Content Management</p>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {SECTIONS.map(sec => (
            <Link key={sec.path} to={sec.path}>
              <Card className="p-3 border transition-all hover:scale-[1.05] cursor-pointer text-center" style={{ background: "rgba(201,151,58,0.05)", borderColor: "rgba(201,151,58,0.2)" }}>
                <sec.icon className={`w-5 h-5 mx-auto mb-1 ${sec.color}`} />
                <p className="text-[10px] font-semibold" style={{ color: "#f5e9c8" }}>{sec.label}</p>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Trending */}
      {overview?.trending?.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-[0.2em] font-semibold mb-2" style={{ color: "rgba(201,151,58,0.6)" }}>Trending Now</p>
          <div className="space-y-1">
            {overview.trending.slice(0, 5).map((song, i) => (
              <Card key={song.id || i} className="p-2.5 border flex items-center gap-3" style={{ background: "rgba(201,151,58,0.03)", borderColor: "rgba(201,151,58,0.15)" }}>
                <span className="text-xs font-black w-5" style={{ color: "#c9973a" }}>{i + 1}</span>
                {song.cover_url && <img src={song.cover_url} className="w-8 h-8 rounded" alt="" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: "#f5e9c8" }}>{song.title}</p>
                  <p className="text-[9px] truncate" style={{ color: "rgba(201,151,58,0.4)" }}>{song.artist_name}</p>
                </div>
                <Badge className="text-[8px]" style={{ background: "rgba(201,151,58,0.15)", color: "#c9973a" }}>{(song.monthly_streams || 0).toLocaleString()} streams/mo</Badge>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Link to="/culture-rail">
        <Button variant="outline" size="sm" style={{ borderColor: "rgba(201,151,58,0.3)", color: "#c9973a" }}>
          <Headphones className="w-4 h-4 mr-1.5" />Open Streaming Experience
        </Button>
      </Link>
    </div>
  );
}