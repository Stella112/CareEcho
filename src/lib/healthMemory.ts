/**
 * Health memory storage. localStorage tonight; the async-free interface is
 * deliberately small so it can move to Supabase later without touching UI.
 */
import { ClinicianInstructionSchema, InstructionCorrectionSchema } from "./schemas";
import type { ClinicianInstruction, Engine, EvidenceAnswer, HealthEntry, InstructionCorrection, Provenance, Utterance, VisitFacts } from "./schemas";
import { demoEntries, demoVisits } from "./demoData";
import { DEFAULT_PROFILE, type Profile } from "./profile";

export type HealthEntryRecord = {
  id: string;
  timestamp: string;
  rawTranscript: string;
  structuredData: HealthEntry;
  sourceType: Provenance;
  engine?: Engine;
  edited?: boolean;
  isDemo?: boolean;
  language?: string;
};

export type QARecord = {
  id: string;
  timestamp: string;
  question: string;
  askedBy: "voice" | "text";
  answer: EvidenceAnswer;
  engine: Engine;
};

export type VisitRecord = {
  id: string;
  timestamp: string;
  transcript: string;
  utterances: Utterance[];
  facts: VisitFacts;
  diarized: boolean;
  medicalMode: boolean;
  /** true when loaded from the sample consultation rather than a live recording */
  isSample: boolean;
  engine: Engine;
  qa: QARecord[];
  language?: string;
  /** Clinician facts stay proposed until the patient explicitly confirms them. */
  clinicianInstructions?: ClinicianInstruction[];
};

const normalizedMedication = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function ensureVisitInstructions(visit: VisitRecord): VisitRecord {
  const existing = visit.clinicianInstructions ?? [];
  const known = new Set(existing.map((instruction) => instruction.id));
  const proposed = visit.facts.medications
    .map<ClinicianInstruction>((medication, index) => ({
      id: `instruction-${visit.id}-${index}`,
      visitId: visit.id,
      kind: "MEDICATION",
      status: "PROPOSED",
      medication: medication.name,
      dose: medication.dose,
      frequency: medication.frequency,
      duration: medication.duration,
      evidence: medication.evidence,
      createdAt: visit.timestamp,
      confirmedAt: null,
      supersededBy: null,
      corrected: false,
    }))
    .filter((instruction) => !known.has(instruction.id));
  return proposed.length || !visit.clinicianInstructions
    ? { ...visit, clinicianInstructions: [...existing, ...proposed] }
    : visit;
}

export function confirmedInstructions(visits: VisitRecord[]): ClinicianInstruction[] {
  return visits
    .flatMap((visit) => ensureVisitInstructions(visit).clinicianInstructions ?? [])
    .filter((instruction) => instruction.status === "CONFIRMED")
    .sort((a, b) => (b.confirmedAt ?? b.createdAt).localeCompare(a.confirmedAt ?? a.createdAt));
}

export function findInstructionConflict(
  candidate: ClinicianInstruction,
  visits: VisitRecord[],
): ClinicianInstruction | undefined {
  const prior = confirmedInstructions(visits).find(
    (instruction) => instruction.id !== candidate.id && normalizedMedication(instruction.medication) === normalizedMedication(candidate.medication),
  );
  if (!prior) return undefined;
  const field = (value: string | null) => (value ?? "").trim().toLowerCase();
  return field(prior.dose) !== field(candidate.dose) || field(prior.frequency) !== field(candidate.frequency) || field(prior.duration) !== field(candidate.duration)
    ? prior
    : undefined;
}

export function confirmInstructionInVisits(
  source: VisitRecord[],
  visitId: string,
  instructionId: string,
  confirmedAt: string,
  correction?: InstructionCorrection,
): VisitRecord[] {
  const visits = source.map(ensureVisitInstructions);
  const target = visits
    .flatMap((visit) => visit.clinicianInstructions ?? [])
    .find((instruction) => instruction.id === instructionId && instruction.visitId === visitId);
  if (!target || target.status !== "PROPOSED") return source;
  const validatedCorrection = correction ? InstructionCorrectionSchema.parse(correction) : undefined;
  const candidate = ClinicianInstructionSchema.parse({
    ...target,
    ...(validatedCorrection ?? {}),
    medication: (validatedCorrection?.medication ?? target.medication).trim().toLowerCase(),
    status: "CONFIRMED",
    confirmedAt,
    supersededBy: null,
    corrected: Boolean(validatedCorrection),
  });
  return visits.map((visit) => ({
    ...visit,
    clinicianInstructions: (visit.clinicianInstructions ?? []).map((instruction) => {
      if (instruction.id === instructionId) return candidate;
      if (instruction.status === "CONFIRMED" && normalizedMedication(instruction.medication) === normalizedMedication(candidate.medication)) {
        return { ...instruction, status: "SUPERSEDED" as const, supersededBy: candidate.id };
      }
      return instruction;
    }),
  }));
}

