import { useState, useMemo } from "react";
import { ChevronRight, ArrowRight } from "lucide-react";

const CATEGORY_COLORS = {
  company: "#3b82f6", department: "#6366f1", person: "#8b5cf6", ai_employee: "#a855f7",
  project: "#0ea5e9", task: "#06b6d4", evidence: "#ef4444", case: "#dc2626",
  canon: "#f59e0b", law: "#f97316", policy: "#eab308", document: "#64748b",
  revenue: "#10b981", customer: "#14b8a6", subscription: "#0d9488", invoice: "#059669",
  approval: "#ec4899", build: "#f97316", infrastructure: "#78716c", module: "#6366f1", api: "#0891b2", other: "#94a3b8",
};

const CATEGORY_LABELS = {
  company: "Company", department: "Department", person: "Person", ai_employee: "AI Employee",
  project: "Project", task: "Task", evidence: "Evidence", case: "Case",
  canon: "Canon", law: "Law", policy: "Policy", document: "Document",
  revenue: "Revenue", customer: "Customer", subscription: "Subscription", invoice: "Invoice",
  approval: "Approval", build: "Build", infrastructure: "Infrastructure", module: "Module", api: "API", other: "Other",
};

export default function GraphCanvas({ centerNode, outgoing, incoming, connectedNodes, onNavigate, mode }) {
  const [hovered, setHovered] = useState(null);

  const connections = useMemo(() => {
    const all = [];
    outgoing?.forEach(o => all.push({ ...o, direction: 'out', id: o.target_id, name: o.target_name, type: o.target_type }));
    incoming?.forEach(i => all.push({ ...i, direction: 'in', id: i.source_id, name: i.source_name, type: i.source_type }));
    return all;
  }, [outgoing, incoming]);

  // Radial layout: center node in middle, connections arranged in circle
  const radius = 220;
  const positions = useMemo(() => {
    const pos = {};
    if (connections.length === 0) return pos;
    connections.forEach((c, i) => {
      const angle = (i / connections.length) * 2 * Math.PI - Math.PI / 2;
      pos[c.id] = { x: 300 + radius * Math.cos(angle), y: 300 + radius * Math.sin(angle) };
    });
    return pos;
  }, [connections]);

  const center = { x: 300, y: 300 };
  const centerColor = CATEGORY_COLORS[centerNode?.entity_category] || "#64748b";

  if (!centerNode) {
    return (
      <div className="flex items-center justify-center h-[500px] text-muted-foreground text-sm">
        Search and select a node to explore the graph.
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <svg viewBox="0 0 600 600" className="w-full h-[500px] border border-border/40 rounded-lg bg-slate-50 dark:bg-slate-900/40">
        {/* Edges */}
        {connections.map((c) => {
          const pos = positions[c.id];
          if (!pos) return null;
          const isHovered = hovered === c.id;
          const stroke = c.direction === 'out' ? '#3b82f6' : '#ec4899';
          return (
            <g key={c.id}>
              <line
                x1={center.x} y1={center.y} x2={pos.x} y2={pos.y}
                stroke={isHovered ? stroke : stroke + '60'} strokeWidth={isHovered ? 2.5 : 1.5}
                strokeDasharray={c.direction === 'in' ? '4 2' : 'none'}
              />
              {/* Relationship label */}
              <text
                x={(center.x + pos.x) / 2} y={(center.y + pos.y) / 2 - 4}
                textAnchor="middle" className="fill-muted-foreground"
                style={{ fontSize: '8px', fontWeight: 600 }}
              >
                {c.relationship}
              </text>
            </g>
          );
        })}

        {/* Connected nodes */}
        {connections.map((c) => {
          const pos = positions[c.id];
          if (!pos) return null;
          const profile = connectedNodes?.find(n => n.entity_id === c.id);
          const color = CATEGORY_COLORS[profile?.entity_category || CATEGORY_LABELS[c.type]?.toLowerCase()] || "#94a3b8";
          const isHovered = hovered === c.id;
          const r = isHovered ? 28 : 24;
          return (
            <g key={`node-${c.id}`} className="cursor-pointer"
               onMouseEnter={() => setHovered(c.id)} onMouseLeave={() => setHovered(null)}
               onClick={() => onNavigate(c.type, c.id)}>
              <circle cx={pos.x} cy={pos.y} r={r} fill={color} fillOpacity={0.85} stroke="white" strokeWidth={2} />
              <text x={pos.x} y={pos.y - 34} textAnchor="middle" className="fill-foreground" style={{ fontSize: '9px', fontWeight: 600 }}>
                {(c.name || c.id.slice(-8)).slice(0, 18)}
              </text>
              <text x={pos.x} y={pos.y + 4} textAnchor="middle" fill="white" style={{ fontSize: '8px' }}>
                {c.direction === 'out' ? '→ dep' : '← dep'}
              </text>
              <text x={pos.x} y={pos.y + 34} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: '7px' }}>
                {c.type}
              </text>
            </g>
          );
        })}

        {/* Center node */}
        <circle cx={center.x} cy={center.y} r="36" fill={centerColor} stroke="white" strokeWidth="3" />
        <text x={center.x} y={center.y + 4} textAnchor="middle" fill="white" style={{ fontSize: '11px', fontWeight: 700 }}>
          {(centerNode.entity_name || '').slice(0, 12)}
        </text>
        <text x={center.x} y={center.y + 50} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: '9px', fontWeight: 600 }}>
          {centerNode.entity_type}
        </text>
      </svg>

      {/* Legend */}
      <div className="absolute top-2 left-2 bg-white dark:bg-slate-800 rounded-md border border-border/40 p-2 text-[9px] space-y-0.5 shadow-sm">
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#3b82f6' }} />Outgoing (depends on)</div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#ec4899' }} />Incoming (depended by)</div>
      </div>

      {connections.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-xs text-muted-foreground bg-white dark:bg-slate-800 px-3 py-1.5 rounded-md border border-border/40">
            No connections yet. Run auto-connect to discover relationships.
          </p>
        </div>
      )}
    </div>
  );
}