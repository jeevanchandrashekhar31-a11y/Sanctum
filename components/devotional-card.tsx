"use client"

import { useEffect, useMemo, useState } from "react"
import { Bell, Bookmark, BookmarkCheck, BookOpen, CheckCircle2, Flame, Lightbulb, Settings } from "lucide-react"
import { getDateKey, useStreak } from "../hooks/use-streak"
import { isBookmarked, removeBookmarkByContent, saveBookmark } from "./saved-bookmarks"

interface Devotional {
  verse: string
  reference: string
  translation: string
  reflection: string
  question: string
  prayer: string
}

const FALLBACK_DEVOTIONAL: Devotional = {
  verse: "Be still, and know that I am God; I will be exalted among the nations, I will be exalted in the earth.",
  reference: "Psalm 46:10",
  translation: "NIV",
  reflection: "In the rush of daily life, God invites us into sacred stillness, not passivity, but a posture of trust. To be still is to release our grip on outcomes and rest in the knowledge that He is sovereign over every storm, every nation, and every detail of our lives. Today, find a quiet moment to receive His presence.",
  question: "Where can I practice stillness and trust God with what I cannot control today?",
  prayer: "Lord, quiet my heart and teach me to rest in Your faithful presence. Lord, help me release what I cannot carry and walk with trust today.",
}

function CrossIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2v20M5 8h14" />
    </svg>
  )
}

function getTodayKey() {
  const date = new Date()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
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

async function fetchWithTimeout(url: string, timeoutMs = 9000) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    window.clearTimeout(timeout)
  }
}

function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      className={className}
      style={{ animation: "pulse 1.5s ease-in-out infinite", background: "var(--surface-raised)", borderRadius: "12px" }}
    />
  )
}

