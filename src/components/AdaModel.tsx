"use client";

import { motion } from "framer-motion";

/** The supplied 3D Ada artwork, presented as a focused product avatar. */
export function AdaModel({ className = "" }: { className?: string }) {
  return (
    <motion.div
      className={`relative isolate overflow-hidden rounded-[26px] bg-[#1d293e] shadow-[0_20px_44px_-22px_rgba(23,33,61,0.7)] ${className}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <img src="/ada-model.png" alt="Ada, your CareEcho health companion" className="h-full w-full object-cover object-center" />
      <div className="absolute inset-x-4 top-4 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.14em] text-white/75">
        <span>CareEcho / Ada</span>
        <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-[#72ddc0]" /> Ready
        </span>
      </div>
    </motion.div>
  );
}
