"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, CircleAlert, FlaskConical, Quote, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Ada } from "../Ada";
import { Waveform } from "../Waveform";
import { useShell } from "../shell/AppShell";
import { ProcessingSteps } from "../ui/bits";
import { clock, useRecorder } from "@/hooks/useRecorder";
import { postJSON, transcribeBlob } from "@/lib/client";
import { SAMPLE_SYMPTOM } from "@/lib/demoData";
import type { Engine, HealthEntry } from "@/lib/schemas";

type Phase = "record" | "transcribing" | "understanding" | "error";

export function ListenScreen() {
  const { go, status } = useShell();
  const rec = useRecorder({ maxSeconds: 90 });
  const [phase, setPhase] = useState<Phase>("record");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    rec.start();
  }, [rec]);

  const understand = useCallback(
    async (text: string, isSample: boolean) => {
      setTranscript(text);
      setPhase("understanding");
      const { entry, engine } = await postJSON<{ entry: HealthEntry; engine: Engine }>("/api/health-entry", { transcript: text });
      go({ name: "review", transcript: text, entry, engine, isSample });
    },
    [go],
  );

  const fail = (err: unknown) => {
    setError(err instanceof Error ? err.message : "We couldn't transcribe that recording. Try again.");
    setPhase("error");
  };

  const done = useCallback(async () => {
    const blob = await rec.stop();
    if (!blob) {
      fail(new Error("Ada didn't catch anything. Try again."));
      return;
    }
    setPhase("transcribing");
    try {
      const t = await transcribeBlob(blob, "symptom");
      await understand(t.text, false);
    } catch (err) {
      fail(err);
    }
  }, [rec, understand]);

  useEffect(() => {
    rec.onCapRef.current = done;
  }, [rec, done]);

  const retry = async () => {
    setError(null);
    setTranscript("");
    setPhase("record");
    await rec.start();
  };

  const useSample = async () => {
    rec.cancel();
    setError(null);
    try {
      await understand(SAMPLE_SYMPTOM, true);
    } catch (err) {
      fail(err);
    }
  };

  const cancel = () => {
    rec.cancel();
    go({ name: "home" });
  };

  const micError = rec.state === "error" && phase === "record";
  const adaState = phase === "record" ? (micError ? "idle" : "listening") : phase === "error" ? "idle" : "processing";

  return (
    <div className="screen absolute inset-0 flex flex-col px-6 pb-[max(env(safe-area-inset-bottom),24px)]">
      <div className="flex items-center justify-between">
        <button onClick={cancel} aria-label="Cancel" className="btn-glass grid h-10 w-10 place-items-center rounded-full text-ink">
          <X size={18} />
        </button>
        <span className="eyebrow">Talk to Ada</span>
        <span className="w-10" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
        <Ada size={phase === "record" ? 168 : 132} state={adaState} />

        <AnimatePresence mode="wait">
          {phase === "record" && !micError && (
            <motion.div key="rec" className="w-full" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <h1 className="mt-5 text-center text-[26px] font-semibold tracking-[-0.02em] text-ink">
                {rec.state === "requesting" ? "Waking the microphone…" : "Ada is listening…"}
              </h1>
              <Waveform analyserRef={rec.analyserRef} active={rec.state === "recording"} className="mt-5" height={96} />
              <p className="mt-3 text-center text-[36px] font-semibold tabular-nums tracking-tight text-ink">{clock(rec.elapsed)}</p>
              <p className="mx-auto mt-2 max-w-[290px] text-center text-[13.5px] leading-relaxed text-mute">
                Tell Ada how you&apos;re feeling — what&apos;s happening, since when, and how strong it is.
              </p>
              {status && !status.assemblyai && (
                <p className="mx-auto mt-3 max-w-[300px] rounded-xl bg-white/60 px-3 py-2 text-center text-[11.5px] text-rose">
                  Live transcription isn&apos;t configured on this server (ASSEMBLYAI_API_KEY).
                </p>
              )}
            </motion.div>
          )}

          {micError && (
            <motion.div key="mic" className="mt-6 w-full text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <CircleAlert className="mx-auto text-rose" />
              <p className="mt-2 text-[15px] font-medium text-ink">{rec.error}</p>
            </motion.div>
          )}

          {(phase === "transcribing" || phase === "understanding") && (
            <motion.div key="proc" className="mt-6 w-full" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <h1 className="text-center text-[22px] font-semibold tracking-tight text-ink">
                {phase === "transcribing" ? "Listening back…" : "Understanding…"}
              </h1>
              <div className="glass mx-auto mt-5 rounded-[24px] p-5">
                <ProcessingSteps
                  steps={[
                    { label: "Transcribing with AssemblyAI", state: phase === "transcribing" ? "active" : "done" },
                    { label: "Organizing what you said", state: phase === "understanding" ? "active" : "pending" },
                  ]}
                />
                <AnimatePresence>
                  {transcript && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="glass-inset mt-4 flex gap-2 rounded-2xl p-3 text-[13.5px] italic leading-relaxed text-ink-soft"
                    >
                      <Quote size={14} className="mt-1 shrink-0 text-periwinkle" />
                      {transcript}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {phase === "error" && (
            <motion.div key="err" className="mt-6 w-full text-center" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <CircleAlert className="mx-auto text-rose" />
              <p className="mt-2 text-[16px] font-semibold text-ink">{error}</p>
              <p className="mt-1 text-[12.5px] text-mute">Nothing was saved.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {phase === "record" && !micError && (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={cancel} className="btn-glass h-14 rounded-full text-[15px] font-semibold text-ink">
            Cancel
          </button>
          <button
            onClick={done}
            disabled={rec.state !== "recording" || rec.elapsed < 1}
            className="btn-primary flex h-14 items-center justify-center gap-2 rounded-full text-[15px] font-semibold"
          >
            <Check size={18} strokeWidth={2.8} /> Done
          </button>
        </div>
      )}

      {(phase === "error" || micError) && (
        <div className="space-y-3">
          <button onClick={retry} className="btn-primary flex h-14 w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold">
            <RotateCcw size={17} /> Try again
          </button>
          <button onClick={useSample} className="flex w-full items-center justify-center gap-1.5 py-2 text-[13px] font-semibold text-indigo">
            <FlaskConical size={15} /> Use sample phrase (demo)
          </button>
        </div>
      )}
    </div>
  );
}
