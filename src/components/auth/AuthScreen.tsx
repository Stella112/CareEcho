"use client";

import { ArrowRight, Check, Mail, ShieldCheck } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { Ada } from "../Ada";
import { Logo, SAFETY_TEXT } from "../ui/bits";

export function AuthScreen() {
  const { configured, signInWithEmail, verifyEmailOtp, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signInWithEmail(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't send the verification code.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await verifyEmailOtp(email.trim(), otp.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "That code is not valid. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setError(null);
    try { await signInWithGoogle(); } catch (err) { setError(err instanceof Error ? err.message : "Google sign-in is unavailable right now."); }
  };

  return (
    <main className="relative flex min-h-dvh items-center justify-center px-5 py-8">
      <div className="glass relative w-full max-w-[480px] rounded-[38px] p-6 shadow-[0_30px_80px_-30px_rgba(56,63,160,0.45)] sm:p-9">
        <div className="flex items-center justify-between"><Logo /><Link href="/" className="text-[12px] font-semibold text-indigo">Back home</Link></div>
        <div className="mt-8 flex items-center gap-4"><Ada size={88} /><div><p className="eyebrow">Your health memory</p><h1 className="mt-1 text-[30px] font-bold tracking-[-0.03em] text-ink">Welcome to CareEcho.</h1></div></div>
        <p className="mt-5 text-[14px] leading-relaxed text-ink-soft">Sign in to keep your timeline, visit evidence and companion settings with you on every device.</p>
        {!configured && <div className="glass-soft mt-5 rounded-2xl p-4 text-[12.5px] leading-relaxed text-ink-soft"><span className="font-semibold text-ink">Demo mode is ready.</span> Add your Supabase variables to enable real accounts and cloud memory.</div>}
        {sent ? (
          <div className="prism mt-6 rounded-[24px] p-5">
            <div className="flex items-center gap-2 text-[15px] font-semibold text-ink"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#d9f7ec] text-[#0d8a6a]"><Check size={17} /></span> Enter your CareEcho code</div>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">We sent a six-digit verification code to <span className="font-semibold text-ink">{email}</span>.</p>
            <form onSubmit={verify} className="mt-5 space-y-3">
              <label className="sr-only" htmlFor="otp">Six-digit verification code</label>
              <input id="otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={otp} onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))} placeholder="000000" className="glass-inset h-14 w-full rounded-2xl text-center text-[25px] font-bold tracking-[0.35em] text-ink outline-none placeholder:text-mute/40" />
              <button disabled={busy || otp.length !== 6} className="btn-primary flex h-13 w-full items-center justify-center gap-2 rounded-full text-[14px] font-bold disabled:opacity-50">{busy ? "Verifying…" : "Verify and continue"} {!busy && <ArrowRight size={17} />}</button>
            </form>
            <button onClick={() => { setSent(false); setOtp(""); }} className="mt-4 text-[13px] font-semibold text-indigo">Use another email</button>
          </div>
        ) : (
          <>
            <button onClick={google} disabled={!configured} className="btn-glass mt-6 flex h-13 w-full items-center justify-center gap-2 rounded-full text-[14px] font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-50"><span className="text-base font-bold">G</span> Continue with Google</button>
            <div className="my-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-mute"><span className="h-px flex-1 bg-white/70" /> or continue with email <span className="h-px flex-1 bg-white/70" /></div>
            <form onSubmit={emailSubmit} className="space-y-3"><label className="sr-only" htmlFor="email">Email address</label><div className="glass-inset flex h-13 items-center gap-2 rounded-full px-4"><Mail size={17} className="text-indigo" /><input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-mute/70" /></div><button disabled={!configured || busy} className="btn-primary flex h-13 w-full items-center justify-center gap-2 rounded-full text-[14px] font-bold disabled:opacity-50">{busy ? "Sending code…" : "Continue with email"} {!busy && <ArrowRight size={17} />}</button></form>
          </>
        )}
        {error && <p role="alert" className="mt-3 text-center text-[12px] font-medium text-rose">{error}</p>}
        <Link href="/app?demo=1" className="btn-glass mt-4 flex h-12 w-full items-center justify-center rounded-full text-[13px] font-semibold text-indigo">Try the demo without an account</Link>
        <p className="mt-5 flex items-start gap-2 text-[11px] leading-relaxed text-mute"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-periwinkle" /> {SAFETY_TEXT}</p>
      </div>
    </main>
  );
}
