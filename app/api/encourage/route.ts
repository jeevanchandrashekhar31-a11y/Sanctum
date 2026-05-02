const SYSTEM_PROMPT = "You are a warm, caring member of a Christian prayer community called Sanctum."

const DEFAULT_LOCAL_AI_BASE_URL = "http://127.0.0.1:11434"
const DEFAULT_LOCAL_AI_MODEL = "qwen3:8b"
const DEFAULT_LOCAL_AI_TIMEOUT_MS = 15000

export const runtime = "nodejs"

function buildUserPrompt(prayerText: string) {
  return `A community member posted this prayer request: "${prayerText}"
Write a short encouragement response (2-3 sentences) that:
- Acknowledges their need with genuine empathy
- References one relevant Bible verse (include the reference)
- Closes with hope and faith
Be human and natural, not preachy. Max 60 words total.
Return only the encouragement text. Do not include reasoning, markdown, labels, or <think> tags.`
}

function getLocalAiTimeout() {
  const value = Number(process.env.LOCAL_AI_TIMEOUT_MS)
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_LOCAL_AI_TIMEOUT_MS
}

function cleanEncouragement(content: string) {
  return content
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^```(?:text|markdown)?\s*/i, "")
    .replace(/```$/i, "")
    .replace(/^["']|["']$/g, "")
    .trim()
}

export async function POST(request: Request) {
  let prayerText = ""

  try {
    const body = await request.json() as { prayerText?: unknown }
    prayerText = typeof body.prayerText === "string" ? body.prayerText.trim() : ""
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  if (!prayerText) {
    return Response.json({ error: "Prayer text is required." }, { status: 400 })
  }

  const baseUrl = (process.env.LOCAL_AI_BASE_URL || DEFAULT_LOCAL_AI_BASE_URL).replace(/\/$/, "")
  const model = process.env.LOCAL_AI_MODEL || DEFAULT_LOCAL_AI_MODEL
  const abortController = new AbortController()
  const timeout = setTimeout(() => abortController.abort(), getLocalAiTimeout())

  let upstream: Response

  try {
    upstream = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `${buildUserPrompt(prayerText.slice(0, 1200))}\n\n/no_think` },
        ],
        options: {
          num_predict: 140,
          temperature: 0.55,
        },
      }),
      signal: abortController.signal,
    })
  } catch {
    return Response.json(
      { error: `Could not connect to the local AI model at ${baseUrl}. Start Ollama and make sure ${model} is available.` },
      { status: 503 },
    )
  } finally {
    clearTimeout(timeout)
  }

  if (!upstream.ok) {
    const details = await upstream.text().catch(() => "")
    return Response.json(
      { error: details || `Local AI model returned ${upstream.status}.` },
      { status: upstream.status || 502 },
    )
  }

  try {
    const result = await upstream.json() as { message?: { content?: string }; response?: string }
    const content = result.message?.content ?? result.response ?? ""
    const encouragement = cleanEncouragement(content)

    if (!encouragement) {
      throw new Error("Empty encouragement.")
    }

    return Response.json({ encouragement })
  } catch {
    return Response.json(
      { error: "The local AI model did not return a valid encouragement." },
      { status: 502 },
    )
  }
}
