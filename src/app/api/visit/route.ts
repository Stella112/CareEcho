import { NextResponse } from "next/server";
import { z } from "zod";
import { extractVisitInstructions } from "@/lib/ai";
import { UtteranceSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({ utterances: z.array(UtteranceSchema).min(1).max(2000) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "A visit transcript is required." }, { status: 400 });
  try {
    return NextResponse.json(await extractVisitInstructions(parsed.data.utterances));
  } catch (err) {
    console.error("[api/visit]", err);
    return NextResponse.json({ error: "Ada couldn't read the care plan from this visit. Try again." }, { status: 500 });
  }
}
