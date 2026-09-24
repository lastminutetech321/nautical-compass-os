/**
 * Submit Canon Drafts for Review
 * Auto-dispatched by Self-Healing Engine v3
 * Submits 14 draft entries for review
 */

export default async function submitCanonDrafts(context) {
  const { db, user, body } = context;

  if (!user) {
    return {
      status: 401,
      body: { error: 'Authentication required' }
    };
  }

  try {
    const { draft_ids } = body;

    if (!draft_ids || !Array.isArray(draft_ids) || draft_ids.length === 0) {
      return {
        status: 400,
        body: { error: 'draft_ids array is required' }
      };
    }

    // Fetch all drafts
    const drafts = await db.canon_drafts.find({
      _id: { $in: draft_ids },
      author_id: user.id,
      status: 'draft'
    });

    if (drafts.length === 0) {
      return {
        status: 404,
        body: { error: 'No eligible drafts found' }
      };
    }

    // Update all drafts to pending_review
    const updatePromises = drafts.map(draft => 
      db.canon_drafts.update(draft._id, {
        status: 'pending_review',
        submitted_at: new Date().toISOString()
      })
    );

    const updated = await Promise.all(updatePromises);

    // Create notification for reviewers
    await db.notifications.create({
      type: 'canon_review_request',
      title: `${drafts.length} Canon Drafts Submitted for Review`,
      message: `${user.email} has submitted ${drafts.length} draft(s) for review`,
      recipient_role: 'canon_reviewer',
      metadata: {
        draft_ids: updated.map(d => d._id),
        author_id: user.id,
        submitted_at: new Date().toISOString()
      },
      status: 'unread',
      created_at: new Date().toISOString()
    });

    return {
      status: 200,
      body: {
        success: true,
        submitted_count: updated.length,
        drafts: updated,
        message: `${updated.length} draft(s) submitted for review`
      }
    };
  } catch (error) {
    console.error('Error submitting drafts:', error);
    return {
      status: 500,
      body: { error: 'Failed to submit drafts', details: error.message }
    };
  }
}

export const config = {
  path: '/canon/drafts/submit',
  method: 'POST',
  auth: 'required'
};