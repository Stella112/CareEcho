"use client";

import Link from "next/link";
import {
  ArrowRight,
  AudioLines,
  FileSearch,
  GitCommitVertical,
  Globe,
  Mic,
  Play,
  Quote,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { Ada } from "@/components/Ada";
import { WaveBackground } from "@/components/ui/WaveBackground";
import { IconBubble, Logo, SAFETY_TEXT, SourceBadge } from "@/components/ui/bits";

const FEATURES = [
  { Icon: GitCommitVertical, title: "Symptom Timeline", body: "Speak how you feel. See the pattern, in your own words.", tone: "indigo" as const },
  { Icon: Stethoscope, title: "Visit Mode", body: "Record the consultation. Keep every instruction.", tone: "cyan" as const },
  { Icon: FileSearch, title: "Evidence-backed Answers", body: "Ask Ada later — every answer shows the exact words.", tone: "lavender" as const },
  { Icon: Globe, title: "Multilingual-ready", body: "Built for care without language barriers. English first.", tone: "indigo" as const },
];

const STEPS = [
  { Icon: Mic, title: "Speak", body: "Tap Talk to Ada and describe your symptoms. AssemblyAI transcribes every word." },
  { Icon: Sparkles, title: "Remember", body: "Ada organizes it into a dated health memory — you review before anything is saved." },
  { Icon: Stethoscope, title: "Record the visit", body: "Visit Mode captures the consultation with speaker labels and pulls out the care plan." },
  { Icon: ShieldCheck, title: "Ask, with proof", body: "Ask what the doctor said. Ada answers only from the recording and shows the source." },
];

export function Landing() {
  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <WaveBackground />

      {/* nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Logo />
        <nav className="hidden items-center gap-8 text-[14px] font-medium text-ink-soft md:flex">
          <a href="#features" className="hover:text-ink">Features</a>
          <a href="#how" className="hover:text-ink">How it works</a>
          <a href="#evidence" className="hover:text-ink">Evidence</a>
        </nav>
        <div className="flex items-center gap-2">
          <span className="btn-glass hidden items-center gap-1 rounded-full px-3 py-1.5 text-[12.5px] font-semibold text-ink sm:flex">
            <Globe size={14} /> EN
          </span>
          <Link href="/app" className="btn-primary rounded-full px-5 py-2.5 text-[14px] font-semibold">
            Get Started
          </Link>
        </div>
      </header>

      {/* hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-10 pt-6 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:pt-10">
        <div>
          <p className="eyebrow !tracking-[0.3em] text-periwinkle">A healthier you · a brighter tomorrow</p>
          <h1 className="mt-5 text-[40px] font-semibold leading-[1.05] tracking-[-0.035em] text-ink sm:text-[56px]">
            A multilingual health companion that <span className="text-gradient">remembers what matters.</span>
          </h1>
          <p className="mt-5 text-[19px] font-medium text-ink">Your health memory, in your voice.</p>
          <p className="mt-3 max-w-xl text-[16px] leading-relaxed text-ink-soft">
            Track symptoms by talking, record your doctor&apos;s visit, and recall verified care instructions — with Ada by your side, and the
            exact words behind every answer.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/app" className="btn-primary flex h-13 items-center gap-2 rounded-full px-7 py-3.5 text-[16px] font-semibold">
              Get Started <ArrowRight size={18} />
            </Link>
            <Link href="/app?demo=1" className="btn-glass flex items-center gap-2 rounded-full px-6 py-3.5 text-[16px] font-semibold text-ink">
              <Play size={16} className="text-indigo" fill="currentColor" /> See Demo
            </Link>
          </div>
          <p className="mt-6 flex max-w-lg items-start gap-2 text-[12px] leading-relaxed text-mute">
            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-periwinkle" /> {SAFETY_TEXT}
          </p>
        </div>

        <div className="relative mx-auto flex w-full max-w-[520px] items-center justify-center">
          <div className="absolute -left-2 top-4 z-10 hidden sm:block">
            <p className="font-hand -rotate-[8deg] text-[22px] leading-[1.05] text-indigo/80">
              Hi, I&apos;m Ada.
              <br />
              Your health companion.
              <br />
              Always here, listening.
            </p>
          </div>
          <div className="absolute -left-4 bottom-6 z-10 hidden sm:block">
            <Ada size={170} />
          </div>
          {/* live product shot */}
          <div className="relative ml-auto h-[640px] w-[296px] overflow-hidden rounded-[46px] border border-white shadow-[0_0_0_9px_rgba(255,255,255,0.45),0_0_0_10px_rgba(190,196,255,0.6),0_40px_80px_-30px_rgba(60,64,170,0.5)] sm:mr-2">
            <iframe
              src="/app"
              title="CareEcho app preview"
              tabIndex={-1}
              className="pointer-events-none absolute left-0 top-0 h-[844px] w-[390px] origin-top-left border-0"
              style={{ transform: "scale(0.7590)" }}
            />
          </div>
          <div className="glass absolute -right-2 top-10 hidden w-[200px] rounded-[24px] p-4 lg:block xl:-right-10">
            <p className="font-hand text-[19px] leading-tight text-ink-soft">“A calmer, more confident you — in every language.”</p>
          </div>
        </div>
      </section>

      {/* visual references */}
      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-12">
        <div className="grid items-end gap-8 lg:grid-cols-[0.72fr_1.28fr]">
          <div className="max-w-md">
            <p className="eyebrow">Built for the moments between appointments</p>
            <h2 className="mt-3 text-[30px] font-semibold leading-[1.12] tracking-[-0.03em] text-ink sm:text-[38px]">
              A calmer way to keep your care in view.
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-ink-soft">
              Capture what matters while it is fresh, then return to a clear, grounded record when you need it.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-5">
            <figure className="group overflow-hidden rounded-[26px] border border-white/90 bg-white/55 shadow-[0_18px_36px_-22px_rgba(38,62,125,0.45)]">
              <img
                src="/careecho-visual-01.png"
                alt="CareEcho visual"
                className="aspect-[3/2] w-full object-cover transition duration-500 group-hover:scale-[1.025]"
              />
              <figcaption className="px-4 py-3 text-[13px] font-semibold text-ink">Speak in your own words</figcaption>
            </figure>
            <figure className="group mt-7 overflow-hidden rounded-[26px] border border-white/90 bg-white/55 shadow-[0_18px_36px_-22px_rgba(38,62,125,0.45)] sm:mt-10">
              <img
                src="/careecho-visual-02.png"
                alt="CareEcho visual"
                className="aspect-[3/2] w-full object-cover transition duration-500 group-hover:scale-[1.025]"
              />
              <figcaption className="px-4 py-3 text-[13px] font-semibold text-ink">Find the words that matter</figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* features */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-10 px-5 py-8 sm:px-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <Link key={f.title} href="/app" className="glass group flex items-start gap-3 rounded-[26px] p-5 transition-transform hover:-translate-y-0.5">
              <IconBubble Icon={f.Icon} tone={f.tone} size={44} />
              <div className="flex-1">
                <p className="text-[15px] font-semibold text-ink">{f.title}</p>
                <p className="mt-1 text-[13px] leading-snug text-mute">{f.body}</p>
              </div>
              <ArrowRight size={16} className="mt-1 text-mute transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </section>

      {/* how */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-10 px-5 py-16 sm:px-8">
        <p className="eyebrow">How it works</p>
        <h2 className="mt-3 max-w-2xl text-[34px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink sm:text-[42px]">
          A more human healthcare experience.
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className="prism rounded-[28px] p-5">
              <div className="flex items-center justify-between">
                <IconBubble Icon={s.Icon} size={42} />
                <span className="text-[34px] font-semibold tracking-tight text-indigo/15">0{i + 1}</span>
              </div>
              <p className="mt-4 text-[17px] font-semibold text-ink">{s.title}</p>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-soft">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* evidence */}
      <section id="evidence" className="mx-auto grid max-w-6xl scroll-mt-10 items-center gap-10 px-5 py-12 sm:px-8 lg:grid-cols-2">
        <div>
          <p className="eyebrow">No source → no claim</p>
          <h2 className="mt-3 text-[34px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink sm:text-[42px]">
            Ada never guesses about your care.
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-ink-soft">
            Every medication, follow-up and instruction is linked to the moment it was said. What you said stays marked as yours — it can never
            turn into a doctor&apos;s instruction. If the recording doesn&apos;t say it, Ada tells you so.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <SourceBadge provenance="PATIENT_REPORTED" size="md" />
            <SourceBadge provenance="CLINICIAN_SAID" size="md" />
            <SourceBadge provenance="AI_DERIVED" size="md" />
          </div>
        </div>

        <div className="glass rounded-[32px] p-5 sm:p-6">
          <div className="ml-auto w-fit max-w-[85%] rounded-[20px] rounded-br-md bg-gradient-to-br from-[#6f78ff] to-[#5256e6] px-4 py-2.5 text-[14.5px] text-white">
            What did the doctor say about my medication?
          </div>
          <div className="prism mt-4 rounded-[24px] rounded-bl-md p-5">
            <p className="text-[12px] font-bold text-ink">Ada</p>
            <p className="mt-1.5 text-[16px] font-medium leading-relaxed text-ink">
              Your doctor said to take amoxicillin 500 mg three times daily for 7 days.
            </p>
            <p className="eyebrow mt-4">Source</p>
            <div className="glass-inset mt-2 rounded-2xl p-3.5">
              <div className="flex items-center gap-2">
                <SourceBadge provenance="CLINICIAN_SAID" />
                <span className="text-[11px] text-mute">Doctor · Visit today · 00:01</span>
              </div>
              <p className="mt-2 flex gap-1.5 text-[14px] italic text-ink-soft">
                <Quote size={13} className="mt-1 shrink-0 text-periwinkle" /> I&apos;m prescribing amoxicillin 500 milligrams three times daily for
                seven days.
              </p>
            </div>
          </div>
          <div className="glass-soft mt-3 rounded-[20px] p-4 text-[14px] text-ink-soft">
            <span className="font-semibold text-ink">“Can I drink alcohol?”</span> → I couldn&apos;t find that in your saved visit.
          </div>
        </div>
      </section>

      {/* closing */}
      <section className="mx-auto max-w-6xl px-5 pb-20 pt-12 sm:px-8">
        <div className="prism flex flex-col items-center rounded-[40px] px-6 py-14 text-center">
          <Ada size={140} />
          <h2 className="mt-4 text-[40px] font-semibold tracking-[-0.035em] text-ink sm:text-[52px]">CareEcho</h2>
          <p className="mt-2 text-[19px] font-medium text-gradient">Your health memory, in your voice.</p>
          <Link href="/app" className="btn-primary mt-8 flex items-center gap-2 rounded-full px-8 py-4 text-[16px] font-semibold">
            <AudioLines size={19} /> Talk to Ada
          </Link>
        </div>
        <footer className="mt-10 flex flex-col items-center justify-between gap-3 text-[12px] text-mute sm:flex-row">
          <Logo />
          <p className="max-w-xl text-center sm:text-right">{SAFETY_TEXT}</p>
        </footer>
      </section>
    </div>
  );
}
