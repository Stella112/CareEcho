"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarCheck,
  ChevronDown,
  ClipboardCheck,
  FlaskConical,
  LoaderCircle,
  Mic,
  Pill,
  Quote,
  SearchX,
  Send,
  ShieldCheck,
  Sparkles,
  Square,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Ada } from "../Ada";
import { Waveform } from "../Waveform";
import { useShell } from "../shell/AppShell";
import { GlassPanel, PrismCard } from "../ui/Glass";
import { BackButton, IconBubble, SafetyNote, ScreenScroll, SourceBadge } from "../ui/bits";
import { clock, useRecorder } from "@/hooks/useRecorder";
import { postJSON, transcribeBlob } from "@/lib/client";
import { dayLabel, timeLabel } from "@/lib/dates";
import { healthMemory, newId, type VisitRecord } from "@/lib/healthMemory";
import type { Engine, Evidence, EvidenceAnswer } from "@/lib/schemas";
import { capitalize, formatClock, formatDose, formatFrequency } from "@/lib/text";

const roleName = (role: Evidence["role"]) => (role === "CLINICIAN" ? "Doctor" : role === "PATIENT" ? "You" : "Speaker");

function visitDay(v: VisitRecord) {
  const d = dayLabel(v.timestamp);
  return d === "Today" || d === "Yesterday" ? `Visit ${d.toLowerCase()}` : `Visit ${d}`;
}

