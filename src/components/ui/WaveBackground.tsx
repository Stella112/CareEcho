const WAVE =
  "M0 100 C240 30 480 170 720 100 S1200 170 1440 100 S1920 170 2160 100 S2640 170 2880 100 V320 H0 Z";

function WaveLayer({ className, fill, opacity, bottom, height }: { className: string; fill: string; opacity: number; bottom: string; height: string }) {
  return (
    <div className="absolute left-0 w-[200%] overflow-hidden" style={{ bottom, height }}>
      <svg className={`h-full w-full ${className}`} viewBox="0 0 2880 320" preserveAspectRatio="none" aria-hidden>
        <path d={WAVE} fill={fill} opacity={opacity} />
      </svg>
    </div>
  );
}

/** Layered, very slow ambient waves with prism light. Decorative only. */
export function WaveBackground({ contained = false }: { contained?: boolean }) {
  return (
    <div
      aria-hidden
      className={`${contained ? "absolute" : "fixed"} inset-0 -z-10 overflow-hidden pointer-events-none`}
      style={{ background: "linear-gradient(165deg, #f5f6ff 0%, #e8ecff 38%, #efe9ff 68%, #e4eeff 100%)" }}
    >
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="wave-a" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.5" stopColor="#d9dcff" />
            <stop offset="1" stopColor="#c4d8ff" />
          </linearGradient>
          <linearGradient id="wave-b" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#e3dcff" />
            <stop offset="0.5" stopColor="#ffffff" />
            <stop offset="1" stopColor="#cfe6ff" />
          </linearGradient>
          <linearGradient id="wave-c" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#bfc4ff" />
            <stop offset="1" stopColor="#eef0ff" />
          </linearGradient>
        </defs>
      </svg>

      {/* colour fields */}
      <div className="animate-blob absolute -left-[15%] -top-[10%] h-[55%] w-[60%] rounded-full bg-[radial-gradient(circle,rgba(150,160,255,0.45),transparent_65%)] blur-2xl" />
      <div
        className="animate-blob absolute -right-[10%] top-[5%] h-[50%] w-[55%] rounded-full bg-[radial-gradient(circle,rgba(120,210,255,0.35),transparent_65%)] blur-2xl"
        style={{ animationDelay: "-9s" }}
      />
      <div
        className="animate-blob absolute bottom-[10%] left-[20%] h-[45%] w-[60%] rounded-full bg-[radial-gradient(circle,rgba(200,170,255,0.35),transparent_65%)] blur-2xl"
        style={{ animationDelay: "-17s" }}
      />

      {/* prism beams */}
      <div className="animate-beam absolute -top-[20%] left-[30%] h-[140%] w-[18%] rotate-[24deg] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.55),rgba(190,225,255,0.3),rgba(225,200,255,0.25),transparent)] blur-md" />
      <div
        className="animate-beam absolute -top-[20%] right-[18%] h-[140%] w-[9%] rotate-[24deg] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.5),rgba(200,190,255,0.3),transparent)] blur-md"
        style={{ animationDelay: "-6s" }}
      />

      {/* waves */}
      <WaveLayer className="animate-wave-slowest" fill="url(#wave-c)" opacity={0.35} bottom="18%" height="34%" />
      <WaveLayer className="animate-wave-slower" fill="url(#wave-b)" opacity={0.55} bottom="4%" height="30%" />
      <WaveLayer className="animate-wave-slow" fill="url(#wave-a)" opacity={0.7} bottom="-6%" height="28%" />
    </div>
  );
}
