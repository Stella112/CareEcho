"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderState = "idle" | "requesting" | "recording" | "error";

const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

function pickMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m));
}

/** Tap-to-talk microphone recording with a live analyser for the waveform. */
export function useRecorder({ maxSeconds = 120 }: { maxSeconds?: number } = {}) {
  const [state, setState] = useState<RecorderState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const stopResolverRef = useRef<((b: Blob | null) => void) | null>(null);

  const teardown = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    analyserRef.current = null;
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
  }, []);

  const stop = useCallback((): Promise<Blob | null> => {
    const rec = recorderRef.current;
    if (!rec || rec.state === "inactive") {
      teardown();
      setState("idle");
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      stopResolverRef.current = resolve;
      rec.stop();
    });
  }, [teardown]);

  const start = useCallback(async () => {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("This browser can't record audio. Try Chrome or Safari.");
      setState("error");
      return false;
    }
    setState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;

      try {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new Ctx();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.72;
        source.connect(analyser);
        ctx.resume().catch(() => {});
        ctxRef.current = ctx;
        analyserRef.current = analyser;
      } catch {
        // waveform is decorative — recording still works without it
      }

      const mimeType = pickMime();
      const rec = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 48_000 });
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || mimeType || "audio/webm" });
        teardown();
        setState("idle");
        stopResolverRef.current?.(blob.size > 0 ? blob : null);
        stopResolverRef.current = null;
      };
      recorderRef.current = rec;
      rec.start(250);

      startedAtRef.current = Date.now();
      setElapsed(0);
      timerRef.current = setInterval(() => {
        const secs = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setElapsed(secs);
      }, 250);
      setState("recording");
      return true;
    } catch (err) {
      teardown();
      const denied = err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "SecurityError");
      setError(denied ? "Microphone access was blocked. Allow it in your browser settings and try again." : "Couldn't start the microphone.");
      setState("error");
      return false;
    }
  }, [teardown]);

  const cancel = useCallback(() => {
    const rec = recorderRef.current;
    stopResolverRef.current = null;
    if (rec && rec.state !== "inactive") {
      rec.onstop = null;
      rec.stop();
    }
    teardown();
    setState("idle");
  }, [teardown]);

  // auto-stop safety cap
  const onCapRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (state === "recording" && elapsed >= maxSeconds) onCapRef.current?.();
  }, [elapsed, maxSeconds, state]);

  useEffect(() => () => cancel(), [cancel]);

  return { state, elapsed, error, start, stop, cancel, analyserRef, onCapRef };
}

export function clock(secs: number) {
  return `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
}
