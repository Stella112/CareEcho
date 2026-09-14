# CareEcho implementation status

This is the live build checklist for the hackathon MVP+.

- [x] Design
- [x] Landing
- [x] Auth UI (Google + email magic link)
- [x] Onboarding
- [x] Database schema
- [x] RLS
- [x] Voice entry
- [x] AssemblyAI
- [x] Extraction
- [x] Timeline
- [ ] Visit brief
- [x] Visit recording
- [x] Visit transcription
- [x] Visit extraction
- [x] Evidence Q&A
- [x] Multilingual voice flows
- [~] Accessibility preferences (stored; full UI application next)
- [x] Demo mode
- [~] Testing
- [ ] Deployment verification with a configured Supabase project

## This pass

Real account mode is enabled when the three Supabase public variables are present. The browser can only use the publishable/anon key. Server routes validate the Supabase user session before reading or writing memory, and the migration applies ownership policies to every user table.

Try Demo remains deliberately separate: it uses clearly labelled seeded data and never claims that sample recordings came from AssemblyAI.
