"use client"

import { type SVGProps, useEffect, useRef, useState } from "react"
import { Bookmark, BookmarkCheck, ChevronLeft, Mic, MoreVertical, Send, Sparkles } from "lucide-react"
import { highlightScripture } from "../lib/scripture"
import { getBookmarks, removeBookmarkByContent, saveBookmark } from "./saved-bookmarks"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

type StreamPayload = {
  error?: string
  delta?: { text?: string }
  message?: { content?: string }
  choices?: Array<{ delta?: { content?: string } }>
}

const initialMessages: Message[] = [
  {
    id: "1",
    role: "assistant",
    content: "Welcome! I'm here to help you explore Scripture and deepen your understanding of God's Word. Ask me anything about the Bible.",
    timestamp: new Date(Date.now() - 60000),
  },
]

const suggestedQuestions = [
  "What does John 3:16 mean?",
  "Explain the Beatitudes",
  "Who was King David?",
]

const SCRIPTURE_REFERENCE_REGEX = /\b(?:(?:1|2|3)\s)?[A-Z][a-z]+ \d+:\d+(?:-\d+)?\b/g
const CHAT_ERROR_MESSAGE = "I'm having trouble connecting right now. Please try again in a moment."
const CHAT_REQUEST_TIMEOUT_MS = 30000
const CHAT_STREAM_CHUNK_TIMEOUT_MS = 25000

function getChatReference(content: string) {
  return content.match(SCRIPTURE_REFERENCE_REGEX)?.[0] ?? "Bible Assistant"
}

function readChunkWithTimeout(reader: ReadableStreamDefaultReader<Uint8Array>) {
  let timeout: number | undefined

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = window.setTimeout(() => reject(new Error("Chat stream timed out.")), CHAT_STREAM_CHUNK_TIMEOUT_MS)
  })

  return Promise.race([reader.read(), timeoutPromise]).finally(() => {
    if (timeout) window.clearTimeout(timeout)
  })
}

function CrossIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M12 2v20M5 8h14" />
    </svg>
  )
}

