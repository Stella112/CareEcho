"use client";

import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { healthMemory, type HealthEntryRecord, type VisitRecord } from "@/lib/healthMemory";
import type { Profile } from "@/lib/profile";
import { isLanguageCode, type LanguageCode } from "@/lib/languages";
import type { Engine, HealthEntry } from "@/lib/schemas";
import { WaveBackground } from "../ui/WaveBackground";
import { BottomNav } from "./BottomNav";
import { HomeScreen } from "../screens/HomeScreen";
import { ListenScreen } from "../screens/ListenScreen";
import { ReviewScreen } from "../screens/ReviewScreen";
import { TimelineScreen } from "../screens/TimelineScreen";
import { VisitsScreen } from "../screens/VisitsScreen";
import { VisitRecordScreen } from "../screens/VisitRecordScreen";
import { VisitSummaryScreen } from "../screens/VisitSummaryScreen";
import { ProfileScreen } from "../screens/ProfileScreen";

export type View =
  | { name: "home" }
  | { name: "listen" }
  | { name: "review"; transcript: string; entry: HealthEntry; engine: Engine; isSample: boolean }
  | { name: "timeline"; highlightId?: string }
  | { name: "visits" }
  | { name: "visitRecord" }
  | { name: "visit"; id: string; fresh?: boolean }
  | { name: "profile" };

export type ServiceStatus = { assemblyai: boolean; llm: boolean } | null;

type Shell = {
  view: View;
  go: (v: View) => void;
  entries: HealthEntryRecord[];
  visits: VisitRecord[];
  openSheet: (node: ReactNode) => void;
  closeSheet: () => void;
  toast: (msg: string) => void;
  status: ServiceStatus;
  language: LanguageCode;
  profile: Profile;
};

const ShellContext = createContext<Shell | null>(null);

export function useShell(): Shell {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used inside AppShell");
  return ctx;
}

