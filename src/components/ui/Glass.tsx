import type { HTMLAttributes } from "react";

export function GlassPanel({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`glass rounded-[26px] ${className}`} {...props} />;
}

export function PrismCard({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`prism rounded-[28px] ${className}`} {...props} />;
}
