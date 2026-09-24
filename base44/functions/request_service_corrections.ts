import { Base44Function } from '@base44/server';

export default Base44Function(async ({ base44, input }) => {
  const { review_id, corrections_needed, missing_evidence, feedback_questions, reviewer_notes } = input;

  const review = await base44.entity('business_service_reviews').get(review_id);
  if (!review) throw new Error('Review not found');

  const submission = await base44.entity('business_service_submissions').get(review.submission_id);
  if (!submission) throw new Error('Submission not found');

  await base44.entity('business_service_reviews').update(review_id, {
    status: 'corrections_requested',
    corrections_needed,
    missing_evidence,
    feedback_questions,
    reviewer_notes
  });

  await base44.entity('business_service_submissions').update(submission.id, {
    review_status: 'corrections_requested'
  });

  return { success: true, corrections_sent: true };
});