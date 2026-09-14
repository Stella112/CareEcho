"use client";

import { motion } from "framer-motion";

/** The supplied 3D Ada artwork, presented as a focused product avatar. */
export function AdaModel({ className = "" }: { className?: string }) {
  return (
    <motion.div
      className={`relative flex items-center justify-center ${className}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <img src="/ada-character.png" alt="Ada, your CareEcho health companion" className="h-full w-full object-contain drop-shadow-[0_18px_28px_rgba(86,94,205,0.28)]" />
    </motion.div>
  );
}
