# CareEcho implementation status

This is the live build checklist for the hackathon MVP+.

- [x] Design
- [x] Landing
- [x] Auth UI (Google + email OTP)
- [x] Onboarding
- [x] Database schema
- [x] RLS
- [x] Voice entry
- [x] AssemblyAI
- [x] Extraction
- [x] Timeline
- [x] Visit brief
- [x] Visit recording
- [x] Visit transcription
- [x] Visit extraction
- [x] Evidence Q&A
- [x] Multilingual voice flows
- [~] Accessibility preferences (stored; full UI application next)
- [x] Demo mode
- [x] Testing (25 safety, grounding, conflict and memory-tool tests)
- [ ] Deployment verification with a configured Supabase project

## This pass

Real account mode is enabled when the three Supabase public variables are present. The browser can only use the publishable/anon key. Server routes validate the Supabase user session before reading or writing memory, and the migration applies ownership policies to every user table.

Try Demo remains deliberately separate: it uses clearly labelled seeded data and never claims that sample recordings came from AssemblyAI.

## Final hardening pass

- [x] Confirm-to-Commit lifecycle: PROPOSED / CONFIRMED / REJECTED / SUPERSEDED
- [x] Deterministic medication conflict comparison
- [x] Evidence-linked source sheet retained for every clinician instruction
- [x] Fixed Stellamaris/Ada judge fixture with four dizziness reports
- [x] Prior confirmed metformin 500 mg once daily fixture
- [x] Proposed metformin 500 mg twice daily sample consultation
- [x] Offline deterministic health-history and medication-change answers
- [x] Judge README, submission copy, 90-second script, shot list and screenshot checklist
- [x] Ada payload reduced from 2.2 MB PNG to a 72 KB transparent WebP without deleting the source asset
- [x] Production build passes
