"use client";

import { Check, Languages } from "lucide-react";
import { useShell } from "../shell/AppShell";
import { healthMemory } from "@/lib/healthMemory";
import { LANGUAGES } from "@/lib/languages";
import { ui } from "@/lib/i18n";

/**
 * Universal-3.5 Pro currently supports these 18 languages with code switching.
 */

export function LanguageSheet() {
  const { closeSheet, language } = useShell();
  return (
    <div>
      <div className="flex items-center gap-2">
        <Languages size={20} className="text-indigo" />
        <h3 className="text-[20px] font-semibold tracking-tight text-ink">{ui(language, "Language")}</h3>
      </div>
      <p className="mt-1 text-[13px] text-mute">{ui(language, "Choose the language you speak with Ada. Voice notes, visits, and answers follow your selection.")}</p>
      <ul className="mt-4 space-y-2">
        {LANGUAGES.map((l) => (
          <li key={l.code}>
            <button
              onClick={() => {
                healthMemory.setLanguage(l.code);
                closeSheet();
              }}
              className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left ${language === l.code ? "glass ring-2 ring-indigo/30" : "glass-soft"}`}
            >
              <span>
                <span className="block text-[15px] font-semibold text-ink">{l.native}</span>
                <span className="block text-[11.5px] text-mute">{ui(language, l.name)} · {ui(language, "voice, memory & answers")}</span>
              </span>
              {language === l.code ? (
                <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-cyan to-indigo text-white">
                  <Check size={15} strokeWidth={3} />
                </span>
              ) : (
                <span className="text-[11px] font-bold uppercase tracking-wider text-mute">{ui(language, "Select")}</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
