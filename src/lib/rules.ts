/**
 * Deterministic fallback extractors, used only when the LLM is unavailable.
 * The UI labels results produced this way. Output still passes through guards.
 */
import type { RawAnswer, RawHealthEntry, RawVisit, SpeakerRole, Utterance, VisitFacts } from "./schemas";
import { capitalize, isPatientVoice, normalize, splitSentences, wordsToDigits } from "./text";

const SYMPTOMS: [string, RegExp][] = [
  ["headache", /\b(headaches?|migraines?|head (hurts|is hurting|pain))\b/i],
  ["dizziness", /\b(dizz(y|iness)|lightheaded|light-headed|vertigo)\b/i],
  ["nausea", /\b(nause(a|ous)|feel(ing)? sick to my stomach)\b/i],
  ["fatigue", /\b(fatigue|tired|exhausted|no energy)\b/i],
  ["fever", /\b(fever|feverish|high temperature)\b/i],
  ["cough", /\b(cough(ing)?)\b/i],
  ["sore throat", /\bsore throat\b/i],
  ["chest pain", /\bchest (pain|tightness|hurts)\b/i],
  ["shortness of breath", /\b(short(ness)? of breath|can'?t breathe|breathless)\b/i],
  ["back pain", /\b(back pain|back hurts)\b/i],
  ["stomach pain", /\b(stomach ?ache|stomach pain|abdominal pain|tummy ache)\b/i],
  ["vomiting", /\b(vomit(ing|ed)?|throwing up|threw up)\b/i],
  ["rash", /\brash\b/i],
  ["trouble sleeping", /\b(insomnia|can'?t sleep|trouble sleeping)\b/i],
  ["blurred vision", /\bblurr(y|ed) vision\b/i],
];

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

function negated(sentence: string, index: number): boolean {
  const before = sentence.slice(Math.max(0, index - 24), index).toLowerCase();
  return /\b(no|not|without|never|don'?t have|haven'?t had)\b[^.]*$/.test(before);
}

export function extractHealthEntryRules(transcript: string): RawHealthEntry {
  const found: { name: string; sentence: string }[] = [];
  for (const sentence of splitSentences(transcript)) {
    for (const [name, re] of SYMPTOMS) {
      const m = re.exec(sentence);
      if (m && !negated(sentence, m.index) && !found.some((f) => f.name === name)) found.push({ name, sentence });
    }
  }
  if (found.length === 0) {
    return { symptoms: [], summary: "No specific symptoms were mentioned." };
  }

  const [primary, ...others] = found;
  const s = wordsToDigits(primary.sentence);
  const duration = s.match(/\bfor (?:the (?:last|past) )?(\d+|a few|a couple of) (hours?|days?|weeks?|months?)\b/i);
  const onset = primary.sentence.match(/\b(yesterday|this morning|last night|today|since \w+)\b/i);
  const severity = primary.sentence.match(/\b(mild|moderate|severe|terrible|really bad|less severe|worse|better)\b/i);

  const symptom = {
    name: primary.name,
    duration: duration ? `${duration[1]} ${duration[2]}` : null,
    onset: onset ? onset[1].toLowerCase() : null,
    severity: severity ? severity[1].toLowerCase() : null,
    associatedSymptoms: others.map((o) => o.name),
  };

  const otherBits = others.map((o) => {
    const when = o.sentence.match(/\b(yesterday|this morning|last night|today)\b/i);
    return when ? `${o.name} ${when[1].toLowerCase()}` : o.name;
  });
  const summary =
    `${capitalize(primary.name)} reported` +
    (symptom.duration ? ` for ${symptom.duration}` : "") +
    (otherBits.length ? `, with ${otherBits.join(" and ")}` : "") +
    ".";

  return { symptoms: [symptom], summary };
}

type Sentence = { text: string; speaker: string | null; role: SpeakerRole };

const CLINICIAN_CUES =
  /\b(prescrib|milligram|mg\b|come back|return if|follow[- ]?up|see you again|take (it|this|one)|times (a|per) day|daily|i('d| would) like to see you)/i;

function classify(utterances: Utterance[]): Sentence[] {
  const sentences: Sentence[] = utterances.flatMap((u) =>
    splitSentences(u.text).map((text) => ({ text, speaker: u.speaker, role: "UNKNOWN" as SpeakerRole })),
  );
  sentences.forEach((s, i) => {
    if (isPatientVoice(s.text) || s.text.trim().endsWith("?")) s.role = "PATIENT";
    else if (CLINICIAN_CUES.test(s.text)) s.role = "CLINICIAN";
    else if (/^(yes|yeah|yep|sure|absolutely|no|nope)\b/i.test(s.text) && sentences[i - 1]?.text.trim().endsWith("?"))
      s.role = "CLINICIAN";
  });
  // With 2+ diarized speakers, unknown sentences inherit their speaker's majority role.
  const labels = new Set(sentences.map((s) => s.speaker).filter(Boolean));
  if (labels.size >= 2) {
    for (const label of labels) {
      const mine = sentences.filter((s) => s.speaker === label);
      const c = mine.filter((s) => s.role === "CLINICIAN").length;
      const p = mine.filter((s) => s.role === "PATIENT").length;
      const role: SpeakerRole = c > p ? "CLINICIAN" : p > c ? "PATIENT" : "UNKNOWN";
      mine.forEach((s) => {
        if (s.role === "UNKNOWN") s.role = role;
      });
    }
  }
  return sentences;
}

const UNIT: Record<string, string> = {
  mg: "mg", milligram: "mg", milligrams: "mg", mcg: "mcg", microgram: "mcg", micrograms: "mcg",
  ml: "ml", milliliter: "ml", milliliters: "ml", millilitre: "ml", millilitres: "ml",
  g: "g", gram: "g", grams: "g", unit: "units", units: "units",
};

export function extractVisitRules(utterances: Utterance[]): RawVisit {
  const sentences = classify(utterances);
  const out: RawVisit = { medications: [], followUp: null, instructions: [], patientStatements: [] };

  sentences.forEach((s, i) => {
    const d = wordsToDigits(s.text);
    const prev = sentences[i - 1];

    if (s.role === "PATIENT") {
      out.patientStatements.push({ text: s.text, sourceText: s.text });
      return;
    }
    if (s.role !== "CLINICIAN") return;

    const med =
      d.match(
        /\b(?:prescrib(?:e|ing)|start(?:ing)? you on|put(?:ting)? you on|take|taking)\s+(?:you\s+)?([A-Za-z][A-Za-z-]{3,})\s*,?\s*(\d+(?:\.\d+)?)\s*(mg|milligrams?|mcg|micrograms?|ml|millilit(?:er|re)s?|grams?|g|units?)\b/i,
      ) ?? d.match(/\bprescrib(?:e|ing)\s+(?:you\s+)?([A-Za-z][A-Za-z-]{3,})/i);
    if (med && !/^(something|some|you|them|this|that|medication|medicine)$/i.test(med[1])) {
      const freq = d.match(/\b(once|twice|\d+ times)\s+(?:a |per )?(day|daily)\b/i);
      const dur = d.match(/\bfor (\d+) (days?|weeks?|months?)\b/i);
      let frequency: string | null = null;
      if (freq) {
        const n = freq[1].toLowerCase();
        const count = n === "once" || n === "twice" ? n : `${NUMBER_WORDS[parseInt(n, 10)] ?? n} times`;
        frequency = `${count} daily`;
      }
      out.medications.push({
        name: med[1].toLowerCase(),
        dose: med[2] ? `${med[2]} ${UNIT[med[3].toLowerCase()] ?? med[3]}` : null,
        frequency,
        duration: dur ? `${dur[1]} ${dur[2]}` : null,
        sourceText: s.text,
        speaker: "CLINICIAN",
        contextText: null,
      });
    }

    const fu = d.match(
      /\b(?:see you(?: again)?|come back|follow[- ]?up|return|back in)\b[^.?!]*?\b(next (?:mon|tues|wednes|thurs|fri|satur|sun)day|next week|in \d+ (?:days?|weeks?|months?)|on (?:mon|tues|wednes|thurs|fri|satur|sun)day|tomorrow)\b/i,
    );
    if (fu && !out.followUp) {
      out.followUp = { when: fu[1], sourceText: s.text, speaker: "CLINICIAN", contextText: null };
    }

    const ret = s.text.match(/\b(?:come back|return)(?: to (?:the )?(?:clinic|hospital|see me))? if ([^.?!]+)/i);
    if (ret) {
      out.instructions.push({
        text: `Return if ${ret[1].replace(/\byour\s+/gi, "").trim()}.`,
        sourceText: s.text,
        speaker: "CLINICIAN",
        contextText: null,
      });
    }

    const general = s.text.match(/\b(avoid|drink plenty|get plenty of rest|rest|keep taking|make sure)\b[^.?!]*/i);
    if (general && !ret && !med) {
      out.instructions.push({
        text: `${capitalize(general[0].trim())}.`,
        sourceText: s.text,
        speaker: "CLINICIAN",
        contextText: null,
      });
    }

    const yesNo = s.text.match(/^(yes|yeah|yep|sure|absolutely|no|nope)\b/i);
    if (yesNo && prev?.role === "PATIENT" && prev.text.trim().endsWith("?")) {
      const q = prev.text.trim().match(/^(?:should|can|could|do|may) i\s+(.+?)\?$/i);
      if (q) {
        const affirmative = !/^no/i.test(yesNo[1]);
        out.instructions.push({
          text: affirmative ? `${capitalize(q[1])}.` : `Don't ${q[1]}.`,
          sourceText: yesNo[0].length === s.text.replace(/[.!]$/, "").length ? s.text : yesNo[0],
          speaker: "CLINICIAN",
          contextText: prev.text,
        });
      }
    }
  });

  return out;
}

const STOP = new Set(
  "the a an to of and or is are was were be did do does what when how about my me i you your doctor say said tell told for with it this that on in at".split(" "),
);

export function answerFromEvidenceRules(question: string, facts: VisitFacts): RawAnswer {
  const q = normalize(question);
  const none: RawAnswer = { found: false, answer: "", citations: [] };

  if (/\b(food|eat|meal|empty stomach)\b/.test(q)) {
    const hit = facts.instructions.find((i) => /food|eat|meal|stomach/i.test(`${i.text} ${i.evidence.context?.quote ?? ""}`));
    if (hit) {
      const citations: RawAnswer["citations"] = [{ quote: hit.evidence.quote, speaker: "CLINICIAN" }];
      if (hit.evidence.context) citations.unshift({ quote: hit.evidence.context.quote, speaker: "PATIENT" });
      return { found: true, answer: `Your doctor's instruction was: ${hit.text}`, citations };
    }
    return none;
  }

  if (/\b(follow|come back|again|appointment|next visit|return|when)\b/.test(q) && facts.followUp) {
    return {
      found: true,
      answer: `Your doctor said they'd like to see you again ${facts.followUp.when}.`,
      citations: [{ quote: facts.followUp.evidence.quote, speaker: "CLINICIAN" }],
    };
  }

  const medNames = facts.medications.map((m) => normalize(m.name));
  if (/\b(medication|medicine|meds|drug|pill|tablet|antibiotics?|prescri\w*|dose|dosage|take|taking)\b/.test(q) || medNames.some((n) => q.includes(n))) {
    if (facts.medications.length === 0) return none;
    const parts = facts.medications.map((m) =>
      [m.name, m.dose, m.frequency, m.duration ? `for ${m.duration}` : null].filter(Boolean).join(" "),
    );
    return {
      found: true,
      answer: `Your doctor said to take ${parts.join(", and ")}.`,
      citations: facts.medications.map((m) => ({ quote: m.evidence.quote, speaker: "CLINICIAN" as const })),
    };
  }

  const words = q.split(" ").filter((w) => w.length > 3 && !STOP.has(w));
  const hit = facts.instructions.find((i) => words.some((w) => normalize(`${i.text} ${i.evidence.quote}`).includes(w)));
  if (hit) {
    return {
      found: true,
      answer: `Your doctor's instruction was: ${hit.text}`,
      citations: [{ quote: hit.evidence.quote, speaker: "CLINICIAN" }],
    };
  }
  return none;
}
