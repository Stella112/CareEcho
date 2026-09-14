import { NextResponse } from "next/server";
import { transcribe, TranscriptionError } from "@/lib/assemblyai";
import { isLanguageCode } from "@/lib/languages";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_BYTES = 4 * 1024 * 1024; // stays under Vercel's request body limit

export async function POST(req: Request) {
  const friendly = "We couldn't transcribe that recording. Try again.";
  try {
    const form = await req.formData();
    const audio = form.get("audio");
    const kind = String(form.get("kind") ?? "symptom");
    const requestedLanguage = String(form.get("language") ?? "en");
    const language = isLanguageCode(requestedLanguage) ? requestedLanguage : "en";
    if (!(audio instanceof Blob) || audio.size === 0) {
      return NextResponse.json({ error: "No audio was received." }, { status: 400 });
    }
    if (audio.size > MAX_BYTES) {
      return NextResponse.json({ error: "That recording is too long for this demo. Try a shorter one." }, { status: 413 });
    }
    const isVisit = kind === "visit";
    const result = await transcribe(await audio.arrayBuffer(), {
      diarize: isVisit,
      medical: isVisit,
      language,
      timeoutMs: isVisit ? 110_000 : 60_000,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/transcribe]", err);
    const detail = err instanceof Error ? err.message : String(err);
    const noSpeech = err instanceof TranscriptionError && /no speech/i.test(detail);
    return NextResponse.json(
      { error: noSpeech ? "Ada didn't catch any words in that recording. Try again." : friendly, detail },
      { status: 502 },
    );
  }
}
