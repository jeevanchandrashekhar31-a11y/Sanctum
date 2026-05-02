type ChatRole = "user" | "assistant" | "system"

interface ChatMessage {
  role: ChatRole
  content: string
}

const SYSTEM_PROMPT = `You are a compassionate, knowledgeable Bible study companion named Sanctum.
Help users understand scripture, explore theological questions, and apply biblical wisdom to daily life.
When citing scripture, always include the book, chapter, and verse reference.
Format scripture references in bold.
Be warm, non-denominational, and respectful of all Christian traditions.
Keep responses concise: 3 to 5 sentences for simple questions, up to 10 sentences for complex theological topics.
Never be preachy.
Answer directly. Do not include hidden reasoning, chain-of-thought, or <think> tags.`

const DEFAULT_LOCAL_AI_BASE_URL = "http://127.0.0.1:11434"
const DEFAULT_LOCAL_AI_MODEL = "qwen3:8b"
const DEFAULT_LOCAL_AI_TIMEOUT_MS = 25000

export const runtime = "nodejs"

function normalizeMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return []

  return value
    .filter((message): message is Partial<ChatMessage> => Boolean(message) && typeof message === "object")
    .map((message) => ({
      role: message.role,
      content: message.content,
    }))
    .filter(
      (message): message is ChatMessage =>
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string" &&
        message.content.trim().length > 0,
    )
    .slice(-12)
}

function createSseEvent(payload: unknown) {
  return `data: ${JSON.stringify(payload)}\n\n`
}

function createTextDelta(text: string) {
  return createSseEvent({
    type: "content_block_delta",
    delta: {
      type: "text_delta",
      text,
    },
  })
}

function getLatestUserMessage(messages: ChatMessage[]) {
  return [...messages].reverse().find((message) => message.role === "user")?.content ?? ""
}

function getFallbackAnswer(messages: ChatMessage[]) {
  const prompt = getLatestUserMessage(messages).toLowerCase()

  if (prompt.includes("john 3:16")) {
    return "**John 3:16** shows the heart of the gospel: God loves the world so deeply that He gives His Son so people may receive eternal life. The verse is not mainly about fear, but about God's generous rescue and invitation to trust Him. It reminds us that faith begins with receiving love before trying to prove ourselves."
  }

  if (prompt.includes("beatitude") || prompt.includes("matthew 5")) {
    return "The Beatitudes in **Matthew 5:3-12** are Jesus' blessings over people who seem weak, empty, grieving, merciful, or persecuted. He is showing that God's kingdom values humility, mercy, purity, and faithful endurance. They invite us to trust that God sees what the world often overlooks."
  }

  if (prompt.includes("king david") || prompt.includes("david")) {
    return "David was Israel's shepherd-king, chosen by God while still young in **1 Samuel 16:12-13**. His life held courage, worship, failure, repentance, and God's mercy. He points us toward honest faith: bringing both strength and brokenness before the Lord."
  }

  if (prompt.includes("peace") || prompt.includes("anxiety") || prompt.includes("worry")) {
    return "**Philippians 4:6-7** encourages believers to bring anxiety to God through prayer, thanksgiving, and trust. Peace does not mean every problem disappears; it means God's presence guards the heart while we walk through it. Start with one honest sentence of prayer today."
  }

  return "That is a thoughtful question. A helpful place to begin is **Psalm 119:105**, which describes God's word as a lamp for our feet and a light for our path. Scripture often guides us one faithful step at a time, so start with the passage itself, its context, and what it reveals about God's character."
}

function createFallbackStream(messages: ChatMessage[]) {
  const encoder = new TextEncoder()
  const answer = getFallbackAnswer(messages)

  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(createTextDelta(answer)))
        controller.enqueue(encoder.encode("data: [DONE]\n\n"))
        controller.close()
      },
    }),
    {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    },
  )
}

function getLocalAiTimeout() {
  const value = Number(process.env.LOCAL_AI_TIMEOUT_MS)
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_LOCAL_AI_TIMEOUT_MS
}

export async function POST(request: Request) {
  let messages: ChatMessage[]

  try {
    const body: unknown = await request.json()
    messages = normalizeMessages((body as { messages?: unknown }).messages)
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  if (messages.length === 0) {
    return Response.json({ error: "At least one message is required." }, { status: 400 })
  }

  const baseUrl = (process.env.LOCAL_AI_BASE_URL || DEFAULT_LOCAL_AI_BASE_URL).replace(/\/$/, "")
  const model = process.env.LOCAL_AI_MODEL || DEFAULT_LOCAL_AI_MODEL
  const localMessages = messages.map((message, index) =>
    index === messages.length - 1 && message.role === "user"
      ? { ...message, content: `${message.content}\n\n/no_think` }
      : message,
  )
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
        stream: true,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...localMessages,
        ],
        options: {
          num_predict: 384,
          temperature: 0.4,
        },
      }),
      signal: abortController.signal,
    })
  } catch {
    return createFallbackStream(messages)
  } finally {
    clearTimeout(timeout)
  }

  if (!upstream.ok || !upstream.body) {
    return createFallbackStream(messages)
  }

  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body!.getReader()
      let buffer = ""

      const pushLine = (line: string) => {
        const trimmed = line.trim()
        if (!trimmed) return false

        try {
          const event = JSON.parse(trimmed) as {
            done?: boolean
            message?: { content?: string }
            error?: string
          }

          if (event.error) {
            controller.enqueue(encoder.encode(createTextDelta(getFallbackAnswer(messages))))
            controller.enqueue(encoder.encode("data: [DONE]\n\n"))
            return true
          }

          const text = event.message?.content
          if (text) {
            controller.enqueue(encoder.encode(createTextDelta(text)))
          }

          return event.done === true
        } catch {
          return false
        }
      }

      try {
        while (true) {
          const { value, done } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() ?? ""

          for (const line of lines) {
            if (pushLine(line)) {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"))
              controller.close()
              return
            }
          }
        }

        if (buffer.trim()) {
          pushLine(buffer)
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"))
        controller.close()
      } catch {
        controller.enqueue(encoder.encode(createSseEvent({ error: "The local AI stream stopped unexpectedly." })))
        controller.close()
      } finally {
        reader.releaseLock()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
