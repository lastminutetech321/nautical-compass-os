/**
 * Submit Canon Entries for Review
 * Auto-dispatched by Self-Healing Engine v3
 * Submits 14 draft canon entries for Founder review
 */

export async function handler(event, context) {
  const { db, user } = context;

  try {
    // Fetch all draft canon entries
    const drafts = await db.canon_entry.find({
      status: 'draft'
    });

    if (!drafts || drafts.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'No draft entries to submit',
          submitted: 0
        })
      };
    }

    // Take first 14 (or all if less than 14)
    const toSubmit = drafts.slice(0, 14);
    const submittedIds = [];

    // Update each entry to 'pending_review' status
    for (const entry of toSubmit) {
      await db.canon_entry.update(entry.id, {
        status: 'pending_review',
        submitted_at: new Date().toISOString(),
        submitted_by: 'Self-Healing Engine v3'
      });
      submittedIds.push(entry.id);
    }

    // Create notification for Founder
    await db.notification.create({
      user_id: 'founder',
      type: 'canon_review_request',
      title: `${toSubmit.length} Canon Entries Ready for Review`,
      message: `The Self-Healing Engine has submitted ${toSubmit.length} draft canon entries for your review.`,
      data: {
        entry_ids: submittedIds,
        submitted_at: new Date().toISOString(),
        source: 'auto_repair_engine'
      },
      priority: 'high',
      read: false
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: `Successfully submitted ${toSubmit.length} entries for review`,
        submitted: toSubmit.length,
        entry_ids: submittedIds,
        remaining_drafts: drafts.length - toSubmit.length
      })
    };

  } catch (error) {
    console.error('Error submitting canon entries:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
}
