import { NextResponse } from "next/server";
import { callGroqJson, hasGroqKey } from "@/lib/ai/groq";
import { ContentInputError, rerollContent } from "@/lib/ai/game-content";
import { CharacterPoolError } from "@/lib/character-catalog";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    return NextResponse.json(await rerollContent(body, hasGroqKey() ? callGroqJson : undefined));
  } catch (error) {
    if (error instanceof CharacterPoolError) return NextResponse.json({ error: error.message, availableCount: error.availableCount }, { status: 409 });
    if (error instanceof ContentInputError || error instanceof SyntaxError) return NextResponse.json({ error: "Geçersiz zar isteği." }, { status: 400 });
    return NextResponse.json({ error: "Zar şu anda çalışmadı. Tekrar dene." }, { status: 500 });
  }
}
