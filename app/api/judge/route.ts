import { NextResponse } from "next/server";
import { callGroqJson, hasGroqKey } from "@/lib/ai/groq";
import { judgeContent, JudgeInputError } from "@/lib/ai/judge-content";

export const runtime = "nodejs";
export const maxDuration = 45;
export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > 40_000) return NextResponse.json({error:"Jüri isteği çok büyük."},{status:413});
  let body: unknown;
  try { body=JSON.parse(raw); } catch {return NextResponse.json({error:"Geçersiz JSON."},{status:400});}
  if(!hasGroqKey()) return NextResponse.json({error:"Groq anahtarı tanımlı değil. Bu tur puanlanmadı; anahtarı sunucuda tanımlayıp tekrar dene."},{status:503});
  try {
    const judge = await judgeContent(body, input => callGroqJson(input));
    return NextResponse.json(judge,{headers:{"Cache-Control":"no-store"}});
  } catch(error) {
    if(error instanceof JudgeInputError)return NextResponse.json({error:error.message},{status:400});
    // Never pass provider response bodies or keys to the browser, and never fabricate AI scores.
    console.warn("KADRO jury failed", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({error:"AI jüri geçerli bir sonuç veremedi. Puan ve turnuva tablosu değişmedi; biraz sonra tekrar dene."},{status:502});
  }
}
