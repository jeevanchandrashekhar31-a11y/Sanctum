const SYSTEM_PROMPT = "You are a gentle prayer guide for a Christian devotional app."

const DEFAULT_LOCAL_AI_BASE_URL = "http://127.0.0.1:11434"
const DEFAULT_LOCAL_AI_MODEL = "qwen3:8b"
const DEFAULT_LOCAL_AI_TIMEOUT_MS = 15000

export const runtime = "nodejs"

function buildUserPrompt(topic: string) {
  return `The user wants to pray about: ${topic}
Generate 3 short prayer starter sentences (1 sentence each, max 20 words each)
to help them begin writing their prayer. Make them heartfelt, personal,
and scripture-inspired. Return ONLY a JSON array of 3 strings. No markdown. /no_think`
}

function getLocalAiTimeout() {
  const value = Number(process.env.LOCAL_AI_TIMEOUT_MS)
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_LOCAL_AI_TIMEOUT_MS
}

function extractStarters(content: string) {
  const cleaned = content
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim()

  const start = cleaned.indexOf("[")
  const end = cleaned.lastIndexOf("]")
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model did not return a JSON array.")
  }

  const parsed: unknown = JSON.parse(cleaned.slice(start, end + 1))
  if (!Array.isArray(parsed) || parsed.length < 1 || !parsed.every((item) => typeof item === "string")) {
    throw new Error("Model returned an invalid starter list.")
  }

  return parsed.slice(0, 3).map((starter) => starter.trim()).filter(Boolean)
}

export async function POST(request: Request) {
  let topic = ""

  try {
    const body = await request.json() as { topic?: unknown }
    topic = typeof body.topic === "string" ? body.topic.trim() : ""
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  if (!topic) {
    return Response.json({ error: "Topic is required." }, { status: 400 })
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
          { role: "user", content: buildUserPrompt(topic) },
        ],
        options: {
          num_predict: 220,
          temperature: 0.6,
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
    const starters = extractStarters(content)

    return Response.json(starters)
  } catch {
    return Response.json(
      { error: "The local AI model did not return valid prayer starters." },
      { status: 502 },
    )
  }
}