export default function DevotionalCard() {
  const [devotional, setDevotional] = useState<Devotional | null>(null)
  const [loading, setLoading] = useState(true)
  const [verseBookmarked, setVerseBookmarked] = useState(false)
  const { completions, streak, bestStreak, todayComplete, markToday } = useStreak()

  const currentDevotional = devotional ?? FALLBACK_DEVOTIONAL
  const today = new Date()
  const dateStr = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
  const yearStr = today.getFullYear()
  const weekData = useMemo(() => {
    const completionSet = new Set(completions)
    const start = new Date()
    start.setDate(start.getDate() - start.getDay())

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start)
      date.setDate(start.getDate() + index)
      return {
        day: date.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1),
        done: completionSet.has(getDateKey(date)),
        today: getDateKey(date) === getDateKey(),
      }
    })
  }, [completions])

  useEffect(() => {
    let cancelled = false

    const loadDevotional = async () => {
      const storageKey = `sanctum-devotional-${getTodayKey()}`

      try {
        const saved = localStorage.getItem(storageKey)
        if (saved) {
          const parsed: unknown = JSON.parse(saved)
          if (isDevotional(parsed)) {
            if (!cancelled) {
              setDevotional(parsed)
              setLoading(false)
            }
            return
          }
        }

        const response = await fetchWithTimeout("/api/devotional")
        if (!response.ok) {
          throw new Error("Devotional request failed.")
        }

        const data: unknown = await response.json()
        if (!isDevotional(data)) {
          throw new Error("Invalid devotional response.")
        }

        localStorage.setItem(storageKey, JSON.stringify(data))
        if (!cancelled) {
          setDevotional(data)
        }
      } catch {
        if (!cancelled) {
          setDevotional(FALLBACK_DEVOTIONAL)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadDevotional()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const syncBookmarkState = () => setVerseBookmarked(isBookmarked(currentDevotional.verse, "verse"))
    syncBookmarkState()

    window.addEventListener("bookmarks-updated", syncBookmarkState)
    return () => window.removeEventListener("bookmarks-updated", syncBookmarkState)
  }, [currentDevotional.verse])

  const handleVerseBookmark = () => {
    if (loading) return

    if (verseBookmarked) {
      removeBookmarkByContent(currentDevotional.verse, "verse")
      setVerseBookmarked(false)
      return
    }

    saveBookmark({
      type: "verse",
      content: currentDevotional.verse,
      reference: `${currentDevotional.reference} ${currentDevotional.translation}`,
    })
    setVerseBookmarked(true)
  }

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
        @keyframes flameFlicker {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.9; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.45; }
          50% { opacity: 1; }
        }
      `}</style>

      <div className="flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: "var(--gold-dim)", border: "1px solid rgba(201,168,76,0.3)" }}
          >
            <BookOpen size={13} style={{ color: "var(--gold)" }} />
          </div>
          <span className="text-sm font-semibold tracking-wide" style={{ color: "var(--text-primary)" }}>
            Sanctum
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            aria-label="Notifications"
            className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
            style={{ background: "var(--surface-raised)" }}
          >
            <Bell size={14} style={{ color: "var(--text-muted)" }} />
          </button>
          <button
            aria-label="Settings"
            className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
            style={{ background: "var(--surface-raised)", marginRight: "2.5rem" }}
          >
            <Settings size={14} style={{ color: "var(--text-muted)" }} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6 flex flex-col gap-5">
        <div className="text-center pt-1 pb-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em]" style={{ color: "var(--gold)" }}>
            Daily Devotional
          </p>
          <h1 className="text-xl font-semibold mt-1 text-balance" style={{ color: "var(--text-primary)" }}>
            {dateStr}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{yearStr}</p>
        </div>

        {loading ? (
          <>
            <div
              className="rounded-2xl p-5 relative overflow-hidden"
              style={{
                background: "var(--surface-card)",
                border: "1.5px solid var(--gold)",
                boxShadow: "0 0 32px var(--gold-dim), inset 0 1px 0 rgba(201,168,76,0.12)",
              }}
            >
              <SkeletonBlock className="h-24 w-full rounded-xl" />
            </div>

            <div className="rounded-2xl p-5" style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
              <SkeletonBlock className="h-4 w-full rounded mb-3" />
              <SkeletonBlock className="h-4 w-3/4 rounded" />
            </div>

            <SkeletonBlock className="h-14 w-full rounded-xl" />
          </>
        ) : (
          <>
            <div
              className="rounded-2xl p-5 relative overflow-hidden"
              style={{
                background: "var(--surface-card)",
                border: "1.5px solid var(--gold)",
                boxShadow: "0 0 32px var(--gold-dim), inset 0 1px 0 rgba(201,168,76,0.12)",
              }}
            >
              {[false, true].map((flip) => (
                <div
                  key={String(flip)}
                  className={`absolute ${flip ? "bottom-3 left-3 rotate-180" : "top-3 right-3"} w-5 h-5 opacity-30`}
                  aria-hidden="true"
                  style={{ color: "var(--gold)" }}
                >
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.2">
                    <path d="M2 2h6M2 2v6" strokeLinecap="round" />
                    <path d="M18 2h-6M18 2v6" strokeLinecap="round" />
                    <path d="M2 18h6M2 18v-6" strokeLinecap="round" />
                    <path d="M18 18h-6M18 18v-6" strokeLinecap="round" />
                  </svg>
                </div>
              ))}

              <p
                className="text-5xl leading-none font-serif -mt-1 mb-2 select-none"
                style={{ color: "var(--gold)", opacity: 0.45, fontFamily: "Georgia, serif" }}
                aria-hidden="true"
              >
                &ldquo;
              </p>

              <blockquote
                className="text-[1.2rem] leading-relaxed text-balance font-serif italic"
                style={{ color: "var(--text-primary)", fontFamily: "var(--font-serif), Georgia, serif", lineHeight: "1.7" }}
              >
                {currentDevotional.verse}
              </blockquote>

              <div className="mt-4 flex items-center gap-2">
                <div className="flex-1 h-px" style={{ background: "rgba(201,168,76,0.25)" }} />
                <span
                  className="text-sm font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
                  style={{ background: "var(--gold-dim)", color: "var(--gold-light)", border: "1px solid rgba(201,168,76,0.25)", fontFamily: "var(--font-serif), Georgia, serif" }}
                >
                  {currentDevotional.reference}
                </span>
                <span
                  className="text-xs px-1.5 py-0.5 rounded font-medium"
                  style={{ background: "var(--gold-dim)", color: "var(--gold)", border: "1px solid rgba(201,168,76,0.25)" }}
                >
                  {currentDevotional.translation}
                </span>
                <button
                  type="button"
                  onClick={handleVerseBookmark}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 flex-shrink-0"
                  style={
                    verseBookmarked
                      ? { background: "var(--gold)", color: "var(--text-on-gold)", border: "1px solid var(--gold)" }
                      : { background: "var(--surface-raised)", color: "var(--gold)", border: "1px solid rgba(201,168,76,0.35)" }
                  }
                  aria-label={verseBookmarked ? "Remove verse bookmark" : "Save verse bookmark"}
                  aria-pressed={verseBookmarked}
                >
                  {verseBookmarked ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
                </button>
              </div>
            </div>

            <div
              className="rounded-2xl p-5"
              style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 rounded-full" style={{ background: "var(--gold)" }} aria-hidden="true" />
                <h2 className="text-xs font-semibold uppercase tracking-[0.15em]" style={{ color: "var(--gold)" }}>
                  Today&apos;s Reflection
                </h2>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)", opacity: 0.85, lineHeight: "1.75" }}>
                {currentDevotional.reflection}
              </p>
            </div>

            <div className="rounded-2xl p-4" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
              <div className="flex items-start gap-3">
                <Lightbulb size={17} className="mt-0.5 flex-shrink-0" style={{ color: "var(--gold)" }} />
                <p className="text-xs leading-relaxed italic" style={{ color: "var(--gold)" }}>
                  <span className="font-semibold not-italic" style={{ color: "var(--gold)" }}>Reflect: </span>
                  {currentDevotional.question}
                </p>
              </div>
            </div>

            <div className="rounded-2xl p-5" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center mb-3" style={{ background: "var(--gold-dim)", color: "var(--gold)" }}>
                <CrossIcon className="w-4 h-4" />
              </div>
              <p className="text-sm leading-relaxed italic font-serif" style={{ color: "var(--text-primary)", lineHeight: "1.75" }}>
                {currentDevotional.prayer}
              </p>
            </div>
          </>
        )}

        <button
          onClick={markToday}
          className="w-full rounded-2xl py-4 flex items-center justify-center gap-2.5 font-semibold text-sm tracking-wide transition-all duration-300 active:scale-95"
          style={
            todayComplete
              ? { background: "var(--gold-dim)", border: "1.5px solid var(--gold)", color: "var(--gold-light)" }
              : { background: "var(--gold)", border: "1.5px solid var(--gold)", color: "var(--text-on-gold)", boxShadow: "0 4px 24px rgba(201,168,76,0.35)" }
          }
          aria-pressed={todayComplete}
        >
          {todayComplete ? (
            <><CheckCircle2 size={18} /><span>Marked as Read</span></>
          ) : (
            <span>Mark as Read</span>
          )}
        </button>

        <div
          className="rounded-2xl p-5"
          style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Flame size={22} aria-label="Flame" style={{ color: "var(--streak-flame)", animation: "flameFlicker 1.5s ease-in-out infinite" }} />
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.12em]" style={{ color: "var(--text-muted)" }}>
                  Current Streak
                </p>
                <p className="text-2xl font-bold leading-none" style={{ color: "var(--gold-light)" }}>
                  {streak} <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>days</span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-[0.12em]" style={{ color: "var(--text-muted)" }}>
                Best Streak
              </p>
              <p className="text-2xl font-bold leading-none" style={{ color: "var(--text-primary)", opacity: 0.6 }}>
                {bestStreak} <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>days</span>
              </p>
            </div>
          </div>

          <div className="flex items-end justify-between gap-1.5">
            {weekData.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                <div
                  className="w-full aspect-square rounded-full flex items-center justify-center transition-all duration-200"
                  style={
                    d.today
                      ? { background: "var(--gold-dim)", border: "2px solid var(--gold)", boxShadow: "0 0 10px rgba(201,168,76,0.4)" }
                      : d.done
                        ? { background: "var(--gold)" }
                        : { background: "var(--surface-raised)", border: "1.5px solid var(--border)" }
                  }
                >
                  {d.done && !d.today && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
                      <path d="M1 3.5L3.8 6.5L9 1" stroke="var(--surface-page)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {d.today && <Flame size={12} aria-label="Today" style={{ color: "var(--gold)" }} />}
                </div>
                <span
                  className="text-[10px] font-medium"
                  style={{ color: d.today ? "var(--gold)" : d.done ? "var(--text-primary)" : "var(--text-muted)", opacity: d.done || d.today ? 1 : 0.5 }}
                >
                  {d.day}
                </span>
              </div>
            ))}
          </div>

          <p className="text-center text-xs mt-4 font-medium" style={{ color: "var(--text-muted)" }}>
            Keep going - {todayComplete ? "today is complete!" : "finish today to keep your streak!"}
          </p>
        </div>
      </div>
    </div>
  )
}