function viewFromHash(hash: string, visits: VisitRecord[]): View {
  const h = hash.replace(/^#/, "");
  if (h === "timeline") return { name: "timeline" };
  if (h === "visits") return { name: "visits" };
  if (h === "profile") return { name: "profile" };
  if (h === "visit-latest" && visits[0]) return { name: "visit", id: visits[0].id };
  if (h.startsWith("visit=")) {
    const id = h.slice(6);
    if (visits.some((v) => v.id === id)) return { name: "visit", id };
  }
  return { name: "home" };
}

function hashFor(v: View): string | null {
  switch (v.name) {
    case "home":
      return "";
    case "timeline":
    case "visits":
    case "profile":
      return v.name;
    case "visit":
      return `visit=${v.id}`;
    default:
      return null;
  }
}

function renderView(view: View) {
  switch (view.name) {
    case "home":
      return <HomeScreen />;
    case "listen":
      return <ListenScreen />;
    case "review":
      return <ReviewScreen transcript={view.transcript} entry={view.entry} engine={view.engine} isSample={view.isSample} />;
    case "timeline":
      return <TimelineScreen highlightId={view.highlightId} />;
    case "visits":
      return <VisitsScreen />;
    case "visitRecord":
      return <VisitRecordScreen />;
    case "visit":
      return <VisitSummaryScreen id={view.id} fresh={view.fresh} />;
    case "profile":
      return <ProfileScreen />;
  }
}

const NAV_VIEWS = new Set<View["name"]>(["home", "timeline", "visits", "visit", "profile"]);

export function AppShell() {
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<View>({ name: "home" });
  const [entries, setEntries] = useState<HealthEntryRecord[]>([]);
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [sheet, setSheet] = useState<ReactNode>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [status, setStatus] = useState<ServiceStatus>(null);
  const [language, setLanguage] = useState<LanguageCode>("en");
  const [profile, setProfile] = useState<Profile>(() => healthMemory.getProfile());
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "1") {
      healthMemory.resetToDemo();
      window.history.replaceState(null, "", window.location.pathname + window.location.hash);
    } else {
      healthMemory.seedDemoIfNeeded();
    }
    const load = () => {
      setEntries(healthMemory.listEntries());
      setVisits(healthMemory.listVisits());
      const savedLanguage = healthMemory.getLanguage();
      if (isLanguageCode(savedLanguage)) setLanguage(savedLanguage);
      setProfile(healthMemory.getProfile());
    };
    load();
    setView(viewFromHash(window.location.hash, healthMemory.listVisits()));
    setMounted(true);
    fetch("/api/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
    const onHash = () => {
      setSheet(null);
      setView(viewFromHash(window.location.hash, healthMemory.listVisits()));
    };
    window.addEventListener("hashchange", onHash);
    const unsubscribe = healthMemory.subscribe(load);
    return () => {
      window.removeEventListener("hashchange", onHash);
      unsubscribe();
    };
  }, []);

  const go = useCallback((v: View) => {
    setSheet(null);
    setView(v);
    const h = hashFor(v);
    if (h !== null) window.history.replaceState(null, "", h ? `#${h}` : window.location.pathname);
  }, []);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 3200);
  }, []);

  const ctx = useMemo<Shell>(
    () => ({ view, go, entries, visits, openSheet: setSheet, closeSheet: () => setSheet(null), toast, status, language, profile }),
    [view, go, entries, visits, toast, status, language, profile],
  );

  const screenKey = view.name === "visit" ? `visit-${view.id}` : view.name;

  return (
    <ShellContext.Provider value={ctx}>
      <WaveBackground />
      <main className="relative flex min-h-dvh items-center justify-center">

        {/* overflow-clip (not hidden): scrollIntoView can't shift a clipped container sideways */}
        <div className="device relative h-dvh w-full overflow-clip sm:h-[min(844px,calc(100dvh-48px))] sm:w-[390px] lg:h-[min(820px,calc(100dvh-48px))] lg:w-[min(1180px,calc(100vw-64px))]">
          {/* inner light */}
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-clip rounded-[inherit]">
            <div className="absolute -left-20 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.9),transparent_65%)]" />
            <div className="absolute -right-24 top-40 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(186,178,255,0.35),transparent_65%)]" />
            <div className="absolute -bottom-20 left-10 h-64 w-80 rounded-full bg-[radial-gradient(circle,rgba(140,207,255,0.28),transparent_65%)]" />
          </div>

          {mounted && (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={screenKey}
                className="absolute inset-0"
                initial={{ opacity: 0, y: 16, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.99 }}
                transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
              >
                {renderView(view)}
              </motion.div>
            </AnimatePresence>
          )}

          <AnimatePresence initial={false}>{mounted && NAV_VIEWS.has(view.name) && <BottomNav key="nav" />}</AnimatePresence>

          <AnimatePresence>
            {sheet && (
              <>
                <motion.div
                  key="scrim"
                  className="absolute inset-0 z-40 bg-[#1b2051]/25 backdrop-blur-[2px]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSheet(null)}
                />
                <motion.div
                  key="sheet"
                  role="dialog"
                  aria-modal="true"
                  className="sheet no-scrollbar absolute inset-x-0 bottom-0 z-50 max-h-[86%] overflow-y-auto rounded-t-[34px] px-6 pb-[max(env(safe-area-inset-bottom),28px)] pt-3"
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 32, stiffness: 320 }}
                  drag="y"
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={{ top: 0, bottom: 0.5 }}
                  onDragEnd={(_, info) => {
                    if (info.offset.y > 110 || info.velocity.y > 700) setSheet(null);
                  }}
                >
                  <div className="mx-auto mb-5 h-1.5 w-11 rounded-full bg-ink/15" />
                  {sheet}
                </motion.div>
              </>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {toastMsg && (
              <motion.div
                key="toast"
                role="status"
                className="glass absolute inset-x-6 bottom-28 z-[60] rounded-2xl px-4 py-3 text-center text-[13px] font-medium text-ink"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
              >
                {toastMsg}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </ShellContext.Provider>
  );
}
