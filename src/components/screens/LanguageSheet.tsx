"use client";

import { Check, Languages } from "lucide-react";
import { useShell } from "../shell/AppShell";

/**
 * English is fully functional. Other rows are shown only where AssemblyAI's
 * pre-recorded docs confirm speech support; Igbo is not yet listed there.
 */
const LANGUAGES = [
  { code: "en", native: "English", name: "English", status: "active" as const },
  { code: "es", native: "Español", name: "Spanish", status: "soon" as const },
  { code: "fr", native: "Français", name: "French", status: "soon" as const },
  { code: "ha", native: "Hausa", name: "Hausa", status: "soon" as const },
  { code: "yo", native: "Yorùbá", name: "Yoruba", status: "soon" as const },
  { code: "sw", native: "Kiswahili", name: "Swahili", status: "soon" as const },
  { code: "ig", native: "Igbo", name: "Igbo", status: "unsupported" as const },
];

export function LanguageSheet() {
  const { closeSheet } = useShell();
  return (
    <div>
      <div className="flex items-center gap-2">
        <Languages size={20} className="text-indigo" />
        <h3 className="text-[20px] font-semibold tracking-tight text-ink">Language</h3>
      </div>
      <p className="mt-1 text-[13px] text-mute">CareEcho is multilingual-ready. English is available in this preview.</p>
      <ul className="mt-4 space-y-2">
        {LANGUAGES.map((l) => (
          <li key={l.code}>
            <button
              disabled={l.status !== "active"}
              onClick={closeSheet}
              className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left ${
                l.status === "active" ? "glass ring-2 ring-indigo/30" : "glass-soft"
              }`}
            >
              <span>
                <span className={`block text-[15px] font-semibold ${l.status === "active" ? "text-ink" : "text-ink-soft"}`}>{l.native}</span>
                <span className="block text-[11.5px] text-mute">
                  {l.status === "active"
                    ? "Voice, memory & answers"
                    : l.status === "soon"
                      ? `${l.name} · speech recognition supported`
                      : `${l.name} · awaiting speech support`}
                </span>
              </span>
              {l.status === "active" ? (
                <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-cyan to-indigo text-white">
                  <Check size={15} strokeWidth={3} />
                </span>
              ) : (
                <span className="rounded-full bg-white/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-mute">Coming soon</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
