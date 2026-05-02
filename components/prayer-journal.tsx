"use client"

import { useEffect, useRef, useState } from "react"
import { Plus, Check, Clock, Loader2, Sparkles, Search, Trash2 } from "lucide-react"

type PrayerTag = "answered" | "ongoing" | "new"

interface Prayer {
  id: string
  title: string
  date: string
  excerpt: string
  tag: PrayerTag
}

const INITIAL_PRAYERS: Prayer[] = [
  { id: "1", title: "Healing for Mom",       date: "May 1, 2026",  excerpt: "Lord, I lift up my mother as she goes through treatment. Bring her comfort, strength, and complete restoration according to Your will.", tag: "ongoing" },
  { id: "2", title: "New Job Opportunity",   date: "Apr 28, 2026", excerpt: "Father, I trust You with this door You have opened. Grant me wisdom, favor, and clarity as I walk into this new season.", tag: "answered" },
  { id: "3", title: "Peace in Our Home",     date: "Apr 25, 2026", excerpt: "Lord, let Your peace that surpasses all understanding guard our hearts and our home. Restore unity and gentle love between us.", tag: "ongoing" },
  { id: "4", title: "My Friend Sarah's Faith", date: "Apr 20, 2026", excerpt: "God, I pray that You would draw Sarah closer to You. Open her heart to Your Word and let her experience Your love firsthand.", tag: "answered" },
  { id: "5", title: "Guidance on Next Steps", date: "May 2, 2026",  excerpt: "I don't know the way forward, but You do. Show me the path, illuminate each step, and let me walk with confidence in Your promises.", tag: "new" },
  { id: "6", title: "Gratitude for This Week", date: "May 2, 2026", excerpt: "Thank You, Lord, for every small mercy this week — the quiet mornings, the unexpected kindness, the strength You gave when I had none.", tag: "new" },
]

const LEGACY_MOCK_PRAYER_KEYS = new Set(INITIAL_PRAYERS.map((prayer) => `${prayer.id}:${prayer.title}`))

const TAG_CONFIG: Record<PrayerTag, { label: string; bgVar: string; textVar: string; borderVar: string; icon: React.ReactNode }> = {
  answered: { label: "Answered", bgVar: "var(--prayer-answered-bg)", textVar: "var(--prayer-answered-text)", borderVar: "var(--prayer-answered-border)", icon: <Check size={10} strokeWidth={2.5} /> },
  ongoing:  { label: "Ongoing",  bgVar: "var(--prayer-ongoing-bg)",  textVar: "var(--prayer-ongoing-text)",  borderVar: "var(--prayer-ongoing-border)",  icon: <Clock size={10} strokeWidth={2.5} /> },
  new:      { label: "New",      bgVar: "var(--prayer-new-bg)",      textVar: "var(--prayer-new-text)",      borderVar: "var(--prayer-new-border)",      icon: <Sparkles size={10} strokeWidth={2.5} /> },
}

type FilterType = "all" | PrayerTag

const STATUS_ORDER: PrayerTag[] = ["new", "ongoing", "answered"]

function isPrayer(value: unknown): value is Prayer {
  if (!value || typeof value !== "object") return false
  const prayer = value as Partial<Prayer>
  return (
    typeof prayer.id === "string" &&
    typeof prayer.title === "string" &&
    typeof prayer.date === "string" &&
    typeof prayer.excerpt === "string" &&
    (prayer.tag === "answered" || prayer.tag === "ongoing" || prayer.tag === "new")
  )
}

function removeLegacyMockPrayers(prayers: Prayer[]) {
  return prayers.filter((prayer) => !LEGACY_MOCK_PRAYER_KEYS.has(`${prayer.id}:${prayer.title}`))
}

