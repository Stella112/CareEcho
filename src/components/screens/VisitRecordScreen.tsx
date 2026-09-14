"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CircleAlert, FlaskConical, RotateCcw, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Ada } from "../Ada";
import { Waveform } from "../Waveform";
import { useShell } from "../shell/AppShell";
import { ProcessingSteps, type StepState } from "../ui/bits";
import { clock, useRecorder } from "@/hooks/useRecorder";
import { postJSON, transcribeBlob } from "@/lib/client";
import { SAMPLE_CONSULTATION } from "@/lib/demoData";
import { healthMemory, newId } from "@/lib/healthMemory";
import type { Engine, Utterance, VisitFacts } from "@/lib/schemas";

type Phase = "record" | "transcribing" | "extracting" | "error";

export function VisitRecordScreen() {
  const { go, language } = useShell();
  const rec = useRecorder({ maxSeconds: 8 * 60 });
  const [phase, setPhase] = useState<Phase>("record");
  const [error, setError] = useState<string | null>(null);
  const [isSample, setIsSample] = useState(false);
  const started = useRef(false);

  const extractAndSave = useCallback(
    async (t: { text: string; utterances: Utterance[]; diarized: boolean; medicalMode: boolean }, sample: boolean) => {
      setPhase("extracting");
      const { facts, engine } = await postJSON<{ facts: VisitFacts; engine: Engine }>("/api/visit", { utterances: t.utterances, language });
      const id = newId();
      healthMemory.saveVisit({
        id,
        timestamp: new Date().toISOString(),
        transcript: t.text,
        utterances: t.utterances,
        facts,
        diarized: t.diarized,
        medicalMode: t.medicalMode,
        isSample: sample,
        engine,
        qa: [],
      });
      go({ name: "visit", id, fresh: true });
    },
    [go],
  );

  const loadSample = useCallback(async () => {
    rec.cancel();
    setIsSample(true);
    setError(null);
    try {
      await extractAndSave(
        { text: SAMPLE_CONSULTATION.map((u) => u.text).join(" "), utterances: SAMPLE_CONSULTATION, diarized: true, medicalMode: false },
        true,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setPhase("error");
    }
  }, [rec, extractAndSave]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (sessionStorage.getItem("careecho.loadSample")) {
      sessionStorage.removeItem("careecho.loadSample");
      loadSample();
    } else {
      rec.start();
    }
  }, [rec, loadSample]);

  const endVisit = useCallback(async () => {
    const blob = await rec.stop();
    if (!blob) {
      setError("Nothing was recorded. Try again.");
      setPhase("error");
      return;
    }
    setPhase("transcribing");
    try {
      const t = await transcribeBlob(blob, "visit", language);
      await extractAndSave(t, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't transcribe that recording. Try again.");
      setPhase("error");
    }
  }, [rec, extractAndSave]);

  useEffect(() => {
    rec.onCapRef.current = endVisit;
  }, [rec, endVisit]);

  const micError = phase === "record" && rec.state === "error";

  const steps: { label: string; state: StepState }[] = [
    {
      label: isSample ? "Sample consultation loaded (no recording)" : "Transcribing with AssemblyAI · speaker labels",
      state: phase === "transcribing" ? "active" : "done",
    },
    { label: "Finding what your doctor said", state: phase === "extracting" ? "active" : "pending" },
    { label: "Attaching evidence to every item", state: "pending" },
  ];

  return (
    <div className="screen absolute inset-0 flex flex-col px-6 pb-[max(env(safe-area-inset-bottom),24px)]">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-[13px] font-semibold text-ink">
          {phase === "record" && !micError ? (
            <>
              <span className="animate-rec h-2.5 w-2.5 rounded-full bg-rose" /> Recording consultation
            </>
          ) : (
            <span className="eyebrow">Visit Mode</span>
          )}
        </span>
        {phase === "record" && (
          <button
            onClick={() => {
              rec.cancel();
              go({ name: "visits" });
            }}
            className="btn-glass rounded-full px-4 py-2 text-[13px] font-semibold text-ink"
          >
            Cancel
          </button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {phase === "record" && !micError && (
            <motion.div key="rec" className="flex w-full flex-col items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.96 }}>
              <Ada size={120} state="listening" />
              <p className="mt-6 text-[60px] font-semibold tabular-nums leading-none tracking-[-0.03em] text-ink">{clock(rec.elapsed)}</p>
              <Waveform analyserRef={rec.analyserRef} active={rec.state === "recording"} className="mt-7 w-full" height={110} bars={38} />
              <p className="mx-auto mt-6 max-w-[280px] text-center text-[13px] leading-relaxed text-mute">
                Place your phone between you and your clinician. Speak naturally.
              </p>
            </motion.div>
          )}

          {(phase === "transcribing" || phase === "extracting") && (
            <motion.div key="proc" className="flex w-full flex-col items-center" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Ada size={130} state="processing" />
              <h1 className="mt-6 text-center text-[23px] font-semibold tracking-tight text-ink">Saving your visit…</h1>
              <div className="glass mt-5 w-full rounded-[24px] p-5">
                <ProcessingSteps steps={steps} />
              </div>
            </motion.div>
          )}

          {(phase === "error" || micError) && (
            <motion.div key="err" className="flex w-full flex-col items-center text-center" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Ada size={110} />
              <CircleAlert className="mt-4 text-rose" />
              <p className="mt-2 text-[16px] font-semibold text-ink">{micError ? rec.error : error}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {phase === "record" && !micError && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={endVisit}
          disabled={rec.state !== "recording" || rec.elapsed < 1}
          className="btn-primary flex h-16 w-full items-center justify-center gap-2.5 rounded-full text-[16px] font-bold uppercase tracking-[0.08em]"
        >
          <Square size={16} fill="currentColor" /> End visit
        </motion.button>
      )}

      {(phase === "error" || micError) && (
        <div className="space-y-3">
          <button onClick={() => go({ name: "visits" })} className="btn-primary flex h-14 w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold">
            <RotateCcw size={17} /> Try again
          </button>
          <button onClick={loadSample} className="flex w-full items-center justify-center gap-1.5 py-2 text-[13px] font-semibold text-indigo">
            <FlaskConical size={15} /> Load demo recording (sample consultation)
          </button>
        </div>
      )}
    </div>
  );
}
