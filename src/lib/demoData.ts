import type { Evidence, Utterance, VisitFacts } from "./schemas";
import type { HealthEntryRecord, VisitRecord } from "./healthMemory";

const demoDate = (day: number, hour: number, minute: number) =>
  new Date(`2026-09-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+01:00`).toISOString();

/** Deterministic submission fixture: four patient-reported dizziness notes. */
export function demoEntries(): HealthEntryRecord[] {
  const reports = [
    [18, 8, 20, "I felt dizzy when I stood up this morning. It lasted about a minute."],
    [21, 19, 5, "I felt dizzy again this evening, especially when I got up from the sofa."],
    [25, 13, 40, "The dizziness came back after lunch today and I needed to sit down."],
    [29, 9, 15, "I was dizzy again this morning. This is the fourth time I've noticed it."],
  ] as const;
  return reports.map(([day, hour, minute, rawTranscript], index) => ({
    id: `demo-dizziness-${index + 1}`,
    timestamp: demoDate(day, hour, minute),
    rawTranscript,
    structuredData: {
      symptoms: [{ name: "dizziness", duration: index === 0 ? "1 minute" : null, onset: index === 2 ? "after lunch" : index === 1 ? "this evening" : "this morning", severity: null, associatedSymptoms: [] }],
      summary: index === 3 ? "Fourth reported episode of dizziness." : "Another patient-reported episode of dizziness.",
      sourceType: "PATIENT_REPORTED",
    },
    sourceType: "PATIENT_REPORTED",
    isDemo: true,
    language: "en",
  }));
}

const priorEvidence: Evidence = {
  quote: "Continue metformin 500 milligrams once daily.",
  role: "CLINICIAN",
  provenance: "CLINICIAN_SAID",
  speakerLabel: "A",
  startMs: 900,
  context: null,
};

const priorFacts: VisitFacts = {
  medications: [{ name: "metformin", dose: "500 mg", frequency: "once daily", duration: null, evidence: priorEvidence }],
  followUp: null,
  instructions: [],
  patientStatements: [],
  excluded: [],
};

/** Prior confirmed instruction used to prove longitudinal conflict handling. */
export function demoVisits(): VisitRecord[] {
  const timestamp = demoDate(10, 10, 30);
  return [{
    id: "demo-prior-metformin",
    timestamp,
    transcript: priorEvidence.quote,
    utterances: [{ speaker: "A", text: priorEvidence.quote, startMs: 900, endMs: 3900 }],
    facts: priorFacts,
    diarized: true,
    medicalMode: false,
    isSample: true,
    engine: "rules",
    qa: [],
    language: "en",
    clinicianInstructions: [{
      id: "instruction-demo-prior-metformin-0",
      visitId: "demo-prior-metformin",
      kind: "MEDICATION",
      status: "CONFIRMED",
      medication: "metformin",
      dose: "500 mg",
      frequency: "once daily",
      duration: null,
      evidence: priorEvidence,
      createdAt: timestamp,
      confirmedAt: timestamp,
      supersededBy: null,
      corrected: false,
    }],
  }];
}

/** Sample consultation for "Load demo recording". Labelled as a sample everywhere it appears. */
export const SAMPLE_CONSULTATION: Utterance[] = [
  {
    speaker: "A",
    text: "Change the metformin to 500 milligrams twice daily.",
    startMs: 1200,
    endMs: 5100,
  },
  { speaker: "B", text: "Should I keep taking it with meals?", startMs: 5600, endMs: 7600 },
  { speaker: "A", text: "Yes. I'd like to see you again next Thursday.", startMs: 8100, endMs: 11900 },
];

export const SAMPLE_SYMPTOM = "I've felt dizzy four times this week, usually when I stand up.";
