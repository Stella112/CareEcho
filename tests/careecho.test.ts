import { describe, expect, it } from "vitest";
import {
  HealthEntrySchema,
  INSTRUCTION_STATUSES,
  PROVENANCE,
  ProvenanceSchema,
  RawVisitSchema,
  VisitFactsSchema,
  NOT_FOUND_ANSWER,
  type Utterance,
} from "@/lib/schemas";
import { finalizeAnswer, finalizeHealthEntry, finalizeVisit } from "@/lib/guards";
import { answerFromEvidenceRules, extractHealthEntryRules, extractVisitRules } from "@/lib/rules";
import { demoEntries, demoVisits, SAMPLE_CONSULTATION, SAMPLE_SYMPTOM } from "@/lib/demoData";
import { confirmInstructionInVisits, ensureVisitInstructions, findInstructionConflict, rejectInstructionInVisits, type VisitRecord } from "@/lib/healthMemory";
import { formatDose, formatFrequency, wordsToDigits } from "@/lib/text";
import { AGENT_TOOL_INPUT_SCHEMAS, answerFromMemory, ConfirmClinicianInstructionInput, getSymptomHistory } from "@/lib/agentTools";

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
    expect(entry.symptoms[0]).toMatchObject({ name: "dizziness" });
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
    expect(med.name).toBe("metformin");
    expect(formatDose(med.dose)).toBe("500 mg");
    expect(formatFrequency(med.frequency)).toBe("2× daily");
    expect(med.duration).toBeNull();
    expect(med.evidence.provenance).toBe("CLINICIAN_SAID");
    expect(med.evidence.quote).toMatch(/metformin to 500 milligrams/);
    expect(facts.followUp?.when).toBe("next Thursday");
    expect(facts.instructions.map((i) => i.text)).toContain("Keep taking it with meals.");
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
    const recording: Utterance[] = [{ speaker: "A", text: "I'm prescribing amoxicillin 500 milligrams three times daily for seven days.", startMs: 0, endMs: 5000 }];
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
      recording,
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
    expect(facts.patientStatements[0].evidence.quote).toBe("Should I keep taking it with meals?");
  });
});

