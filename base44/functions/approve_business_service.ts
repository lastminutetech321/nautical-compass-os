import { Base44Function } from '@base44/server';

export default Base44Function(async ({ base44, input }) => {
  const { review_id, service_categories, verified_credentials, verified_insurance, reviewer_notes } = input;

  const review = await base44.entity('business_service_reviews').get(review_id);
  if (!review) throw new Error('Review not found');

  const submission = await base44.entity('business_service_submissions').get(review.submission_id);
  if (!submission) throw new Error('Submission not found');

  await base44.entity('business_service_reviews').update(review_id, {
    status: 'approved',
    business_identity_verified: true,
    services_validated: true,
    service_categories,
    insurance_status: verified_insurance ? 'verified' : 'not_applicable',
    credentials_status: verified_credentials ? 'verified' : 'not_applicable',
    reviewer_notes,
    approved_at: new Date().toISOString()
  });

  const listing = await base44.entity('service_listings').create({
    submission_id: submission.id,
    review_id: review.id,
    provider_id: submission.user_id,
    business_name: submission.business_name,
    service_categories,
    description: submission.description,
    service_areas: submission.service_areas,
    verified_credentials,
    verified_insurance,
    visibility: 'opportunity_only',
    status: 'active'
  });

  await base44.entity('business_service_reviews').update(review_id, {
    listing_created: true,
    listing_id: listing.id
  });

  await base44.entity('business_service_submissions').update(submission.id, {
    review_status: 'approved',
    listing_id: listing.id
  });

  return { success: true, listing };
});