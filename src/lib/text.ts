import type { Utterance } from "./schemas";

const SMALL: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};
const NUM_WORD =
  "(?:seventeen|thirteen|fourteen|fifteen|sixteen|eighteen|nineteen|eleven|twelve|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|zero|one|two|three|four|five|six|seven|eight|nine|ten)";
const NUM_RUN = new RegExp(`\\b${NUM_WORD}(?:[\\s-]+${NUM_WORD})*\\b`, "gi");

/** "five hundred milligrams for seven days" → "500 milligrams for 7 days" */
export function wordsToDigits(text: string): string {
  return text.replace(NUM_RUN, (run) => {
    let total = 0;
    let current = 0;
    for (const w of run.toLowerCase().split(/[\s-]+/)) {
      if (w === "hundred") current = (current || 1) * 100;
      else if (w === "thousand") {
        total += (current || 1) * 1000;
        current = 0;
      } else current += SMALL[w] ?? 0;
    }
    return String(total + current);
  });
}

/** Lowercase, digits for number words, punctuation stripped, single spaces. */
export function normalize(text: string): string {
  return wordsToDigits(text)
    .toLowerCase()
    .replace(/[’'`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function numbersIn(text: string): Set<string> {
  return new Set(wordsToDigits(text).match(/\d+(?:\.\d+)?/g) ?? []);
}

export function splitSentences(text: string): string[] {
  return (text.match(/[^.!?]+[.!?]*/g) ?? [])
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * First-person requests, questions and guesses are the patient's voice.
 * These can never be promoted into clinician instructions.
 */
const PATIENT_VOICE = [
  /\bi think i (need|should|have|might|may)\b/,
  /\bshould i\b/,
  /\bcan i\b/,
  /\bcould i\b/,
  /\bmay i\b/,
  /\bdo i (need|have)\b/,
  /\bi want\b/,
  /\bi (would|d) like (some|to get|to have|to take|to try)\b/,
  /\bcan you (give|prescribe) me\b/,
  /\bi need (some|an|a|to get|antibiotics)\b/,
  /\bive (had|been)\b/,
  /\bi have (had|been)\b/,
];

export function isPatientVoice(text: string): boolean {
  const n = normalize(text);
  return PATIENT_VOICE.some((re) => re.test(n));
}

export type Grounding = {
  quote: string;
  utteranceIndex: number;
  speakerLabel: string | null;
  startMs: number | null;
  exact: boolean;
};

/**
 * Locate a claimed quote in the real transcript.
 * Exact (normalized, word-boundary) match first, then a strict fuzzy match
 * (≥ 85% of words present in one sentence) that returns the REAL sentence.
 */
export function findGrounding(sourceText: string, utterances: Utterance[]): Grounding | null {
  const cleaned = sourceText.trim().replace(/^["“”']+|["“”']+$/g, "").trim();
  const nq = normalize(cleaned);
  if (!nq) return null;

  for (let i = 0; i < utterances.length; i++) {
    const u = utterances[i];
    if (` ${normalize(u.text)} `.includes(` ${nq} `)) {
      return { quote: cleaned, utteranceIndex: i, speakerLabel: u.speaker, startMs: u.startMs, exact: true };
    }
  }

  const qTokens = nq.split(" ");
  if (qTokens.length < 4) return null;

  let best: { score: number; quote: string; index: number } | null = null;
  utterances.forEach((u, index) => {
    const candidates = [...splitSentences(u.text), u.text];
    for (const candidate of candidates) {
      const tokens = new Set(normalize(candidate).split(" "));
      const score = qTokens.filter((t) => tokens.has(t)).length / qTokens.length;
      if (score >= 0.85 && (!best || score > best.score)) best = { score, quote: candidate.trim(), index };
    }
  });
  if (!best) return null;
  const b = best as { score: number; quote: string; index: number };
  const u = utterances[b.index];
  return { quote: b.quote, utteranceIndex: b.index, speakerLabel: u.speaker, startMs: u.startMs, exact: false };
}

export function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function formatClock(ms: number | null | undefined): string | null {
  if (ms == null) return null;
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** "three times daily" → "3× daily" */
export function formatFrequency(freq: string | null): string | null {
  if (!freq) return null;
  const f = wordsToDigits(freq.toLowerCase())
    .replace(/\bonce\b/, "1 times")
    .replace(/\btwice\b/, "2 times");
  const m = f.match(/(\d+)\s*(?:x|×|times)\s*(?:a|per|each)?\s*(day|daily|week|weekly)/);
  if (m) return `${m[1]}× ${m[2].startsWith("week") ? "weekly" : "daily"}`;
  return freq;
}

/** "500 milligrams" → "500 mg" */
export function formatDose(dose: string | null): string | null {
  if (!dose) return null;
  return wordsToDigits(dose)
    .replace(/\bmilligrams?\b/i, "mg")
    .replace(/\bmicrograms?\b/i, "mcg")
    .replace(/\bmillilit(?:er|re)s?\b/i, "ml")
    .replace(/\bgrams?\b/i, "g");
}
