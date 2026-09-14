import { describe, expect, it } from "vitest";
import {
  HealthEntrySchema,
  PROVENANCE,
  ProvenanceSchema,
  RawVisitSchema,
  VisitFactsSchema,
  NOT_FOUND_ANSWER,
  type Utterance,
} from "@/lib/schemas";
import { finalizeAnswer, finalizeHealthEntry, finalizeVisit } from "@/lib/guards";
import { answerFromEvidenceRules, extractHealthEntryRules, extractVisitRules } from "@/lib/rules";
import { SAMPLE_CONSULTATION, SAMPLE_SYMPTOM } from "@/lib/demoData";
import { formatDose, formatFrequency, wordsToDigits } from "@/lib/text";

describe("1. health extraction schema", () => {
  it("accepts the canonical health entry shape", () => {
    const entry = {
      symptoms: [{ name: "headache", duration: "3 days", onset: null, severity: null, associatedSymptoms: ["dizziness"] }],
      summary: "Headache reported for three days with dizziness yesterday.",
      sourceType: "PATIENT_REPORTED",
    };
    expect(HealthEntrySchema.parse(entry)).toEqual(entry);
  });

  it("rejects a health entry that claims clinician provenance", () => {
    expect(() =>
      HealthEntrySchema.parse({ symptoms: [], summary: "x", sourceType: "CLINICIAN_SAID" }),
    ).toThrow();
  });

  it("always stamps PATIENT_REPORTED, regardless of model output", () => {
    const entry = finalizeHealthEntry({ symptoms: [], summary: "Nothing." });
    expect(entry.sourceType).toBe("PATIENT_REPORTED");
  });

  it("extracts the demo symptom sentence", () => {
    const entry = finalizeHealthEntry(extractHealthEntryRules(SAMPLE_SYMPTOM));
    expect(entry.symptoms[0]).toMatchObject({ name: "headache", duration: "3 days", associatedSymptoms: ["dizziness"] });
    expect(entry.summary).not.toMatch(/migraine|likely|diagnos/i);
  });
});

describe("2. visit extraction schema", () => {
  it("rejects raw visit output missing source evidence", () => {
    expect(() =>
      RawVisitSchema.parse({
        medications: [{ name: "amoxicillin", dose: "500 mg", frequency: null, duration: null }],
        followUp: null,
        instructions: [],
        patientStatements: [],
      }),
    ).toThrow();
  });

  it("extracts the demo consultation with evidence on every fact", () => {
    const facts = finalizeVisit(extractVisitRules(SAMPLE_CONSULTATION), SAMPLE_CONSULTATION);
    expect(VisitFactsSchema.parse(facts)).toBeTruthy();
    expect(facts.medications).toHaveLength(1);
    const med = facts.medications[0];
    expect(med.name).toBe("amoxicillin");
    expect(formatDose(med.dose)).toBe("500 mg");
    expect(formatFrequency(med.frequency)).toBe("3× daily");
    expect(wordsToDigits(med.duration ?? "")).toBe("7 days");
    expect(med.evidence.provenance).toBe("CLINICIAN_SAID");
    expect(med.evidence.quote).toMatch(/amoxicillin 500 milligrams/);
    expect(facts.followUp?.when).toBe("next Thursday");
    expect(facts.instructions.map((i) => i.text)).toContain("Return if symptoms worsen.");
    for (const item of [...facts.medications, ...facts.instructions, facts.followUp!]) {
      expect(item.evidence.quote.length).toBeGreaterThan(0);
    }
  });

  it("drops a fact whose quote is not in the recording", () => {
    const facts = finalizeVisit(
      {
        medications: [
          { name: "ibuprofen", dose: "400 mg", frequency: null, duration: null, sourceText: "Take ibuprofen 400 mg.", speaker: "CLINICIAN", contextText: null },
        ],
        followUp: null,
        instructions: [],
        patientStatements: [],
      },
      SAMPLE_CONSULTATION,
    );
    expect(facts.medications).toHaveLength(0);
    expect(facts.excluded[0].kind).toBe("medication");
  });

  it("strips a dose that was never spoken", () => {
    const facts = finalizeVisit(
      {
        medications: [
          {
            name: "amoxicillin",
            dose: "1000 mg",
            frequency: "three times daily",
            duration: "7 days",
            sourceText: "I'm prescribing amoxicillin 500 milligrams three times daily for seven days.",
            speaker: "CLINICIAN",
            contextText: null,
          },
        ],
        followUp: null,
        instructions: [],
        patientStatements: [],
      },
      SAMPLE_CONSULTATION,
    );
    expect(facts.medications[0].dose).toBeNull();
    expect(facts.medications[0].duration).toBe("7 days");
  });
});