function SourceSheet({ evidence, saved, visit }: { evidence: Evidence; saved: string; visit: VisitRecord }) {
  const t = formatClock(evidence.startMs);
  return (
    <div>
      <div className="flex items-center justify-between">
        <SourceBadge provenance={evidence.provenance} size="md" />
        <span className="text-[12px] text-mute">
          {roleName(evidence.role)}
          {t ? ` · ${t}` : ""} · {visitDay(visit)}
        </span>
      </div>

      {evidence.context && (
        <div className="glass-soft mt-4 rounded-2xl p-3.5">
          <div className="flex items-center justify-between">
            <p className="eyebrow">You asked</p>
            {formatClock(evidence.context.startMs) && <span className="text-[11px] text-mute">{formatClock(evidence.context.startMs)}</span>}
          </div>
          <p className="mt-1 text-[14.5px] italic text-ink-soft">“{evidence.context.quote}”</p>
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="prism mt-4 rounded-[26px] p-5">
        <Quote size={26} className="text-periwinkle" fill="currentColor" strokeWidth={0} />
        <p className="mt-2 text-[21px] font-medium leading-[1.4] tracking-[-0.01em] text-ink">{evidence.quote}</p>
      </motion.div>

      <div className="glass-soft mt-3 flex items-start gap-3 rounded-2xl p-3.5">
        <Sparkles size={16} className="mt-0.5 shrink-0 text-indigo" />
        <div>
          <p className="eyebrow">What Ada saved</p>
          <p className="mt-0.5 text-[14px] font-semibold text-ink">{saved}</p>
        </div>
      </div>

      <p className="mt-4 text-[11.5px] leading-relaxed text-mute">
        {visit.isSample
          ? "Quoted from the sample consultation (demo) — not a live recording."
          : `Quoted word-for-word from your recorded consultation (AssemblyAI${visit.diarized ? ", speaker labels" : ""}${visit.medicalMode ? ", Medical Mode" : ""}).`}{" "}
        Ada only saves what&apos;s in the recording.
      </p>
    </div>
  );
}

function ViewSourceButton({ onClick, evidence }: { onClick: () => void; evidence: Evidence }) {
  const t = formatClock(evidence.startMs);
  return (
    <div className="mt-4 flex items-center justify-between border-t border-white/70 pt-3">
      <span className="text-[11.5px] text-mute">
        {roleName(evidence.role)}
        {t ? ` · ${t}` : ""}
      </span>
      <button onClick={onClick} className="btn-glass flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-indigo">
        <Quote size={12} fill="currentColor" strokeWidth={0} /> View source
      </button>
    </div>
  );
}

function AnswerCard({ answer, question, askedBy, visit, onSource }: { answer: EvidenceAnswer; question: string; askedBy: "voice" | "text"; visit: VisitRecord; onSource: (e: Evidence, saved: string) => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="space-y-2.5">
      <div className="ml-auto flex w-fit max-w-[88%] items-start gap-1.5 rounded-[20px] rounded-br-md bg-gradient-to-br from-[#6f78ff] to-[#5256e6] px-3.5 py-2.5 text-[14px] text-white shadow-[0_8px_20px_-10px_rgba(80,86,230,0.7)]">
        {askedBy === "voice" && <Mic size={13} className="mt-1 shrink-0 opacity-80" />}
        {question}
      </div>

      <div className={`${answer.found ? "prism" : "glass"} rounded-[24px] rounded-bl-md p-4`}>
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-[#e9ebff] to-[#cfd3ff]">
            <Sparkles size={12} className="text-indigo" />
          </span>
          <span className="text-[12px] font-bold text-ink">Ada</span>
        </div>
        {answer.found ? (
          <>
            <p className="mt-2 text-[15.5px] font-medium leading-relaxed text-ink">{answer.answer}</p>
            <p className="eyebrow mt-4">Source</p>
            <div className="mt-2 space-y-2">
              {answer.citations.map((c, i) => (
                <button key={i} onClick={() => onSource(c, answer.answer)} className="glass-inset block w-full rounded-2xl p-3 text-left">
                  <div className="flex items-center gap-2">
                    <SourceBadge provenance={c.provenance} />
                    <span className="text-[11px] text-mute">
                      {roleName(c.role)} · {visitDay(visit)}
                      {formatClock(c.startMs) ? ` · ${formatClock(c.startMs)}` : ""}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[13.5px] italic leading-relaxed text-ink-soft">“{c.quote}”</p>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="mt-2 flex items-start gap-2.5">
            <SearchX size={18} className="mt-0.5 shrink-0 text-mute" />
            <div>
              <p className="text-[15px] font-medium text-ink">{answer.answer}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-mute">Nothing in this recording mentions that, so Ada won&apos;t guess. Your clinician can help.</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

const SUGGESTIONS = ["What did the doctor say about my medication?", "When is my follow-up?", "Should I take it with food?", "Can I drink alcohol?"];

export function VisitSummaryScreen({ id, fresh }: { id: string; fresh?: boolean }) {
  const { go, visits, openSheet, toast, language } = useShell();
  const visit = visits.find((v) => v.id === id);
  const rec = useRecorder({ maxSeconds: 30 });
  const [askPhase, setAskPhase] = useState<"idle" | "listening" | "transcribing" | "thinking">("idle");
  const [pending, setPending] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [showTranscript, setShowTranscript] = useState(false);
  const [showExcluded, setShowExcluded] = useState(false);
  const threadEnd = useRef<HTMLDivElement>(null);

  const qaCount = visit?.qa.length ?? 0;
  useEffect(() => {
    if (qaCount > 0 || pending) threadEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [qaCount, pending]);

  const speakerRoles = useMemo(() => {
    const map = new Map<string, Set<string>>();
    if (!visit) return map;
    const add = (label: string | null, role: string) => {
      if (!label) return;
      map.set(label, new Set([...(map.get(label) ?? []), role]));
    };
    visit.facts.medications.forEach((m) => add(m.evidence.speakerLabel, "Doctor"));
    visit.facts.instructions.forEach((m) => add(m.evidence.speakerLabel, "Doctor"));
    if (visit.facts.followUp) add(visit.facts.followUp.evidence.speakerLabel, "Doctor");
    visit.facts.patientStatements.forEach((m) => add(m.evidence.speakerLabel, "You"));
    return map;
  }, [visit]);

  if (!visit) {
    return (
      <ScreenScroll>
        <BackButton onClick={() => go({ name: "visits" })} />
        <p className="mt-10 text-center text-ink-soft">This visit isn&apos;t on this device.</p>
      </ScreenScroll>
    );
  }

  const { facts } = visit;
  const planEmpty = facts.medications.length === 0 && !facts.followUp && facts.instructions.length === 0;
  const source = (evidence: Evidence, saved: string) => openSheet(<SourceSheet evidence={evidence} saved={saved} visit={visit} />);

  const ask = async (question: string, askedBy: "voice" | "text") => {
    const q = question.trim();
    if (!q) return;
    setPending(q);
    setAskPhase("thinking");
    try {
      const { answer, engine } = await postJSON<{ answer: EvidenceAnswer; engine: Engine }>("/api/ask", {
        question: q,
        visit: { utterances: visit.utterances, facts: visit.facts },
        language,
      });
      healthMemory.addQA(visit.id, { id: newId(), timestamp: new Date().toISOString(), question: q, askedBy, answer, engine });
    } catch (err) {
      toast(err instanceof Error ? err.message : "Ada couldn't answer right now.");
    } finally {
      setPending(null);
      setAskPhase("idle");
    }
  };

  const micTap = async () => {
    if (askPhase === "idle") {
      if (await rec.start()) setAskPhase("listening");
      return;
    }
    if (askPhase === "listening") {
      const blob = await rec.stop();
      if (!blob) {
        setAskPhase("idle");
        return;
      }
      setAskPhase("transcribing");
      try {
        const t = await transcribeBlob(blob, "question", language);
        await ask(t.text, "voice");
      } catch (err) {
        toast(err instanceof Error ? err.message : "We couldn't transcribe that recording. Try again.");
        setAskPhase("idle");
      }
    }
  };

  const busy = askPhase === "transcribing" || askPhase === "thinking";
  const medLine = (m: (typeof facts.medications)[number]) =>
    [capitalize(m.name), formatDose(m.dose), formatFrequency(m.frequency), m.duration].filter(Boolean).join(" · ");

  return (
    <ScreenScroll>
      <div className="flex items-center justify-between">
        <BackButton onClick={() => go({ name: "visits" })} />
        <span className="glass-soft rounded-full px-3 py-1.5 text-[11.5px] font-semibold text-ink-soft">
          {dayLabel(visit.timestamp)} · {timeLabel(visit.timestamp)}
        </span>
      </div>

      {visit.isSample && (
        <div className="glass-soft mt-3 flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-[12px] font-medium text-ink-soft">
          <FlaskConical size={15} className="shrink-0 text-indigo" /> Sample consultation (demo) — not a live recording. Extraction below is real.
        </div>
      )}

      <section className="mt-3 flex items-center gap-2">
        <Ada size={104} state={fresh ? "success" : "idle"} />
        <div>
          <motion.h1
            initial={fresh ? { opacity: 0, y: 10 } : false}
            animate={{ opacity: 1, y: 0 }}
            className="text-[27px] font-bold leading-[1.1] tracking-[-0.025em] text-ink"
          >
            Your visit is saved.
          </motion.h1>
          <p className="mt-1 text-[12.5px] leading-snug text-mute">Every item links to your doctor&apos;s exact words.</p>
        </div>
      </section>

      <p className="eyebrow mt-4">Your care plan</p>
      <div className="mt-2.5 space-y-3">
        {facts.medications.map((m, i) => (
          <motion.div key={`m${i}`} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.08, duration: 0.45 }}>
            <PrismCard className="p-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2.5">
                  <IconBubble Icon={Pill} size={34} />
                  <span className="eyebrow !text-indigo">Medication</span>
                </span>
                <SourceBadge provenance="CLINICIAN_SAID" />
              </div>
              <p className="mt-3 text-[25px] font-bold tracking-[-0.02em] text-ink">{capitalize(m.name)}</p>
              <div className="mt-2.5 grid grid-cols-3 gap-2">
                {[
                  ["Dose", formatDose(m.dose)],
                  ["How often", formatFrequency(m.frequency)],
                  ["How long", m.duration],
                ].map(([label, value]) => (
                  <div key={label} className="glass-inset rounded-2xl px-2.5 py-2">
                    <p className="eyebrow !text-[9px] !tracking-[0.1em]">{label}</p>
                    <p className={`mt-0.5 text-[15px] font-bold ${value ? "text-ink" : "text-mute/60"}`}>{value ?? "Not said"}</p>
                  </div>
                ))}
              </div>
              <ViewSourceButton evidence={m.evidence} onClick={() => source(m.evidence, medLine(m))} />
            </PrismCard>
          </motion.div>
        ))}

        {facts.followUp && (
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22, duration: 0.45 }}>
            <PrismCard className="p-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2.5">
                  <IconBubble Icon={CalendarCheck} size={34} tone="cyan" />
                  <span className="eyebrow !text-[#0d7c96]">Follow-up</span>
                </span>
                <SourceBadge provenance="CLINICIAN_SAID" />
              </div>
              <p className="mt-3 text-[22px] font-bold tracking-[-0.02em] text-ink">{capitalize(facts.followUp.when)}</p>
              <ViewSourceButton evidence={facts.followUp.evidence} onClick={() => source(facts.followUp!.evidence, `Follow-up: ${capitalize(facts.followUp!.when)}`)} />
            </PrismCard>
          </motion.div>
        )}

        {facts.instructions.map((ins, i) => (
          <motion.div key={`i${i}`} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.08, duration: 0.45 }}>
            <PrismCard className="p-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2.5">
                  <IconBubble Icon={ClipboardCheck} size={34} tone="lavender" />
                  <span className="eyebrow !text-[#6b55e0]">Instruction</span>
                </span>
                <SourceBadge provenance="CLINICIAN_SAID" />
              </div>
              <p className="mt-3 text-[18px] font-semibold leading-snug tracking-[-0.01em] text-ink">{ins.text}</p>
              {ins.evidence.context && <p className="mt-1 text-[12px] text-mute">In reply to your question</p>}
              <ViewSourceButton evidence={ins.evidence} onClick={() => source(ins.evidence, ins.text)} />
            </PrismCard>
          </motion.div>
        ))}

        {planEmpty && (
          <GlassPanel className="p-4 text-[13.5px] text-ink-soft">Ada didn&apos;t hear any medications, follow-ups or instructions from your clinician in this recording.</GlassPanel>
        )}

        {facts.excluded.length > 0 && (
          <div className="glass-soft rounded-2xl px-4 py-3">
            <button onClick={() => setShowExcluded((s) => !s)} className="flex w-full items-center gap-2 text-left text-[12.5px] text-ink-soft">
              <ShieldCheck size={16} className="shrink-0 text-indigo" />
              <span className="flex-1">
                Ada left out {facts.excluded.length} {facts.excluded.length === 1 ? "item" : "items"} without clinician evidence.
              </span>
              <ChevronDown size={15} className={`transition-transform ${showExcluded ? "rotate-180" : ""}`} />
            </button>
            {showExcluded && (
              <ul className="mt-2 space-y-1 pl-6 text-[12px] text-mute">
                {facts.excluded.map((e, i) => (
                  <li key={i}>
                    <span className="font-semibold text-ink-soft">{capitalize(e.text)}</span> — {e.reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Ask Ada */}
      <section className="glass mt-6 rounded-[28px] p-4">
        <div className="flex items-center gap-3">
          <Ada size={50} state={askPhase === "listening" ? "listening" : busy ? "processing" : "idle"} />
          <div>
            <h2 className="text-[18px] font-semibold tracking-tight text-ink">Ask Ada about your visit</h2>
            <p className="text-[12px] text-mute">Answers come only from this recording.</p>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {visit.qa.map((qa) => (
            <AnswerCard key={qa.id} answer={qa.answer} question={qa.question} askedBy={qa.askedBy} visit={visit} onSource={source} />
          ))}
          {pending && (
            <div className="space-y-2.5">
              <div className="ml-auto w-fit max-w-[88%] rounded-[20px] rounded-br-md bg-gradient-to-br from-[#6f78ff] to-[#5256e6] px-3.5 py-2.5 text-[14px] text-white">{pending}</div>
              <div className="glass flex w-fit items-center gap-2 rounded-[20px] rounded-bl-md px-4 py-3 text-[13px] text-ink-soft">
                <LoaderCircle size={15} className="animate-spin text-indigo" /> Checking your visit for evidence…
              </div>
            </div>
          )}
          <div ref={threadEnd} />
        </div>

        <div className="mt-4 flex flex-col items-center">
          <AnimatePresence>
            {askPhase === "listening" && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="w-full">
                <Waveform analyserRef={rec.analyserRef} active height={48} bars={28} />
                <p className="text-center text-[12px] tabular-nums text-mute">{clock(rec.elapsed)}</p>
              </motion.div>
            )}
          </AnimatePresence>
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={micTap}
            disabled={busy}
            aria-label={askPhase === "listening" ? "Stop and ask" : "Ask with your voice"}
            className={`btn-primary mt-2 grid h-[72px] w-[72px] place-items-center rounded-full ${askPhase === "listening" ? "animate-rec" : ""}`}
          >
            {busy ? <LoaderCircle size={26} className="animate-spin" /> : askPhase === "listening" ? <Square size={22} fill="currentColor" /> : <Mic size={28} />}
          </motion.button>
          <p className="mt-2 text-[12.5px] font-medium text-ink-soft">
            {askPhase === "listening" ? "Listening… tap to ask" : askPhase === "transcribing" ? "Transcribing with AssemblyAI…" : askPhase === "thinking" ? "Finding evidence…" : "Tap to ask"}
          </p>
          {rec.state === "error" && <p className="mt-1 text-center text-[12px] text-rose">{rec.error}</p>}
        </div>

        <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
          {SUGGESTIONS.map((s) => (
            <button key={s} disabled={busy || askPhase === "listening"} onClick={() => ask(s, "text")} className="glass-soft shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium text-ink">
              {s}
            </button>
          ))}
        </div>

        <form
          className="glass-inset mt-3 flex items-center gap-2 rounded-full py-1 pl-4 pr-1"
          onSubmit={(e) => {
            e.preventDefault();
            const q = typed;
            setTyped("");
            ask(q, "text");
          }}
        >
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Or type a question…"
            className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-mute/70"
          />
          <button type="submit" disabled={busy || !typed.trim()} aria-label="Send" className="btn-primary grid h-9 w-9 place-items-center rounded-full">
            <Send size={15} />
          </button>
        </form>
      </section>

      {/* transcript */}
      <section className="glass-soft mt-4 rounded-[24px] p-4">
        <button onClick={() => setShowTranscript((s) => !s)} className="flex w-full items-center justify-between">
          <span className="text-[14px] font-semibold text-ink">Full transcript</span>
          <ChevronDown size={17} className={`text-mute transition-transform ${showTranscript ? "rotate-180" : ""}`} />
        </button>
        {showTranscript && (
          <ul className="mt-3 space-y-3">
            {visit.utterances.map((u, i) => {
              const roles = u.speaker ? speakerRoles.get(u.speaker) : undefined;
              const who = roles && roles.size === 1 ? [...roles][0] : u.speaker ? `Speaker ${u.speaker}` : "Recording";
              return (
                <li key={i} className="text-[13px] leading-relaxed">
                  <span className="text-[11px] font-semibold text-mute">
                    {who}
                    {formatClock(u.startMs) ? ` · ${formatClock(u.startMs)}` : ""}
                  </span>
                  <p className="text-ink">{u.text}</p>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-3 text-[11px] text-mute">
          {visit.isSample ? "Sample transcript (demo)" : `AssemblyAI${visit.diarized ? " · speaker labels" : ""}${visit.medicalMode ? " · Medical Mode" : ""}`} ·{" "}
          {visit.engine === "openai" ? "Care plan by OpenAI" : "Care plan extracted offline"}
        </p>
      </section>

      <SafetyNote className="mt-4" />
    </ScreenScroll>
  );
}
