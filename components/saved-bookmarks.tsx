"use client"

import { useState, useEffect } from "react"
import { Bookmark, Trash2, X, BookOpen, MessageCircle } from "lucide-react"

export interface BookmarkItem {
  id: string
  type: "verse" | "chat"
  content: string
  reference: string
  dateSaved: string
}

interface SavedBookmarksProps {
  onClose: () => void
}

const STORAGE_KEY = "sanctum-bookmarks"
const BOOKMARKS_UPDATED_EVENT = "bookmarks-updated"

function isBookmarkItem(value: unknown): value is BookmarkItem {
  if (!value || typeof value !== "object") return false
  const item = value as Partial<BookmarkItem>
  return (
    typeof item.id === "string" &&
    (item.type === "verse" || item.type === "chat") &&
    typeof item.content === "string" &&
    typeof item.reference === "string" &&
    typeof item.dateSaved === "string"
  )
}

function writeBookmarks(bookmarks: BookmarkItem[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks))
  window.dispatchEvent(new Event(BOOKMARKS_UPDATED_EVENT))
}

export function getBookmarks(): BookmarkItem[] {
  if (typeof window === "undefined") return []
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return []

    const parsed: unknown = JSON.parse(data)
    return Array.isArray(parsed) ? parsed.filter(isBookmarkItem) : []
  } catch {
    return []
  }
}

export function saveBookmark(item: Omit<BookmarkItem, "id" | "dateSaved">): BookmarkItem {
  const bookmarks = getBookmarks()
  const existing = bookmarks.find((bookmark) => bookmark.type === item.type && bookmark.content === item.content)
  const newBookmark: BookmarkItem = {
    ...item,
    id: existing?.id ?? Date.now().toString(),
    dateSaved: new Date().toISOString(),
  }
  const nextBookmarks = [
    newBookmark,
    ...bookmarks.filter((bookmark) => !(bookmark.type === item.type && bookmark.content === item.content)),
  ]
  writeBookmarks(nextBookmarks)
  return newBookmark
}

export function removeBookmark(id: string): void {
  const bookmarks = getBookmarks()
  const filtered = bookmarks.filter((b) => b.id !== id)
  writeBookmarks(filtered)
}

export function removeBookmarkByContent(content: string, type: "verse" | "chat"): void {
  const bookmarks = getBookmarks()
  const filtered = bookmarks.filter((bookmark) => !(bookmark.content === content && bookmark.type === type))
  writeBookmarks(filtered)
}

export function isBookmarked(content: string, type: "verse" | "chat"): boolean {
  const bookmarks = getBookmarks()
  return bookmarks.some((b) => b.content === content && b.type === type)
}

export default function SavedBookmarks({ onClose }: SavedBookmarksProps) {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([])
  const [filter, setFilter] = useState<"all" | "verse" | "chat">("all")

  useEffect(() => {
    setBookmarks(getBookmarks())

    const handleUpdate = () => setBookmarks(getBookmarks())
    window.addEventListener(BOOKMARKS_UPDATED_EVENT, handleUpdate)
    return () => window.removeEventListener(BOOKMARKS_UPDATED_EVENT, handleUpdate)
  }, [])

  const handleDelete = (id: string) => {
    removeBookmark(id)
  }

  const filtered = filter === "all" ? bookmarks : bookmarks.filter((b) => b.type === filter)

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col"
      style={{ background: "var(--surface-page)" }}
    >
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <header
        className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
        style={{ borderColor: "var(--border)", paddingTop: "calc(env(safe-area-inset-top) + 16px)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "var(--gold-dim)", border: "1px solid rgba(201,168,76,0.3)" }}
          >
            <Bookmark size={16} style={{ color: "var(--gold)" }} />
          </div>
          <div>
            <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Saved</h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{bookmarks.length} items</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
          style={{ background: "var(--surface-raised)", color: "var(--text-muted)" }}
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </header>

      {/* Filter tabs */}
      <div className="flex gap-2 px-5 py-3 border-b flex-shrink-0" style={{ borderColor: "var(--border)" }}>
        {(["all", "verse", "chat"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-4 py-2 rounded-full text-xs font-semibold transition-all"
            style={
              filter === f
                ? { background: "var(--purple-deep)", color: "var(--text-on-primary)" }
                : { background: "var(--surface-raised)", color: "var(--text-muted)", border: "1px solid var(--border)" }
            }
          >
            {f === "all" ? "All" : f === "verse" ? "Verses" : "Chat"}
          </button>
        ))}
      </div>

      {/* Bookmarks list */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ background: "var(--surface-raised)" }}
            >
              <Bookmark size={24} style={{ color: "var(--text-muted)" }} />
            </div>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>No saved items yet</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Tap the bookmark icon on verses or chat responses to save them here
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((bookmark, index) => (
              <div
                key={bookmark.id}
                className="rounded-2xl p-4 relative"
                style={{
                  background: "var(--surface-card)",
                  border: "1px solid var(--border)",
                  animation: `fadeInUp 0.3s ease-out ${index * 0.05}s both`,
                }}
              >
                {/* Type badge */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center"
                      style={{
                        background: bookmark.type === "verse" ? "var(--gold-dim)" : "rgba(91,33,182,0.12)",
                      }}
                    >
                      {bookmark.type === "verse" ? (
                        <BookOpen size={12} style={{ color: "var(--gold)" }} />
                      ) : (
                        <MessageCircle size={12} style={{ color: "var(--purple-deep)" }} />
                      )}
                    </div>
                    <span
                      className="text-xs font-semibold uppercase tracking-wide"
                      style={{ color: bookmark.type === "verse" ? "var(--gold)" : "var(--purple-deep)" }}
                    >
                      {bookmark.type === "verse" ? "Verse" : "Chat Response"}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(bookmark.id)}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
                    style={{ background: "var(--surface-raised)", color: "var(--text-muted)" }}
                    aria-label="Delete bookmark"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Content */}
                <p
                  className="text-sm leading-relaxed mb-3 whitespace-pre-line"
                  style={{
                    color: "var(--text-primary)",
                    fontFamily: bookmark.type === "verse" ? "var(--font-serif), Georgia, serif" : "inherit",
                    fontStyle: bookmark.type === "verse" ? "italic" : "normal",
                  }}
                >
                  {bookmark.content.length > 200 ? bookmark.content.substring(0, 200) + "..." : bookmark.content}
                </p>

                {/* Reference and date */}
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs font-semibold px-2 py-1 rounded-full"
                    style={{
                      background: bookmark.type === "verse" ? "var(--gold-dim)" : "rgba(91,33,182,0.08)",
                      color: bookmark.type === "verse" ? "var(--gold)" : "var(--purple-deep)",
                    }}
                  >
                    {bookmark.reference}
                  </span>
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    Saved {formatDate(bookmark.dateSaved)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
