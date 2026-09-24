# NC Business Service Open Pilot — Documentation

This directory contains all documentation for the NC Business Service Open Pilot program.

## Contents

- **[business-service-open-pilot-staff-checklist.md](./business-service-open-pilot-staff-checklist.md)** — Internal staff operations checklist for managing pilot participants
- **Participant instructions** — Hosted in the frontend at `/apply/business-service-open-pilot` (see `src/pages/apply/business-service-open-pilot.jsx`)

## Quick Links

- **Participant landing page:** [/apply/business-service-open-pilot](/apply/business-service-open-pilot)
- **Privacy policy:** [/privacy](/privacy)
- **Support:** [/support](/support)

## Purpose

The Open Pilot validates our business service workflows, matching algorithms, and staff processes before launching production programs. It is a **research and development phase** — participants are informed that pilot involvement does not guarantee work or program acceptance.

## Key Principles

1. **Transparency:** Participants know exactly what we collect, why, and who sees it.
2. **Control:** Participants can update their data, request corrections, and withdraw at any time.
3. **No guarantees:** Pilot participation ≠ guaranteed work. This is clearly communicated upfront.
4. **Internal only:** Pilot data is not shared externally without explicit participant consent.
5. **Feedback-driven:** Every participant receives constructive feedback, regardless of outcome.

## Related Entities (Base44)

- `pilot_application` (or equivalent) — stores participant applications
- `user` — participant accounts
- `service_preference` — desired services and availability
- `professional_profile` — work history, skills, education

## Workflow Overview

1. Participant reads instructions at `/apply/business-service-open-pilot`
2. Participant clicks "Start Application" → redirected to `/signup`
3. After signup, participant completes professional profile and pilot-specific questions
4. Application triggers workflow → routes to reviewer
5. Reviewer evaluates using rubric → provides feedback → updates application status
6. Participant receives feedback email
7. Accepted participants continue to pilot activities; others receive constructive feedback

## Staff Access

See [business-service-open-pilot-staff-checklist.md](./business-service-open-pilot-staff-checklist.md) for full operations guide.
