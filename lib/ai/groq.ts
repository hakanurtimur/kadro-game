export class GroqUnavailableError extends Error {
  constructor(message = "Groq kullanılamıyor.") {
    super(message);
    this.name = "GroqUnavailableError";
  }
}

export function hasGroqKey() {
  return Boolean(process.env.GROQ_API_KEY);
}

export async function callGroqJson<T>(input: {
  system: string;
  prompt: string;
  temperature?: number;
}): Promise<T> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new GroqUnavailableError("GROQ_API_KEY tanımlı değil.");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
      temperature: input.temperature ?? 0.9,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.prompt },
      ],
    }),
  });

  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    throw new GroqUnavailableError(`Groq ${response.status}: ${detail}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new GroqUnavailableError("Groq boş yanıt döndürdü.");

  try {
    return JSON.parse(content) as T;
  } catch {
    throw new GroqUnavailableError("Groq geçersiz JSON döndürdü.");
  }
}
