import { NextResponse } from "next/server";
import { z } from "zod";
import { answerFromEvidence } from "@/lib/ai";
import { isLanguageCode } from "@/lib/languages";
import { UtteranceSchema, VisitFactsSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  question: z.string().min(1).max(1000),
  visit: z.object({ utterances: z.array(UtteranceSchema).min(1), facts: VisitFactsSchema }),
  language: z.string().optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "A question and a saved visit are required." }, { status: 400 });
  try {
    const language = parsed.data.language && isLanguageCode(parsed.data.language) ? parsed.data.language : "en";
    return NextResponse.json(await answerFromEvidence(parsed.data.question, parsed.data.visit, language));
  } catch (err) {
    console.error("[api/ask]", err);
    return NextResponse.json({ error: "Ada couldn't answer right now. Try again." }, { status: 500 });
  }
}
