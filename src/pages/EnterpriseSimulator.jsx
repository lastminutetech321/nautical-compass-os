import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Play, FlaskConical, Users, AlertTriangle, Server, Scale, TrendingDown, Building2, DollarSign, Trash2, History, Sparkles, Bot, Code, Wallet } from "lucide-react";
import moment from "moment";
import ScenarioResults from "@/components/simulator/ScenarioResults";

const SCENARIO_TEMPLATES = [
  { name: "100K Member Surge", question: "What if 100,000 members join in the next 6 months?", type: "growth_spike", icon: Users, color: "text-blue-600" },
  { name: "Stripe Failure", question: "What if Stripe fails and we lose all payment processing for 30 days?", type: "provider_failure", icon: AlertTriangle, color: "text-red-600" },
  { name: "Hosting Doubles", question: "What if hosting and infrastructure costs double?", type: "cost_increase", icon: Server, color: "text-orange-600" },
  { name: "JurisEngine 1M Requests", question: "What if JurisEngine receives 1 million requests per month?", type: "load_spike", icon: Scale, color: "text-violet-600" },
  { name: "Churn Crisis", question: "What if our churn rate doubles to 10% monthly?", type: "churn_spike", icon: TrendingDown, color: "text-pink-600" },
  { name: "Enterprise x3", question: "What if enterprise growth triples and we onboard 50 new enterprise clients?", type: "enterprise_spike", icon: Building2, color: "text-emerald-600" },
];

