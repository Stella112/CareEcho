# CareEcho

**Your health memory, in your voice.**

CareEcho is a voice-first personal health memory. Speak about your symptoms during the week, record your doctor's visit, and later ask Ada — your CareEcho companion — what the doctor actually said. Every answer shows the exact words behind it.

> CareEcho helps organize and remember health information. It does not diagnose conditions or replace professional medical care.

**Core principle: NO SOURCE → NO CLAIM.**

---

## The demo flow

```
VOICE SYMPTOM → AssemblyAI → structured health entry → review → timeline
VISIT RECORDING → AssemblyAI (speaker labels + Medical Mode) → care plan with evidence
ASK ADA (voice) → AssemblyAI → answer from visit evidence only → DOCTOR SAID [exact quote]
```

1. Open `/app`. Tap **Talk to Ada** and say *"I've had headaches for three days. Yesterday I also felt dizzy."*
2. Review what Ada understood → **Save to health memory** → it appears on the timeline alongside the demo week.
3. **Visits** → tick consent → **Start visit** → record the consultation → **End visit**.
4. The care plan appears (medication, follow-up, instructions). **View source** shows the doctor's exact words and timestamp.
5. **Ask Ada**: *"What did the doctor say about my medication?"* → the answer plus its source.
6. Ask something the visit doesn't cover (*"Can I drink alcohol?"*) → *"I couldn't find that in your saved visit."*

For judging reliability there is a clearly labelled **Load demo recording (sample consultation)** button. It skips transcription only; the care-plan extraction and Q&A still run for real, and the visit is labelled *Sample* everywhere.

---

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Framer Motion · Lucide · Zod · AssemblyAI · OpenAI Responses API · localStorage · MediaRecorder.

## Setup

```bash
npm install
cp .env.example .env.local   # add ASSEMBLYAI_API_KEY and OPENAI_API_KEY
npm run dev                  # http://localhost:3000/app
npm test                     # guard + schema tests
npm run build
```

API keys are only read server-side (route handlers). Nothing sensitive reaches the browser.

> Next.js gives real environment variables precedence over `.env.local`. Keep both API keys server-side; never prefix them with `NEXT_PUBLIC_`.

## Architecture

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

`tests/careecho.test.ts` covers: health-entry schema, visit schema, provenance values, evidence answers refusing unsupported facts, and patient statements never becoming clinician instructions.

## Languages

The language picker supports AssemblyAI Universal-3.5 Pro's 18 languages: English, Spanish, French, German, Italian, Portuguese, Arabic, Danish, Dutch, Finnish, Hebrew, Hindi, Japanese, Mandarin Chinese, Norwegian, Swedish, Turkish and Vietnamese. The selected language is sent to transcription and used to guide CareEcho extraction and answers. Universal-2 remains the fallback for broader coverage outside these 18.

## Deploy (Vercel)

1. Import the repo in Vercel (framework preset: Next.js).
2. Set `ASSEMBLYAI_API_KEY` and `OPENAI_API_KEY` in Project → Settings → Environment Variables.
3. Deploy. Route handlers declare `maxDuration` for transcription polling; uploads are capped at 4 MB (≈8 minutes at the recorder's 48 kbps).

## Roadmap (not in this MVP)

- Supabase storage + authentication (Google / email OTP), replacing `healthMemory.ts`
- Realtime streaming transcription and a real wake word
- Prepare for Visit summaries and clinician sharing
- Full multilingual experience (Igbo once speech support exists)
- Reminders, calendar, wearables

## References

- AssemblyAI — [Transcribe an audio file](https://www.assemblyai.com/docs/getting-started/transcribe-an-audio-file), [Medical Mode](https://www.assemblyai.com/docs/pre-recorded-audio/medical-mode), [Supported languages](https://www.assemblyai.com/docs/pre-recorded-audio/supported-languages)
