"use client";

import { BellRing, ChevronRight, CircleCheck, CircleAlert, Globe, HardDrive, RotateCcw, Trash2 } from "lucide-react";
import { useShell } from "../shell/AppShell";
import { GlassPanel } from "../ui/Glass";
import { SafetyNote, ScreenScroll } from "../ui/bits";
import { LanguageSheet } from "./LanguageSheet";
import { healthMemory } from "@/lib/healthMemory";
import { languageName } from "@/lib/languages";
import { useAuth } from "../auth/AuthProvider";
import { ui } from "@/lib/i18n";

function Row({ icon, label, value, onClick, soon, soonLabel = "Coming soon" }: { icon: React.ReactNode; label: string; value?: string; onClick?: () => void; soon?: boolean; soonLabel?: string }) {
  return (
    <button onClick={onClick} disabled={!onClick} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
      <span className="text-indigo">{icon}</span>
      <span className="flex-1 text-[14.5px] font-medium text-ink">{label}</span>
      {soon ? (
        <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-mute">{soonLabel}</span>
      ) : (
        <span className="text-[13px] text-mute">{value}</span>
      )}
      {onClick && <ChevronRight size={16} className="text-mute" />}
    </button>
  );
}

export function ProfileScreen() {
  const { entries, visits, openSheet, status, toast, language, profile } = useShell();
  const { configured, signOut } = useAuth();

  const service = (ok: boolean | undefined, name: string) => (
    <div className="flex items-center justify-between px-4 py-3 text-[13.5px]">
      <span className="text-ink">{name}</span>
      {status === null ? (
        <span className="text-mute">{ui(language, "Checking…")}</span>
      ) : ok ? (
        <span className="flex items-center gap-1 font-semibold text-[#0d8a6a]">
          <CircleCheck size={15} /> {ui(language, "Connected")}
        </span>
      ) : (
        <span className="flex items-center gap-1 font-semibold text-rose">
          <CircleAlert size={15} /> {ui(language, "Not configured")}
        </span>
      )}
    </div>
  );

  return (
    <ScreenScroll>
      <header className="flex items-center gap-4">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-[#ffd6e6] via-[#d9d4ff] to-[#b9c6ff] text-[24px] font-bold text-indigo-deep ring-4 ring-white shadow-lg">
          {profile.firstName.slice(0, 1).toUpperCase()}
        </span>
        <div>
          <h1 className="text-[26px] font-bold tracking-[-0.02em] text-ink">{profile.firstName}</h1>
          <p className="text-[13px] text-mute">
            {entries.length} {ui(language, "health notes")} · {visits.length} {ui(language, "visits")}
          </p>
        </div>
      </header>

      <GlassPanel className="mt-6 divide-y divide-white/70">
        <Row icon={<Globe size={18} />} label={ui(language, "Language")} value={ui(language, languageName(language))} onClick={() => openSheet(<LanguageSheet />)} />
        <Row icon={<BellRing size={18} />} label={ui(language, "Wake Mode (“Hey Ada”)")} soon soonLabel={ui(language, "Coming soon")} />
        <Row icon={<HardDrive size={18} />} label={ui(language, "Storage")} value={ui(language, "This device only")} />
      </GlassPanel>

      <p className="eyebrow mt-6">{ui(language, "Services")}</p>
      <GlassPanel className="mt-2 divide-y divide-white/70">
        {service(status?.assemblyai, ui(language, "AssemblyAI transcription"))}
        {service(status?.llm, ui(language, "OpenAI (care-plan extraction)"))}
      </GlassPanel>

      {configured && (
        <button onClick={() => signOut()} className="btn-glass mt-5 flex h-12 w-full items-center justify-center rounded-full text-[13px] font-semibold text-ink">
          {ui(language, "Sign out of CareEcho")}
        </button>
      )}

      <p className="eyebrow mt-6">{ui(language, "Demo data")}</p>
      <GlassPanel className="mt-2 divide-y divide-white/70">
        <button
          onClick={() => {
            healthMemory.resetToDemo();
            toast(ui(language, "Demo week loaded. Your visits were cleared."));
          }}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-[14.5px] font-medium text-ink"
        >
          <RotateCcw size={18} className="text-indigo" /> {ui(language, "Try Demo — reset to sample week")}
        </button>
        <button
          onClick={() => {
            if (window.confirm(ui(language, "Clear all health notes and visits from this device?"))) {
              healthMemory.clearAll();
              toast(ui(language, "All data cleared from this device."));
            }
          }}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-[14.5px] font-medium text-rose"
        >
          <Trash2 size={18} /> {ui(language, "Clear all data")}
        </button>
      </GlassPanel>

      <SafetyNote className="mt-6" />
    </ScreenScroll>
  );
}
