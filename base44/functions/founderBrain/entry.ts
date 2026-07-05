import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { operation, params } = body;

    const fetchAll = async (entityName, limit = 200) => {
      try { return await base44.asServiceRole.entities[entityName].list('-created_date', limit); }
      catch { return []; }
    };

    const getCurrentBrain = async () => {
      const all = await fetchAll('FounderBrain', 200);
      return all.find(b => b.is_current === true) || all.find(b => b.status === 'active') || null;
    };

    const nextVersion = (allBrains) => {
      let maxMajor = 0, maxMinor = 0;
      allBrains.forEach(b => {
        const parts = (b.version || "1.0").split(".");
        const major = parseInt(parts[0]) || 0;
        const minor = parseInt(parts[1]) || 0;
        if (major > maxMajor || (major === maxMajor && minor > maxMinor)) {
          maxMajor = major; maxMinor = minor;
        }
      });
      return `${maxMajor}.${maxMinor + 1}`;
    };

    // ── GET CURRENT ──
    if (operation === 'get_current') {
      const all = await fetchAll('FounderBrain', 200);
      const current = all.find(b => b.is_current === true) || all.find(b => b.status === 'active') || null;
      const pending = all.filter(b => b.status === 'pending_approval').sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      const history = all.sort((a, b) => {
        const va = parseFloat(b.version || "0");
        const vb = parseFloat(a.version || "0");
        return va - vb;
      });
      return Response.json({ current, pending_updates: pending, all_versions: history, operation: 'get_current' });
    }

    // ── REFERENCE FOR AGENT ──
    if (operation === 'reference_for_agent') {
      const current = await getCurrentBrain();
      if (!current) {
        return Response.json({
          reference: "FOUNDER BRAIN: Not yet initialized. All AI recommendations must be conservative, avoid autonomous high-risk actions, and escalate to founder for approval on any decision involving payments, external communication, legal matters, or data deletion.",
          initialized: false,
          operation: 'reference_for_agent'
        });
      }

      const fmtArr = (arr, field) => (arr || [])
        .map(item => typeof item === 'string' ? item : (item[field] || item.title || item.goal || item.description || JSON.stringify(item)))
        .filter(Boolean);

      const risk = current.risk_tolerance || {};
      const approval = current.approval_preferences || {};

      const ref = `═══ FOUNDER BRAIN DIRECTIVE (v${current.version}) ═══

VISION: ${current.vision || "Not specified"}
MISSION: ${current.mission || "Not specified"}

BUSINESS PHILOSOPHY: ${current.business_philosophy || "Not specified"}
PRODUCT PHILOSOPHY: ${current.product_philosophy || "Not specified"}
ENGINEERING PHILOSOPHY: ${current.engineering_philosophy || "Not specified"}
LEGAL PHILOSOPHY: ${current.legal_philosophy || "Not specified"}

LEADERSHIP STYLE: ${current.leadership_style || "Not specified"}
COMMUNICATION STYLE: ${current.communication_style || "Not specified"}

RISK TOLERANCE:
- Overall: ${risk.overall || "conservative"}
- Comfortable with: ${(risk.comfortable_with || []).join(", ") || "N/A"}
- Avoids: ${(risk.avoids || []).join(", ") || "N/A"}

APPROVAL PREFERENCES:
- Always requires approval: ${(approval.always_requires_approval || []).join(", ") || "payments, external communication, legal actions, data deletion, deployments"}
- Can decide autonomously: ${(approval.can_decide_autonomously || []).join(", ") || "internal organization, documentation, research"}
- Preferred flow: ${approval.preferred_flow || "review → approve → execute"}

TOP PRIORITIES: ${fmtArr(current.priorities, "item").join(" | ")}

STRATEGIC GOALS: ${fmtArr(current.strategic_goals, "goal").join(" | ")}

RECENT LESSONS LEARNED: ${fmtArr((current.lessons_learned || []).slice(-5), "title").join(" | ")}

═══ CRITICAL DIRECTIVE ═══
All AI recommendations MUST align with the above founder philosophy.
- Never contradict founder vision, mission, or philosophy.
- Respect risk tolerance boundaries — do not recommend actions the founder avoids.
- When uncertain or when an action requires approval, ESCALATE to founder.
- NEVER overwrite or modify the Founder Brain automatically.
- All Founder Brain updates require explicit founder approval.`;

      return Response.json({ reference: ref, version: current.version, initialized: true, operation: 'reference_for_agent' });
    }

    // ── REQUEST UPDATE ──
    if (operation === 'request_update') {
      const { changes, update_reason } = params;
      if (!changes) return Response.json({ error: 'changes required' }, { status: 400 });

      const current = await getCurrentBrain();
      const allBrains = await fetchAll('FounderBrain', 200);
      const newVersion = nextVersion(allBrains);

      // Merge: start from current, apply changes
      const base = current || {};
      const merged = { ...base };
      Object.keys(changes).forEach(key => { merged[key] = changes[key]; });

      const created = await base44.asServiceRole.entities.FounderBrain.create({
        version: newVersion,
        is_current: false,
        status: 'pending_approval',
        vision: merged.vision || "",
        mission: merged.mission || "",
        business_philosophy: merged.business_philosophy || "",
        product_philosophy: merged.product_philosophy || "",
        engineering_philosophy: merged.engineering_philosophy || "",
        legal_philosophy: merged.legal_philosophy || "",
        leadership_style: merged.leadership_style || "",
        approval_preferences: merged.approval_preferences || {},
        risk_tolerance: merged.risk_tolerance || {},
        priorities: merged.priorities || [],
        communication_style: merged.communication_style || "",
        decision_history: merged.decision_history || [],
        lessons_learned: merged.lessons_learned || [],
        strategic_goals: merged.strategic_goals || [],
        update_reason: update_reason || "",
        requested_by: user.full_name || user.email,
        tags: ["pending"],
      });

      return Response.json({ pending_version: created, operation: 'request_update' });
    }

    // ── APPROVE UPDATE ──
    if (operation === 'approve_update') {
      const { brain_id } = params;
      if (!brain_id) return Response.json({ error: 'brain_id required' }, { status: 400 });

      const pending = await base44.asServiceRole.entities.FounderBrain.get(brain_id);
      if (pending.status !== 'pending_approval') {
        return Response.json({ error: 'Brain version is not pending approval' }, { status: 400 });
      }

      // Supersede current
      const current = await getCurrentBrain();
      if (current && current.id !== brain_id) {
        await base44.asServiceRole.entities.FounderBrain.update(current.id, {
          is_current: false,
          status: 'superseded',
          superseded_by_version: pending.version,
        });
      }

      // Approve pending
      const approved = await base44.asServiceRole.entities.FounderBrain.update(brain_id, {
        is_current: true,
        status: 'active',
        approved_by: user.full_name || user.email,
        approved_at: new Date().toISOString(),
      });

      return Response.json({ current: approved, operation: 'approve_update' });
    }

    // ── REJECT UPDATE ──
    if (operation === 'reject_update') {
      const { brain_id, rejection_reason } = params;
      if (!brain_id) return Response.json({ error: 'brain_id required' }, { status: 400 });

      const rejected = await base44.asServiceRole.entities.FounderBrain.update(brain_id, {
        status: 'rejected',
        rejection_reason: rejection_reason || "",
      });

      return Response.json({ rejected, operation: 'reject_update' });
    }

    // ── INITIALIZE (first brain) ──
    if (operation === 'initialize') {
      const existing = await getCurrentBrain();
      if (existing) return Response.json({ error: 'Founder Brain already initialized', current: existing }, { status: 400 });

      const { initial_data } = params;
      const created = await base44.asServiceRole.entities.FounderBrain.create({
        version: "1.0",
        is_current: true,
        status: 'active',
        vision: initial_data?.vision || "",
        mission: initial_data?.mission || "",
        business_philosophy: initial_data?.business_philosophy || "",
        product_philosophy: initial_data?.product_philosophy || "",
        engineering_philosophy: initial_data?.engineering_philosophy || "",
        legal_philosophy: initial_data?.legal_philosophy || "",
        leadership_style: initial_data?.leadership_style || "",
        approval_preferences: initial_data?.approval_preferences || {
          always_requires_approval: ["payments", "external communication", "legal actions", "data deletion", "deployments"],
          can_decide_autonomously: ["internal organization", "documentation", "research"],
          preferred_flow: "review → approve → execute",
        },
        risk_tolerance: initial_data?.risk_tolerance || {
          overall: "conservative",
          comfortable_with: ["calculated experiments", "incremental improvement"],
          avoids: ["unauthorized external communication", "high-risk financial commitments", "autonomous legal actions"],
        },
        priorities: initial_data?.priorities || [],
        communication_style: initial_data?.communication_style || "",
        decision_history: [],
        lessons_learned: [],
        strategic_goals: initial_data?.strategic_goals || [],
        update_reason: "Initial initialization",
        requested_by: user.full_name || user.email,
        approved_by: user.full_name || user.email,
        approved_at: new Date().toISOString(),
        tags: ["initial"],
      });

      return Response.json({ current: created, operation: 'initialize' });
    }

    // ── OVERVIEW ──
    if (operation === 'overview') {
      const all = await fetchAll('FounderBrain', 200);
      const current = all.find(b => b.is_current === true);
      const pending = all.filter(b => b.status === 'pending_approval');

      return Response.json({
        overview: {
          has_current: !!current,
          current_version: current?.version || "None",
          total_versions: all.length,
          pending_approvals: pending.length,
          decisions_recorded: current?.decision_history?.length || 0,
          lessons_recorded: current?.lessons_learned?.length || 0,
          strategic_goals: current?.strategic_goals?.length || 0,
          priorities: current?.priorities?.length || 0,
        },
        operation: 'overview'
      });
    }

    return Response.json({ error: 'Unknown operation: ' + operation }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});