export function rejectInstructionInVisits(source: VisitRecord[], visitId: string, instructionId: string): VisitRecord[] {
  return source.map(ensureVisitInstructions).map((visit) => ({
    ...visit,
    clinicianInstructions: (visit.clinicianInstructions ?? []).map((instruction) =>
      visit.id === visitId && instruction.id === instructionId && instruction.status === "PROPOSED"
        ? { ...instruction, status: "REJECTED" as const }
        : instruction,
    ),
  }));
}

const KEYS = {
  entries: "careecho.v1.entries",
  visits: "careecho.v1.visits",
  seeded: "careecho.v1.seeded",
  language: "careecho.v1.language",
  profile: "careecho.v1.profile",
};
const EVENT = "careecho:memory";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn("[healthMemory] write failed", err);
  }
  window.dispatchEvent(new Event(EVENT));
}

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `id-${Date.now()}-${Math.random()}`;

export const healthMemory = {
  subscribe(cb: () => void) {
    const handler = () => cb();
    window.addEventListener(EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  },

  seedDemoIfNeeded() {
    if (read(KEYS.seeded, false)) return;
    if (read<HealthEntryRecord[]>(KEYS.entries, []).length === 0) write(KEYS.entries, demoEntries());
    if (read<VisitRecord[]>(KEYS.visits, []).length === 0) write(KEYS.visits, demoVisits());
    write(KEYS.seeded, true);
  },

  resetToDemo() {
    write(KEYS.entries, demoEntries());
    write(KEYS.visits, demoVisits());
    write(KEYS.profile, { ...DEFAULT_PROFILE, firstName: "Stellamaris", assistantName: "Ada", preferredLanguage: "en" });
    write(KEYS.language, "en");
    write(KEYS.seeded, true);
  },

  clearAll() {
    write(KEYS.entries, []);
    write(KEYS.visits, []);
    write(KEYS.seeded, true);
  },

  replaceCloud(entries: HealthEntryRecord[], visits: VisitRecord[]) {
    write(KEYS.entries, entries);
    write(KEYS.visits, visits);
    write(KEYS.seeded, true);
  },

  exportCloud(): { entries: HealthEntryRecord[]; visits: VisitRecord[] } {
    return { entries: this.listEntries(), visits: this.listVisits() };
  },

  listEntries(): HealthEntryRecord[] {
    return read<HealthEntryRecord[]>(KEYS.entries, []).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  },

  saveEntry(entry: HealthEntryRecord) {
    write(KEYS.entries, [entry, ...read<HealthEntryRecord[]>(KEYS.entries, []).filter((e) => e.id !== entry.id)]);
  },

  listVisits(): VisitRecord[] {
    return read<VisitRecord[]>(KEYS.visits, []).map(ensureVisitInstructions).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  },

  getVisit(id: string): VisitRecord | undefined {
    const visit = read<VisitRecord[]>(KEYS.visits, []).find((v) => v.id === id);
    return visit ? ensureVisitInstructions(visit) : undefined;
  },

  saveVisit(visit: VisitRecord) {
    write(KEYS.visits, [ensureVisitInstructions(visit), ...read<VisitRecord[]>(KEYS.visits, []).filter((v) => v.id !== visit.id)]);
  },

  confirmInstruction(visitId: string, instructionId: string, correction?: InstructionCorrection) {
    const visits = read<VisitRecord[]>(KEYS.visits, []).map(ensureVisitInstructions);
    const next = confirmInstructionInVisits(visits, visitId, instructionId, new Date().toISOString(), correction);
    if (next === visits) return false;
    write(KEYS.visits, next);
    return true;
  },

  rejectInstruction(visitId: string, instructionId: string) {
    const visits = read<VisitRecord[]>(KEYS.visits, []).map(ensureVisitInstructions);
    const target = visits.flatMap((visit) => visit.clinicianInstructions ?? []).find((instruction) => visitId === instruction.visitId && instructionId === instruction.id);
    if (!target || target.status !== "PROPOSED") return false;
    write(KEYS.visits, rejectInstructionInVisits(visits, visitId, instructionId));
    return true;
  },

  addQA(visitId: string, qa: QARecord) {
    const visit = this.getVisit(visitId);
    if (visit) this.saveVisit({ ...visit, qa: [...visit.qa, qa] });
  },

  getLanguage(): string {
    return read(KEYS.language, "en");
  },

  setLanguage(code: string) {
    write(KEYS.language, code);
  },

  getProfile(): Profile {
    return { ...DEFAULT_PROFILE, ...read<Partial<Profile>>(KEYS.profile, {}) };
  },

  setProfile(profile: Profile) {
    write(KEYS.profile, profile);
    if (isBrowser()) write(KEYS.language, profile.preferredLanguage);
  },
};

function isBrowser() {
  return typeof window !== "undefined";
}