export default function EnterpriseSimulator() {
  const [scenarios, setScenarios] = useState([]);
  const [platformState, setPlatformState] = useState(null);
  const [latestScenario, setLatestScenario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customQuestion, setCustomQuestion] = useState("");
  const [customName, setCustomName] = useState("");
  const [selectedHistory, setSelectedHistory] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [scenRes, stateRes] = await Promise.all([
        base44.functions.invoke('enterpriseSimulator', { operation: 'get_scenarios', params: {} }),
        base44.functions.invoke('enterpriseSimulator', { operation: 'platform_state', params: {} }).catch(() => ({ data: { state: null } })),
      ]);
      const allScenarios = scenRes.data?.scenarios || [];
      setScenarios(allScenarios);
      setPlatformState(stateRes.data?.state);
      const completed = allScenarios.find(s => s.status === 'completed');
      setLatestScenario(completed || null);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const runScenario = async (question, type, name) => {
    setRunning(true);
    setLatestScenario(null);
    try {
      const res = await base44.functions.invoke('enterpriseSimulator', {
        operation: 'run_scenario',
        params: { question, scenario_type: type, name }
      });
      setLatestScenario(res.data?.scenario);
      await load();
    } catch (e) { console.error(e); }
    setRunning(false);
  };

  const handleCustom = () => {
    if (!customQuestion) return;
    runScenario(customQuestion, 'custom', customName || customQuestion.substring(0, 60));
    setShowCustom(false);
    setCustomQuestion("");
    setCustomName("");
  };

  const deleteScenario = async (id) => {
    try {
      await base44.functions.invoke('enterpriseSimulator', { operation: 'delete_scenario', params: { scenario_id: id } });
      await load();
    } catch (e) { console.error(e); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  const displayScenario = selectedHistory || latestScenario;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Enterprise Simulator</p>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <FlaskConical className="w-6 h-6 text-primary" />Enterprise Simulator
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Simulate the future · Run what-if scenarios · Get proactive recommendations before problems occur</p>
      </div>

      {/* Platform State Summary */}
      {platformState && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="p-3 border border-border/60"><DollarSign className="w-4 h-4 text-emerald-600 mb-1" /><p className="text-lg font-bold">${platformState.financials?.mrr?.toLocaleString() || 0}</p><p className="text-[10px] text-muted-foreground">MRR</p></Card>
          <Card className="p-3 border border-border/60"><Wallet className="w-4 h-4 text-blue-600 mb-1" /><p className="text-lg font-bold">{platformState.financials?.runway_months || 0}mo</p><p className="text-[10px] text-muted-foreground">Runway</p></Card>
          <Card className="p-3 border border-border/60"><Users className="w-4 h-4 text-violet-600 mb-1" /><p className="text-lg font-bold">{platformState.subscriptions?.active_count || 0}</p><p className="text-[10px] text-muted-foreground">Active Subs</p></Card>
          <Card className="p-3 border border-border/60"><Bot className="w-4 h-4 text-cyan-600 mb-1" /><p className="text-lg font-bold">{platformState.infrastructure?.ai_employees || 0}</p><p className="text-[10px] text-muted-foreground">AI Employees</p></Card>
          <Card className="p-3 border border-border/60"><Code className="w-4 h-4 text-orange-600 mb-1" /><p className="text-lg font-bold">{platformState.health?.open_tech_debt || 0}</p><p className="text-[10px] text-muted-foreground">Open Tech Debt</p></Card>
        </div>
      )}

      {/* Scenario Templates */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Quick What-If Scenarios</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {SCENARIO_TEMPLATES.map(tpl => (
            <Card key={tpl.name} className="p-3 border border-border/60 hover:border-primary/40 transition-colors cursor-pointer" >
              <div className="flex items-start gap-3">
                <tpl.icon className={`w-5 h-5 ${tpl.color} mt-0.5 flex-shrink-0`} />
                <div className="flex-1">
                  <p className="text-sm font-semibold mb-1">{tpl.name}</p>
                  <p className="text-[10px] text-muted-foreground mb-2 italic">"{tpl.question}"</p>
                  <Button size="sm" className="w-full text-xs h-7" disabled={running} onClick={() => runScenario(tpl.question, tpl.type, tpl.name)}>
                    {running ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Play className="w-3 h-3 mr-1" />}
                    Run Simulation
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          <Card className="p-3 border border-dashed border-primary/40 bg-primary/5 flex items-center justify-center cursor-pointer hover:bg-primary/10 transition-colors" onClick={() => setShowCustom(true)}>
            <div className="text-center">
              <Sparkles className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-sm font-semibold text-primary">Custom Scenario</p>
              <p className="text-[10px] text-muted-foreground">Run your own what-if</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Running State */}
      {running && (
        <Card className="p-6 text-center border border-primary/30">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
          <p className="text-sm font-semibold">Simulating scenario...</p>
          <p className="text-xs text-muted-foreground">Gathering platform state · Running 13-dimension projection · Generating proactive recommendations</p>
        </Card>
      )}

      {/* Results */}
      {!running && displayScenario && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Latest Simulation Results</p>
              <p className="text-sm font-bold mt-0.5">{displayScenario.name}</p>
              <p className="text-[10px] text-muted-foreground italic">"{displayScenario.question}"</p>
            </div>
            {selectedHistory && (
              <Button variant="outline" size="sm" onClick={() => setSelectedHistory(null)}>Show Latest</Button>
            )}
          </div>
          <ScenarioResults scenario={displayScenario} />
        </div>
      )}

      {/* History */}
      {scenarios.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1"><History className="w-3.5 h-3.5" />Simulation History</p>
          <div className="space-y-2">
            {scenarios.slice(0, 10).map(s => (
              <Card key={s.id} className={`p-3 border ${selectedHistory?.id === s.id ? "border-primary" : "border-border/60"} cursor-pointer hover:border-primary/40 transition-colors`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0" onClick={() => s.status === 'completed' && setSelectedHistory(s)}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge variant="outline" className="text-[8px] capitalize">{s.scenario_type.replace(/_/g, " ")}</Badge>
                      <Badge variant={s.status === 'completed' ? 'default' : s.status === 'failed' ? 'destructive' : 'secondary'} className="text-[8px]">{s.status}</Badge>
                      <span className="text-[10px] text-muted-foreground">{moment(s.created_date).format("MMM D, HH:mm")}</span>
                    </div>
                    <p className="text-xs font-semibold truncate">{s.name}</p>
                    {s.summary && <p className="text-[10px] text-muted-foreground truncate">{s.summary}</p>}
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => deleteScenario(s.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Custom Scenario Dialog */}
      <Dialog open={showCustom} onOpenChange={setShowCustom}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Custom What-If Scenario</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Scenario Name (optional)</Label><Input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="e.g. Competitor launches cheaper alternative" /></div>
            <div><Label>What-If Question *</Label><Textarea rows={3} value={customQuestion} onChange={e => setCustomQuestion(e.target.value)} placeholder="e.g. What if a competitor launches a free alternative and we lose 30% of subscriptions?" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustom(false)}>Cancel</Button>
            <Button onClick={handleCustom} disabled={!customQuestion || running}>
              {running ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Play className="w-4 h-4 mr-1" />}
              Run Simulation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}