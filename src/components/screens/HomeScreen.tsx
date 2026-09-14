"use client";

import { motion } from "framer-motion";
import {
  AudioLines,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  GitCommitVertical,
  Globe,
  Pill,
  Sparkles,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";
import { useMemo } from "react";
import { AdaModel } from "../AdaModel";
import { useShell } from "../shell/AppShell";
import { GlassPanel, PrismCard } from "../ui/Glass";
import { IconBubble, Logo, SafetyNote, ScreenScroll, symptomIcon } from "../ui/bits";
import { LanguageSheet } from "./LanguageSheet";
import { dayLabel, greeting, timeLabel } from "@/lib/dates";
import { healthMemory, type HealthEntryRecord } from "@/lib/healthMemory";
import { capitalize, formatDose, formatFrequency } from "@/lib/text";

function weekStats(entries: HealthEntryRecord[]) {
  const since = Date.now() - 7 * 86_400_000;
  const counts = new Map<string, { count: number; last: string }>();
  for (const e of entries) {
    if (Date.parse(e.timestamp) < since) continue;
    const names = new Set(e.structuredData.symptoms.flatMap((s) => [s.name, ...s.associatedSymptoms]));
    for (const n of names) {
      const prev = counts.get(n);
      counts.set(n, { count: (prev?.count ?? 0) + 1, last: prev && prev.last > e.timestamp ? prev.last : e.timestamp });
    }
  }
  return [...counts.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.count - a.count || b.last.localeCompare(a.last))
    .slice(0, 2);
}

function StatTile({ Icon, value, label, sub }: { Icon: LucideIcon; value: string | number; label: string; sub: string }) {
  return (
    <div className="glass-inset flex flex-col rounded-[20px] p-3">
      <div className="flex items-center gap-1.5">
        <Icon size={15} className="text-indigo" strokeWidth={2.3} />
        <span className={`font-bold tracking-tight text-ink ${typeof value === "number" ? "text-[22px]" : "text-[17px]"}`}>{value}</span>
      </div>
      <span className="mt-1 truncate text-[12px] font-semibold text-ink">{label}</span>
      <span className="truncate text-[10.5px] text-mute">{sub}</span>
    </div>
  );
}

function QuickAction({ Icon, label, onClick, rec, soon }: { Icon: LucideIcon; label: string; onClick?: () => void; rec?: boolean; soon?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={soon}
      className="glass relative flex h-[96px] flex-col justify-between rounded-[22px] p-3 text-left transition-transform active:scale-[0.97] disabled:cursor-default"
    >
      <div className="flex w-full items-start justify-between">
        <IconBubble Icon={Icon} size={34} tone={rec ? "cyan" : soon ? "lavender" : "indigo"} />
        {rec && <span className="animate-rec mt-1 h-2 w-2 rounded-full bg-rose" />}
        {soon && <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-mute">Soon</span>}
      </div>
      <span className={`text-[12px] font-semibold leading-tight ${soon ? "text-ink-soft" : "text-ink"}`}>{label}</span>
    </button>
  );
}

export function HomeScreen() {
  const { go, entries, visits, openSheet, language } = useShell();
  const stats = useMemo(() => weekStats(entries), [entries]);
  const recent = entries.slice(0, 3);
  const latestVisit = visits[0];

  return (
    <ScreenScroll>
      <header className="flex items-center justify-between">
        <Logo />
        <div className="flex items-center gap-2">
          <button
            onClick={() => openSheet(<LanguageSheet />)}
            className="btn-glass flex h-9 items-center gap-1 rounded-full px-3 text-[12.5px] font-semibold text-ink"
            aria-label="Language"
          >
            <Globe size={15} /> {language.toUpperCase()} <ChevronDown size={13} />
          </button>
          <button
            onClick={() => go({ name: "profile" })}
            aria-label="Profile"
            className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#ffd6e6] via-[#d9d4ff] to-[#b9c6ff] text-[14px] font-bold text-indigo-deep ring-2 ring-white shadow-md"
          >
            S
          </button>
        </div>
      </header>

      <section className="mt-5">
        <p className="text-[15px] text-ink-soft">{greeting()},</p>
        <h1 className="text-[32px] font-bold leading-[1.1] tracking-[-0.025em] text-ink">Stellamaris</h1>
        <p className="mt-1 text-[13px] text-mute">Your health memory, in your voice.</p>
      </section>

      <section className="relative mt-5 flex flex-col items-center">
        <AdaModel className="h-[168px] w-full max-w-[315px]" />
        <h2 className="mt-4 text-[19px] font-semibold tracking-[-0.01em] text-ink">How are you feeling today?</h2>
      </section>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => go({ name: "listen" })}
        className="btn-primary mt-4 flex h-[58px] w-full items-center justify-center gap-2.5 rounded-full text-[17px] font-semibold"
      >
        <AudioLines size={21} /> Talk to Ada
      </motion.button>

      <div className="mt-4 grid grid-cols-3 gap-2.5">
        <QuickAction Icon={GitCommitVertical} label="Health Timeline" onClick={() => go({ name: "timeline" })} />
        <QuickAction Icon={Stethoscope} label="Visit Mode" rec onClick={() => go({ name: "visits" })} />
        <QuickAction Icon={ClipboardList} label="Prepare for Visit" soon />
      </div>

      {entries.length === 0 && (
        <PrismCard className="mt-4 flex items-center gap-3 p-4">
          <IconBubble Icon={Sparkles} tone="lavender" />
          <div className="flex-1">
            <p className="text-[14px] font-semibold text-ink">New to CareEcho?</p>
            <p className="text-[12px] text-mute">Load a sample week to explore.</p>
          </div>
          <button onClick={() => healthMemory.resetToDemo()} className="btn-primary rounded-full px-4 py-2 text-[13px] font-semibold">
            Try Demo
          </button>
        </PrismCard>
      )}

      <GlassPanel className="mt-4 p-4">
        <div className="flex items-center justify-between">
          <span className="eyebrow">This week</span>
          <button onClick={() => go({ name: "timeline" })} className="flex items-center text-[12px] font-semibold text-indigo">
            See details <ChevronRight size={14} />
          </button>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {stats.map((s) => (
            <StatTile key={s.name} Icon={symptomIcon(s.name)} value={s.count} label={capitalize(s.name)} sub={s.count === 1 ? "report" : "reports"} />
          ))}
          {stats.length < 2 &&
            Array.from({ length: 2 - stats.length }, (_, i) => <StatTile key={`e${i}`} Icon={Sparkles} value="—" label="No reports" sub="this week" />)}
          <StatTile
            Icon={CalendarClock}
            value={entries[0] ? dayLabel(entries[0].timestamp) : "—"}
            label="Last update"
            sub={entries[0] ? new Date(entries[0].timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Nothing yet"}
          />
        </div>
      </GlassPanel>

      {latestVisit && (
        <PrismCard className="mt-4 p-4">
          <button className="flex w-full items-center gap-3 text-left" onClick={() => go({ name: "visit", id: latestVisit.id })}>
            <IconBubble Icon={latestVisit.facts.medications.length ? Pill : Stethoscope} tone="cyan" />
            <div className="min-w-0 flex-1">
              <p className="eyebrow">Last visit · {dayLabel(latestVisit.timestamp)}</p>
              <p className="truncate text-[14.5px] font-semibold text-ink">
                {latestVisit.facts.medications[0]
                  ? [capitalize(latestVisit.facts.medications[0].name), formatDose(latestVisit.facts.medications[0].dose), formatFrequency(latestVisit.facts.medications[0].frequency)]
                      .filter(Boolean)
                      .join(" · ")
                  : "Consultation saved"}
              </p>
              <p className="text-[12px] font-medium text-indigo">Ask Ada about your visit</p>
            </div>
            <ChevronRight size={18} className="text-mute" />
          </button>
        </PrismCard>
      )}

      {recent.length > 0 && (
        <GlassPanel className="mt-4 p-4">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Health timeline</span>
            <button onClick={() => go({ name: "timeline" })} className="flex items-center text-[12px] font-semibold text-indigo">
              View all <ChevronRight size={14} />
            </button>
          </div>
          <ul className="relative mt-3 space-y-3.5 pl-5">
            <span className="absolute bottom-2 left-[5px] top-2 w-px bg-gradient-to-b from-indigo/40 to-indigo/5" />
            {recent.map((e) => {
              const s = e.structuredData.symptoms[0];
              return (
                <li key={e.id} className="relative">
                  <span className="absolute -left-5 top-1.5 h-[11px] w-[11px] rounded-full border-2 border-white bg-indigo shadow" />
                  <p className="text-[10.5px] text-mute">
                    {dayLabel(e.timestamp)} · {timeLabel(e.timestamp)}
                  </p>
                  <p className="text-[13.5px] font-semibold text-ink">{s ? `Reported ${/^[aeiou]/.test(s.name) ? "an" : "a"} ${s.name}` : "Health note"}</p>
                  <p className="line-clamp-1 text-[12px] italic text-ink-soft">“{e.rawTranscript}”</p>
                </li>
              );
            })}
          </ul>
        </GlassPanel>
      )}

      <SafetyNote className="mt-4" />
    </ScreenScroll>
  );
}