describe("4. evidence answers cannot return unsupported facts", () => {
  const facts = finalizeVisit(extractVisitRules(SAMPLE_CONSULTATION), SAMPLE_CONSULTATION);

  it("answers the medication question from the doctor's words", () => {
    const answer = finalizeAnswer(answerFromEvidenceRules("What did the doctor say about my medication?", facts), SAMPLE_CONSULTATION);
    expect(answer.found).toBe(true);
    expect(answer.answer).toMatch(/metformin 500 mg twice daily/);
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
        answer: "Your doctor said to take metformin 1000 mg for 10 days.",
        citations: [{ quote: "Change the metformin to 500 milligrams twice daily.", speaker: "CLINICIAN" }],
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

describe("6. confirm-to-commit medication safety", () => {
  const proposedVisit = (): VisitRecord =>
    ensureVisitInstructions({
      id: "new-visit",
      timestamp: "2026-09-29T10:00:00.000Z",
      transcript: SAMPLE_CONSULTATION.map((item) => item.text).join(" "),
      utterances: SAMPLE_CONSULTATION,
      facts: finalizeVisit(extractVisitRules(SAMPLE_CONSULTATION), SAMPLE_CONSULTATION),
      diarized: true,
      medicalMode: false,
      isSample: true,
      engine: "rules",
      qa: [],
      language: "en",
    });

  it("uses explicit lifecycle states and defaults extracted instructions to PROPOSED", () => {
    expect([...INSTRUCTION_STATUSES]).toEqual(["PROPOSED", "CONFIRMED", "REJECTED", "SUPERSEDED"]);
    expect(proposedVisit().clinicianInstructions?.[0].status).toBe("PROPOSED");
  });

  it("detects a deterministic conflict with the prior confirmed dose", () => {
    const prior = demoVisits();
    const candidate = proposedVisit().clinicianInstructions![0];
    expect(findInstructionConflict(candidate, [...prior, proposedVisit()])).toMatchObject({ frequency: "once daily", status: "CONFIRMED" });
  });

  it("confirmation supersedes the previous instruction", () => {
    const current = proposedVisit();
    const candidate = current.clinicianInstructions![0];
    const next = confirmInstructionInVisits([...demoVisits(), current], current.id, candidate.id, "2026-09-29T10:01:00.000Z");
    const ledger = next.flatMap((visit) => visit.clinicianInstructions ?? []);
    expect(ledger.find((item) => item.id === candidate.id)?.status).toBe("CONFIRMED");
    expect(ledger.find((item) => item.id === "instruction-demo-prior-metformin-0")).toMatchObject({ status: "SUPERSEDED", supersededBy: candidate.id });
  });

  it("cannot re-confirm a superseded instruction through the state function", () => {
    const current = proposedVisit();
    const candidate = current.clinicianInstructions![0];
    const confirmed = confirmInstructionInVisits([...demoVisits(), current], current.id, candidate.id, "2026-09-29T10:01:00.000Z");
    const unchanged = confirmInstructionInVisits(
      confirmed,
      "demo-prior-metformin",
      "instruction-demo-prior-metformin-0",
      "2026-09-29T10:02:00.000Z",
    );
    expect(unchanged).toBe(confirmed);
    expect(unchanged.flatMap((visit) => visit.clinicianInstructions ?? []).find((item) => item.id === candidate.id)?.status).toBe("CONFIRMED");
  });

  it("rejection never changes the prior confirmed instruction", () => {
    const current = proposedVisit();
    const candidate = current.clinicianInstructions![0];
    const next = rejectInstructionInVisits([...demoVisits(), current], current.id, candidate.id);
    const ledger = next.flatMap((visit) => visit.clinicianInstructions ?? []);
    expect(ledger.find((item) => item.id === candidate.id)?.status).toBe("REJECTED");
    expect(ledger.find((item) => item.id === "instruction-demo-prior-metformin-0")?.status).toBe("CONFIRMED");
  });
});

describe("7. deterministic agent memory tools", () => {
  it("defines strict input contracts for every bounded agent tool", () => {
    expect(Object.keys(AGENT_TOOL_INPUT_SCHEMAS)).toEqual([
      "log_symptom",
      "search_health_memory",
      "get_symptom_history",
      "save_question_for_doctor",
      "propose_clinician_instruction",
      "confirm_clinician_instruction",
      "reject_clinician_instruction",
      "find_memory_conflicts",
      "get_visit_evidence",
      "get_latest_confirmed_instruction",
    ]);
    expect(() => ConfirmClinicianInstructionInput.parse({ visitId: "visit", instructionId: "instruction", confirmedByUser: false })).toThrow();
  });

  it("retrieves the first dizziness report and exact count", () => {
    const entries = demoEntries();
    const history = getSymptomHistory("dizziness", entries);
    expect(history?.count).toBe(4);
    expect(history?.firstReportedAt).toContain("2026-09-18");
  });

  it("answers the medication change only after confirmation", () => {
    const current = ensureVisitInstructions({
      id: "new-visit",
      timestamp: "2026-09-29T10:00:00.000Z",
      transcript: SAMPLE_CONSULTATION.map((item) => item.text).join(" "),
      utterances: SAMPLE_CONSULTATION,
      facts: finalizeVisit(extractVisitRules(SAMPLE_CONSULTATION), SAMPLE_CONSULTATION),
      diarized: true,
      medicalMode: false,
      isSample: true,
      engine: "rules",
      qa: [],
    });
    expect(answerFromMemory("What changed with my medication today?", [], [...demoVisits(), current])).toBeNull();
    const candidate = current.clinicianInstructions![0];
    const confirmed = confirmInstructionInVisits([...demoVisits(), current], current.id, candidate.id, "2026-09-29T10:01:00.000Z");
    expect(answerFromMemory("When did I first report dizziness?", demoEntries(), [])?.answer).toBe("Your first saved dizziness report was September 18. You've reported it 4 times since.");
    expect(answerFromMemory("What changed with my medication today?", [], confirmed)?.answer).toMatch(/once daily to 500 milligrams twice daily/);
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
