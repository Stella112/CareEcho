/**
 * NO SOURCE → NO CLAIM.
 *
 * Model output is never trusted directly. Every fact must quote words that
 * actually exist in the recording, and anything the patient said stays
 * PATIENT_REPORTED — it can never become a clinician instruction.
 */
import {
  type Evidence,
  type EvidenceAnswer,
  type HealthEntry,
  type RawAnswer,
  type RawHealthEntry,
  type RawVisit,
  type SpeakerRole,
  type Utterance,
  type VisitFacts,
  HealthEntrySchema,
  NOT_FOUND_ANSWER,
  EvidenceAnswerSchema,
  VisitFactsSchema,
  provenanceForRole,
} from "./schemas";
import { findGrounding, isPatientVoice, normalize, numbersIn, type Grounding } from "./text";

export function finalizeHealthEntry(raw: RawHealthEntry): HealthEntry {
  const seen = new Set<string>();
  const symptoms = raw.symptoms
    .map((s) => ({
      ...s,
      name: s.name.trim().toLowerCase(),
      associatedSymptoms: [...new Set(s.associatedSymptoms.map((a) => a.trim().toLowerCase()).filter(Boolean))],
    }))
    .filter((s) => s.name && !seen.has(s.name) && seen.add(s.name));
  return HealthEntrySchema.parse({ symptoms, summary: raw.summary.trim(), sourceType: "PATIENT_REPORTED" });
}

function toEvidence(g: Grounding, role: SpeakerRole, context: Evidence["context"]): Evidence {
  return {
    quote: g.quote,
    role,
    provenance: provenanceForRole(role),
    speakerLabel: g.speakerLabel,
    startMs: g.startMs,
    context,
  };
}

function groundContext(contextText: string | null, utterances: Utterance[]): Evidence["context"] {
  if (!contextText) return null;
  const g = findGrounding(contextText, utterances);
  return g ? { quote: g.quote, role: "PATIENT", startMs: g.startMs } : null;
}

/** Keep a detail only if every number in it was actually spoken in the quote. */
function supportedDetail(detail: string | null, quote: string): string | null {
  if (!detail) return null;
  const quoteNums = numbersIn(quote);
  for (const n of numbersIn(detail)) if (!quoteNums.has(n)) return null;
  return detail.trim();
}

function nameInQuote(name: string, quote: string): boolean {
  const n = normalize(name);
  const q = ` ${normalize(quote)} `;
  if (!n) return false;
  if (q.includes(` ${n} `)) return true;
  // tolerate small transcription spelling differences ("amoxicilin")
  const stem = n.split(" ")[0].slice(0, 5);
  return stem.length >= 5 && q.split(" ").some((t) => t.startsWith(stem));
}

type ClinicianCheck = { ok: true; g: Grounding } | { ok: false; reason: string };

function checkClinicianClaim(sourceText: string, speaker: SpeakerRole, utterances: Utterance[]): ClinicianCheck {
  const g = findGrounding(sourceText, utterances);
  if (!g) return { ok: false, reason: "These words aren't in the recording." };
  if (speaker !== "CLINICIAN" || isPatientVoice(g.quote)) {
    return { ok: false, reason: "This was said by the patient, not the clinician." };
  }
  return { ok: true, g };
}

export function finalizeVisit(raw: RawVisit, utterances: Utterance[]): VisitFacts {
  const excluded: VisitFacts["excluded"] = [];
  const patientStatements: VisitFacts["patientStatements"] = [];

  const medications: VisitFacts["medications"] = [];
  for (const m of raw.medications) {
    const check = checkClinicianClaim(m.sourceText, m.speaker, utterances);
    if (!check.ok) {
      excluded.push({ kind: "medication", text: m.name, reason: check.reason });
      continue;
    }
    if (!nameInQuote(m.name, check.g.quote)) {
      excluded.push({ kind: "medication", text: m.name, reason: "The medication name isn't in the quoted words." });
      continue;
    }
    medications.push({
      name: m.name.trim().toLowerCase(),
      dose: supportedDetail(m.dose, check.g.quote),
      frequency: supportedDetail(m.frequency, check.g.quote),
      duration: supportedDetail(m.duration, check.g.quote),
      evidence: toEvidence(check.g, "CLINICIAN", groundContext(m.contextText, utterances)),
    });
  }

  let followUp: VisitFacts["followUp"] = null;
  if (raw.followUp) {
    const check = checkClinicianClaim(raw.followUp.sourceText, raw.followUp.speaker, utterances);
    const when = check.ok ? supportedDetail(raw.followUp.when, check.g.quote) : null;
    if (check.ok && when) {
      followUp = { when, evidence: toEvidence(check.g, "CLINICIAN", groundContext(raw.followUp.contextText, utterances)) };
    } else {
      excluded.push({
        kind: "follow-up",
        text: raw.followUp.when,
        reason: check.ok ? "The date isn't in the quoted words." : check.reason,
      });
    }
  }

  const instructions: VisitFacts["instructions"] = [];
  for (const ins of raw.instructions) {
    const check = checkClinicianClaim(ins.sourceText, ins.speaker, utterances);
    if (!check.ok) {
      excluded.push({ kind: "instruction", text: ins.text, reason: check.reason });
      continue;
    }
    instructions.push({
      text: ins.text.trim(),
      evidence: toEvidence(check.g, "CLINICIAN", groundContext(ins.contextText, utterances)),
    });
  }

  for (const p of raw.patientStatements) {
    const g = findGrounding(p.sourceText, utterances);
    if (g) patientStatements.push({ text: p.text.trim(), evidence: toEvidence(g, "PATIENT", null) });
  }

  return VisitFactsSchema.parse({ medications, followUp, instructions, patientStatements, excluded });
}

export function notFound(): EvidenceAnswer {
  return { found: false, answer: NOT_FOUND_ANSWER, citations: [] };
}

/**
 * An answer survives only if it cites real transcript words, and every number
 * in the answer (doses, days, times) appears in those cited words.
 */
export function finalizeAnswer(raw: RawAnswer, utterances: Utterance[]): EvidenceAnswer {
  if (!raw.found || raw.citations.length === 0 || !raw.answer.trim()) return notFound();

  const citations: Evidence[] = [];
  for (const c of raw.citations) {
    const g = findGrounding(c.quote, utterances);
    if (!g) return notFound();
    const role: SpeakerRole = c.speaker === "CLINICIAN" && isPatientVoice(g.quote) ? "PATIENT" : c.speaker;
    citations.push(toEvidence(g, role, null));
  }

  if (!citations.some((c) => c.role === "CLINICIAN") && /\b(doctor|clinician|nurse)\b/i.test(raw.answer)) {
    // Attributing words to the doctor requires the doctor's words.
    return notFound();
  }

  const cited = new Set(citations.flatMap((c) => [...numbersIn(c.quote)]));
  for (const n of numbersIn(raw.answer)) if (!cited.has(n)) return notFound();

  return EvidenceAnswerSchema.parse({ found: true, answer: raw.answer.trim(), citations });
}
