interface Devotional {
  verse: string
  reference: string
  translation: string
  reflection: string
  question: string
  prayer: string
}

const SYSTEM_PROMPT = "You are a devotional writer for a Christian faith app called Sanctum. Write warm, accessible, non-denominational devotionals. Answer directly with final JSON only. Do not include hidden reasoning, chain-of-thought, or <think> tags."

const USER_PROMPT = `Generate a daily devotional for today. Return ONLY valid JSON with exactly these fields:
{
  "verse": "string, the full Bible verse text",
  "reference": "string, e.g. Psalm 46:10",
  "translation": "string, e.g. NIV",
  "reflection": "string, 3-4 sentences of reflection, 60-80 words",
  "question": "string, one personal application question ending in ?",
  "prayer": "string, a 2-sentence closing prayer starting with Lord"
}
No markdown, no code fences, no reasoning, just raw JSON. /no_think`

const DEFAULT_LOCAL_AI_BASE_URL = "http://127.0.0.1:11434"
const DEFAULT_LOCAL_AI_MODEL = "qwen3:8b"
const DEFAULT_LOCAL_AI_TIMEOUT_MS = 18000

let cachedDate: string | null = null
let cachedDevotional: Devotional | null = null

export const runtime = "nodejs"

function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}

function getLocalAiTimeout() {
  const value = Number(process.env.LOCAL_AI_TIMEOUT_MS)
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_LOCAL_AI_TIMEOUT_MS
}

function isDevotional(value: unknown): value is Devotional {
  if (!value || typeof value !== "object") return false
  const item = value as Partial<Devotional>
  return (
    typeof item.verse === "string" &&
    typeof item.reference === "string" &&
    typeof item.translation === "string" &&
    typeof item.reflection === "string" &&
    typeof item.question === "string" &&
    typeof item.prayer === "string"
  )
}

function extractJson(content: string) {
  const cleaned = content
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim()

  const start = cleaned.indexOf("{")
  const end = cleaned.lastIndexOf("}")
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model did not return JSON.")
  }

  const parsed: unknown = JSON.parse(cleaned.slice(start, end + 1))
  if (!isDevotional(parsed)) {
    throw new Error("Model returned an invalid devotional shape.")
  }

  return parsed
}

export async function GET() {
  const today = getTodayKey()

  if (cachedDate === today && cachedDevotional) {
    return Response.json(cachedDevotional, {
      headers: {
        "Cache-Control": "s-maxage=86400, stale-while-revalidate=3600",
      },
    })
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
          { role: "user", content: USER_PROMPT },
        ],
        options: {
          num_predict: 360,
          temperature: 0.45,
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
    const devotional = extractJson(content)

    cachedDate = today
    cachedDevotional = devotional

    return Response.json(devotional, {
      headers: {
        "Cache-Control": "s-maxage=86400, stale-while-revalidate=3600",
      },
    })
  } catch {
    return Response.json(
      { error: "The local AI model did not return a valid devotional." },
      { status: 502 },
    )
  }
}
