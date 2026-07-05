import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Download, Boxes, Shield, TrendingUp, Zap } from "lucide-react";

const CATEGORY_COLORS = {
  productivity: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  crm: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  hr: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  legal: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  finance: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  culture: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  workforce: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  evidence: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  canon: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  ai: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  infrastructure: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  security: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  analytics: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  communication: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  operations: "bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300",
  other: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const PRICING_LABEL = {
  free: "Free",
  freemium: "Freemium",
  subscription: "Subscription",
  one_time: "One-Time",
  enterprise: "Enterprise",
  usage_based: "Usage-Based",
  trial: "Trial",
};

export default function ModuleCard({ module: m, onClick, onInstall }) {
  const catColor = CATEGORY_COLORS[m.category] || CATEGORY_COLORS.other;

  const formatPrice = () => {
    if (m.pricing_model === 'free') return 'Free';
    if (m.pricing_model === 'enterprise') return `$${m.price_enterprise || 0}+`;
    if (m.pricing_model === 'one_time') return `$${m.price_monthly || 0} once`;
    if (m.price_monthly > 0) return `$${m.price_monthly}/mo`;
    return 'Contact';
  };

  return (
    <Card className="p-4 border border-border/60 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer flex flex-col h-full" onClick={() => onClick?.(m)}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
            <Boxes className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight truncate">{m.name}</p>
            <p className="text-[10px] text-muted-foreground">v{m.current_version}</p>
          </div>
        </div>
        {m.is_featured && <Badge className="text-[8px] bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 border-0"><Zap className="w-2 h-2 mr-0.5" />Featured</Badge>}
      </div>

      <p className="text-xs text-muted-foreground mb-2 flex-1 line-clamp-2">{m.description}</p>

      <div className="flex items-center gap-1 mb-2 flex-wrap">
        <Badge variant="outline" className={`text-[8px] border-0 ${catColor}`}>{m.category}</Badge>
        {m.is_verified && <Badge variant="outline" className="text-[8px] text-emerald-600 border-emerald-200"><Shield className="w-2 h-2 mr-0.5" />Verified</Badge>}
        <Badge variant="outline" className="text-[8px] text-muted-foreground">{PRICING_LABEL[m.pricing_model] || m.pricing_model}</Badge>
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-2">
        <span className="flex items-center gap-0.5"><Star className="w-3 h-3 fill-amber-400 text-amber-400" />{m.avg_rating?.toFixed(1) || '0.0'} ({m.review_count || 0})</span>
        <span className="flex items-center gap-0.5"><Download className="w-3 h-3" />{m.active_installs || 0} installs</span>
      </div>

      <div className="flex items-center justify-between gap-2 mt-auto">
        <span className="text-sm font-bold text-primary">{formatPrice()}</span>
        {m.trial_days > 0 && m.pricing_model !== 'free' && (
          <span className="text-[9px] text-muted-foreground">{m.trial_days}d trial</span>
        )}
      </div>

      {onInstall && (
        <Button size="sm" className="w-full text-xs h-7 mt-2" onClick={(e) => { e.stopPropagation(); onInstall(m); }}>
          <Download className="w-3 h-3 mr-1" />Install
        </Button>
      )}
    </Card>
  );
}