import { NextResponse } from "next/server";
import { z } from "zod";
import { isLanguageCode } from "@/lib/languages";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const Body = z.object({
  firstName: z.string().trim().min(1).max(80),
  assistantName: z.string().trim().min(1).max(40),
  preferredLanguage: z.string(),
  readAloud: z.boolean(),
  largeText: z.boolean(),
  highContrast: z.boolean(),
  voiceFirst: z.boolean(),
  onboardingComplete: z.boolean(),
});

async function currentUser() {
  const supabase = await createClient();
  if (!supabase) return { error: NextResponse.json({ error: "Cloud accounts are not configured." }, { status: 503 }) };
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { error: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  return { supabase, user: data.user };
}

export async function GET() {
  const auth = await currentUser();
  if ("error" in auth) return auth.error;
  const { data, error } = await auth.supabase.from("profiles").select("first_name,assistant_name,preferred_language,onboarding_complete").eq("user_id", auth.user.id).maybeSingle();
  if (error) return NextResponse.json({ error: "Profile storage is not ready. Apply the Supabase migration first." }, { status: 503 });
  if (!data) return NextResponse.json({ profile: null });
  const { data: preferences } = await auth.supabase.from("user_preferences").select("read_aloud,large_text,high_contrast,voice_first").eq("user_id", auth.user.id).maybeSingle();
  return NextResponse.json({ profile: { firstName: data.first_name, assistantName: data.assistant_name, preferredLanguage: data.preferred_language, onboardingComplete: data.onboarding_complete, readAloud: preferences?.read_aloud ?? false, largeText: preferences?.large_text ?? false, highContrast: preferences?.high_contrast ?? false, voiceFirst: preferences?.voice_first ?? true } });
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isLanguageCode(parsed.data.preferredLanguage)) return NextResponse.json({ error: "Please complete the setup fields." }, { status: 400 });
  const auth = await currentUser();
  if ("error" in auth) return auth.error;
  const { data: profile, error: profileError } = await auth.supabase.from("profiles").upsert({ user_id: auth.user.id, first_name: parsed.data.firstName, assistant_name: parsed.data.assistantName, preferred_language: parsed.data.preferredLanguage, onboarding_complete: parsed.data.onboardingComplete }, { onConflict: "user_id" }).select().single();
  if (profileError) return NextResponse.json({ error: "Profile storage is not ready. Apply the Supabase migration first." }, { status: 503 });
  const { error: preferencesError } = await auth.supabase.from("user_preferences").upsert({ user_id: auth.user.id, read_aloud: parsed.data.readAloud, large_text: parsed.data.largeText, high_contrast: parsed.data.highContrast, voice_first: parsed.data.voiceFirst }, { onConflict: "user_id" });
  if (preferencesError) return NextResponse.json({ error: "Could not save accessibility preferences." }, { status: 503 });
  return NextResponse.json({ profile: { firstName: profile.first_name, assistantName: profile.assistant_name, preferredLanguage: profile.preferred_language, onboardingComplete: profile.onboarding_complete, readAloud: parsed.data.readAloud, largeText: parsed.data.largeText, highContrast: parsed.data.highContrast, voiceFirst: parsed.data.voiceFirst } });
}
