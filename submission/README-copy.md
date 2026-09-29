# CareEcho

**Your health memory, in your voice.**

CareEcho is a patient-owned voice agent that remembers symptoms between appointments, retrieves that history during consultations, and turns clinician instructions into confirmed, evidence-backed health memory.

## What makes it different

- **Longitudinal voice memory:** dated patient reports remain searchable over time.
- **Confirm-to-Commit:** extracted clinical instructions begin as `PROPOSED`; the patient must confirm, correct, or reject them.
- **Deterministic conflict detection:** CareEcho compares a proposed medication instruction with the latest confirmed record without making a medical judgment.
- **Evidence-linked recall:** important answers open the clinician's exact recorded words and timestamp.
- **Accessible by design:** voice-first, large touch targets, clear state text, and source information that does not depend on animation.

## AssemblyAI

Live recordings use AssemblyAI Universal-3.5 Pro transcription. Consultation flows request speaker labels and Medical Mode when available. Transcript text, speaker context, and timestamps are the evidence boundary for extraction and Q&A. The reliable demo fixture is clearly labelled and never presented as live transcription.

## Safety

**NO SOURCE → NO CLAIM.**

**NO CONFIRMATION → NO CLINICAL MEMORY CHANGE.**

CareEcho organizes health information. It does not diagnose, validate a dosage, or replace professional medical care.

## Demo

Open `/app?demo=1`, load the sample consultation, confirm the metformin conflict, open View source, and ask what changed today. Full technical details and local setup are in the repository root README.
