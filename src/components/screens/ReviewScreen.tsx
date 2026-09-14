"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, FlaskConical, Pencil, Quote, Sparkles, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Ada } from "../Ada";
import { useShell } from "../shell/AppShell";
import { PrismCard } from "../ui/Glass";
import { IconBubble, SourceBadge, symptomIcon } from "../ui/bits";
import { healthMemory, newId } from "@/lib/healthMemory";
import type { Engine, HealthEntry } from "@/lib/schemas";
import { capitalize } from "@/lib/text";

type Draft = { name: string; duration: string; onset: string; severity: string; also: string };

function toDraft(entry: HealthEntry): Draft {
  const s = entry.symptoms[0];
  const also = new Set([...(s?.associatedSymptoms ?? []), ...entry.symptoms.slice(1).map((x) => x.name)]);
  return { name: s?.name ?? "", duration: s?.duration ?? "", onset: s?.onset ?? "", severity: s?.severity ?? "", also: [...also].join(", ") };
}

function fromDraft(entry: HealthEntry, d: Draft): HealthEntry {
  const name = d.name.trim().toLowerCase();
  if (!name) return { ...entry, symptoms: [] };
  return {
    ...entry,
    symptoms: [
      {
        name,
        duration: d.duration.trim() || null,
        onset: d.onset.trim() || null,
        severity: d.severity.trim() || null,
        associatedSymptoms: d.also.split(",").map((a) => a.trim().toLowerCase()).filter(Boolean),
      },
    ],
  };
}

function Field({ label, value, editing, onChange, placeholder }: { label: string; value: string; editing: boolean; onChange: (v: string) => void; placeholder: string }) {
  if (!editing && !value) return null;
  return (
    <div className="glass-inset rounded-2xl px-3.5 py-2.5">
      <p className="eyebrow !text-[9.5px]">{label}</p>
      {editing ? (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="mt-0.5 w-full bg-transparent text-[15px] font-semibold text-ink outline-none placeholder:font-normal placeholder:text-mute/60"
        />
      ) : (
        <p className="mt-0.5 text-[15px] font-semibold text-ink">{capitalize(value)}</p>
      )}
    </div>
  );
}

