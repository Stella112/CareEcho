import type { Utterance } from "./schemas";
import type { HealthEntryRecord } from "./healthMemory";

/** Seeded demo week. Clearly flagged isDemo — never presented as live transcription. */
export function demoEntries(now = new Date()): HealthEntryRecord[] {
  const at = (daysAgo: number, h: number, m: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(h, m, 0, 0);
    if (daysAgo === 0 && d.getTime() > now.getTime() - 30 * 60_000) {
      // keep "today" in the past (so new recordings sort above it) without slipping into yesterday
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 1, 0, 0);
      d.setTime(Math.max(startOfToday.getTime(), now.getTime() - 30 * 60_000));
    }
    return d.toISOString();
  };
  return [
    {
      id: "demo-1",
      timestamp: at(3, 8, 20),
      rawTranscript: "I woke up with a headache this morning. It's a dull pain behind my eyes.",
      structuredData: {
        symptoms: [{ name: "headache", duration: null, onset: "this morning", severity: "dull", associatedSymptoms: [] }],
        summary: "Dull headache behind the eyes since waking.",
        sourceType: "PATIENT_REPORTED",
      },
      sourceType: "PATIENT_REPORTED",
      isDemo: true,
    },
    {
      id: "demo-2",
      timestamp: at(2, 19, 5),
      rawTranscript: "The headache came back this afternoon and I've been really tired all day.",
      structuredData: {
        symptoms: [{ name: "headache", duration: null, onset: "this afternoon", severity: null, associatedSymptoms: ["fatigue"] }],
        summary: "Headache returned in the afternoon, with fatigue all day.",
        sourceType: "PATIENT_REPORTED",
      },
      sourceType: "PATIENT_REPORTED",
      isDemo: true,
    },
    {
      id: "demo-3",
      timestamp: at(1, 13, 40),
      rawTranscript: "I felt dizzy when I stood up after lunch. It passed after a minute.",
      structuredData: {
        symptoms: [{ name: "dizziness", duration: "1 minute", onset: "after lunch", severity: null, associatedSymptoms: [] }],
        summary: "Felt dizzy while standing up; passed after a minute.",
        sourceType: "PATIENT_REPORTED",
      },
      sourceType: "PATIENT_REPORTED",
      isDemo: true,
    },
    {
      id: "demo-4",
      timestamp: at(0, 9, 15),
      rawTranscript: "Still a headache today, but it's less severe than yesterday.",
      structuredData: {
        symptoms: [{ name: "headache", duration: null, onset: "today", severity: "less severe", associatedSymptoms: [] }],
        summary: "Headache today, less severe than before.",
        sourceType: "PATIENT_REPORTED",
      },
      sourceType: "PATIENT_REPORTED",
      isDemo: true,
    },
  ];
}

/** Sample consultation for "Load demo recording". Labelled as a sample everywhere it appears. */
export const SAMPLE_CONSULTATION: Utterance[] = [
  {
    speaker: "A",
    text: "I'm prescribing amoxicillin 500 milligrams three times daily for seven days. Come back if your symptoms worsen.",
    startMs: 1200,
    endMs: 7400,
  },
  { speaker: "B", text: "Should I take it with food?", startMs: 8100, endMs: 9500 },
  { speaker: "A", text: "Yes. I'd like to see you again next Thursday.", startMs: 10100, endMs: 13300 },
];

export const SAMPLE_SYMPTOM = "I've had headaches for three days. Yesterday I also felt dizzy.";
