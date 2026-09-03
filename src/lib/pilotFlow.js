export const SERVICE_CHOICES = Object.freeze(["legal", "grant"]);
export const PILOT_SEAT_LIMIT = 10;

export const PAYMENT_CONFIG = Object.freeze({
  enabled: false,
  ncLegalLookupKey: "nc_legal_pilot_test_price_pending",
  grantEngineLookupKey: "grant_engine_pilot_test_price_pending",
});

export function buildAccountEntry({ preferredName, authenticatedEmail, termsAccepted, phone = "", smsConsent = false, profileChoice }) {
  const name = preferredName.trim();
  const email = authenticatedEmail.trim();
  const normalizedPhone = phone.trim();
  if (!name) throw new Error("Preferred or display name is required.");
  if (!email) throw new Error("An authenticated email is required.");
  if (!termsAccepted) throw new Error("Terms and Privacy acknowledgment is required.");
  if (!normalizedPhone && smsConsent) throw new Error("A phone number is required before SMS consent can be recorded.");
  if (!["start_profile", "skip_profile"].includes(profileChoice)) throw new Error("Choose a profile action.");

  return {
    preferred_name: name,
    authenticated_email: email,
    terms_privacy_acknowledged: true,
    phone: normalizedPhone || null,
    sms_consent: Boolean(normalizedPhone && smsConsent),
    profile_choice: profileChoice,
  };
}

export function isLegalAccessAllowed(result) {
  const access = result?.access ?? result ?? {};
  return access.authenticated === true
    && access.authorized === true
    && access.pilot_active === true
    && access.capacity_available === true
    && Number(access.seat_limit) === PILOT_SEAT_LIMIT;
}

export function assertServiceChoice(service) {
  if (!SERVICE_CHOICES.includes(service)) throw new Error("Invalid service selection.");
  return service;
}
