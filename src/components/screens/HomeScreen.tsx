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
import { ui } from "@/lib/i18n";

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

function QuickAction({ Icon, label, onClick, rec, soon, language }: { Icon: LucideIcon; label: string; onClick?: () => void; rec?: boolean; soon?: boolean; language: string }) {
  return (
    <button
      onClick={onClick}
      disabled={soon}
      className="glass relative flex h-[96px] flex-col justify-between rounded-[22px] p-3 text-left transition-transform active:scale-[0.97] disabled:cursor-default"
    >
      <div className="flex w-full items-start justify-between">
        <IconBubble Icon={Icon} size={34} tone={rec ? "cyan" : soon ? "lavender" : "indigo"} />
        {rec && <span className="animate-rec mt-1 h-2 w-2 rounded-full bg-rose" />}
        {soon && <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-mute">{ui(language, "Soon")}</span>}
      </div>
      <span className={`text-[12px] font-semibold leading-tight ${soon ? "text-ink-soft" : "text-ink"}`}>{label}</span>
    </button>
  );
}

export function HomeScreen() {
  const { go, entries, visits, openSheet, language, profile } = useShell();
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
        <p className="text-[15px] text-ink-soft">{ui(language, greeting())},</p>
        <h1 className="text-[32px] font-bold leading-[1.1] tracking-[-0.025em] text-ink">{profile.firstName}</h1>
        <p className="mt-1 text-[13px] text-mute">{ui(language, "Your health memory, in your voice.")}</p>
      </section>

      <section className="relative mt-5 flex flex-col items-center">
        <AdaModel className="h-[168px] w-full max-w-[315px]" />
        <h2 className="mt-4 text-[19px] font-semibold tracking-[-0.01em] text-ink">{ui(language, "How are you feeling today?")}</h2>
      </section>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => go({ name: "listen" })}
        className="btn-primary mt-4 flex h-[58px] w-full items-center justify-center gap-2.5 rounded-full text-[17px] font-semibold"
      >
        <AudioLines size={21} /> {ui(language, "Talk to")} {profile.assistantName}
      </motion.button>

      <div className="mt-4 grid grid-cols-3 gap-2.5">
        <QuickAction language={language} Icon={GitCommitVertical} label={ui(language, "Health Timeline")} onClick={() => go({ name: "timeline" })} />
        <QuickAction language={language} Icon={Stethoscope} label={ui(language, "Visit Mode")} rec onClick={() => go({ name: "visits" })} />
        <QuickAction language={language} Icon={ClipboardList} label={ui(language, "Prepare for Visit")} soon />
      </div>

      {entries.length === 0 && (
        <PrismCard className="mt-4 flex items-center gap-3 p-4">
          <IconBubble Icon={Sparkles} tone="lavender" />
          <div className="flex-1">
            <p className="text-[14px] font-semibold text-ink">{ui(language, "New to CareEcho?")}</p>
            <p className="text-[12px] text-mute">{ui(language, "Load a sample week to explore.")}</p>
          </div>
          <button onClick={() => healthMemory.resetToDemo()} className="btn-primary rounded-full px-4 py-2 text-[13px] font-semibold">
            {ui(language, "Try Demo")}
          </button>
        </PrismCard>
      )}

      <GlassPanel className="mt-4 p-4">
        <div className="flex items-center justify-between">
          <span className="eyebrow">{ui(language, "This week")}</span>
          <button onClick={() => go({ name: "timeline" })} className="flex items-center text-[12px] font-semibold text-indigo">
            {ui(language, "See details")} <ChevronRight size={14} />
          </button>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {stats.map((s) => (
            <StatTile key={s.name} Icon={symptomIcon(s.name)} value={s.count} label={capitalize(s.name)} sub={ui(language, s.count === 1 ? "report" : "reports")} />
          ))}
          {stats.length < 2 &&
            Array.from({ length: 2 - stats.length }, (_, i) => <StatTile key={`e${i}`} Icon={Sparkles} value="—" label={ui(language, "No reports")} sub={ui(language, "this week")} />)}
          <StatTile
            Icon={CalendarClock}
            value={entries[0] ? dayLabel(entries[0].timestamp) : "—"}
            label={ui(language, "Last update")}
            sub={entries[0] ? new Date(entries[0].timestamp).toLocaleDateString(language === "zh" ? "zh-CN" : "en-US", { month: "short", day: "numeric" }) : ui(language, "Nothing yet")}
          />
        </div>
      </GlassPanel>

      {latestVisit && (
        <PrismCard className="mt-4 p-4">
          <button className="flex w-full items-center gap-3 text-left" onClick={() => go({ name: "visit", id: latestVisit.id })}>
            <IconBubble Icon={latestVisit.facts.medications.length ? Pill : Stethoscope} tone="cyan" />
            <div className="min-w-0 flex-1">
              <p className="eyebrow">{ui(language, "Last visit")} · {dayLabel(latestVisit.timestamp)}</p>
              <p className="truncate text-[14.5px] font-semibold text-ink">
                {latestVisit.facts.medications[0]
                  ? [capitalize(latestVisit.facts.medications[0].name), formatDose(latestVisit.facts.medications[0].dose), formatFrequency(latestVisit.facts.medications[0].frequency)]
                      .filter(Boolean)
                      .join(" · ")
                  : ui(language, "Consultation saved")}
              </p>
              <p className="text-[12px] font-medium text-indigo">{ui(language, "Ask Ada about your visit")}</p>
            </div>
            <ChevronRight size={18} className="text-mute" />
          </button>
        </PrismCard>
      )}

      {recent.length > 0 && (
        <GlassPanel className="mt-4 p-4">
          <div className="flex items-center justify-between">
            <span className="eyebrow">{ui(language, "Health timeline")}</span>
            <button onClick={() => go({ name: "timeline" })} className="flex items-center text-[12px] font-semibold text-indigo">
              {ui(language, "View all")} <ChevronRight size={14} />
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
                  <p className="text-[13.5px] font-semibold text-ink">{s ? `${ui(language, "Reported")} ${s.name}` : ui(language, "Health note")}</p>
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