export default function BibleChat() {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [savedChatContents, setSavedChatContents] = useState<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    const syncSavedMessages = () => {
      const savedMessages = getBookmarks()
        .filter((bookmark) => bookmark.type === "chat")
        .map((bookmark) => bookmark.content)
      setSavedChatContents(new Set(savedMessages))
    }

    syncSavedMessages()
    window.addEventListener("bookmarks-updated", syncSavedMessages)
    return () => window.removeEventListener("bookmarks-updated", syncSavedMessages)
  }, [])

  const handleSend = async () => {
    if (!inputValue.trim() || isTyping) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    }
    const nextMessages = [...messages, userMessage]
    const streamingId = "streaming"
    let assistantContent = ""
    let assistantStarted = false

    const addOrUpdateStreamingMessage = (content: string) => {
      if (!assistantStarted) {
        assistantStarted = true
        setMessages((prev) => [
          ...prev,
          { id: streamingId, role: "assistant", content, timestamp: new Date() },
        ])
        return
      }

      setMessages((prev) =>
        prev.map((message) => (message.id === streamingId ? { ...message, content } : message)),
      )
    }

    const processSseLine = (line: string) => {
      if (!line.startsWith("data: ")) return false

      const data = line.replace(/^data:\s*/, "").trim()
      if (!data) return false
      if (data === "[DONE]") return true

      const parsed = JSON.parse(data) as StreamPayload
      if (parsed.error) {
        throw new Error(parsed.error)
      }

      const text = parsed.delta?.text ?? parsed.message?.content ?? parsed.choices?.[0]?.delta?.content ?? ""
      if (text) {
        assistantContent += text
        addOrUpdateStreamingMessage(assistantContent)
      }

      return false
    }

    setMessages(nextMessages)
    setInputValue("")
    setIsTyping(true)

    const requestController = new AbortController()
    const requestTimeout = window.setTimeout(() => requestController.abort(), CHAT_REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: requestController.signal,
        body: JSON.stringify({
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      })
      window.clearTimeout(requestTimeout)

      if (!response.ok || !response.body) {
        throw new Error("Chat request failed.")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let finished = false

      while (!finished) {
        const { value, done } = await readChunkWithTimeout(reader)
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""

        for (const line of lines) {
          finished = processSseLine(line.trimEnd())
          if (finished) break
        }
      }

      if (!finished && buffer.trim()) {
        processSseLine(buffer.trimEnd())
      }

      if (!assistantStarted) {
        addOrUpdateStreamingMessage(CHAT_ERROR_MESSAGE)
      }

      const finalId = `assistant-${Date.now()}`
      setMessages((prev) =>
        prev.map((message) =>
          message.id === streamingId
            ? { ...message, id: finalId, content: assistantContent || CHAT_ERROR_MESSAGE }
            : message,
        ),
      )
    } catch {
      window.clearTimeout(requestTimeout)
      const errorId = `assistant-error-${Date.now()}`
      if (assistantStarted) {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === streamingId ? { ...message, id: errorId, content: CHAT_ERROR_MESSAGE } : message,
          ),
        )
      } else {
        setMessages((prev) => [
          ...prev,
          { id: errorId, role: "assistant", content: CHAT_ERROR_MESSAGE, timestamp: new Date() },
        ])
      }
    } finally {
      setIsTyping(false)
    }
  }

  const handleChatBookmark = (message: Message) => {
    if (savedChatContents.has(message.content)) {
      removeBookmarkByContent(message.content, "chat")
      setSavedChatContents((prev) => {
        const next = new Set(prev)
        next.delete(message.content)
        return next
      })
      return
    }

    saveBookmark({
      type: "chat",
      content: message.content,
      reference: getChatReference(message.content),
    })
    setSavedChatContents((prev) => new Set(prev).add(message.content))
  }

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })

  const hasStreamingMessage = messages.some((message) => message.id === "streaming")

  return (
    <div
      className="flex flex-col h-full w-full"
      style={{
        background: "var(--surface-page)",
        paddingTop: "env(safe-area-inset-top)",
        animation: "fadeInUp 0.3s ease-out",
      }}
    >
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <header
        className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{ background: "var(--surface-page)", borderColor: "var(--border)" }}
      >
        <button className="p-2 -ml-2 transition-colors" style={{ color: "var(--text-muted)" }} aria-label="Back">
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full" style={{ background: "var(--purple-deep)" }}>
            <CrossIcon className="w-4 h-4" style={{ color: "var(--text-on-primary)" } as React.CSSProperties} />
          </div>
          <div>
            <h1 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Bible Assistant</h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Local AI study companion</p>
          </div>
        </div>

        <button className="p-2 -mr-2 transition-colors" style={{ color: "var(--text-muted)" }} aria-label="More options">
          <MoreVertical className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-4">
          {messages.map((message) => {
            const chatSaved = message.role === "assistant" && savedChatContents.has(message.content)
            const isErrorMessage = message.role === "assistant" && message.content === CHAT_ERROR_MESSAGE

            return (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[85%] rounded-2xl px-4 py-3"
                  style={
                    message.role === "user"
                      ? { background: "var(--purple-deep)", borderBottomRightRadius: "4px" }
                      : isErrorMessage
                        ? { background: "var(--tag-healing-bg)", borderLeft: "3px solid var(--tag-healing-text)", borderBottomLeftRadius: "4px", border: "1px solid var(--tag-healing-bg)", borderLeftWidth: "3px", borderLeftColor: "var(--tag-healing-text)" }
                        : { background: "var(--surface-card)", borderLeft: "3px solid var(--gold)", borderBottomLeftRadius: "4px", border: "1px solid var(--border)", borderLeftWidth: "3px", borderLeftColor: "var(--gold)" }
                  }
                >
                  {message.role === "assistant" && (
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" style={{ color: isErrorMessage ? "var(--tag-healing-text)" : "var(--gold)" }} />
                        <span className="text-xs font-medium" style={{ color: isErrorMessage ? "var(--tag-healing-text)" : "var(--gold)" }}>Bible Assistant</span>
                      </div>
                      {!isErrorMessage && (
                        <button
                          type="button"
                          onClick={() => handleChatBookmark(message)}
                          className="w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90"
                          style={
                            chatSaved
                              ? { background: "var(--gold)", color: "var(--text-on-gold)" }
                              : { background: "var(--surface-raised)", color: "var(--text-muted)", border: "1px solid var(--border)" }
                          }
                          aria-label={chatSaved ? "Remove chat bookmark" : "Save chat bookmark"}
                          aria-pressed={chatSaved}
                        >
                          {chatSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                        </button>
                      )}
                    </div>
                  )}
                  {message.role === "assistant" ? (
                    <p
                      className="text-sm leading-relaxed whitespace-pre-line"
                      style={{ color: "var(--text-primary)" }}
                      dangerouslySetInnerHTML={{
                        __html: highlightScripture(message.content),
                      }}
                    />
                  ) : (
                    <p
                      className="text-sm leading-relaxed whitespace-pre-line"
                      style={{ color: "var(--text-on-primary)" }}
                    >
                      {message.content}
                    </p>
                  )}
                  <p className="text-[10px] mt-2" style={{ color: message.role === "user" ? "rgba(255,255,255,0.55)" : "var(--text-muted)" }}>
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            )
          })}

          {isTyping && !hasStreamingMessage && (
            <div className="flex justify-start">
              <div
                className="rounded-2xl px-4 py-3"
                style={{ background: "var(--surface-card)", borderLeft: "3px solid var(--gold)", border: "1px solid var(--border)", borderLeftWidth: "3px", borderLeftColor: "var(--gold)", borderBottomLeftRadius: "4px" }}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--gold)" }} />
                  <span className="text-xs font-medium" style={{ color: "var(--gold)" }}>Bible Assistant</span>
                </div>
                <div className="flex gap-1.5 py-1">
                  {[0, 150, 300].map((delay) => (
                    <span key={delay} className="w-2 h-2 rounded-full animate-bounce" style={{ background: "var(--text-muted)", opacity: 0.4, animationDelay: `${delay}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t flex-shrink-0 px-4 py-3" style={{ borderColor: "var(--border)", background: "var(--surface-page)" }}>
        <div
          className="flex items-center gap-2 rounded-full px-4 py-2"
          style={{ background: "var(--surface-input)", border: "1px solid var(--border)" }}
        >
          <Mic className="w-5 h-5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            disabled={isTyping}
            placeholder="Ask about Scripture..."
            className="flex-1 bg-transparent text-sm focus:outline-none disabled:opacity-70"
            style={{ color: "var(--text-primary)" }}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isTyping}
            className="flex items-center justify-center w-9 h-9 rounded-full transition-all active:scale-90 disabled:cursor-not-allowed"
            style={
              inputValue.trim() && !isTyping
                ? { background: "var(--gold)", color: "var(--text-on-gold)" }
                : { background: "var(--surface-subtle)", color: "var(--text-muted)" }
            }
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-3">
          <p className="text-xs mb-2 px-1" style={{ color: "var(--text-muted)" }}>Suggested questions</p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => { setInputValue(q); inputRef.current?.focus() }}
                disabled={isTyping}
                className="px-3 py-1.5 text-xs font-medium rounded-full transition-colors disabled:opacity-60"
                style={{ background: "var(--surface-raised)", color: "var(--purple-deep)", border: "1px solid var(--border)" }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
