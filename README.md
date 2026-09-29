# CareEcho

**Your health memory, in your voice.**

CareEcho is a voice-first personal health memory. Speak about your symptoms during the week, record your doctor's visit, and later ask Ada — your CareEcho companion — what the doctor actually said. Every answer shows the exact words behind it.

> CareEcho helps organize and remember health information. It does not diagnose conditions or replace professional medical care.

**Core principle: NO SOURCE → NO CLAIM.**

**Secondary principle: NO CONFIRMATION → NO CLINICAL MEMORY CHANGE.**

---

## The problem

Patients often reach an appointment unable to reconstruct when a symptom began, how often it happened, or exactly what changed in the clinician's instructions. A transcript alone does not solve continuity: the important information still has to be remembered, compared, verified, and kept under the patient's control.

## What CareEcho does

CareEcho is a patient-owned voice agent that follows the patient before, during, and after a consultation. It turns spoken symptom reports into a dated health timeline, retrieves that history when asked, and preserves clinician instructions with source evidence. It is an organizational memory—not a diagnostic system.

## Why this is a voice agent

Speech is the primary interaction, not a decorative input. A patient talks to Ada, CareEcho routes the transcript to bounded memory tools, and the interface changes state: a symptom is proposed for review, history is searched, or a clinician instruction is proposed. Important writes are validated in code. This makes CareEcho useful when typing is difficult, including for blind and low-vision users, older adults, people with low literacy, and hands-busy users.

## Core demo

```
PATIENT / CLINICIAN VOICE
          ↓
ASSEMBLYAI SPEECH LAYER
Universal-3.5 Pro · speaker labels · Medical Mode fallback
          ↓
      GUARDED AGENT ROUTER
          ↓
 ┌────────────────────────────────────┐
 │ log_symptom                        │
 │ search_health_memory               │
 │ get_symptom_history                │
 │ save_question_for_doctor           │
 │ propose_clinician_instruction      │
 │ confirm_clinician_instruction      │
 │ reject_clinician_instruction       │
 │ find_memory_conflicts              │
 │ get_visit_evidence                 │
 │ get_latest_confirmed_instruction   │
 └────────────────────────────────────┘
          ↓
   VALIDATION LAYER
          ↓
   PATIENT HEALTH MEMORY
          ↓
EVIDENCE + TIMELINE + Q&A
```

1. Reset Demo to load Stellamaris, four dated dizziness reports, and a prior confirmed instruction: metformin 500 mg once daily.
2. Open Visit Mode and load the clearly labelled sample consultation.
3. CareEcho extracts: “Change the metformin to 500 milligrams twice daily.”
4. The new instruction remains **PROPOSED** and a deterministic conflict card compares it with the prior confirmed instruction.
5. Confirm it explicitly. The new instruction becomes **CONFIRMED** and the old one becomes **SUPERSEDED**.
6. Ask: “What changed with my medication today?” The answer links to the clinician's exact words.

## Confirm-to-Commit

Medication instructions use four explicit states: `PROPOSED`, `CONFIRMED`, `REJECTED`, and `SUPERSEDED`. Extraction can only propose. The confirmation action is a separate, validated state transition triggered by the patient. Correct and Don't save are first-class choices.

## Memory Conflict Detection

Before confirmation, CareEcho deterministically compares medication name, dose, frequency, and duration with the latest confirmed instruction for that medication. It reports that the records differ; it never decides which dose is medically correct.

## Evidence & Provenance

Every important record carries one of `PATIENT_REPORTED`, `CLINICIAN_SAID`, `AI_DERIVED`, or `UNKNOWN`. Clinician facts must quote words found in the recording. **View source** opens the transcript excerpt, speaker role, timestamp, and saved interpretation. If the evidence is absent or unsupported, CareEcho refuses to claim it.

## How AssemblyAI is used

