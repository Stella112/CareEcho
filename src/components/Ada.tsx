"use client";

import { motion } from "framer-motion";
import { useId } from "react";

export type AdaState = "idle" | "listening" | "processing" | "success";

const bodyMotion = {
  idle: { y: [0, -9, 0], scale: 1, transition: { duration: 6, repeat: Infinity, ease: "easeInOut" as const } },
  listening: { y: 0, scale: [1, 1.045, 1], transition: { duration: 1.6, repeat: Infinity, ease: "easeInOut" as const } },
  processing: { y: [0, -4, 0], scale: 1, transition: { duration: 2.2, repeat: Infinity, ease: "easeInOut" as const } },
  success: { y: 0, scale: [1, 1.1, 1], transition: { duration: 0.7, ease: "easeOut" as const } },
};

const SMILE = "M109 113 Q120 122 131 113";
const SMILE_BIG = "M106 111 Q120 127 134 111";

const auraColor: Record<AdaState, string> = {
  idle: "rgba(146,152,255,0.45)",
  listening: "rgba(120,140,255,0.6)",
  processing: "rgba(140,120,255,0.62)",
  success: "rgba(98,220,245,0.6)",
};

/** Ada — CareEcho's glass companion. Static SVG, animated with Framer Motion. */
export function Ada({ size = 200, state = "idle", className = "" }: { size?: number; state?: AdaState; className?: string }) {
  const uid = useId().replace(/:/g, "");
  const id = (n: string) => `ada-${n}-${uid}`;
  const eyesOpen = state === "listening";

  return (
    <div className={`relative select-none ${className}`} style={{ width: size, height: size * 1.08 }} aria-label={`Ada, ${state}`} role="img">
      {/* aura */}
      <motion.div
        className="absolute inset-[-8%] rounded-full blur-2xl"
        style={{ background: `radial-gradient(circle at 50% 45%, ${auraColor[state]}, transparent 62%)` }}
        animate={
          state === "idle"
            ? { opacity: [0.7, 0.95, 0.7], scale: [1, 1.05, 1] }
            : state === "listening"
              ? { opacity: [0.75, 1, 0.75], scale: [1, 1.14, 1] }
              : state === "processing"
                ? { opacity: [0.6, 1, 0.6], scale: [0.98, 1.1, 0.98] }
                : { opacity: [0.6, 1, 0.8], scale: [1, 1.25, 1.05] }
        }
        transition={{ duration: state === "listening" ? 1.6 : state === "success" ? 0.9 : 3.2, repeat: state === "success" ? 0 : Infinity, ease: "easeInOut" }}
      />

      {/* processing ring */}
      {state === "processing" && (
        <motion.div
          className="absolute left-1/2 top-[40%] aspect-square w-[92%] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: "conic-gradient(from 0deg, transparent 0deg, rgba(98,220,245,0.9) 70deg, rgba(123,110,255,0.9) 140deg, transparent 220deg)",
            WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))",
          }}
          initial={{ rotate: 0, opacity: 0 }}
          animate={{ rotate: 360, opacity: 1 }}
          transition={{ rotate: { duration: 2.2, repeat: Infinity, ease: "linear" }, opacity: { duration: 0.4 } }}
        />
      )}

      <motion.svg
        viewBox="0 0 240 260"
        className="relative h-full w-full drop-shadow-[0_18px_28px_rgba(80,86,210,0.28)]"
        animate={bodyMotion[state]}
      >
        <defs>
          <radialGradient id={id("head")} cx="34%" cy="24%" r="85%">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.38" stopColor="#f1f2ff" />
            <stop offset="0.72" stopColor="#c9cdff" />
            <stop offset="1" stopColor="#9da4f6" />
          </radialGradient>
          <radialGradient id={id("body")} cx="38%" cy="20%" r="90%">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.5" stopColor="#dfe2ff" />
            <stop offset="1" stopColor="#a3a9f7" />
          </radialGradient>
          <linearGradient id={id("ear")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#eef0ff" />
            <stop offset="1" stopColor="#8f96f3" />
          </linearGradient>
          <linearGradient id={id("inf")} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#62dcf5" />
            <stop offset="0.5" stopColor="#8aa2ff" />
            <stop offset="1" stopColor="#62dcf5" />
          </linearGradient>
          <radialGradient id={id("face")} cx="50%" cy="40%" r="70%">
            <stop offset="0" stopColor="rgba(255,255,255,0.65)" />
            <stop offset="1" stopColor="rgba(220,224,255,0.15)" />
          </radialGradient>
          <filter id={id("soft")} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.4" />
          </filter>
          <filter id={id("glow")} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ground shadow */}
        <ellipse cx="120" cy="251" rx="46" ry="6" fill="rgba(80,88,200,0.16)" />

        {/* arms */}
        <ellipse cx="74" cy="192" rx="10" ry="21" fill={`url(#${id("body")})`} transform="rotate(28 74 192)" stroke="rgba(255,255,255,0.8)" />
        <motion.g
          style={{ transformBox: "fill-box", originX: 0.2, originY: 0.9 }}
          animate={state === "success" ? { rotate: [0, -18, 6, -12, 0] } : { rotate: 0 }}
          transition={{ duration: 1.1 }}
        >
          <ellipse cx="168" cy="184" rx="10" ry="21" fill={`url(#${id("body")})`} transform="rotate(-38 168 184)" stroke="rgba(255,255,255,0.8)" />
        </motion.g>

        {/* body */}
        <path
          d="M80 172 Q80 150 120 150 Q160 150 160 172 L165 214 Q167 240 120 240 Q73 240 75 214 Z"
          fill={`url(#${id("body")})`}
          stroke="rgba(255,255,255,0.9)"
          strokeWidth="1.5"
        />
        <ellipse cx="102" cy="168" rx="14" ry="6" fill="white" opacity="0.7" filter={`url(#${id("soft")})`} />
        <motion.path
          d="M120 201 C112 190 99 190 99 201 C99 212 112 212 120 201 C128 190 141 190 141 201 C141 212 128 212 120 201 Z"
          fill="none"
          stroke={`url(#${id("inf")})`}
          strokeWidth="3.6"
          strokeLinecap="round"
          filter={`url(#${id("glow")})`}
          animate={{ opacity: state === "processing" ? [0.5, 1, 0.5] : [0.85, 1, 0.85] }}
          transition={{ duration: state === "processing" ? 1.1 : 3, repeat: Infinity }}
        />

        {/* headphones band */}
        <path d="M46 82 Q120 -4 194 82" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="7" strokeLinecap="round" />
        <path d="M46 82 Q120 -4 194 82" fill="none" stroke="rgba(160,168,250,0.45)" strokeWidth="2" strokeLinecap="round" />

        {/* head */}
        <rect x="40" y="30" width="160" height="128" rx="62" fill={`url(#${id("head")})`} stroke="rgba(255,255,255,0.95)" strokeWidth="1.5" />
        <rect x="58" y="52" width="124" height="88" rx="42" fill={`url(#${id("face")})`} />

        {/* ear cups */}
        <ellipse cx="40" cy="96" rx="14" ry="25" fill={`url(#${id("ear")})`} stroke="rgba(255,255,255,0.9)" />
        <ellipse cx="200" cy="96" rx="14" ry="25" fill={`url(#${id("ear")})`} stroke="rgba(255,255,255,0.9)" />
        <ellipse cx="36" cy="86" rx="4" ry="8" fill="white" opacity="0.7" />
        <ellipse cx="196" cy="86" rx="4" ry="8" fill="white" opacity="0.7" />

        {/* eyes */}
        <motion.g
          style={{ transformBox: "fill-box", originY: 0.5 }}
          animate={state === "idle" ? { scaleY: [1, 1, 0.15, 1] } : { scaleY: 1 }}
          transition={state === "idle" ? { duration: 5.5, repeat: Infinity, times: [0, 0.93, 0.965, 1] } : { duration: 0.2 }}
        >
          {eyesOpen ? (
            <>
              <ellipse cx="96" cy="94" rx="7" ry="9" fill="#262b69" />
              <ellipse cx="144" cy="94" rx="7" ry="9" fill="#262b69" />
              <circle cx="98.5" cy="90" r="2.4" fill="white" />
              <circle cx="146.5" cy="90" r="2.4" fill="#fff" />
            </>
          ) : (
            <>
              <path d="M85 97 Q96 83 107 97" fill="none" stroke="#262b69" strokeWidth="6" strokeLinecap="round" />
              <path d="M133 97 Q144 83 155 97" fill="none" stroke="#262b69" strokeWidth="6" strokeLinecap="round" />
            </>
          )}
        </motion.g>

        {/* smile */}
        <motion.path
          fill="none"
          stroke="#262b69"
          strokeWidth="4.6"
          strokeLinecap="round"
          d={state === "success" ? SMILE_BIG : SMILE}
          initial={false}
          animate={{ d: state === "success" ? SMILE_BIG : SMILE }}
          transition={{ duration: 0.4 }}
        />

        {/* cheeks */}
        <ellipse cx="79" cy="112" rx="10" ry="6" fill="#ffadd0" opacity="0.6" filter={`url(#${id("soft")})`} />
        <ellipse cx="161" cy="112" rx="10" ry="6" fill="#ffadd0" opacity="0.6" filter={`url(#${id("soft")})`} />

        {/* specular highlights */}
        <ellipse cx="86" cy="52" rx="30" ry="11" fill="white" opacity="0.9" transform="rotate(-18 86 52)" filter={`url(#${id("soft")})`} />
        <circle cx="170" cy="58" r="5" fill="white" opacity="0.7" />
        <path d="M186 110 Q192 128 178 146" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="3" strokeLinecap="round" />
      </motion.svg>
    </div>
  );
}
