import test from "node:test";
import assert from "node:assert/strict";
import { assertServiceChoice, buildAccountEntry, isLegalAccessAllowed, PAYMENT_CONFIG } from "../src/lib/pilotFlow.js";

test("account entry binds the authenticated email and leaves SMS consent off by default", () => {
  const entry = buildAccountEntry({
    preferredName: " Founder ",
    authenticatedEmail: "founder@example.test",
    termsAccepted: true,
    profileChoice: "start_profile",
  });
  assert.deepEqual(entry, {
    preferred_name: "Founder",
    authenticated_email: "founder@example.test",
    terms_privacy_acknowledged: true,
    phone: null,
    sms_consent: false,
    profile_choice: "start_profile",
  });
});

test("account entry rejects SMS consent without a phone", () => {
  assert.throws(() => buildAccountEntry({
    preferredName: "Founder",
    authenticatedEmail: "founder@example.test",
    termsAccepted: true,
    smsConsent: true,
    profileChoice: "skip_profile",
  }), /phone number/i);
});

test("account entry requires Terms and Privacy acknowledgment", () => {
  assert.throws(() => buildAccountEntry({
    preferredName: "Founder",
    authenticatedEmail: "founder@example.test",
    termsAccepted: false,
    profileChoice: "start_profile",
  }), /acknowledgment/i);
});

test("service selection allows only Legal and Grant", () => {
  assert.equal(assertServiceChoice("legal"), "legal");
  assert.equal(assertServiceChoice("grant"), "grant");
  assert.throws(() => assertServiceChoice("dispatch"), /invalid/i);
});

test("legal access fails closed unless every server assertion is explicit", () => {
  const allowed = { authenticated: true, authorized: true, pilot_active: true, capacity_available: true, seat_limit: 10 };
  assert.equal(isLegalAccessAllowed(allowed), true);
  for (const key of ["authenticated", "authorized", "pilot_active", "capacity_available"]) {
    assert.equal(isLegalAccessAllowed({ ...allowed, [key]: false }), false);
  }
  assert.equal(isLegalAccessAllowed({ ...allowed, seat_limit: 11 }), false);
  assert.equal(isLegalAccessAllowed({}), false);
});

test("payment configuration remains disabled and uses placeholders", () => {
  assert.equal(PAYMENT_CONFIG.enabled, false);
  assert.match(PAYMENT_CONFIG.ncLegalLookupKey, /pending$/);
  assert.match(PAYMENT_CONFIG.grantEngineLookupKey, /pending$/);
});
