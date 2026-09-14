"use client";

import { useEffect, useState } from "react";
import { AppShell } from "../shell/AppShell";
import { AuthProvider, useAuth } from "./AuthProvider";
import { AuthScreen } from "./AuthScreen";
import { OnboardingScreen } from "./OnboardingScreen";
import { healthMemory } from "@/lib/healthMemory";
import type { Profile } from "@/lib/profile";
import { DEFAULT_PROFILE } from "@/lib/profile";

function CloudApp() {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => {
    if (!user) return;
    let active = true;
    Promise.all([fetch("/api/profile").then((r) => r.ok ? r.json() : null), fetch("/api/memory").then((r) => r.ok ? r.json() : null)])
      .then(([remoteProfile, memory]) => {
        if (!active) return;
        if (memory) healthMemory.replaceCloud(memory.entries ?? [], memory.visits ?? []);
        if (remoteProfile?.profile) {
          const normalized: Profile = { ...DEFAULT_PROFILE, ...remoteProfile.profile };
          setProfile(normalized);
          healthMemory.setProfile(normalized);
        }
        setReady(true);
      }).catch(() => active && setReady(true));
    return () => { active = false; };
  }, [user]);
  useEffect(() => {
    if (!user || !ready) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = healthMemory.subscribe(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        const snapshot = healthMemory.exportCloud();
        if (snapshot.entries.length === 0 && snapshot.visits.length === 0) await fetch("/api/memory", { method: "DELETE" }).catch(() => undefined);
        else await fetch("/api/memory", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(snapshot) }).catch(() => undefined);
      }, 350);
    });
    return () => { if (timer) clearTimeout(timer); unsubscribe(); };
  }, [user, ready]);
  if (!ready) return <main className="grid min-h-dvh place-items-center text-[14px] font-semibold text-ink-soft">Preparing your private health memory…</main>;
  if (!profile?.onboardingComplete) return <OnboardingScreen onComplete={async (next) => { const response = await fetch("/api/profile", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(next) }); if (!response.ok) throw new Error("We couldn't save your setup."); healthMemory.setProfile(next); setProfile(next); }} />;
  return <AppShell />;
}

function GateContent() {
  const { configured, loading, user } = useAuth();
  const [demo, setDemo] = useState(false);
  useEffect(() => setDemo(new URLSearchParams(window.location.search).get("demo") === "1"), []);
  if (demo || !configured) return <AppShell />;
  if (loading) return <main className="grid min-h-dvh place-items-center text-[14px] font-semibold text-ink-soft">Opening CareEcho…</main>;
  return user ? <CloudApp /> : <AuthScreen />;
}

export function AppGate() { return <AuthProvider><GateContent /></AuthProvider>; }
