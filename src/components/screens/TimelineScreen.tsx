"use client";

import { motion } from "framer-motion";
import { AudioLines, ChevronRight, FlaskConical, Quote, Stethoscope } from "lucide-react";
import { useMemo } from "react";
import { Ada } from "../Ada";
import { useShell } from "../shell/AppShell";
import { IconBubble, ScreenScroll, SourceBadge, symptomIcon } from "../ui/bits";
import { dayLabel, timeLabel } from "@/lib/dates";
import type { HealthEntryRecord, VisitRecord } from "@/lib/healthMemory";
import { capitalize, formatDose, formatFrequency } from "@/lib/text";
import { ui } from "@/lib/i18n";

type Item = { kind: "entry"; at: string; entry: HealthEntryRecord } | { kind: "visit"; at: string; visit: VisitRecord };

function entryTitle(e: HealthEntryRecord) {
  const s = e.structuredData.symptoms;
  if (!s.length) return "Health note";
  const extra = [...new Set([...s[0].associatedSymptoms, ...s.slice(1).map((x) => x.name)])];
  return [capitalize(s[0].name), ...extra].join(" + ");
}

function EntrySheet({ entry }: { entry: HealthEntryRecord }) {
  const s = entry.structuredData.symptoms[0];
  const details = s
    ? ([
        ["Duration", s.duration],
        ["When", s.onset],
        ["Severity", s.severity],
      ].filter(([, v]) => v) as [string, string][])
    : [];
  return (
    <div>
      <p className="eyebrow">
        {dayLabel(entry.timestamp)} · {timeLabel(entry.timestamp)}
      </p>
      <h3 className="mt-1 text-[24px] font-bold tracking-tight text-ink">{entryTitle(entry)}</h3>

      <div className="glass mt-4 rounded-[24px] p-4">
        <SourceBadge provenance="PATIENT_REPORTED" size="md" />
        <p className="mt-3 flex gap-2 text-[17px] italic leading-relaxed text-ink">
          <Quote size={17} className="mt-1 shrink-0 text-periwinkle" />
          {entry.rawTranscript}
        </p>
      </div>

      <div className="glass-soft mt-3 rounded-[24px] p-4">
        <SourceBadge provenance="AI_DERIVED" />
        <p className="mt-2 text-[14px] leading-relaxed text-ink">{entry.structuredData.summary}</p>
        {details.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {details.map(([k, v]) => (
              <div key={k} className="glass-inset rounded-xl px-2.5 py-2">
                <p className="eyebrow !text-[9px]">{k}</p>
                <p className="text-[13px] font-semibold text-ink">{capitalize(v)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-[11.5px] text-mute">
        {entry.isDemo ? (
          <>
            <FlaskConical size={13} /> Demo entry — sample data, not a live recording.
          </>
        ) : (
          <>
            Transcribed by AssemblyAI{entry.edited ? " · edited by you" : ""} · stored on this device
          </>
        )}
      </p>
    </div>
  );
}

export function TimelineScreen({ highlightId }: { highlightId?: string }) {
  const { entries, visits, openSheet, go, language } = useShell();

  const groups = useMemo(() => {
    const items: Item[] = [
      ...entries.map((entry) => ({ kind: "entry" as const, at: entry.timestamp, entry })),
      ...visits.map((visit) => ({ kind: "visit" as const, at: visit.timestamp, visit })),
    ].sort((a, b) => b.at.localeCompare(a.at));
    const map = new Map<string, Item[]>();
    for (const it of items) {
      const label = dayLabel(it.at);
      map.set(label, [...(map.get(label) ?? []), it]);
    }
    return [...map.entries()];
  }, [entries, visits]);

  return (
    <ScreenScroll>
      <header>
        <p className="eyebrow">{ui(language, "Health memory")}</p>
        <h1 className="mt-1 text-[30px] font-bold leading-tight tracking-[-0.025em] text-ink">{ui(language, "Health Timeline")}</h1>
        <p className="mt-1 text-[13px] text-mute">{ui(language, "Everything you told Ada — and what your doctor said.")}</p>
      </header>

      {groups.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <Ada size={130} />
          <p className="mt-4 text-[17px] font-semibold text-ink">{ui(language, "Your timeline is empty")}</p>
          <p className="mt-1 text-[13px] text-mute">{ui(language, "Tell Ada how you feel to start your health memory.")}</p>
          <button onClick={() => go({ name: "listen" })} className="btn-primary mt-5 flex h-12 items-center gap-2 rounded-full px-6 text-[15px] font-semibold">
            <AudioLines size={18} /> {ui(language, "Talk to Ada")}
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {groups.map(([label, items], gi) => (
            <section key={label}>
              <div className="flex items-center gap-3">
                <span className="eyebrow !text-ink-soft">{label}</span>
                <span className="h-px flex-1 bg-gradient-to-r from-indigo/20 to-transparent" />
              </div>
              <ul className="relative mt-3 space-y-3 pl-7">
                <span className="absolute bottom-3 left-[9px] top-3 w-[2px] rounded-full bg-gradient-to-b from-indigo/35 via-lavender/40 to-transparent" />
                {items.map((it, i) => {
                  const id = it.kind === "entry" ? it.entry.id : it.visit.id;
                  const highlighted = id === highlightId;
                  return (
                    <motion.li
                      key={id}
                      className="relative"
                      initial={{ opacity: 0, x: highlighted ? 0 : 12, scale: highlighted ? 0.92 : 1 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      transition={{ delay: highlighted ? 0.25 : gi * 0.05 + i * 0.04, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <span
                        className={`absolute -left-7 top-5 grid h-5 w-5 place-items-center rounded-full border-[3px] border-white shadow-md ${
                          it.kind === "visit" ? "bg-cyan" : "bg-indigo"
                        }`}
                      >
                        {highlighted && <span className="absolute inset-[-6px] animate-ping rounded-full bg-indigo/30" />}
                      </span>
                      {it.kind === "entry" ? (
                        <button
                          onClick={() => openSheet(<EntrySheet entry={it.entry} />)}
                          className={`glass w-full rounded-[22px] p-4 text-left transition-shadow ${highlighted ? "ring-2 ring-indigo/40 shadow-[0_0_0_6px_rgba(91,92,240,0.08)]" : ""}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] text-mute">{timeLabel(it.at)}</span>
                            <div className="flex items-center gap-1.5">
                              {highlighted && <span className="rounded-full bg-indigo px-2 py-[3px] text-[9px] font-bold uppercase tracking-wider text-white">{ui(language, "New")}</span>}
                              {it.entry.isDemo && <span className="rounded-full bg-white/70 px-2 py-[3px] text-[9px] font-bold uppercase tracking-wider text-mute">{ui(language, "Demo")}</span>}
                              <SourceBadge provenance="PATIENT_REPORTED" />
                            </div>
                          </div>
                          <div className="mt-2 flex items-center gap-3">
                            <IconBubble Icon={symptomIcon(it.entry.structuredData.symptoms[0]?.name ?? "")} size={36} />
                            <div className="min-w-0 flex-1">
                              <p className="text-[15.5px] font-semibold text-ink">{entryTitle(it.entry)}</p>
                              <p className="line-clamp-2 text-[12.5px] leading-snug text-ink-soft">{it.entry.structuredData.summary}</p>
                            </div>
                          </div>
                        </button>
                      ) : (
                        <button onClick={() => go({ name: "visit", id: it.visit.id })} className="prism w-full rounded-[22px] p-4 text-left">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] text-mute">{timeLabel(it.at)}</span>
                            <div className="flex items-center gap-1.5">
                              {it.visit.isSample && <span className="rounded-full bg-white/70 px-2 py-[3px] text-[9px] font-bold uppercase tracking-wider text-mute">Sample</span>}
                              <SourceBadge provenance="CLINICIAN_SAID" />
                            </div>
                          </div>
                          <div className="mt-2 flex items-center gap-3">
                            <IconBubble Icon={Stethoscope} tone="cyan" size={36} />
                            <div className="min-w-0 flex-1">
                              <p className="text-[15.5px] font-semibold text-ink">{ui(language, "Doctor visit")}</p>
                              <p className="truncate text-[12.5px] text-ink-soft">
                                {[
                                  it.visit.facts.medications[0] &&
                                    [capitalize(it.visit.facts.medications[0].name), formatDose(it.visit.facts.medications[0].dose), formatFrequency(it.visit.facts.medications[0].frequency)]
                                      .filter(Boolean)
                                      .join(" "),
                                  it.visit.facts.followUp && `${ui(language, "follow-up")} ${it.visit.facts.followUp.when}`,
                                ]
                                  .filter(Boolean)
                                  .join(" · ") || ui(language, "Consultation saved")}
                              </p>
                            </div>
                            <ChevronRight size={18} className="text-mute" />
                          </div>
                        </button>
                      )}
                    </motion.li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </ScreenScroll>
  );
}
