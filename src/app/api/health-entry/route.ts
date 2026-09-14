import { NextResponse } from "next/server";
import { z } from "zod";
import { extractHealthEntry } from "@/lib/ai";
import { isLanguageCode } from "@/lib/languages";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({ transcript: z.string().min(1).max(10_000), language: z.string().optional() });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "A transcript is required." }, { status: 400 });
  try {
    const language = parsed.data.language && isLanguageCode(parsed.data.language) ? parsed.data.language : "en";
    return NextResponse.json(await extractHealthEntry(parsed.data.transcript, language));
  } catch (err) {
    console.error("[api/health-entry]", err);
    return NextResponse.json({ error: "Ada couldn't organize that note. Try again." }, { status: 500 });
  }
}