AssemblyAI is the speech layer for live user recordings. CareEcho uploads audio, requests Universal-3.5 Pro transcription in the selected supported language, and uses speaker labels plus Medical Mode for consultations when available. The transcript and utterance timestamps provide the evidence boundary for every downstream extraction and answer. The deterministic sample skips transcription and is always labelled as demo data.

The current submission uses AssemblyAI's pre-recorded API for reliability. The newer Voice Agent API is documented as the next realtime path; the project does **not** claim that turn-taking, barge-in, or Voice Agent tool calling is already implemented.

## Architecture

The LLM cannot write directly to health memory. Structured output is parsed with Zod, transcript claims pass through grounding guards, and high-importance clinical writes require a separate confirmation reducer. Supabase stores user-owned visit snapshots and timeline entries under row-level security; local storage provides the deterministic offline demo.

## Safety model

- No source → no claim.
- No confirmation → no clinical memory change.
- Patient statements cannot become clinician instructions.
- A new confirmed instruction supersedes the old record without deleting its history.
- Unsupported questions return “I couldn't find that in your saved visit.”

## Multilingual design

The language registry exposes the 18 languages currently used by CareEcho's Universal-3.5 Pro prerecorded flow. Selection is sent to transcription and persisted with the profile. UI translation depth varies by language and is stated honestly; Igbo is shown as coming soon rather than falsely advertised as supported.

## Accessibility

CareEcho uses large touch targets, semantic labels, visible state text, keyboard-accessible controls, and source text that does not depend on Ada's animation. Voice-first interaction is designed to reduce the typing and navigation burden for blind, low-vision, older, and low-literacy users.

---

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Framer Motion · Lucide · Zod · AssemblyAI · OpenAI Responses API · Supabase Auth/Postgres · MediaRecorder.

## Run locally

```bash
npm install
cp .env.example .env.local   # add ASSEMBLYAI_API_KEY and OPENAI_API_KEY
npm run dev                  # http://localhost:3000/app
npm test                     # guard + schema tests
npm run build
```

API keys are only read server-side (route handlers). Nothing sensitive reaches the browser.

> Next.js gives real environment variables precedence over `.env.local`. Keep both API keys server-side; never prefix them with `NEXT_PUBLIC_`.

## Environment variables

See `.env.example`. The required speech and extraction variables are `ASSEMBLYAI_API_KEY` and `OPENAI_API_KEY`. Supabase account mode additionally uses the three public Supabase URL/key variables documented there. Never expose an AssemblyAI, OpenAI, or Supabase service-role secret through `NEXT_PUBLIC_*`.

## Implementation map

| Path | Purpose |
| --- | --- |
| `src/lib/assemblyai.ts` | Pre-recorded REST flow: `POST /v2/upload` → `POST /v2/transcript` → poll `GET /v2/transcript/:id`. Uses `speech_models: ["universal-3-5-pro","universal-2"]` and the selected language code. Visits add `speaker_labels: true` and `domain: "medical-v1"`, automatically falling back to plain transcription if either config is rejected. |
| `src/lib/ai.ts` | The only three AI functions: `extractHealthEntry()`, `extractVisitInstructions()`, `answerFromEvidence()`. OpenAI Responses API structured outputs, validated with Zod. |
| `src/lib/guards.ts` | Verifies every model claim against the real transcript before it is shown or saved. |
| `src/lib/rules.ts` | Deterministic fallback extractors, used only if the LLM is unavailable (the UI labels this). Output passes through the same guards. |
| `src/lib/healthMemory.ts` | Storage abstraction over localStorage — the swap point for Supabase. |
| `src/app/api/*` | `transcribe`, `health-entry`, `visit`, `ask`, `status`. |
| `src/components/screens/*` | Home, Listening, Review, Timeline, Visit Mode, Post-visit + Ask Ada, Profile. |

### Provenance

Internally every fact carries one of `PATIENT_REPORTED`, `CLINICIAN_SAID`, `AI_DERIVED`, `UNKNOWN`. In the UI these read **YOU SAID**, **DOCTOR SAID**, **CAREECHO SUMMARY**.

