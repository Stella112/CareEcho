import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const Entry = z.object({ id: z.string().min(1).max(120), timestamp: z.string(), rawTranscript: z.string().max(20_000), structuredData: z.unknown(), sourceType: z.string(), engine: z.string().optional(), edited: z.boolean().optional(), isDemo: z.boolean().optional(), language: z.string().optional() });
const Visit = z.object({ id: z.string().min(1).max(120), timestamp: z.string(), transcript: z.string().max(100_000), utterances: z.array(z.unknown()), facts: z.unknown(), diarized: z.boolean(), medicalMode: z.boolean(), isSample: z.boolean(), engine: z.string(), qa: z.array(z.unknown()), language: z.string().optional() });
const Body = z.object({ entries: z.array(Entry).max(500), visits: z.array(Visit).max(100) });

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
  const [entries, visits] = await Promise.all([
    auth.supabase.from("health_entries").select("id,recorded_at,raw_transcript,structured_data,source_type,engine,edited,is_demo,language").eq("user_id", auth.user.id).order("recorded_at", { ascending: false }),
    auth.supabase.from("visits").select("id,created_at,snapshot,language").eq("user_id", auth.user.id).order("created_at", { ascending: false }),
  ]);
  if (entries.error || visits.error) return NextResponse.json({ error: "Memory storage is not ready. Apply the Supabase migration first." }, { status: 503 });
  return NextResponse.json({
    entries: (entries.data ?? []).map((row) => ({ id: row.id, timestamp: row.recorded_at, rawTranscript: row.raw_transcript, structuredData: row.structured_data, sourceType: row.source_type, engine: row.engine ?? undefined, edited: row.edited ?? undefined, isDemo: row.is_demo ?? undefined, language: row.language })),
    visits: (visits.data ?? []).map((row) => ({ ...(row.snapshot as Record<string, unknown>), id: row.id, timestamp: (row.snapshot as Record<string, unknown>).timestamp ?? row.created_at, language: row.language })),
  });
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid memory payload." }, { status: 400 });
  const auth = await currentUser();
  if ("error" in auth) return auth.error;
  const entries = parsed.data.entries.map((entry) => ({ id: entry.id, user_id: auth.user.id, recorded_at: entry.timestamp, raw_transcript: entry.rawTranscript, summary: typeof entry.structuredData === "object" && entry.structuredData && "summary" in entry.structuredData ? String((entry.structuredData as { summary?: unknown }).summary ?? "") : "", language: entry.language ?? "en", source_type: entry.sourceType, structured_data: entry.structuredData, engine: entry.engine ?? null, edited: entry.edited ?? false, is_demo: entry.isDemo ?? false }));
  const visits = parsed.data.visits.map((visit) => ({ id: visit.id, user_id: auth.user.id, created_at: visit.timestamp, raw_transcript: visit.transcript, language: visit.language ?? "en", status: "completed", snapshot: visit }));
  const entryResult = entries.length ? await auth.supabase.from("health_entries").upsert(entries, { onConflict: "user_id,id" }) : { error: null };
  const visitResult = visits.length ? await auth.supabase.from("visits").upsert(visits, { onConflict: "user_id,id" }) : { error: null };
  if (entryResult.error || visitResult.error) return NextResponse.json({ error: "Could not save your private health memory." }, { status: 503 });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const auth = await currentUser();
  if ("error" in auth) return auth.error;
  const [entries, visits] = await Promise.all([auth.supabase.from("health_entries").delete().eq("user_id", auth.user.id), auth.supabase.from("visits").delete().eq("user_id", auth.user.id)]);
  if (entries.error || visits.error) return NextResponse.json({ error: "Could not clear your health memory." }, { status: 503 });
  return NextResponse.json({ ok: true });
}
