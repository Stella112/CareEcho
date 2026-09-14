import { NextResponse } from "next/server";
import { assemblyConfigured } from "@/lib/assemblyai";
import { llmConfigured } from "@/lib/ai";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ assemblyai: assemblyConfigured(), llm: llmConfigured() });
}
