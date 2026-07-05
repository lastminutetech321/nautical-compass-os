import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Dna, Sparkles, RefreshCw, CheckCircle2, XCircle, AlertTriangle, ScrollText } from 'lucide-react';
import EvolutionMetricsBar from '@/components/evolution/EvolutionMetricsBar';
import ProposalCard from '@/components/evolution/ProposalCard';
import ProposalDetail from '@/components/evolution/ProposalDetail';

export default function NCEvolutionEngine() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [approving, setApproving] = useState(null);
  const [data, setData] = useState(null);
  const [allProposals, setAllProposals] = useState([]);
  const [selected, setSelected] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scanSummary, setScanSummary] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await base44.functions.invoke('ncEvolutionEngine', { operation: 'dashboard', params: {} });
      setData(res.data);
      const listRes = await base44.functions.invoke('ncEvolutionEngine', { operation: 'list_proposals', params: {} });
      setAllProposals(listRes.data.proposals || []);
    } catch (err) {
      toast({ title: 'Error loading', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleScan = async () => {
    try {
      setScanning(true);
      const res = await base44.functions.invoke('ncEvolutionEngine', { operation: 'scan', params: {} });
      setScanSummary(res.data.scan_summary);
      toast({
        title: 'Evolution Scan Complete',
        description: res.data.proposals_created > 0
          ? `${res.data.proposals_created} proposals generated. ${res.data.scan_summary?.high_priority_count || 0} high priority.`
          : 'No new completed work to analyze.'
      });
      await load();
    } catch (err) {
      toast({ title: 'Scan failed', description: err.message, variant: 'destructive' });
    } finally {
      setScanning(false);
    }
  };

  const handleApprove = async (proposal) => {
    try {
      setApproving(proposal.id);
      const res = await base44.functions.invoke('ncEvolutionEngine', { operation: 'approve', params: { proposal_id: proposal.id } });
      const roadmapCreated = res.data.roadmap_item ? ' Roadmap item created.' : '';
      const lessonCreated = res.data.lesson ? ' Lesson extracted.' : '';
      toast({ title: 'Proposal Approved', description: `Accepted by founder.${roadmapCreated}${lessonCreated}` });
      setDrawerOpen(false);
      await load();
    } catch (err) {
      toast({ title: 'Approval failed', description: err.message, variant: 'destructive' });
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async (proposal) => {
    try {
      setApproving(proposal.id);
      await base44.functions.invoke('ncEvolutionEngine', { operation: 'reject', params: { proposal_id: proposal.id, reason: 'Rejected by founder' } });
      toast({ title: 'Proposal Rejected', description: 'Evolution proposal dismissed.' });
      setDrawerOpen(false);
      await load();
    } catch (err) {
      toast({ title: 'Rejection failed', description: err.message, variant: 'destructive' });
    } finally {
      setApproving(null);
    }
  };

  const openProposal = (proposal) => {
    setSelected(proposal);
    setDrawerOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const metrics = data?.metrics || {};
  const pending = data?.pending_proposals || [];
  const recent = data?.recent_proposals || [];

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-500/20">
            <Dna className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">NC Evolution Engine</h1>
            <p className="text-xs text-slate-400">Continuously improve NCOS · Learn from every completed task · Never repeat mistakes</p>
          </div>
        </div>
        <Button onClick={handleScan} disabled={scanning} className="bg-violet-600 hover:bg-violet-700">
          {scanning ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Scanning...</> : <><Sparkles className="w-4 h-4 mr-2" />Run Evolution Scan</>}
        </Button>
      </div>

      {scanSummary && (
        <Card className="p-4 bg-violet-950/20 border-violet-500/30 mb-4">
          <div className="flex items-start gap-3">
            <ScrollText className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-violet-300">Last Scan Summary</h3>
              <p className="text-sm text-slate-300 mt-1">{scanSummary.overall_health_assessment}</p>
              <p className="text-xs text-slate-400 mt-1"><span className="text-violet-400 font-medium">Key Learning:</span> {scanSummary.key_learning}</p>
              <div className="flex gap-4 mt-2 text-xs">
                <span className="text-slate-400">Scanned: <span className="text-white">{scanSummary.total_scanned}</span></span>
                <span className="text-slate-400">Generated: <span className="text-white">{scanSummary.proposals_generated}</span></span>
                <span className="text-slate-400">High Priority: <span className="text-orange-400">{scanSummary.high_priority_count}</span></span>
              </div>
            </div>
          </div>
        </Card>
      )}

      <EvolutionMetricsBar metrics={metrics} />

      <Tabs defaultValue="pending">
        <TabsList className="bg-slate-900 border border-slate-800 mb-4">
          <TabsTrigger value="pending" className="text-xs">
            {metrics.pending_count > 0 && <AlertTriangle className="w-3 h-3 mr-1 text-amber-400" />}
            Pending ({metrics.pending_count || 0})
          </TabsTrigger>
          <TabsTrigger value="all" className="text-xs">All Proposals</TabsTrigger>
          <TabsTrigger value="approved" className="text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />Approved</TabsTrigger>
          <TabsTrigger value="recent" className="text-xs">Recent</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {pending.length === 0 ? (
            <Card className="p-12 bg-slate-900/50 border-slate-800 text-center">
              <Dna className="w-10 h-10 text-violet-400 mx-auto mb-3" />
              <p className="text-slate-400">No pending proposals. Run an evolution scan to analyze completed work.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pending.map(p => (
                <ProposalCard
                  key={p.id}
                  proposal={p}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onView={openProposal}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all">
          {allProposals.length === 0 ? (
            <Card className="p-12 bg-slate-900/50 border-slate-800 text-center">
              <p className="text-slate-400">No proposals yet.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allProposals.map(p => (
                <ProposalCard
                  key={p.id}
                  proposal={p}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onView={openProposal}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="approved">
          {allProposals.filter(p => p.status === 'approved' || p.status === 'implemented').length === 0 ? (
            <Card className="p-12 bg-slate-900/50 border-slate-800 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <p className="text-slate-400">No approved proposals yet. Approve a pending proposal to auto-create a roadmap item.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allProposals.filter(p => p.status === 'approved' || p.status === 'implemented').map(p => (
                <ProposalCard key={p.id} proposal={p} onApprove={handleApprove} onReject={handleReject} onView={openProposal} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="recent">
          {recent.length === 0 ? (
            <Card className="p-12 bg-slate-900/50 border-slate-800 text-center">
              <p className="text-slate-400">No recent proposals.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recent.map(p => (
                <ProposalCard key={p.id} proposal={p} onApprove={handleApprove} onReject={handleReject} onView={openProposal} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ProposalDetail
        proposal={selected}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
}