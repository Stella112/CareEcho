/**
 * AssemblyAI pre-recorded transcription (REST, server-side only).
 * Docs: https://www.assemblyai.com/docs/getting-started/transcribe-an-audio-file
 *   POST /v2/upload       → { upload_url }
 *   POST /v2/transcript   → { id }
 *   GET  /v2/transcript/:id → status: queued | processing | completed | error
 */
import type { Utterance } from "./schemas";

const BASE = "https://api.assemblyai.com";
// AssemblyAI's current pre-recorded API model IDs. Keep Universal-2 as a
// fallback so a short-lived model/config issue does not block the demo.
const SPEECH_MODELS = ["universal-3-pro", "universal-2"];

export type TranscriptResult = {
  id: string;
  text: string;
  utterances: Utterance[];
  diarized: boolean;
  medicalMode: boolean;
  audioDurationSec: number | null;
};

export class TranscriptionError extends Error {}

type AaiTranscript = {
  id: string;
  status: "queued" | "processing" | "completed" | "error";
  text: string | null;
  error?: string;
  audio_duration?: number | null;
  utterances?: { speaker: string; text: string; start: number; end: number }[] | null;
};

function apiKey(): string {
  const key = process.env.ASSEMBLYAI_API_KEY;
  if (!key) throw new TranscriptionError("ASSEMBLYAI_API_KEY is not configured on the server.");
  return key;
}

async function upload(key: string, audio: ArrayBuffer): Promise<string> {
  const res = await fetch(`${BASE}/v2/upload`, {
    method: "POST",
    headers: { authorization: key, "content-type": "application/octet-stream" },
    body: audio,
  });
  if (!res.ok) throw new TranscriptionError(`AssemblyAI upload failed (${res.status}): ${await res.text()}`);
  const data = (await res.json()) as { upload_url: string };
  return data.upload_url;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function poll(key: string, id: string, deadline: number): Promise<AaiTranscript> {
  let delay = 700;
  while (Date.now() < deadline) {
    const res = await fetch(`${BASE}/v2/transcript/${id}`, { headers: { authorization: key }, cache: "no-store" });
    if (!res.ok) throw new TranscriptionError(`AssemblyAI polling failed (${res.status})`);
    const t = (await res.json()) as AaiTranscript;
    if (t.status === "completed" || t.status === "error") return t;
    await sleep(delay);
    delay = Math.min(delay * 1.3, 2500);
  }
  throw new TranscriptionError("Transcription timed out.");
}

export async function transcribe(
  audio: ArrayBuffer,
  opts: { diarize: boolean; medical: boolean; timeoutMs?: number },
): Promise<TranscriptResult> {
  const key = apiKey();
  const deadline = Date.now() + (opts.timeoutMs ?? 100_000);
  const audioUrl = await upload(key, audio);

  const base = { audio_url: audioUrl, speech_models: SPEECH_MODELS, language_code: "en" };
  // Preferred config first; fall back so diarization / Medical Mode never block the MVP.
  const configs: Record<string, unknown>[] = [];
  if (opts.diarize && opts.medical) configs.push({ ...base, speaker_labels: true, domain: "medical-v1" });
  if (opts.diarize) configs.push({ ...base, speaker_labels: true });
  if (opts.medical && !opts.diarize) configs.push({ ...base, domain: "medical-v1" });
  configs.push(base);

  let lastError = "Unknown transcription error";
  for (const config of configs) {
    const res = await fetch(`${BASE}/v2/transcript`, {
      method: "POST",
      headers: { authorization: key, "content-type": "application/json" },
      body: JSON.stringify(config),
    });
    if (!res.ok) {
      lastError = `AssemblyAI rejected config (${res.status}): ${await res.text()}`;
      console.warn("[assemblyai]", lastError);
      if (res.status === 401 || res.status === 403) break;
      continue;
    }
    const { id } = (await res.json()) as { id: string };
    const t = await poll(key, id, deadline);
    if (t.status === "error") {
      lastError = t.error ?? "Transcription failed";
      console.warn("[assemblyai] transcript error:", lastError);
      // Audio problems won't be fixed by a simpler config.
      if (/audio|speech|duration|file/i.test(lastError)) break;
      continue;
    }
    const text = (t.text ?? "").trim();
    if (!text) throw new TranscriptionError("No speech was detected in the recording.");

    const utterances: Utterance[] =
      t.utterances && t.utterances.length > 0
        ? t.utterances.map((u) => ({ speaker: u.speaker, text: u.text, startMs: u.start, endMs: u.end }))
        : [{ speaker: null, text, startMs: null, endMs: null }];

    return {
      id: t.id,
      text,
      utterances,
      diarized: Boolean(config.speaker_labels) && Boolean(t.utterances?.length),
      medicalMode: config.domain === "medical-v1",
      audioDurationSec: t.audio_duration ?? null,
    };
  }
  throw new TranscriptionError(lastError);
}

export function assemblyConfigured(): boolean {
  return Boolean(process.env.ASSEMBLYAI_API_KEY);
}
