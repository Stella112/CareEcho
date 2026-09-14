"use client";

import {
  Activity,
  BatteryLow,
  Brain,
  Check,
  ChevronLeft,
  CircleHelp,
  LoaderCircle,
  Orbit,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Thermometer,
  UserRound,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { useId, type ReactNode } from "react";
import type { Provenance } from "@/lib/schemas";

/* ------------------------------------------------------------------ */

const BADGES: Record<Provenance, { label: string; className: string; Icon: LucideIcon }> = {
  PATIENT_REPORTED: { label: "You said", className: "bg-[#eeebff] text-[#5a4fd6] ring-[#dcd5ff]", Icon: UserRound },
  CLINICIAN_SAID: { label: "Doctor said", className: "bg-[#e1f5fb] text-[#0d7c96] ring-[#bfe8f3]", Icon: Stethoscope },
  AI_DERIVED: {
    label: "CareEcho summary",
    className: "bg-gradient-to-r from-[#eef0ff] to-[#f4ecff] text-[#5b5cf0] ring-[#dedcff]",
    Icon: Sparkles,
  },
  UNKNOWN: { label: "Speaker unclear", className: "bg-slate-100 text-slate-500 ring-slate-200", Icon: CircleHelp },
};

export function SourceBadge({ provenance, size = "sm" }: { provenance: Provenance; size?: "sm" | "md" }) {
  const b = BADGES[provenance];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full font-bold uppercase tracking-[0.09em] ring-1 ${b.className} ${
        size === "sm" ? "px-2 py-[3px] text-[9.5px]" : "px-2.5 py-1 text-[11px]"
      }`}
    >
      <b.Icon size={size === "sm" ? 10 : 12} strokeWidth={2.6} />
      {b.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */

export function LogoMark({ size = 28 }: { size?: number }) {
  // unique id: a gradient defined inside a display:none SVG can't be referenced elsewhere
  const gid = `ce-logo-${useId().replace(/:/g, "")}`;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9bbcff" />
          <stop offset="0.55" stopColor="#5b5cf0" />
          <stop offset="1" stopColor="#3a3ec4" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="19" fill={`url(#${gid})`} />
      <path d="M6 22 C11 15 15 15 20 21 S29 27 34 19" stroke="white" strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <path d="M9 28.5 C13 24.5 16 24.5 20 28 S27 31.5 31 26.5" stroke="white" strokeOpacity="0.55" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <ellipse cx="14" cy="11" rx="7" ry="3.2" fill="white" opacity="0.4" transform="rotate(-25 14 11)" />
    </svg>
  );
}

export function Logo({ size = "sm" }: { size?: "sm" | "lg" }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark size={size === "sm" ? 26 : 40} />
      <span className={`font-semibold tracking-[-0.02em] text-ink ${size === "sm" ? "text-[17px]" : "text-[28px]"}`}>CareEcho</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */

export const SAFETY_TEXT =
  "CareEcho helps organize and remember health information. It does not diagnose conditions or replace professional medical care.";

export function SafetyNote({ className = "" }: { className?: string }) {
  return (
    <div className={`glass-soft flex gap-2.5 rounded-2xl px-4 py-3 text-[11.5px] leading-relaxed text-mute ${className}`}>
      <ShieldCheck size={16} className="mt-0.5 shrink-0 text-periwinkle" />
      <p>{SAFETY_TEXT}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export type StepState = "pending" | "active" | "done";

export function ProcessingSteps({ steps }: { steps: { label: string; state: StepState }[] }) {
  return (
    <ul className="space-y-3">
      {steps.map((s) => (
        <li key={s.label} className="flex items-center gap-3 text-[14px]">
          <span
            className={`grid h-7 w-7 shrink-0 place-items-center rounded-full transition-colors ${
              s.state === "done"
                ? "bg-gradient-to-br from-cyan to-indigo text-white shadow-[0_4px_12px_-4px_rgba(91,92,240,0.6)]"
                : s.state === "active"
                  ? "bg-white/85 text-indigo ring-1 ring-indigo/20"
                  : "bg-white/40 text-mute/60"
            }`}
          >
            {s.state === "done" ? (
              <Check size={14} strokeWidth={3} />
            ) : s.state === "active" ? (
              <LoaderCircle size={15} className="animate-spin" />
            ) : (
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
            )}
          </span>
          <span className={s.state === "pending" ? "text-mute/70" : "font-medium text-ink"}>{s.label}</span>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */

export function ScreenScroll({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`screen no-scrollbar absolute inset-0 overflow-y-auto px-5 pb-32 ${className}`}>{children}</div>;
}

export function BackButton({ onClick, label = "Back" }: { onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick} aria-label={label} className="btn-glass grid h-10 w-10 place-items-center rounded-full text-ink">
      <ChevronLeft size={19} />
    </button>
  );
}

export function symptomIcon(name: string): LucideIcon {
  const n = name.toLowerCase();
  if (/head|migraine/.test(n)) return Brain;
  if (/dizz|vertigo|light/.test(n)) return Orbit;
  if (/fatigue|tired/.test(n)) return BatteryLow;
  if (/fever|temperature/.test(n)) return Thermometer;
  if (/breath|cough/.test(n)) return Wind;
  return Activity;
}

export function IconBubble({ Icon, tone = "indigo", size = 38 }: { Icon: LucideIcon; tone?: "indigo" | "cyan" | "lavender"; size?: number }) {
  const bg =
    tone === "cyan"
      ? "from-[#dff7fd] to-[#c5ecfb] text-[#0d88a3]"
      : tone === "lavender"
        ? "from-[#f1ecff] to-[#e2d9ff] text-[#6b55e0]"
        : "from-[#eceeff] to-[#d9dcff] text-indigo";
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-2xl bg-gradient-to-br ring-1 ring-white/90 shadow-[inset_0_1px_0_white,0_6px_14px_-8px_rgba(80,86,210,0.45)] ${bg}`}
      style={{ width: size, height: size }}
    >
      <Icon size={size * 0.48} strokeWidth={2.2} />
    </span>
  );
}
