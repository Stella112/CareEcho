"use client";

import { useEffect, useRef, type RefObject } from "react";

/** Mirrored live waveform. Uses the mic analyser when present, a calm synthetic wave otherwise. */
export function Waveform({
  analyserRef,
  active = true,
  bars = 34,
  height = 96,
  className = "",
}: {
  analyserRef?: RefObject<AnalyserNode | null>;
  active?: boolean;
  bars?: number;
  height?: number;
  className?: string;
}) {
  const refs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    let raf = 0;
    const data = new Uint8Array(64);
    const smooth = new Array(bars).fill(0.08);
    const tick = (t: number) => {
      const analyser = analyserRef?.current;
      let hasSignal = false;
      if (analyser && active) {
        analyser.getByteFrequencyData(data);
        hasSignal = true;
      }
      for (let i = 0; i < bars; i++) {
        const center = 1 - Math.abs(i - (bars - 1) / 2) / (bars / 2); // 0..1, peak in middle
        let v: number;
        if (hasSignal) {
          const bin = data[Math.min(data.length - 1, Math.floor(Math.abs(i - bars / 2) * 1.1) + 2)] / 255;
          v = Math.max(0.06, bin * (0.55 + center * 0.6));
        } else {
          const amp = active ? 0.34 : 0.14;
          v = 0.08 + amp * (0.5 + 0.5 * Math.sin(t / 380 + i * 0.55)) * (0.4 + center * 0.6);
        }
        smooth[i] += (v - smooth[i]) * 0.35;
        const el = refs.current[i];
        if (el) el.style.transform = `scaleY(${Math.min(1, smooth[i]).toFixed(3)})`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [analyserRef, active, bars]);

  return (
    <div className={`flex items-center justify-center gap-[5px] ${className}`} style={{ height }} aria-hidden>
      {Array.from({ length: bars }, (_, i) => (
        <span
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className="block w-[4px] rounded-full will-change-transform"
          style={{
            height: "100%",
            transform: "scaleY(0.08)",
            background: "linear-gradient(180deg, #62dcf5 0%, #7b86ff 50%, #a58bff 100%)",
            opacity: 0.55 + 0.45 * (1 - Math.abs(i - (bars - 1) / 2) / (bars / 2)),
          }}
        />
      ))}
    </div>
  );
}
