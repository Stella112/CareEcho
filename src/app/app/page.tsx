import type { Metadata } from "next";
import { AppShell } from "@/components/shell/AppShell";

export const metadata: Metadata = { title: "CareEcho — Talk to Ada" };

export default function AppPage() {
  return <AppShell />;
}