function formatToday() {
  return new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export default function PrayerJournal() {
  const [prayers, setPrayers] = useState<Prayer[]>(() => {
    if (typeof window === "undefined") return []
    try {
      const saved = localStorage.getItem("sanctum-prayers")
      if (!saved) return []

      const parsed: unknown = JSON.parse(saved)
      return Array.isArray(parsed) && parsed.every(isPrayer) ? removeLegacyMockPrayers(parsed) : []
    } catch {
      return []
    }
  })
  const [activeFilter, setActiveFilter] = useState<FilterType>("all")
  const [showAddModal, setShowAddModal] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newTopic, setNewTopic] = useState("")
  const [newContent, setNewContent] = useState("")
  const [prayerStarters, setPrayerStarters] = useState<string[]>([])
  const [starterLoading, setStarterLoading] = useState(false)
  const [starterError, setStarterError] = useState("")
  const [deleteVisibleId, setDeleteVisibleId] = useState<string | null>(null)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    localStorage.setItem("sanctum-prayers", JSON.stringify(prayers))
  }, [prayers])

  const filtered = activeFilter === "all" ? prayers : prayers.filter((p) => p.tag === activeFilter)

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const handleTouchStart = (id: string) => {
    clearLongPressTimer()
    longPressTimerRef.current = setTimeout(() => {
      setDeleteVisibleId(id)
    }, 600)
  }

  const handleContextMenu = (event: React.MouseEvent, id: string) => {
    event.preventDefault()
    setDeleteVisibleId(id)
  }

  const handleDeletePrayer = (id: string) => {
    if (!window.confirm("Remove this prayer?")) return
    setPrayers((prev) => prev.filter((prayer) => prayer.id !== id))
    setDeleteVisibleId(null)
  }

  const handleCycleStatus = (id: string) => {
    setPrayers((prev) =>
      prev.map((prayer) => {
        if (prayer.id !== id) return prayer
        const currentIndex = STATUS_ORDER.indexOf(prayer.tag)
        return { ...prayer, tag: STATUS_ORDER[(currentIndex + 1) % STATUS_ORDER.length] }
      })
    )
  }

  const handleSubmitPrayer = () => {
    const content = newContent.trim()
    if (!content) return

    const newPrayer: Prayer = {
      id: Date.now().toString(),
      title: newTitle.trim() || "Untitled Prayer",
      date: formatToday(),
      excerpt: content.slice(0, 120),
      tag: "new",
    }

    setPrayers((prev) => [newPrayer, ...prev])
    setShowAddModal(false)
    setNewTitle("")
    setNewTopic("")
    setNewContent("")
    setPrayerStarters([])
    setStarterError("")
    setDeleteVisibleId(null)
  }

  const handleGetPrayerStarters = async () => {
    const topic = newTopic.trim()
    if (!topic || starterLoading) return

    setStarterLoading(true)
    setStarterError("")
    setPrayerStarters([])

    try {
      const response = await fetch("/api/prayer-prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ topic }),
      })

      if (!response.ok) {
        throw new Error("Starter request failed.")
      }

      const data: unknown = await response.json()
      if (!Array.isArray(data) || !data.every((item) => typeof item === "string")) {
        throw new Error("Invalid starter response.")
      }

      setPrayerStarters(data.slice(0, 3))
    } catch {
      setStarterError("Could not get starters right now.")
    } finally {
      setStarterLoading(false)
    }
  }

  const handleAppendStarter = (starter: string) => {
    setNewContent((prev) => {
      const trimmed = prev.trim()
      return trimmed ? `${trimmed}\n\n${starter}` : starter
    })
  }

  return (
    <div 
      className="flex flex-col h-full w-full font-sans" 
      style={{ 
        background: "var(--surface-page)",
        paddingTop: 'env(safe-area-inset-top)',
        animation: 'fadeInUp 0.3s ease-out',
      }}
    >
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <header className="px-5 pt-5 pb-2 flex-shrink-0">
        <div className="flex items-end justify-between mb-1">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] mb-1" style={{ color: "var(--gold)" }}>
              Sanctum
            </p>
            <h1 className="text-2xl font-bold text-balance font-serif" style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
              My Prayers
            </h1>
          </div>
          <button
            aria-label="Search prayers"
            className="w-9 h-9 flex items-center justify-center rounded-full transition-colors hover:opacity-80"
            style={{ background: "var(--surface-raised)", color: "var(--text-muted)", marginRight: "2.5rem" }}
          >
            <Search size={16} />
          </button>
        </div>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          {filtered.length} {filtered.length === 1 ? "prayer" : "prayers"}
        </p>
      </header>

      {/* Filter row */}
      <div className="flex items-center gap-2 px-5 py-3 flex-shrink-0">
        {(["all", "answered", "ongoing", "new"] as FilterType[]).map((f) => {
          const active = activeFilter === f
          const label = f === "all" ? "All" : TAG_CONFIG[f as PrayerTag].label
          return (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={
                active
                  ? { background: "var(--purple-deep)", color: "var(--text-on-primary)", boxShadow: "0 2px 10px rgba(74,50,104,0.22)" }
                  : { background: "var(--surface-raised)", color: "var(--text-muted)", border: "1px solid var(--border)" }
              }
              aria-pressed={active}
            >
              {f !== "all" && <span style={{ opacity: active ? 1 : 0.7 }}>{TAG_CONFIG[f as PrayerTag].icon}</span>}
              {label}
            </button>
          )
        })}
      </div>

      {/* Prayer list */}
      <div className="flex-1 overflow-y-auto px-5 pb-28 flex flex-col gap-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: "var(--surface-raised)" }}>
              <Sparkles size={22} style={{ color: "var(--gold)" }} />
            </div>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>No prayers here yet</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Tap the + button to add one</p>
          </div>
        ) : (
          filtered.map((prayer) => {
            const tag = TAG_CONFIG[prayer.tag]
            return (
              <div
                key={prayer.id}
                className="relative"
                onContextMenu={(event) => handleContextMenu(event, prayer.id)}
                onTouchStart={() => handleTouchStart(prayer.id)}
                onTouchEnd={clearLongPressTimer}
                onTouchCancel={clearLongPressTimer}
              >
                <article
                  className="rounded-2xl p-4 transition-all active:scale-[0.99] cursor-pointer"
                  style={{ background: "var(--surface-card)", border: "1px solid var(--border)", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Prayer: ${prayer.title}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h2 className="text-sm font-semibold leading-snug flex-1 text-balance" style={{ color: "var(--text-primary)" }}>
                      {prayer.title}
                    </h2>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        handleCycleStatus(prayer.id)
                      }}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold flex-shrink-0 mt-0.5 transition-all active:scale-95"
                      style={{ background: tag.bgVar, color: tag.textVar, border: `1px solid ${tag.borderVar}` }}
                      aria-label={`Change status from ${tag.label}`}
                    >
                      {tag.icon}
                      {tag.label}
                    </button>
                  </div>

                  <p className="text-xs leading-relaxed line-clamp-2 mb-3" style={{ color: "var(--text-muted)", lineHeight: "1.65" }}>
                    {prayer.excerpt}
                  </p>

                  <div className="flex items-center gap-2">
                    <div className="w-5 h-px" style={{ background: "var(--gold)", opacity: 0.5 }} aria-hidden="true" />
                    <time className="text-[11px] font-medium" style={{ color: "var(--gold)" }}>{prayer.date}</time>
                  </div>
                </article>

                {deleteVisibleId === prayer.id && (
                  <button
                    type="button"
                    onClick={() => handleDeletePrayer(prayer.id)}
                    className="absolute right-3 bottom-3 w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-all active:scale-90"
                    style={{ background: "var(--tag-healing-bg)", color: "var(--tag-healing-text)", border: "1px solid rgba(185,64,64,0.22)" }}
                    aria-label="Delete prayer"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Floating Add Button */}
      <button
        onClick={() => {
          setShowAddModal(true)
          setDeleteVisibleId(null)
        }}
        aria-label="Add new prayer"
        className="absolute bottom-24 right-6 w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg"
        style={{ background: "var(--gold)", boxShadow: "0 6px 24px rgba(201,168,76,0.45)", color: "var(--text-on-gold)" }}
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>

      {/* Add Prayer Modal */}
      {showAddModal && (
        <div
          className="absolute inset-0 flex items-end justify-center z-50"
          style={{ background: "var(--surface-overlay)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl p-6 pb-10"
            style={{ background: "var(--surface-card)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: "var(--border)" }} aria-hidden="true" />
            <h2 className="text-base font-bold mb-4 font-serif" style={{ color: "var(--text-primary)" }}>New Prayer</h2>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
                placeholder="Prayer title..."
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTopic}
                  onChange={(event) => setNewTopic(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && handleGetPrayerStarters()}
                  placeholder="What's on your heart?"
                  className="min-w-0 flex-1 rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                />
                <button
                  type="button"
                  onClick={handleGetPrayerStarters}
                  disabled={!newTopic.trim() || starterLoading}
                  className="min-h-11 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-60"
                  style={{ background: "var(--gold)", color: "var(--text-on-gold)", boxShadow: "0 3px 12px rgba(201,168,76,0.28)" }}
                >
                  {starterLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                  <span>Get starters ✦</span>
                </button>
              </div>
              {(prayerStarters.length > 0 || starterError) && (
                <div className="flex flex-wrap gap-2">
                  {prayerStarters.map((starter) => (
                    <button
                      key={starter}
                      type="button"
                      onClick={() => handleAppendStarter(starter)}
                      className="rounded-full px-3 py-1.5 text-xs font-medium text-left transition-all active:scale-95"
                      style={{ background: "var(--gold-dim)", color: "var(--gold-light)", border: "1px solid rgba(201,168,76,0.25)" }}
                    >
                      {starter}
                    </button>
                  ))}
                  {starterError && (
                    <p className="text-xs" style={{ color: "var(--tag-healing-text)" }}>
                      {starterError}
                    </p>
                  )}
                </div>
              )}
              <textarea
                value={newContent}
                onChange={(event) => setNewContent(event.target.value)}
                placeholder="Write your prayer..."
                rows={4}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
                style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", color: "var(--text-primary)", lineHeight: "1.65" }}
              />
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                New prayers start as New. Tap the status pill later to move it to Ongoing or Answered.
              </p>
              <button
                onClick={handleSubmitPrayer}
                disabled={!newContent.trim()}
                className="w-full rounded-xl py-3.5 text-sm font-semibold transition-all active:scale-95"
                style={
                  newContent.trim()
                    ? { background: "var(--purple-deep)", color: "var(--text-on-primary)", boxShadow: "0 4px 14px rgba(74,50,104,0.25)" }
                    : { background: "var(--surface-subtle)", color: "var(--text-muted)" }
                }
              >
                Save Prayer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
