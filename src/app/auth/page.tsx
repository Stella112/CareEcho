import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { AuthScreen } from "@/components/auth/AuthScreen";

export const metadata: Metadata = { title: "Sign in · CareEcho" };

export default function AuthPage() {
  return <AuthProvider><AuthScreen /></AuthProvider>;
}
