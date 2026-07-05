import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Store, Loader2, ShoppingBag, Star, Tag, TrendingUp, DollarSign, CheckCircle, X } from "lucide-react";

const LISTING_TYPES = ["beat", "sample_pack", "stem", "instrumental", "license", "service", "merch", "nft", "artwork"];

export default function MarketplacePage() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const load = async () => {
      const data = await base44.entities.MarketplaceListing.list('-created_date', 200).catch(() => []);
      setListings(data);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = filter === "all" ? listings : listings.filter(l => l.listing_type === filter);
  const totalRevenue = listings.reduce((s, l) => s + (l.total_revenue || 0), 0);
  const totalSales = listings.reduce((s, l) => s + (l.purchase_count || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto" style={{ background: "linear-gradient(135deg, #0a0a0a 0%, #1a1505 100%)", minHeight: "100vh", padding: "24px" }}>
      <div>
        <p className="text-xs uppercase tracking-[0.3em] font-semibold mb-1" style={{ color: "rgba(201,151,58,0.6)" }}>Culture Rail</p>
        <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: "#f5e9c8" }}><Store className="w-6 h-6" style={{ color: "#c9973a" }} />Marketplace</h1>
        <p className="text-sm mt-1" style={{ color: "rgba(201,151,58,0.5)" }}>Beats, sample packs, stems, licenses, services, merch, NFTs, artwork</p>
      </div>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#c9973a" }} /></div> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-3 border" style={{ background: "rgba(201,151,58,0.05)", borderColor: "rgba(201,151,58,0.2)" }}><Store className="w-4 h-4 mb-1" style={{ color: "#c9973a" }} /><p className="text-xl font-black" style={{ color: "#f5e9c8" }}>{listings.length}</p><p className="text-[10px]" style={{ color: "rgba(201,151,58,0.5)" }}>Active Listings</p></Card>
            <Card className="p-3 border" style={{ background: "rgba(201,151,58,0.05)", borderColor: "rgba(201,151,58,0.2)" }}><ShoppingBag className="w-4 h-4 mb-1" style={{ color: "#c9973a" }} /><p className="text-xl font-black" style={{ color: "#f5e9c8" }}>{totalSales.toLocaleString()}</p><p className="text-[10px]" style={{ color: "rgba(201,151,58,0.5)" }}>Total Sales</p></Card>
            <Card className="p-3 border" style={{ background: "rgba(201,151,58,0.05)", borderColor: "rgba(201,151,58,0.2)" }}><DollarSign className="w-4 h-4 mb-1" style={{ color: "#c9973a" }} /><p className="text-xl font-black" style={{ color: "#f5e9c8" }}>${totalRevenue.toLocaleString()}</p><p className="text-[10px]" style={{ color: "rgba(201,151,58,0.5)" }}>Total Revenue</p></Card>
            <Card className="p-3 border" style={{ background: "rgba(201,151,58,0.05)", borderColor: "rgba(201,151,58,0.2)" }}><Star className="w-4 h-4 mb-1" style={{ color: "#c9973a" }} /><p className="text-xl font-black" style={{ color: "#f5e9c8" }}>{listings.filter(l => l.is_featured).length}</p><p className="text-[10px]" style={{ color: "rgba(201,151,58,0.5)" }}>Featured</p></Card>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}
              style={filter === "all" ? { background: "#c9973a", color: "#0a0a0a" } : { borderColor: "rgba(201,151,58,0.3)", color: "#c9973a" }} className="text-xs">All</Button>
            {LISTING_TYPES.map(t => (
              <Button key={t} size="sm" variant={filter === t ? "default" : "outline"} onClick={() => setFilter(t)}
                style={filter === t ? { background: "#c9973a", color: "#0a0a0a" } : { borderColor: "rgba(201,151,58,0.3)", color: "#c9973a" }} className="text-xs">{t.replace(/_/g, " ")}</Button>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {filtered.map(l => (
              <Card key={l.id} className="p-3 border" style={{ background: "rgba(201,151,58,0.03)", borderColor: "rgba(201,151,58,0.15)" }}>
                {l.image_url && <img src={l.image_url} className="w-full h-32 rounded mb-2 object-cover" alt="" />}
                <div className="flex items-center justify-between mb-1">
                  <Badge style={{ background: "rgba(201,151,58,0.15)", color: "#c9973a" }} className="text-[8px]">{l.listing_type?.replace(/_/g, " ")}</Badge>
                  {l.is_featured && <Star className="w-3 h-3" style={{ color: "#c9973a" }} />}
                </div>
                <p className="text-xs font-bold mb-1" style={{ color: "#f5e9c8" }}>{l.title}</p>
                <p className="text-[9px] mb-1" style={{ color: "rgba(201,151,58,0.4)" }}>{l.seller_name}</p>
                {l.genres?.length > 0 && <p className="text-[8px] mb-1" style={{ color: "rgba(201,151,58,0.3)" }}>{l.genres.join(", ")}</p>}
                <div className="flex items-center justify-between mt-2">
                  <p className="text-sm font-black" style={{ color: "#c9973a" }}>${l.price}</p>
                  <span className="text-[8px]" style={{ color: "rgba(201,151,58,0.4)" }}>{l.purchase_count || 0} sold</span>
                </div>
                {l.license_type && <Badge variant="outline" className="text-[7px] mt-1" style={{ color: "rgba(201,151,58,0.4)", borderColor: "rgba(201,151,58,0.2)" }}>{l.license_type.replace(/_/g, " ")}</Badge>}
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}