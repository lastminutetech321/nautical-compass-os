import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Plus, Music, Disc, Mic, Video, Calendar, ShoppingBag, Users, Star, Radio, ListMusic, FileText, DollarSign, Sparkles } from "lucide-react";

const CONFIG = {
  artists: { entity: "Artist", label: "Artists", icon: Music, titleField: "name", subtitleField: "genres", imageField: "image_url" },
  albums: { entity: "Album", label: "Albums", icon: Disc, titleField: "title", subtitleField: "artist_name", imageField: "cover_url" },
  songs: { entity: "Song", label: "Songs", icon: Music, titleField: "title", subtitleField: "artist_name", imageField: "cover_url", metaField: "total_streams", metaLabel: "streams" },
  creators: { entity: "Creator", label: "Creators", icon: Sparkles, titleField: "name", subtitleField: "creator_type", imageField: "avatar_url" },
  podcasts: { entity: "Podcast", label: "Podcasts", icon: Mic, titleField: "title", subtitleField: "creator_name", imageField: "cover_url", metaField: "monthly_listeners", metaLabel: "listeners" },
  videos: { entity: "Video", label: "Videos", icon: Video, titleField: "title", subtitleField: "creator_name", imageField: "thumbnail_url", metaField: "view_count", metaLabel: "views" },
  events: { entity: "LiveEvent", label: "Live Events", icon: Calendar, titleField: "title", subtitleField: "artist_name", imageField: "cover_url", metaField: "start_date", metaLabel: "date" },
  merch: { entity: "Merchandise", label: "Merchandise", icon: ShoppingBag, titleField: "name", subtitleField: "category", imageField: "image_url", metaField: "price", metaLabel: "price", isCurrency: true },
  communities: { entity: "Community", label: "Communities", icon: Users, titleField: "name", subtitleField: "community_type", metaField: "member_count", metaLabel: "members" },
  "fan-clubs": { entity: "FanClub", label: "Fan Clubs", icon: Star, titleField: "name", subtitleField: "artist_name", metaField: "member_count", metaLabel: "members" },
  radio: { entity: "Radio", label: "Radio", icon: Radio, titleField: "name", subtitleField: "station_type", imageField: "cover_url", metaField: "listener_count", metaLabel: "listeners" },
  playlists: { entity: "Playlist", label: "Playlists", icon: ListMusic, titleField: "name", subtitleField: "curator_name", imageField: "cover_url", metaField: "follower_count", metaLabel: "followers" },
  licensing: { entity: "Licensing", label: "Licensing", icon: FileText, titleField: "title", subtitleField: "licensee_name", metaField: "fee_amount", metaLabel: "fee", isCurrency: true },
  royalties: { entity: "RoyaltyTracking", label: "Royalties", icon: DollarSign, titleField: "title", subtitleField: "source", metaField: "artist_payout", metaLabel: "payout", isCurrency: true },
};

export default function CultureContentManager({ type = "artists" }) {
  const config = CONFIG[type] || CONFIG.artists;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.entities[config.entity].list('-created_date', 200);
      setItems(data);
    } catch (e) { setItems([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [type]);

  const filtered = items.filter(i => {
    if (!search) return true;
    const title = (i[config.titleField] || "").toLowerCase();
    const sub = (i[config.subtitleField] || "").toLowerCase();
    return title.includes(search.toLowerCase()) || sub.includes(search.toLowerCase());
  });

  const formatMeta = (val, isCurrency) => {
    if (val === undefined || val === null) return "—";
    if (isCurrency) return `$${val}`;
    return typeof val === "number" ? val.toLocaleString() : val;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto" style={{ background: "linear-gradient(135deg, #0a0a0a 0%, #1a1505 100%)", minHeight: "100vh", padding: "24px" }}>
      <div>
        <p className="text-xs uppercase tracking-[0.3em] font-semibold mb-1" style={{ color: "rgba(201,151,58,0.6)" }}>Culture Rail</p>
        <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: "#f5e9c8" }}>
          <config.icon className="w-6 h-6" style={{ color: "#c9973a" }} />{config.label}
        </h1>
        <p className="text-sm mt-1" style={{ color: "rgba(201,151,58,0.5)" }}>{items.length} total · Manage {config.label.toLowerCase()}</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-2.5 w-4 h-4" style={{ color: "rgba(201,151,58,0.4)" }} />
          <Input placeholder={`Search ${config.label.toLowerCase()}...`} value={search} onChange={e => setSearch(e.target.value)} className="pl-8" style={{ background: "rgba(201,151,58,0.05)", borderColor: "rgba(201,151,58,0.2)", color: "#f5e9c8" }} />
        </div>
        <Button size="sm" style={{ background: "#c9973a", color: "#0a0a0a" }}><Plus className="w-4 h-4 mr-1" />Add {config.label.slice(0, -1)}</Button>
      </div>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#c9973a" }} /></div> : filtered.length === 0 ? (
        <Card className="p-8 text-center border" style={{ background: "rgba(201,151,58,0.03)", borderColor: "rgba(201,151,58,0.15)" }}>
          <p className="text-sm" style={{ color: "rgba(201,151,58,0.4)" }}>No {config.label.toLowerCase()} found. Add your first {config.label.slice(0, -1).toLowerCase()} to get started.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(item => (
            <Card key={item.id} className="p-3 border" style={{ background: "rgba(201,151,58,0.03)", borderColor: "rgba(201,151,58,0.15)" }}>
              <div className="flex items-start gap-3">
                {config.imageField && item[config.imageField] && (
                  <img src={item[config.imageField]} className="w-12 h-12 rounded object-cover flex-shrink-0" alt="" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: "#f5e9c8" }}>{item[config.titleField] || "Untitled"}</p>
                  {item[config.subtitleField] && <p className="text-[10px] truncate" style={{ color: "rgba(201,151,58,0.4)" }}>{Array.isArray(item[config.subtitleField]) ? item[config.subtitleField].join(", ") : item[config.subtitleField]}</p>}
                </div>
              </div>
              {config.metaField && (
                <div className="mt-2 pt-2 border-t flex items-center justify-between" style={{ borderColor: "rgba(201,151,58,0.1)" }}>
                  <span className="text-[9px]" style={{ color: "rgba(201,151,58,0.4)" }}>{config.metaLabel}</span>
                  <span className="text-xs font-bold" style={{ color: "#c9973a" }}>{formatMeta(item[config.metaField], config.isCurrency)}</span>
                </div>
              )}
              {item.status && <Badge style={{ background: "rgba(201,151,58,0.1)", color: "#c9973a" }} className="text-[8px] mt-1">{item.status}</Badge>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}