import { z } from "zod";
import { ClinicianInstructionSchema, EvidenceSchema, InstructionCorrectionSchema } from "./schemas";
import type { EvidenceAnswer } from "./schemas";
import type { HealthEntryRecord, VisitRecord } from "./healthMemory";

/** Strict schemas mirror the bounded tool surface used by CareEcho's agent layer. */
export const LogSymptomInput = z.object({ transcript: z.string().min(1).max(20_000), language: z.string().min(2).max(12) });
export const SearchHealthMemoryInput = z.object({ query: z.string().min(1).max(500) });
export const SymptomHistoryInput = z.object({ symptom: z.string().min(1).max(120) });
export const SaveQuestionForDoctorInput = z.object({ question: z.string().trim().min(1).max(500) });
export const ProposeClinicianInstructionInput = z.object({
  visitId: z.string().min(1),
  instruction: InstructionCorrectionSchema,
  evidence: EvidenceSchema,
});
export const InstructionActionInput = z.object({ visitId: z.string().min(1), instructionId: z.string().min(1) });
export const ConfirmClinicianInstructionInput = InstructionActionInput.extend({
  confirmedByUser: z.literal(true),
  correction: InstructionCorrectionSchema.optional(),
});
export const RejectClinicianInstructionInput = InstructionActionInput;
export const FindMemoryConflictsInput = z.object({ candidate: ClinicianInstructionSchema });
export const VisitEvidenceInput = z.object({ visitId: z.string().min(1), instructionId: z.string().optional() });
export const LatestConfirmedInstructionInput = z.object({ medication: z.string().trim().min(1).max(120).optional() });

export const AGENT_TOOL_INPUT_SCHEMAS = {
  log_symptom: LogSymptomInput,
  search_health_memory: SearchHealthMemoryInput,
  get_symptom_history: SymptomHistoryInput,
  save_question_for_doctor: SaveQuestionForDoctorInput,
  propose_clinician_instruction: ProposeClinicianInstructionInput,
  confirm_clinician_instruction: ConfirmClinicianInstructionInput,
  reject_clinician_instruction: RejectClinicianInstructionInput,
  find_memory_conflicts: FindMemoryConflictsInput,
  get_visit_evidence: VisitEvidenceInput,
  get_latest_confirmed_instruction: LatestConfirmedInstructionInput,
} as const;

export type SymptomHistory = {
  symptom: string;
  count: number;
  firstReportedAt: string;
  lastReportedAt: string;
  entries: HealthEntryRecord[];
};

const traceTool = (name: string, input: unknown) => {
  if (process.env.NODE_ENV !== "production") console.info(`[CareEcho tool] ${name}`, input);
};

export function getSymptomHistory(symptom: string, entries: HealthEntryRecord[]): SymptomHistory | null {
  const parsed = SymptomHistoryInput.parse({ symptom });
  traceTool("get_symptom_history", parsed);
  const needle = parsed.symptom.toLowerCase();
  const matches = entries
    .filter((entry) => entry.structuredData.symptoms.some((item) => [item.name, ...item.associatedSymptoms].some((name) => name.toLowerCase() === needle)))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  if (!matches.length) return null;
  return { symptom: needle, count: matches.length, firstReportedAt: matches[0].timestamp, lastReportedAt: matches.at(-1)!.timestamp, entries: matches };
}

export function getLatestConfirmedInstruction(visits: VisitRecord[], medication?: string) {
  traceTool("get_latest_confirmed_instruction", { medication });
  const needle = medication?.trim().toLowerCase();
  return visits
    .flatMap((visit) => visit.clinicianInstructions ?? [])
    .filter((instruction) => instruction.status === "CONFIRMED" && (!needle || instruction.medication.toLowerCase() === needle))
    .sort((a, b) => (b.confirmedAt ?? b.createdAt).localeCompare(a.confirmedAt ?? a.createdAt))[0];
}

export function answerFromMemory(question: string, entries: HealthEntryRecord[], visits: VisitRecord[]): EvidenceAnswer | null {
  const q = SearchHealthMemoryInput.parse({ query: question }).query.toLowerCase();
  traceTool("search_health_memory", { query: question });

  if (/\b(first|when|how long)\b/.test(q) && /\bdizz/.test(q)) {
    const history = getSymptomHistory("dizziness", entries);
    if (!history) return null;
    const first = new Date(history.firstReportedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "Africa/Lagos" });
    const source = history.entries[0];
    return {
      found: true,
      answer: `Your first saved dizziness report was ${first}. You've reported it ${history.count} times since.`,
      citations: [{ quote: source.rawTranscript, role: "PATIENT", provenance: "PATIENT_REPORTED", speakerLabel: null, startMs: null, context: null }],
    };
  }

  if (/\b(what|which).*\b(changed|change)\b/.test(q) && /\b(medication|medicine|metformin|dose)\b/.test(q)) {
    const current = getLatestConfirmedInstruction(visits, "metformin");
    if (!current) return null;
    const previous = visits.flatMap((visit) => visit.clinicianInstructions ?? []).find((instruction) => instruction.supersededBy === current.id);
    if (!previous) return null;
    return {
      found: true,
      answer: `Today's confirmed instruction changed from metformin ${spokenDose(previous.dose)} ${previous.frequency ?? ""} to ${spokenDose(current.dose)} ${current.frequency ?? ""}.`.replace(/\s+/g, " "),
      citations: [current.evidence],
    };
  }

  return null;
}

const spokenDose = (dose: string | null) => (dose ?? "").replace(/\bmg\b/gi, "milligrams");
