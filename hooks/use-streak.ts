"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

const COMPLETIONS_KEY = "sanctum-completions"
const STREAK_UPDATED_EVENT = "sanctum-streak-updated"

export const getDateKey = (date = new Date()) => date.toISOString().split("T")[0]

export const getStoredCompletions = (): string[] => {
  if (typeof window === "undefined") return []
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(COMPLETIONS_KEY) || "[]")
    return Array.isArray(parsed)
      ? Array.from(new Set(parsed.filter((item): item is string => typeof item === "string"))).sort()
      : []
  } catch {
    return []
  }
}

export const calculateStreak = (completions: string[]): number => {
  const set = new Set(completions)
  let streak = 0
  const d = new Date()

  if (set.has(getDateKey(d))) {
    streak++
  }

  d.setDate(d.getDate() - 1)
  while (set.has(getDateKey(d))) {
    streak++
    d.setDate(d.getDate() - 1)
  }

  return streak
}

export const calculateBestStreak = (completions: string[]): number => {
  const sorted = Array.from(new Set(completions)).sort()
  if (sorted.length === 0) return 0

  let best = 1
  let run = 1

  for (let i = 1; i < sorted.length; i++) {
    const previous = new Date(`${sorted[i - 1]}T00:00:00.000Z`)
    const current = new Date(`${sorted[i]}T00:00:00.000Z`)
    const diffDays = Math.round((current.getTime() - previous.getTime()) / 86400000)

    if (diffDays === 1) {
      run++
    } else if (diffDays > 1) {
      run = 1
    }

    best = Math.max(best, run)
  }

  return best
}

export function useStreak() {
  const [completions, setCompletions] = useState<string[]>(() => getStoredCompletions())

  const syncCompletions = useCallback(() => {
    setCompletions(getStoredCompletions())
  }, [])

  useEffect(() => {
    window.addEventListener(STREAK_UPDATED_EVENT, syncCompletions)
    window.addEventListener("storage", syncCompletions)
    return () => {
      window.removeEventListener(STREAK_UPDATED_EVENT, syncCompletions)
      window.removeEventListener("storage", syncCompletions)
    }
  }, [syncCompletions])

  const streak = useMemo(() => calculateStreak(completions), [completions])
  const bestStreak = useMemo(() => calculateBestStreak(completions), [completions])
  const todayComplete = completions.includes(getDateKey())

  useEffect(() => {
    localStorage.setItem(COMPLETIONS_KEY, JSON.stringify(completions))
  }, [completions])

  const markToday = useCallback(() => {
    const today = getDateKey()
    setCompletions((prev) => {
      if (prev.includes(today)) return prev
      const next = [...prev, today].sort()
      localStorage.setItem(COMPLETIONS_KEY, JSON.stringify(next))
      window.dispatchEvent(new Event(STREAK_UPDATED_EVENT))
      return next
    })
  }, [])

  return {
    completions,
    streak,
    bestStreak,
    todayComplete,
    markToday,
  }
}
