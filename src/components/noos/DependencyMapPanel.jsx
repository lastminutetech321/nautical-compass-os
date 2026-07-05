import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Network, RefreshCw, AlertTriangle, Building2, Box, Bot, Workflow } from "lucide-react";

const typeIcon = (type) => {
  if (type === 'department') return Building2;
  if (type === 'module') return Box;
  if (type === 'ai_agent') return Bot;
  if (type === 'workflow') return Workflow;
  return Network;
};

const typeColor = (type) => {
  if (type === 'department') return 'text-blue-500';
  if (type === 'module') return 'text-purple-500';
  if (type === 'ai_agent') return 'text-emerald-500';
  if (type === 'workflow') return 'text-amber-500';
  return 'text-muted-foreground';
};

export default function DependencyMapPanel() {
  const [nodes, setNodes] = useState([]);
  const [bottlenecks, setBottlenecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const items = await base44.entities.OrgDependency.list('-created_date', 200);
      setNodes(items);
      setBottlenecks(items.filter(n => n.is_bottleneck));
    } catch (e) { /* ignore */ }
    setLoading(false);
  }, []);

  const generate = async () => {
    setLoading(true);
    try {
      await base44.functions.invoke('ncNOOS', { operation: 'dependency_map' });
      load();
    } catch (e) { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, [load]);

  const filtered = filter === 'all' ? nodes : nodes.filter(n => n.node_type === filter);
  const counts = {
    department: nodes.filter(n => n.node_type === 'department').length,
    module: nodes.filter(n => n.node_type === 'module').length,
    ai_agent: nodes.filter(n => n.node_type === 'ai_agent').length,
    workflow: nodes.filter(n => n.node_type === 'workflow').length,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Network className="h-5 w-5" /> Organizational Dependency Map
          </h2>
          <p className="text-xs text-muted-foreground">Live graph of department, module, entity, automation, AI, and workflow dependencies</p>
        </div>
        <Button variant="outline" size="sm" onClick={generate}>
          <RefreshCw className="h-3 w-3 mr-1" /> Regenerate Map
        </Button>
      </div>

      {bottlenecks.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="font-medium text-amber-900">{bottlenecks.length} Bottlenecks Detected</span>
            </div>
            <div className="space-y-1">
              {bottlenecks.slice(0, 5).map((b, i) => (
                <div key={i} className="text-xs flex items-center justify-between">
                  <span className="font-medium">{b.node_name}</span>
                  <Badge variant="destructive" className="text-xs">{b.bottleneck_severity}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 flex-wrap">
        <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>
          All ({nodes.length})
        </Button>
        <Button variant={filter === 'department' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('department')}>
          <Building2 className="h-3 w-3 mr-1" /> Departments ({counts.department})
        </Button>
        <Button variant={filter === 'module' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('module')}>
          <Box className="h-3 w-3 mr-1" /> Modules ({counts.module})
        </Button>
        <Button variant={filter === 'ai_agent' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('ai_agent')}>
          <Bot className="h-3 w-3 mr-1" /> AI Agents ({counts.ai_agent})
        </Button>
        <Button variant={filter === 'workflow' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('workflow')}>
          <Workflow className="h-3 w-3 mr-1" /> Workflows ({counts.workflow})
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Building dependency map...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <Network className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-3">No dependency nodes yet.</p>
            <Button onClick={generate}><Network className="h-4 w-4 mr-2" /> Generate Dependency Map</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((node) => {
            const Icon = typeIcon(node.node_type);
            return (
              <Card key={node.id} className={node.is_bottleneck ? 'border-amber-300' : ''}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${typeColor(node.node_type)}`} />
                      <div>
                        <div className="font-medium text-sm">{node.node_name}</div>
                        <div className="text-xs text-muted-foreground capitalize">{node.node_type.replace(/_/g, ' ')}</div>
                      </div>
                    </div>
                    {node.is_bottleneck && <Badge variant="destructive" className="text-xs">Bottleneck</Badge>}
                  </div>
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Health:</span>
                      <span className="font-semibold">{node.health_score}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Depends on:</span>
                      <span className="font-semibold">{(node.depends_on || []).length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Depended by:</span>
                      <span className="font-semibold">{(node.depended_by || []).length}</span>
                    </div>
                    {node.blocked_count > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Blocked items:</span>
                        <span className="font-semibold text-red-500">{node.blocked_count}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}