### How "no source → no claim" is enforced

The LLM is never trusted directly. `guards.ts`:

- drops any medication / follow-up / instruction whose `sourceText` isn't found in the transcript (normalized exact match, or a strict ≥85% word match that substitutes the *real* sentence);
- drops clinician facts whose quote is in the patient's voice (*"I think I need antibiotics"*, *"Should I…"*) — they stay `PATIENT_REPORTED`;
- strips any dose, frequency, duration or date containing a number that wasn't spoken in the quote;
- refuses an answer (→ *"I couldn't find that in your saved visit."*) if it has no citations, any citation isn't in the transcript, it attributes words to the doctor without clinician evidence, or it contains a number absent from its citations.

Provenance for health entries is stamped server-side — the model cannot set it.

## Tests

`tests/careecho.test.ts` covers health-entry and visit schemas, provenance, unsupported-answer refusal, patient/clinician separation, deterministic conflict detection, and the complete proposed → confirmed/superseded or rejected instruction lifecycle.

## Demo mode

Open `/app?demo=1` or use **Reset Demo**. The reset loads the fixed Stellamaris/Ada story, four September dizziness reports, the earlier confirmed metformin instruction, and a sample consultation. Sample data is visually labelled and never represented as live AssemblyAI output.

## Implementation details

The language picker supports AssemblyAI Universal-3.5 Pro's 18 languages: English, Spanish, French, German, Italian, Portuguese, Arabic, Danish, Dutch, Finnish, Hebrew, Hindi, Japanese, Mandarin Chinese, Norwegian, Swedish, Turkish and Vietnamese. The selected language is sent to transcription and used to guide CareEcho extraction and answers. Universal-2 remains the fallback for broader coverage outside these 18.

## Real accounts and Supabase

1. Create a Supabase project.
2. In the Supabase SQL editor, run supabase/migrations/20260914000000_careecho.sql.
3. In Authentication URL Configuration, add your local and Vercel /app URLs as redirect URLs.
4. Enable Google in Authentication Providers if you want the Google button. For email OTP, use the Magic link or OTP template and render {{ .Token }} instead of {{ .ConfirmationURL }}.
5. Add the Supabase public variables, AssemblyAI key and OpenAI key to local development and Vercel.

The exact variable names are in .env.example. Never put a service-role key in the browser.

When Supabase variables are configured, /app requires sign-in, shows onboarding for a new user, and syncs memory across devices. Try Demo remains available at /app?demo=1.

## Deploy (Vercel)

1. Import the repo in Vercel (framework preset: Next.js).
2. Set `ASSEMBLYAI_API_KEY` and `OPENAI_API_KEY` in Project → Settings → Environment Variables.
3. Deploy. Route handlers declare `maxDuration` for transcription polling; uploads are capped at 4 MB (≈8 minutes at the recorder's 48 kbps).

## Known limitations

- Consultation recording is processed after the user ends the recording; realtime Voice Agent turn-taking and barge-in are not yet part of this build.
- Full UI copy is not translated for every transcription language.
- The product is not clinically validated, a diagnostic device, or a replacement for professional medical care.
- Source playback is represented by transcript evidence and timestamps; audio clipping is not implemented.

## Future work

- AssemblyAI Voice Agent API for realtime turn-taking, interruption, and spoken tool results
- A real wake word and read-aloud responses
- Prepare for Visit summaries and clinician sharing
- Full multilingual experience (Igbo once speech support exists)
- Reminders, calendar, wearables

## References

- AssemblyAI — [Transcribe an audio file](https://www.assemblyai.com/docs/getting-started/transcribe-an-audio-file), [Medical Mode](https://www.assemblyai.com/docs/pre-recorded-audio/medical-mode), [Supported languages](https://www.assemblyai.com/docs/pre-recorded-audio/supported-languages)
