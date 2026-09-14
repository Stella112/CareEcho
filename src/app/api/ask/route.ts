import { NextResponse } from "next/server";
import { z } from "zod";
import { answerFromEvidence } from "@/lib/ai";
import { UtteranceSchema, VisitFactsSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  question: z.string().min(1).max(1000),
  visit: z.object({ utterances: z.array(UtteranceSchema).min(1), facts: VisitFactsSchema }),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "A question and a saved visit are required." }, { status: 400 });
  try {
    return NextResponse.json(await answerFromEvidence(parsed.data.question, parsed.data.visit));
  } catch (err) {
    console.error("[api/ask]", err);
    return NextResponse.json({ error: "Ada couldn't answer right now. Try again." }, { status: 500 });
  }
}