describe("3. provenance values", () => {
  it("has exactly the four internal provenance values", () => {
    expect([...PROVENANCE]).toEqual(["PATIENT_REPORTED", "CLINICIAN_SAID", "AI_DERIVED", "UNKNOWN"]);
    expect(() => ProvenanceSchema.parse("DOCTOR_SAID")).toThrow();
  });

  it("marks patient questions PATIENT_REPORTED", () => {
    const facts = finalizeVisit(extractVisitRules(SAMPLE_CONSULTATION), SAMPLE_CONSULTATION);
    expect(facts.patientStatements[0].evidence.provenance).toBe("PATIENT_REPORTED");
    expect(facts.patientStatements[0].evidence.quote).toBe("Should I take it with food?");
  });
});

describe("4. evidence answers cannot return unsupported facts", () => {
  const facts = finalizeVisit(extractVisitRules(SAMPLE_CONSULTATION), SAMPLE_CONSULTATION);

  it("answers the medication question from the doctor's words", () => {
    const answer = finalizeAnswer(answerFromEvidenceRules("What did the doctor say about my medication?", facts), SAMPLE_CONSULTATION);
    expect(answer.found).toBe(true);
    expect(answer.answer).toMatch(/amoxicillin 500 mg three times daily for 7 days/);
    expect(answer.citations[0].provenance).toBe("CLINICIAN_SAID");
  });

  it("refuses when the citation is not in the transcript", () => {
    const answer = finalizeAnswer(
      { found: true, answer: "Your doctor said to take ibuprofen.", citations: [{ quote: "Take ibuprofen twice a day.", speaker: "CLINICIAN" }] },
      SAMPLE_CONSULTATION,
    );
    expect(answer).toEqual({ found: false, answer: NOT_FOUND_ANSWER, citations: [] });
  });

  it("refuses when the answer contains a number the evidence doesn't", () => {
    const answer = finalizeAnswer(
      {
        found: true,
        answer: "Your doctor said to take amoxicillin 1000 mg for 10 days.",
        citations: [{ quote: "I'm prescribing amoxicillin 500 milligrams three times daily for seven days.", speaker: "CLINICIAN" }],
      },
      SAMPLE_CONSULTATION,
    );
    expect(answer.found).toBe(false);
  });

  it("refuses an uncited answer", () => {
    const answer = finalizeAnswer({ found: true, answer: "Your doctor said you have a sinus infection.", citations: [] }, SAMPLE_CONSULTATION);
    expect(answer.found).toBe(false);
  });

  it("returns not-found for questions the visit doesn't cover", () => {
    const answer = finalizeAnswer(answerFromEvidenceRules("Can I drink alcohol?", facts), SAMPLE_CONSULTATION);
    expect(answer.answer).toBe(NOT_FOUND_ANSWER);
  });
});

describe("5. patient statements never become clinician instructions", () => {
  const visit: Utterance[] = [
    { speaker: "B", text: "I think I need antibiotics.", startMs: 0, endMs: 1500 },
    { speaker: "A", text: "Let's wait and see how you feel over the weekend.", startMs: 1800, endMs: 4200 },
  ];

  it("rules extractor does not prescribe what the patient asked for", () => {
    const facts = finalizeVisit(extractVisitRules(visit), visit);
    expect(facts.medications).toHaveLength(0);
    expect(facts.patientStatements[0].evidence.provenance).toBe("PATIENT_REPORTED");
  });

  it("guard rejects a model that mislabels the patient's words as the clinician's", () => {
    const facts = finalizeVisit(
      {
        medications: [
          { name: "antibiotics", dose: null, frequency: null, duration: null, sourceText: "I think I need antibiotics.", speaker: "CLINICIAN", contextText: null },
        ],
        followUp: null,
        instructions: [{ text: "Take antibiotics.", sourceText: "I think I need antibiotics.", speaker: "CLINICIAN", contextText: null }],
        patientStatements: [],
      },
      visit,
    );
    expect(facts.medications).toHaveLength(0);
    expect(facts.instructions).toHaveLength(0);
    expect(facts.excluded.every((e) => /patient/.test(e.reason))).toBe(true);
  });

  it("answers cannot attribute the patient's words to the doctor", () => {
    const answer = finalizeAnswer(
      { found: true, answer: "Your doctor said you need antibiotics.", citations: [{ quote: "I think I need antibiotics.", speaker: "CLINICIAN" }] },
      visit,
    );
    expect(answer.found).toBe(false);
  });

  it("health notes about wanting medication produce no symptom", () => {
    const entry = finalizeHealthEntry(extractHealthEntryRules("I think I need antibiotics."));
    expect(entry.symptoms).toHaveLength(0);
    expect(entry.sourceType).toBe("PATIENT_REPORTED");
  });
});
