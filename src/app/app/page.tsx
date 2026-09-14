import type { Metadata } from "next";
import { AppGate } from "@/components/auth/AppGate";

export const metadata: Metadata = { title: "CareEcho — Talk to Ada" };

export default function AppPage() {
  return <AppGate />;
}
