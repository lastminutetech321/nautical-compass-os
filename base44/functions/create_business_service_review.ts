import { Base44Function } from '@base44/server';

export default Base44Function(async ({ base44, input }) => {
  const { submission_id, reviewer_id } = input;

  const submission = await base44.entity('business_service_submissions').get(submission_id);
  if (!submission) {
    throw new Error('Submission not found');
  }

  const review = await base44.entity('business_service_reviews').create({
    submission_id,
    reviewer_id: reviewer_id || null,
    status: 'pending',
    sla_target_hours: 72,
    listing_created: false
  });

  await base44.entity('business_service_submissions').update(submission_id, {
    review_status: 'pending',
    review_id: review.id
  });

  return { success: true, review };
});