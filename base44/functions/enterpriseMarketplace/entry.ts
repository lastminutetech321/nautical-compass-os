import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { operation, params } = body;

    const fetchAll = async (entityName, limit = 100) => {
      try { return await base44.asServiceRole.entities[entityName].list('-created_date', limit); }
      catch { return []; }
    };

    // ── GET MODULES ──
    if (operation === 'get_modules') {
      const { category, search, pricing_model } = params || {};
      let modules = await fetchAll('MarketplaceModule', 100);
      modules = modules.filter(m => m.status === 'published' || m.status === 'deprecated');
      if (category && category !== 'all') modules = modules.filter(m => m.category === category);
      if (pricing_model && pricing_model !== 'all') modules = modules.filter(m => m.pricing_model === pricing_model);
      if (search) {
        const s = search.toLowerCase();
        modules = modules.filter(m => m.name?.toLowerCase().includes(s) || m.description?.toLowerCase().includes(s) || (m.tags || []).some(t => t.toLowerCase().includes(s)));
      }
      return Response.json({ modules: modules.sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0)), operation: 'get_modules' });
    }

    // ── GET MODULE ──
    if (operation === 'get_module') {
      const { module_id } = params;
      const mod = await base44.asServiceRole.entities.MarketplaceModule.get(module_id);
      const reviews = await fetchAll('ModuleReview', 100);
      const moduleReviews = reviews.filter(r => r.module_id === module_id && r.status === 'published');
      return Response.json({ module: mod, reviews: moduleReviews, operation: 'get_module' });
    }

    // ── CREATE MODULE ──
    if (operation === 'create_module') {
      const m = params;
      const mod = await base44.asServiceRole.entities.MarketplaceModule.create({
        ...m,
        status: m.status || 'published',
        current_version: m.current_version || '1.0.0',
        version_history: m.version_history || [{ version: m.current_version || '1.0.0', date: new Date().toISOString().split('T')[0], changelog: 'Initial release', breaking_changes: [] }],
        published_at: new Date().toISOString(),
        created_by: user.full_name || user.email,
        total_installs: 0,
        active_installs: 0,
        avg_rating: 0,
        review_count: 0,
      });
      return Response.json({ module: mod, operation: 'create_module' });
    }

    // ── GENERATE LISTING (AI) ──
    if (operation === 'generate_listing') {
      const { module_name, description, category } = params;
      const prompt = `You are the NCOS Enterprise Marketplace listing generator. Create a compelling marketplace listing for an NCOS module that is being turned into a sellable product.

MODULE NAME: ${module_name}
BRIEF DESCRIPTION: ${description || 'Not provided'}
CATEGORY: ${category || 'general'}

Generate a complete marketplace listing with:
- name: the module name
- slug: url-friendly slug
- description: one-line tagline (max 100 chars)
- long_description: 2-3 paragraph detailed description explaining what the module does, who it's for, and the value it provides
- features: array of 5-8 key features (short, benefit-oriented phrases)
- pricing_model: recommend the best model (free, freemium, subscription, enterprise, usage_based)
- price_monthly: recommended monthly price in USD (0 if free)
- price_annual: recommended annual price (usually 10x monthly)
- price_enterprise: recommended enterprise price
- trial_days: recommended trial period (14 or 30 typical, 0 if free)
- dependencies: array of dependency objects {module_name, min_version, required} — what other NCOS modules this depends on
- documentation: markdown documentation outline (installation steps, key concepts, configuration)
- install_instructions: step-by-step install guide
- tags: 5-8 relevant tags
- module_type: standalone, extension, integration, template, or full_platform

Make this realistic and professional. Price based on the module's complexity and target market.`;

      const llmRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            name: { type: "string" }, slug: { type: "string" }, description: { type: "string" },
            long_description: { type: "string" }, features: { type: "array", items: { type: "string" } },
            pricing_model: { type: "string" }, price_monthly: { type: "number" }, price_annual: { type: "number" },
            price_enterprise: { type: "number" }, trial_days: { type: "number" },
            dependencies: { type: "array", items: { type: "object" } },
            documentation: { type: "string" }, install_instructions: { type: "string" },
            tags: { type: "array", items: { type: "string" } }, module_type: { type: "string" },
            category: { type: "string" },
          }
        },
        model: "claude_sonnet_4_6",
      });
      const listing = typeof llmRes === 'string' ? JSON.parse(llmRes) : llmRes;
      return Response.json({ listing, operation: 'generate_listing' });
    }

    // ── GET ENTERPRISES ──
    if (operation === 'get_enterprises') {
      const [clones, orgs] = await Promise.all([
        fetchAll('EnterpriseClone', 50),
        fetchAll('EnterpriseOrg', 50),
      ]);
      const enterprises = [
        ...clones.map(c => ({ id: c.id, name: c.clone_name || c.name, type: 'clone', industry: c.industry })),
        ...orgs.map(o => ({ id: o.id, name: o.name || o.org_name, type: 'org', industry: o.industry })),
      ];
      return Response.json({ enterprises, operation: 'get_enterprises' });
    }

    // ── CHECK DEPENDENCIES ──
    if (operation === 'check_dependencies') {
      const { module_id, enterprise_id } = params;
      const mod = await base44.asServiceRole.entities.MarketplaceModule.get(module_id);
      const installations = await fetchAll('ModuleInstallation', 100);
      const entInstalls = installations.filter(i => i.enterprise_id === enterprise_id && i.status === 'active');
      const installedNames = new Set(entInstalls.map(i => i.module_name));
      const deps = mod.dependencies || [];
      const results = deps.map(d => ({
        module_name: d.module_name,
        min_version: d.min_version,
        required: d.required,
        installed: installedNames.has(d.module_name),
        installed_version: entInstalls.find(i => i.module_name === d.module_name)?.installed_version,
      }));
      const missing = results.filter(r => r.required && !r.installed);
      return Response.json({ dependencies: results, all_satisfied: missing.length === 0, missing, operation: 'check_dependencies' });
    }

    // ── INSTALL MODULE ──
    if (operation === 'install_module') {
      const { module_id, enterprise_id, enterprise_name, license_type, seats, auto_update } = params;
      const mod = await base44.asServiceRole.entities.MarketplaceModule.get(module_id);

      const installations = await fetchAll('ModuleInstallation', 100);
      const entInstalls = installations.filter(i => i.enterprise_id === enterprise_id && i.status === 'active');
      const installedNames = new Set(entInstalls.map(i => i.module_name));
      const deps = mod.dependencies || [];
      const missing = deps.filter(d => d.required && !installedNames.has(d.module_name));
      if (missing.length > 0) {
        return Response.json({ error: 'Missing required dependencies', missing, operation: 'install_module' }, { status: 400 });
      }

      const existing = entInstalls.find(i => i.module_id === module_id);
      if (existing) {
        return Response.json({ error: 'Module already installed', installation: existing, operation: 'install_module' }, { status: 400 });
      }

      const now = new Date();
      const trialEnd = license_type === 'trial' && mod.trial_days > 0
        ? new Date(now.getTime() + mod.trial_days * 86400000).toISOString() : null;

      const installation = await base44.asServiceRole.entities.ModuleInstallation.create({
        module_id,
        module_name: mod.name,
        module_slug: mod.slug,
        installed_version: mod.current_version,
        enterprise_id,
        enterprise_name: enterprise_name || '',
        license_type: license_type || (mod.pricing_model === 'free' ? 'free' : 'subscription'),
        status: 'active',
        install_date: now.toISOString(),
        trial_end_date: trialEnd,
        seats: seats || 1,
        auto_update: auto_update !== false,
        installed_by: user.full_name || user.email,
      });

      await base44.asServiceRole.entities.ModuleUsageEvent.create({
        module_id, module_name: mod.name, installation_id: installation.id,
        enterprise_id, enterprise_name: enterprise_name || '',
        event_type: license_type === 'trial' ? 'trial_start' : 'install',
        event_data: { version: mod.current_version, license_type },
        user_id: user.id,
      });

      await base44.asServiceRole.entities.MarketplaceModule.update(module_id, {
        total_installs: (mod.total_installs || 0) + 1,
        active_installs: (mod.active_installs || 0) + 1,
      });

      return Response.json({ installation, operation: 'install_module' });
    }

    // ── UNINSTALL MODULE ──
    if (operation === 'uninstall_module') {
      const { installation_id } = params;
      const inst = await base44.asServiceRole.entities.ModuleInstallation.get(installation_id);
      await base44.asServiceRole.entities.ModuleInstallation.update(installation_id, { status: 'uninstalled', last_updated: new Date().toISOString() });
      await base44.asServiceRole.entities.ModuleUsageEvent.create({
        module_id: inst.module_id, module_name: inst.module_name, installation_id,
        enterprise_id: inst.enterprise_id, enterprise_name: inst.enterprise_name,
        event_type: 'uninstall', user_id: user.id,
      });
      const mod = await base44.asServiceRole.entities.MarketplaceModule.get(inst.module_id);
      await base44.asServiceRole.entities.MarketplaceModule.update(inst.module_id, {
        active_installs: Math.max(0, (mod.active_installs || 1) - 1),
      });
      return Response.json({ success: true, operation: 'uninstall_module' });
    }

    // ── UPDATE MODULE (version) ──
    if (operation === 'update_module') {
      const { installation_id } = params;
      const inst = await base44.asServiceRole.entities.ModuleInstallation.get(installation_id);
      const mod = await base44.asServiceRole.entities.MarketplaceModule.get(inst.module_id);
      if (inst.installed_version === mod.current_version) {
        return Response.json({ error: 'Already on latest version', operation: 'update_module' }, { status: 400 });
      }
      const oldVersion = inst.installed_version;
      await base44.asServiceRole.entities.ModuleInstallation.update(installation_id, {
        installed_version: mod.current_version,
        status: 'active',
        last_updated: new Date().toISOString(),
        update_available: false,
        available_version: '',
      });
      await base44.asServiceRole.entities.ModuleUsageEvent.create({
        module_id: inst.module_id, module_name: inst.module_name, installation_id,
        enterprise_id: inst.enterprise_id, enterprise_name: inst.enterprise_name,
        event_type: 'update', event_data: { from: oldVersion, to: mod.current_version }, user_id: user.id,
      });
      return Response.json({ installation: { ...inst, installed_version: mod.current_version }, operation: 'update_module' });
    }

    // ── CHECK FOR UPDATES ──
    if (operation === 'check_updates') {
      const { enterprise_id } = params;
      const installations = await fetchAll('ModuleInstallation', 100);
      const modules = await fetchAll('MarketplaceModule', 100);
      const entInstalls = installations.filter(i => i.enterprise_id === enterprise_id && i.status === 'active');
      const updates = [];
      for (const inst of entInstalls) {
        const mod = modules.find(m => m.id === inst.module_id);
        if (mod && mod.current_version !== inst.installed_version) {
          updates.push({ installation_id: inst.id, module_name: inst.module_name, current: inst.installed_version, available: mod.current_version });
          await base44.asServiceRole.entities.ModuleInstallation.update(inst.id, { update_available: true, available_version: mod.current_version });
        }
      }
      return Response.json({ updates, operation: 'check_updates' });
    }

    // ── GET INSTALLATIONS ──
    if (operation === 'get_installations') {
      const { enterprise_id } = params;
      const installations = await fetchAll('ModuleInstallation', 100);
      const filtered = enterprise_id
        ? installations.filter(i => i.enterprise_id === enterprise_id)
        : installations;
      return Response.json({ installations: filtered.filter(i => i.status !== 'uninstalled'), operation: 'get_installations' });
    }

    // ── SUBMIT REVIEW ──
    if (operation === 'submit_review') {
      const { module_id, rating, review_text, reviewer_name, enterprise_name, pros, cons } = params;
      const mod = await base44.asServiceRole.entities.MarketplaceModule.get(module_id);
      const review = await base44.asServiceRole.entities.ModuleReview.create({
        module_id, module_name: mod.name, reviewer_id: user.id,
        reviewer_name: reviewer_name || user.full_name || user.email,
        enterprise_name: enterprise_name || '', rating, review_text: review_text || '',
        pros: pros || [], cons: cons || [], status: 'published', is_verified_install: true,
      });
      const allReviews = await fetchAll('ModuleReview', 200);
      const modReviews = allReviews.filter(r => r.module_id === module_id && r.status === 'published');
      const avg = modReviews.length > 0 ? modReviews.reduce((s, r) => s + r.rating, 0) / modReviews.length : 0;
      await base44.asServiceRole.entities.MarketplaceModule.update(module_id, {
        avg_rating: Math.round(avg * 10) / 10, review_count: modReviews.length,
      });
      return Response.json({ review, avg_rating: Math.round(avg * 10) / 10, operation: 'submit_review' });
    }

    // ── GET REVIEWS ──
    if (operation === 'get_reviews') {
      const { module_id } = params;
      const reviews = await fetchAll('ModuleReview', 100);
      return Response.json({ reviews: reviews.filter(r => r.module_id === module_id && r.status === 'published').sort((a, b) => new Date(b.created_date) - new Date(a.created_date)), operation: 'get_reviews' });
    }

    // ── TRACK USAGE ──
    if (operation === 'track_usage') {
      const { module_id, module_name, installation_id, enterprise_id, enterprise_name, event_type, event_data } = params;
      const event = await base44.asServiceRole.entities.ModuleUsageEvent.create({
        module_id, module_name, installation_id, enterprise_id, enterprise_name,
        event_type: event_type || 'feature_use', event_data: event_data || {}, user_id: user.id,
      });
      return Response.json({ event, operation: 'track_usage' });
    }

    // ── GET USAGE ANALYTICS ──
    if (operation === 'get_usage_analytics') {
      const events = await fetchAll('ModuleUsageEvent', 200);
      const byModule = {};
      const byEventType = {};
      const byDate = {};
      const byEnterprise = {};
      events.forEach(e => {
        byModule[e.module_name] = (byModule[e.module_name] || 0) + 1;
        byEventType[e.event_type] = (byEventType[e.event_type] || 0) + 1;
        const date = (e.created_date || '').split('T')[0];
        if (date) byDate[date] = (byDate[date] || 0) + 1;
        byEnterprise[e.enterprise_name] = (byEnterprise[e.enterprise_name] || 0) + 1;
      });
      const topModules = Object.entries(byModule).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count }));
      const trendData = Object.entries(byDate).sort((a, b) => a[0].localeCompare(b[0])).slice(-30).map(([date, count]) => ({ date, count }));
      return Response.json({ total_events: events.length, top_modules: topModules, by_event_type: byEventType, trend: trendData, by_enterprise: byEnterprise, operation: 'get_usage_analytics' });
    }

    // ── MARKETPLACE STATS ──
    if (operation === 'get_marketplace_stats') {
      const [modules, installations, reviews, events] = await Promise.all([
        fetchAll('MarketplaceModule', 100),
        fetchAll('ModuleInstallation', 100),
        fetchAll('ModuleReview', 100),
        fetchAll('ModuleUsageEvent', 200),
      ]);
      const published = modules.filter(m => m.status === 'published');
      const activeInstalls = installations.filter(i => i.status === 'active');
      const categories = {};
      published.forEach(m => { categories[m.category] = (categories[m.category] || 0) + 1; });
      const avgRating = published.length > 0 ? published.reduce((s, m) => s + (m.avg_rating || 0), 0) / published.length : 0;
      return Response.json({
        stats: {
          total_modules: published.length,
          total_installs: installations.length,
          active_installs: activeInstalls.length,
          total_reviews: reviews.filter(r => r.status === 'published').length,
          avg_rating: Math.round(avgRating * 10) / 10,
          total_usage_events: events.length,
          categories,
          featured_count: published.filter(m => m.is_featured).length,
        },
        operation: 'get_marketplace_stats'
      });
    }

    // ── DELETE MODULE ──
    if (operation === 'delete_module') {
      const { module_id } = params;
      await base44.asServiceRole.entities.MarketplaceModule.delete(module_id);
      return Response.json({ success: true, operation: 'delete_module' });
    }

    return Response.json({ error: 'Unknown operation: ' + operation }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});