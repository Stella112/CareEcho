/**
 * Health memory storage. localStorage tonight; the async-free interface is
 * deliberately small so it can move to Supabase later without touching UI.
 */
import type { Engine, EvidenceAnswer, HealthEntry, Provenance, Utterance, VisitFacts } from "./schemas";
import { demoEntries } from "./demoData";
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
};

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
    write(KEYS.seeded, true);
  },

  resetToDemo() {
    write(KEYS.entries, demoEntries());
    write(KEYS.visits, []);
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
    return read<VisitRecord[]>(KEYS.visits, []).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  },

  getVisit(id: string): VisitRecord | undefined {
    return read<VisitRecord[]>(KEYS.visits, []).find((v) => v.id === id);
  },

  saveVisit(visit: VisitRecord) {
    write(KEYS.visits, [visit, ...read<VisitRecord[]>(KEYS.visits, []).filter((v) => v.id !== visit.id)]);
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