export function ReviewScreen({ transcript, entry, engine, isSample }: { transcript: string; entry: HealthEntry; engine: Engine; isSample: boolean }) {
  const { go, language } = useShell();
  const [editing, setEditing] = useState(false);
  const [edited, setEdited] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => toDraft(entry));
  const [saved, setSaved] = useState(false);

  const current = edited ? fromDraft(entry, draft) : entry;
  const primary = current.symptoms[0];
  const also = draft.also.split(",").map((a) => a.trim()).filter(Boolean);
  const Icon = symptomIcon(primary?.name ?? "");

  const set = (k: keyof Draft) => (v: string) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setEdited(true);
  };

  const save = () => {
    const id = newId();
    healthMemory.saveEntry({
      id,
      timestamp: new Date().toISOString(),
      rawTranscript: transcript,
      structuredData: current,
      sourceType: "PATIENT_REPORTED",
      engine,
      edited,
      isDemo: isSample || undefined,
      language,
    });
    setSaved(true);
    setTimeout(() => go({ name: "timeline", highlightId: id }), 1500);
  };

  return (
    <div className="screen no-scrollbar absolute inset-0 overflow-y-auto px-5 pb-10">
      <div className="flex items-center justify-between">
        <button onClick={() => go({ name: "home" })} aria-label="Close" className="btn-glass grid h-10 w-10 place-items-center rounded-full text-ink">
          <X size={18} />
        </button>
        <span className="eyebrow flex items-center gap-1.5 !text-indigo">
          <Sparkles size={13} /> Ada understood
        </span>
        <span className="w-10" />
      </div>

      <div className="mt-3 flex items-center gap-3">
        <Ada size={74} state="success" />
        <p className="text-[14px] leading-snug text-ink-soft">
          Here&apos;s what I heard. <span className="font-semibold text-ink">Nothing is saved until you say so.</span>
        </p>
      </div>

      <motion.div initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
        <PrismCard className="mt-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <IconBubble Icon={Icon} size={46} />
              <div>
                {editing ? (
                  <input
                    value={draft.name}
                    onChange={(e) => set("name")(e.target.value)}
                    placeholder="Symptom"
                    className="w-40 border-b border-indigo/30 bg-transparent text-[26px] font-bold tracking-tight text-ink outline-none"
                  />
                ) : (
                  <h1 className="text-[26px] font-bold leading-tight tracking-[-0.02em] text-ink">{primary ? capitalize(primary.name) : "Health note"}</h1>
                )}
                {!primary && !editing && <p className="text-[12.5px] text-mute">Ada didn&apos;t hear a specific symptom.</p>}
              </div>
            </div>
            <SourceBadge provenance="PATIENT_REPORTED" />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Field label="Duration" value={draft.duration} editing={editing} onChange={set("duration")} placeholder="e.g. 3 days" />
            <Field label="When" value={draft.onset} editing={editing} onChange={set("onset")} placeholder="e.g. yesterday" />
            <Field label="Severity" value={draft.severity} editing={editing} onChange={set("severity")} placeholder="e.g. mild" />
          </div>

          {(also.length > 0 || editing) && (
            <div className="mt-4">
              <p className="eyebrow">Also mentioned</p>
              {editing ? (
                <input
                  value={draft.also}
                  onChange={(e) => set("also")(e.target.value)}
                  placeholder="dizziness, fatigue"
                  className="glass-inset mt-2 w-full rounded-2xl px-3.5 py-2.5 text-[14px] text-ink outline-none"
                />
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {also.map((a) => {
                    const AIcon = symptomIcon(a);
                    return (
                      <span key={a} className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold text-ink">
                        <AIcon size={14} className="text-indigo" /> {capitalize(a)}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="mt-4 border-t border-white/70 pt-4">
            <SourceBadge provenance="AI_DERIVED" />
            <p className="mt-2 text-[14px] leading-relaxed text-ink">{current.summary}</p>
          </div>
        </PrismCard>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass mt-3 rounded-[24px] p-4">
        <div className="flex items-center justify-between">
          <p className="eyebrow">Your original words</p>
          <SourceBadge provenance="PATIENT_REPORTED" />
        </div>
        <p className="mt-2 flex gap-2 text-[15px] italic leading-relaxed text-ink">
          <Quote size={15} className="mt-1 shrink-0 text-periwinkle" />
          {transcript}
        </p>
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-mute">
          {isSample ? (
            <>
              <FlaskConical size={12} /> Sample phrase (demo) — not a live recording
            </>
          ) : (
            <>Transcribed by AssemblyAI</>
          )}
          <span>·</span>
          <span>{engine === "openai" ? "Organized by OpenAI" : "Organized offline (AI unavailable)"}</span>
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mt-5 space-y-3">
        <button onClick={save} className="btn-primary flex h-14 w-full items-center justify-center gap-2 rounded-full text-[14.5px] font-bold uppercase tracking-[0.06em]">
          <Check size={18} strokeWidth={2.8} /> Save to health memory
        </button>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setEditing((e) => !e)} className="btn-glass flex h-12 items-center justify-center gap-2 rounded-full text-[14px] font-semibold text-ink">
            {editing ? <Check size={16} /> : <Pencil size={16} />} {editing ? "Done editing" : "Edit"}
          </button>
          <button onClick={() => go({ name: "home" })} className="btn-glass flex h-12 items-center justify-center gap-2 rounded-full text-[14px] font-semibold text-rose">
            <Trash2 size={16} /> Discard
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {saved && (
          <motion.div
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/55 backdrop-blur-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Ada size={130} state="success" />
            <motion.div
              className="mt-4 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-cyan to-indigo text-white shadow-[0_12px_30px_-10px_rgba(91,92,240,0.7)]"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 12, stiffness: 260, delay: 0.1 }}
            >
              <motion.svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.45, delay: 0.3 }} />
              </motion.svg>
            </motion.div>
            <motion.p className="mt-4 text-[19px] font-semibold tracking-tight text-ink" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              Saved to your health memory
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
