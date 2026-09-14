"use client";

import { motion } from "framer-motion";
import { GitCommitVertical, House, Stethoscope, UserRound, type LucideIcon } from "lucide-react";
import { useShell, type View } from "./AppShell";

const TABS: { key: string; label: string; Icon: LucideIcon; view: View }[] = [
  { key: "home", label: "Home", Icon: House, view: { name: "home" } },
  { key: "timeline", label: "Timeline", Icon: GitCommitVertical, view: { name: "timeline" } },
  { key: "visits", label: "Visits", Icon: Stethoscope, view: { name: "visits" } },
  { key: "profile", label: "Profile", Icon: UserRound, view: { name: "profile" } },
];

export function BottomNav() {
  const { view, go } = useShell();
  const active = view.name === "visit" ? "visits" : view.name;
  return (
    <motion.nav
      aria-label="Main"
      className="nav-glass absolute inset-x-4 bottom-[max(env(safe-area-inset-bottom),14px)] z-30 grid grid-cols-4 rounded-[28px] p-1.5 lg:inset-y-5 lg:bottom-auto lg:left-5 lg:right-auto lg:w-[190px] lg:grid-cols-1 lg:content-start lg:gap-1.5 lg:rounded-[24px] lg:p-2.5"
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 40, opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      {TABS.map((t) => {
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            onClick={() => go(t.view)}
            aria-current={isActive ? "page" : undefined}
            className="relative flex flex-col items-center gap-0.5 rounded-[22px] py-2 text-[10.5px] font-semibold lg:flex-row lg:gap-3 lg:rounded-[16px] lg:px-3 lg:py-3 lg:text-[13px]"
          >
            {isActive && (
              <motion.span
                layoutId="nav-pill"
                className="absolute inset-0 rounded-[22px] bg-white/85 shadow-[0_6px_16px_-8px_rgba(80,86,210,0.45),inset_0_1px_0_white] lg:rounded-[16px]"
                transition={{ type: "spring", damping: 30, stiffness: 380 }}
              />
            )}
            <t.Icon size={20} strokeWidth={isActive ? 2.4 : 2} className={`relative ${isActive ? "text-indigo" : "text-mute"}`} />
            <span className={`relative ${isActive ? "text-indigo" : "text-mute"}`}>{t.label}</span>
          </button>
        );
      })}
    </motion.nav>
  );
}
