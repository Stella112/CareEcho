import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Provenance — who a piece of information came from.                  */
/* ------------------------------------------------------------------ */

export const PROVENANCE = ["PATIENT_REPORTED", "CLINICIAN_SAID", "AI_DERIVED", "UNKNOWN"] as const;
export const ProvenanceSchema = z.enum(PROVENANCE);
export type Provenance = z.infer<typeof ProvenanceSchema>;

export const SpeakerRoleSchema = z.enum(["CLINICIAN", "PATIENT", "UNKNOWN"]);
export type SpeakerRole = z.infer<typeof SpeakerRoleSchema>;

export function provenanceForRole(role: SpeakerRole): Provenance {
  if (role === "CLINICIAN") return "CLINICIAN_SAID";
  if (role === "PATIENT") return "PATIENT_REPORTED";
  return "UNKNOWN";
}

/* ------------------------------------------------------------------ */
/* Transcripts                                                         */
/* ------------------------------------------------------------------ */

export const UtteranceSchema = z.object({
  speaker: z.string().nullable(),
  text: z.string(),
  startMs: z.number().nullable(),
  endMs: z.number().nullable(),
});
export type Utterance = z.infer<typeof UtteranceSchema>;

/* ------------------------------------------------------------------ */
/* Health entry (patient voice notes)                                  */
/* ------------------------------------------------------------------ */

export const SymptomSchema = z.object({
  name: z.string(),
  duration: z.string().nullable(),
  onset: z.string().nullable(),
  severity: z.string().nullable(),
  associatedSymptoms: z.array(z.string()),
});
export type Symptom = z.infer<typeof SymptomSchema>;

/** What the model is allowed to produce. Provenance is NOT model-controlled. */
export const RawHealthEntrySchema = z.object({
  symptoms: z.array(SymptomSchema),
  summary: z.string(),
});
export type RawHealthEntry = z.infer<typeof RawHealthEntrySchema>;

export const HealthEntrySchema = RawHealthEntrySchema.extend({
  sourceType: z.literal("PATIENT_REPORTED"),
});
export type HealthEntry = z.infer<typeof HealthEntrySchema>;

/* ------------------------------------------------------------------ */
/* Visit instructions                                                  */
/* ------------------------------------------------------------------ */

const RawEvidenceFields = {
  sourceText: z.string(),
  speaker: SpeakerRoleSchema,
  contextText: z.string().nullable(),
};

/** What the model is allowed to produce — verified by guards before use. */
export const RawVisitSchema = z.object({
  medications: z.array(
    z.object({
      name: z.string(),
      dose: z.string().nullable(),
      frequency: z.string().nullable(),
      duration: z.string().nullable(),
      ...RawEvidenceFields,
    }),
  ),
  followUp: z.object({ when: z.string(), ...RawEvidenceFields }).nullable(),
  instructions: z.array(z.object({ text: z.string(), ...RawEvidenceFields })),
  patientStatements: z.array(z.object({ text: z.string(), sourceText: z.string() })),
});
export type RawVisit = z.infer<typeof RawVisitSchema>;

export const EvidenceSchema = z.object({
  quote: z.string(),
  role: SpeakerRoleSchema,
  provenance: ProvenanceSchema,
  speakerLabel: z.string().nullable(),
  startMs: z.number().nullable(),
  context: z
    .object({
      quote: z.string(),
      role: SpeakerRoleSchema,
      startMs: z.number().nullable(),
    })
    .nullable(),
});
export type Evidence = z.infer<typeof EvidenceSchema>;

export const MedicationSchema = z.object({
  name: z.string(),
  dose: z.string().nullable(),
  frequency: z.string().nullable(),
  duration: z.string().nullable(),
  evidence: EvidenceSchema,
});
export type Medication = z.infer<typeof MedicationSchema>;

export const VisitFactsSchema = z.object({
  medications: z.array(MedicationSchema),
  followUp: z.object({ when: z.string(), evidence: EvidenceSchema }).nullable(),
  instructions: z.array(z.object({ text: z.string(), evidence: EvidenceSchema })),
  patientStatements: z.array(z.object({ text: z.string(), evidence: EvidenceSchema })),
  excluded: z.array(z.object({ kind: z.string(), text: z.string(), reason: z.string() })),
});
export type VisitFacts = z.infer<typeof VisitFactsSchema>;

/* ------------------------------------------------------------------ */
/* Evidence answers                                                    */
/* ------------------------------------------------------------------ */

export const RawAnswerSchema = z.object({
  found: z.boolean(),
  answer: z.string(),
  citations: z.array(z.object({ quote: z.string(), speaker: SpeakerRoleSchema })),
});
export type RawAnswer = z.infer<typeof RawAnswerSchema>;

export const EvidenceAnswerSchema = z.object({
  found: z.boolean(),
  answer: z.string(),
  citations: z.array(EvidenceSchema),
});
export type EvidenceAnswer = z.infer<typeof EvidenceAnswerSchema>;

export const NOT_FOUND_ANSWER = "I couldn't find that in your saved visit.";

export type Engine = "claude" | "rules";
