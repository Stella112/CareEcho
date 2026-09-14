import type { TranscriptResult } from "./assemblyai";
import type { LanguageCode } from "./languages";

export class ApiError extends Error {
  constructor(
    message: string,
    public detail?: string,
  ) {
    super(message);
  }
}

export async function transcribeBlob(blob: Blob, kind: "symptom" | "visit" | "question", language: LanguageCode = "en"): Promise<TranscriptResult> {
  const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
  const form = new FormData();
  form.append("audio", blob, `recording.${ext}`);
  form.append("kind", kind);
  form.append("language", language);
  let res: Response;
  try {
    res = await fetch("/api/transcribe", { method: "POST", body: form });
  } catch {
    throw new ApiError("We couldn't transcribe that recording. Try again.", "Network error");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (data.detail) console.warn("[transcribe]", data.detail);
    throw new ApiError(data.error ?? "We couldn't transcribe that recording. Try again.", data.detail);
  }
  return data as TranscriptResult;
}

export async function postJSON<T>(url: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new ApiError("Couldn't reach CareEcho. Check your connection and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? "Something went wrong. Try again.");
  return data as T;
}
