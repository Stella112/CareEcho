import type { Metadata } from "next";
import { Landing } from "@/components/Landing";

export const metadata: Metadata = {
  title: "CareEcho — Your health memory, in your voice.",
};

export default function Page() {
  return <Landing />;
}
