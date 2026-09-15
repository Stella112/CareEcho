"use client";

import { motion } from "framer-motion";
import { AudioLines, Check, ChevronRight, FileSearch, FlaskConical, Lock, Mic, Stethoscope } from "lucide-react";
import { useState } from "react";
import { Ada } from "../Ada";
import { useShell } from "../shell/AppShell";
import { GlassPanel, PrismCard } from "../ui/Glass";
import { IconBubble, SafetyNote, ScreenScroll } from "../ui/bits";
import { dayLabel, timeLabel } from "@/lib/dates";
import { capitalize, formatDose } from "@/lib/text";
import { ui } from "@/lib/i18n";

export function VisitsScreen() {
  const { go, visits, language } = useShell();
  const [consent, setConsent] = useState(false);

  return (
    <ScreenScroll>
      <header className="flex items-start justify-between">
        <div>
          <p className="eyebrow">{ui(language, "Visit Mode")}</p>
          <h1 className="mt-1 text-[30px] font-bold leading-tight tracking-[-0.025em] text-ink">{ui(language, "Your consultations")}</h1>
        </div>
        <span className="mt-2 flex items-center gap-1.5 rounded-full bg-white/75 px-2.5 py-1 text-[10px] font-bold tracking-wider text-rose ring-1 ring-white">
          <span className="animate-rec h-2 w-2 rounded-full bg-rose" /> REC
        </span>
      </header>

      <PrismCard className="mt-5 p-5">
        <div className="flex items-center gap-3">
          <Ada size={78} />
          <p className="text-[17px] font-semibold leading-snug tracking-tight text-ink">{ui(language, "CareEcho can record and remember your consultation.")}</p>
        </div>
        <ul className="mt-4 space-y-2.5 text-[13px] text-ink-soft">
          <li className="flex gap-2.5">
            <Mic size={16} className="mt-0.5 shrink-0 text-indigo" /> {ui(language, "Transcribed by AssemblyAI, with speaker labels.")}
          </li>
          <li className="flex gap-2.5">
            <FileSearch size={16} className="mt-0.5 shrink-0 text-indigo" /> {ui(language, "Ada saves medications, follow-ups and instructions — each linked to the exact words.")}
          </li>
          <li className="flex gap-2.5">
            <Lock size={16} className="mt-0.5 shrink-0 text-indigo" /> {ui(language, "Stored only on this device.")}
          </li>
        </ul>

        <button
          role="checkbox"
          aria-checked={consent}
          onClick={() => setConsent((c) => !c)}
          className={`mt-5 flex w-full items-center gap-3 rounded-2xl p-3.5 text-left transition-colors ${consent ? "bg-white/80 ring-2 ring-indigo/35" : "glass-inset"}`}
        >
          <span
            className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 transition-colors ${
              consent ? "border-transparent bg-gradient-to-br from-cyan to-indigo text-white" : "border-mute/40 bg-white"
            }`}
          >
            {consent && <Check size={14} strokeWidth={3.2} />}
          </span>
          <span className="text-[13.5px] font-medium leading-snug text-ink">{ui(language, "Make sure everyone being recorded has agreed.")}</span>
        </button>

        <motion.button
          whileTap={{ scale: 0.97 }}
          disabled={!consent}
          onClick={() => go({ name: "visitRecord" })}
          className="btn-primary mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-full text-[15px] font-bold uppercase tracking-[0.06em]"
        >
          <AudioLines size={19} /> {ui(language, "Start visit")}
        </motion.button>
        <SampleButton />
      </PrismCard>

      {visits.length > 0 && (
        <section className="mt-6">
          <p className="eyebrow">{ui(language, "Saved visits")}</p>
          <ul className="mt-3 space-y-2.5">
            {visits.map((v) => (
              <li key={v.id}>
                <button onClick={() => go({ name: "visit", id: v.id })} className="glass flex w-full items-center gap-3 rounded-[22px] p-3.5 text-left">
                  <IconBubble Icon={Stethoscope} tone="cyan" size={38} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-mute">
                      {dayLabel(v.timestamp)} · {timeLabel(v.timestamp)}
                      {v.isSample && " · Sample"}
                    </p>
                    <p className="truncate text-[14.5px] font-semibold text-ink">
                      {v.facts.medications[0]
                        ? `${capitalize(v.facts.medications[0].name)} ${formatDose(v.facts.medications[0].dose) ?? ""}`.trim()
                        : ui(language, "Consultation")}
                    </p>
                    <p className="text-[11.5px] text-ink-soft">
                      {v.facts.medications.length + v.facts.instructions.length + (v.facts.followUp ? 1 : 0)} {ui(language, "saved items")} · {v.qa.length} {ui(language, "questions")}
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-mute" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <GlassPanel className="mt-6 p-4">
        <p className="text-[13px] font-semibold text-ink">{ui(language, "No source → no claim")}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-mute">
          {ui(language, "Ada only keeps what your clinician actually said. Things you said stay marked as yours — they never become instructions.")}
        </p>
      </GlassPanel>
      <SafetyNote className="mt-3" />
    </ScreenScroll>
  );
}

function SampleButton() {
  const { go, language } = useShell();
  return (
    <button
      onClick={() => {
        sessionStorage.setItem("careecho.loadSample", "1");
        go({ name: "visitRecord" });
      }}
      className="mt-2 flex w-full items-center justify-center gap-1.5 py-2 text-[12.5px] font-semibold text-indigo"
    >
      <FlaskConical size={14} /> {ui(language, "Load demo recording (sample consultation)")}
    </button>
  );
}
