import { NextResponse } from "next/server";
import { z } from "zod";
import { extractVisitInstructions } from "@/lib/ai";
import { isLanguageCode } from "@/lib/languages";
import { UtteranceSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({ utterances: z.array(UtteranceSchema).min(1).max(2000), language: z.string().optional() });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "A visit transcript is required." }, { status: 400 });
  try {
    const language = parsed.data.language && isLanguageCode(parsed.data.language) ? parsed.data.language : "en";
    return NextResponse.json(await extractVisitInstructions(parsed.data.utterances, language));
  } catch (err) {
    console.error("[api/visit]", err);
    return NextResponse.json({ error: "Ada couldn't read the care plan from this visit. Try again." }, { status: 500 });
  }
}
