import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { operation, params } = body;
    const admin = base44.asServiceRole;

    const fetchAll = async (entityName, limit = 200) => {
      try { return await admin.entities[entityName].list('-created_date', limit); }
      catch { return []; }
    };

    // ═══════════════════════════════════════════════════════════
    // EXECUTIVE OVERVIEW — Culture Rail dashboard data
    // ═══════════════════════════════════════════════════════════
    if (operation === 'overview') {
      const [artists, albums, songs, creators, podcasts, videos, events, merch, communities, fanClubs, radios, playlists, licensing, royalties, distributions, marketplace, ads, promotions] = await Promise.all([
        fetchAll('Artist', 200), fetchAll('Album', 200), fetchAll('Song', 500),
        fetchAll('Creator', 200), fetchAll('Podcast', 100), fetchAll('Video', 200),
        fetchAll('LiveEvent', 100), fetchAll('Merchandise', 200), fetchAll('Community', 100),
        fetchAll('FanClub', 100), fetchAll('Radio', 50), fetchAll('Playlist', 100),
        fetchAll('Licensing', 100), fetchAll('RoyaltyTracking', 200), fetchAll('RevenueDistribution', 50),
        fetchAll('MarketplaceListing', 200), fetchAll('AdCampaign', 50), fetchAll('Promotion', 100),
      ]);

      const totalStreams = songs.reduce((s, x) => s + (x.total_streams || 0), 0);
      const totalViews = videos.reduce((s, x) => s + (x.view_count || 0), 0);
      const totalMerchRev = merch.reduce((s, x) => s + (x.total_revenue || 0), 0);
      const totalEventRev = events.reduce((s, x) => s + (x.total_revenue || 0), 0);
      const totalRoyaltyRev = royalties.reduce((s, x) => s + (x.gross_revenue || 0), 0);
      const totalMarketRev = marketplace.reduce((s, x) => s + (x.total_revenue || 0), 0);
      const totalAdRev = ads.reduce((s, x) => s + (x.revenue_generated || 0), 0);
      const totalFanClubRev = fanClubs.reduce((s, x) => s + (x.total_revenue || 0), 0);
      const totalPlatformRev = totalMerchRev + totalEventRev + totalRoyaltyRev + totalMarketRev + totalAdRev + totalFanClubRev;
      const totalCommunityMembers = communities.reduce((s, x) => s + (x.member_count || 0), 0);
      const totalFanClubMembers = fanClubs.reduce((s, x) => s + (x.member_count || 0), 0);
      const upcomingEvents = events.filter(e => e.status === 'announced' || e.status === 'tickets_on_sale').length;
      const liveNow = radios.filter(r => r.is_live).length;
      const verifiedCreators = creators.filter(c => c.verified).length;

      return Response.json({
        operation: 'overview',
        stats: {
          artists: artists.length, albums: albums.length, songs: songs.length,
          creators: creators.length, podcasts: podcasts.length, videos: videos.length,
          events: events.length, merch: merch.length, communities: communities.length,
          fanClubs: fanClubs.length, radios: radios.length, playlists: playlists.length,
          licensing: licensing.length, royalties: royalties.length,
          marketplace: marketplace.length, ads: ads.length, promotions: promotions.length,
          totalStreams, totalViews, totalMerchRev, totalEventRev, totalRoyaltyRev,
          totalMarketRev, totalAdRev, totalFanClubRev, totalPlatformRev,
          totalCommunityMembers, totalFanClubMembers, upcomingEvents, liveNow, verifiedCreators,
        },
        trending: songs.sort((a, b) => (b.monthly_streams || 0) - (a.monthly_streams || 0)).slice(0, 10),
        upcoming_events: events.filter(e => e.status === 'announced' || e.status === 'tickets_on_sale').slice(0, 5),
        active_promotions: promotions.filter(p => p.status === 'active' || p.status === 'suggested').slice(0, 5),
      });
    }

    // ═══════════════════════════════════════════════════════════
    // CALCULATE ROYALTIES — for a period
    // ═══════════════════════════════════════════════════════════
    if (operation === 'calculate_royalties') {
      const { period_start, period_end } = params;
      const songs = await fetchAll('Song', 500);
      const sources = ['spotify', 'apple_music', 'youtube', 'tidal', 'amazon_music', 'soundcloud'];

      const royaltyRecords = [];
      for (const song of songs) {
        if (!song.total_streams || song.total_streams === 0) continue;
        for (const source of sources) {
          // Simulate per-source streams (evenly distributed)
          const sourceStreams = Math.floor((song.total_streams || 0) / sources.length);
          if (sourceStreams === 0) continue;
          const grossRevenue = sourceStreams * 0.004; // avg $0.004 per stream
          const platformFeePct = source === 'spotify' ? 30 : source === 'apple_music' ? 30 : 45;
          const platformFeeAmount = grossRevenue * (platformFeePct / 100);
          const netRevenue = grossRevenue - platformFeeAmount;
          const artistSharePct = 80;
          const artistPayout = netRevenue * (artistSharePct / 100);
          const ncosSharePct = 10;
          const ncosPayout = netRevenue * (ncosSharePct / 100);
          const labelPayout = netRevenue * 0.05;
          const producerPayout = netRevenue * 0.05;

          try {
            const rec = await admin.entities.RoyaltyTracking.create({
              title: `${song.title} — ${source} — ${period_start}`,
              song_id: song.id, song_name: song.title,
              artist_id: song.artist_id, artist_name: song.artist_name,
              album_id: song.album_id,
              period_start, period_end,
              source, stream_count: sourceStreams,
              gross_revenue: Math.round(grossRevenue * 100) / 100,
              platform_fee_pct: platformFeePct,
              platform_fee_amount: Math.round(platformFeeAmount * 100) / 100,
              net_revenue: Math.round(netRevenue * 100) / 100,
              artist_share_pct: artistSharePct,
              artist_payout: Math.round(artistPayout * 100) / 100,
              label_share_pct: 5, label_payout: Math.round(labelPayout * 100) / 100,
              producer_share_pct: 5, producer_payout: Math.round(producerPayout * 100) / 100,
              ncos_share_pct: ncosSharePct, ncos_payout: Math.round(ncosPayout * 100) / 100,
              status: 'calculated',
            });
            royaltyRecords.push(rec);
          } catch (e) { /* skip */ }
        }
      }

      return Response.json({
        operation: 'calculate_royalties',
        records_created: royaltyRecords.length,
        period_start, period_end,
      });
    }

    // ═══════════════════════════════════════════════════════════
    // PROMOTION ENGINE — AI generates promotion suggestions
    // ═══════════════════════════════════════════════════════════
    if (operation === 'generate_promotions') {
      const [songs, artists, podcasts, videos, events, playlists, existingPromos] = await Promise.all([
        fetchAll('Song', 100), fetchAll('Artist', 50), fetchAll('Podcast', 50),
        fetchAll('Video', 50), fetchAll('LiveEvent', 30), fetchAll('Playlist', 50),
        fetchAll('Promotion', 50),
      ]);

      const contentInventory = {
        top_songs: songs.sort((a, b) => (b.monthly_streams || 0) - (a.monthly_streams || 0)).slice(0, 20).map(s => ({ title: s.title, artist: s.artist_name, streams: s.monthly_streams, genre: s.genre })),
        trending_artists: artists.sort((a, b) => (b.monthly_listeners || 0) - (a.monthly_listeners || 0)).slice(0, 10).map(a => ({ name: a.name, listeners: a.monthly_listeners, verified: a.verified })),
        podcasts: podcasts.slice(0, 10).map(p => ({ title: p.title, listeners: p.monthly_listeners })),
        videos: videos.sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 10).map(v => ({ title: v.title, views: v.view_count })),
        upcoming_events: events.filter(e => e.status === 'announced').slice(0, 5).map(e => ({ title: e.title, date: e.start_date })),
        playlists: playlists.filter(p => p.is_featured).slice(0, 5).map(p => ({ name: p.name, followers: p.follower_count })),
      };

      const result = await admin.integrations.Core.InvokeLLM({
        prompt: `You are the NCOS Culture Rail Promotion Engine. Analyze the content inventory and generate promotion suggestions to maximize engagement and revenue.

CONTENT INVENTORY:
${JSON.stringify(contentInventory).slice(0, 8000)}

Generate 5-10 promotion suggestions. For each:
- title, promotion_type (featured_placement, playlist_pitch, social_boost, email_blast, homepage_spotlight, trending_boost, editorial_pick)
- target_type (song, album, artist, podcast, video, event, playlist)
- target_name (from the inventory above)
- description (why this should be promoted)
- duration_days, budget
- ai_recommendation (detailed reasoning)
- priority_score (0-100)
- expected engagement_lift_pct
- expected revenue_impact

Focus on items with high growth potential that aren't already trending.`,
        response_json_schema: {
          type: "object",
          properties: {
            promotions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  promotion_type: { type: "string" },
                  target_type: { type: "string" },
                  target_name: { type: "string" },
                  description: { type: "string" },
                  duration_days: { type: "number" },
                  budget: { type: "number" },
                  ai_recommendation: { type: "string" },
                  priority_score: { type: "number" },
                  engagement_lift_pct: { type: "number" },
                  revenue_impact: { type: "number" },
                }
              }
            },
            strategy_summary: { type: "string" }
          }
        }
      });

      const created = [];
      for (const p of (result.promotions || [])) {
        try {
          const rec = await admin.entities.Promotion.create({
            title: p.title,
            promotion_type: p.promotion_type || 'featured_placement',
            target_type: p.target_type || 'song',
            target_name: p.target_name,
            description: p.description,
            duration_days: p.duration_days || 7,
            budget: p.budget || 0,
            ai_recommendation: p.ai_recommendation,
            priority_score: p.priority_score || 50,
            engagement_lift_pct: p.engagement_lift_pct || 0,
            revenue_impact: p.revenue_impact || 0,
            auto_generated: true,
            status: 'suggested',
            requires_founder_approval: true,
            start_date: new Date().toISOString().slice(0, 10),
            end_date: new Date(Date.now() + (p.duration_days || 7) * 86400000).toISOString().slice(0, 10),
          });
          created.push(rec);
        } catch (e) { /* skip */ }
      }

      return Response.json({
        operation: 'generate_promotions',
        promotions_created: created.length,
        strategy_summary: result.strategy_summary,
      });
    }

    // ═══════════════════════════════════════════════════════════
    // APPROVE PROMOTION — founder approves
    // ═══════════════════════════════════════════════════════════
    if (operation === 'approve_promotion') {
      const { promotion_id } = params;
      if (!promotion_id) return Response.json({ error: 'promotion_id required' }, { status: 400 });
      const updated = await admin.entities.Promotion.update(promotion_id, {
        status: 'approved', approved_by: user.email, approved_at: new Date().toISOString(),
      });
      return Response.json({ operation: 'approve_promotion', promotion: updated });
    }

    // ═══════════════════════════════════════════════════════════
    // APPROVE LICENSING — founder approves
    // ═══════════════════════════════════════════════════════════
    if (operation === 'approve_licensing') {
      const { licensing_id } = params;
      if (!licensing_id) return Response.json({ error: 'licensing_id required' }, { status: 400 });
      const updated = await admin.entities.Licensing.update(licensing_id, {
        status: 'active', approved_by: user.email, approved_at: new Date().toISOString(),
      });
      return Response.json({ operation: 'approve_licensing', licensing: updated });
    }

    // ═══════════════════════════════════════════════════════════
    // APPROVE AD CAMPAIGN — founder approves
    // ═══════════════════════════════════════════════════════════
    if (operation === 'approve_ad') {
      const { ad_id } = params;
      if (!ad_id) return Response.json({ error: 'ad_id required' }, { status: 400 });
      const updated = await admin.entities.AdCampaign.update(ad_id, {
        status: 'active', approved_by: user.email, approved_at: new Date().toISOString(),
      });
      return Response.json({ operation: 'approve_ad', ad: updated });
    }

    return Response.json({ error: 'Unknown operation: ' + operation }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});