"use client"

import { useMemo } from "react"
import { Calendar, Check, ChevronRight, Flame, Target, Trophy } from "lucide-react"
import { getDateKey, useStreak } from "../hooks/use-streak"

const DAYS_OF_WEEK = ["S", "M", "T", "W", "T", "F", "S"]
const totalDays = 30

const generateCalendarData = (completions: string[]) => {
  const today = new Date()
  const completionSet = new Set(completions)
  const days: { date: Date; completed: boolean; isToday: boolean }[] = []
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - 21 - today.getDay())

  for (let i = 0; i < 28; i++) {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + i)
    days.push({
      date,
      completed: completionSet.has(getDateKey(date)),
      isToday: date.toDateString() === today.toDateString(),
    })
  }

  return days
}

export default function HabitTracker() {
  const { completions, streak, bestStreak, todayComplete, markToday } = useStreak()
  const calendarData = useMemo(() => generateCalendarData(completions), [completions])
  const daysCompleted = completions.length
  const daysRemaining = Math.max(totalDays - daysCompleted, 0)
  const progressPercent = Math.min(Math.round((daysCompleted / totalDays) * 100), 100)

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
          0%, 100% { transform: scale(1) rotate(0deg); opacity: 1; }
          50% { transform: scale(1.15) rotate(2deg); opacity: 0.95; }
        }
      `}</style>

      <header className="px-5 pt-5 pb-3 flex-shrink-0">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] mb-1" style={{ color: "var(--gold)" }}>
          Sanctum
        </p>
        <h1 className="text-2xl font-bold text-balance font-serif" style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
          Your Progress
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        <div
          className="rounded-3xl p-6 mt-3 relative overflow-hidden"
          style={{
            background: "var(--purple-deep)",
            boxShadow: "0 8px 32px rgba(74,50,104,0.25)",
          }}
        >
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-10" style={{ background: "var(--text-on-primary)" }} />
          <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full opacity-10" style={{ background: "var(--text-on-primary)" }} />

          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.15em] mb-1" style={{ color: "rgba(255,255,255,0.7)" }}>
                Current Streak
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-bold" style={{ color: "var(--text-on-primary)", fontFamily: "var(--font-sans)" }}>
                  {streak}
                </span>
                <span className="text-lg font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>days</span>
              </div>
            </div>

            <div className="relative">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.15)", boxShadow: "0 0 40px rgba(201,168,76,0.4)" }}
              >
                <Flame
                  size={48}
                  aria-label="Flame"
                  style={{
                    color: "var(--streak-flame)",
                    filter: "drop-shadow(0 0 12px rgba(255,107,53,0.6))",
                    animation: "flameFlicker 1.5s ease-in-out infinite",
                  }}
                />
              </div>
              <div
                className="absolute inset-0 rounded-full animate-ping opacity-30"
                style={{ background: "transparent", border: "2px solid rgba(255,107,53,0.5)", animationDuration: "2s" }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <Trophy size={14} style={{ color: "rgba(255,255,255,0.6)" }} />
            <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>Best: {bestStreak} days</span>
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          {[
            { icon: <Target size={16} style={{ color: "var(--gold)" }} />, iconBg: "rgba(201,168,76,0.12)", value: daysCompleted, label: "Days Completed" },
            { icon: <Calendar size={16} style={{ color: "var(--purple-deep)" }} />, iconBg: "rgba(74,50,104,0.10)", value: daysRemaining, label: "Days Remaining" },
          ].map((stat) => (
            <div key={stat.label} className="flex-1 rounded-2xl p-4" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2" style={{ background: stat.iconBg }}>
                {stat.icon}
              </div>
              <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{stat.value}</p>
              <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl p-5 mt-4" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Last 4 Weeks</h2>
            <button className="flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-70" style={{ color: "var(--purple-deep)" }}>
              View All <ChevronRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-2">
            {DAYS_OF_WEEK.map((day, i) => (
              <div key={i} className="text-center">
                <span className="text-[10px] font-semibold uppercase" style={{ color: "var(--text-muted)" }}>{day}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {calendarData.map((day, i) => {
              const isCompleted = day.completed
              return (
                <button
                  key={i}
                  onClick={() => day.isToday && markToday()}
                  disabled={!day.isToday}
                  className="aspect-square rounded-xl flex items-center justify-center transition-all"
                  style={
                    day.isToday
                      ? isCompleted
                        ? { background: "var(--gold)", boxShadow: "0 2px 12px rgba(201,168,76,0.4)" }
                        : { background: "var(--surface-card)", border: "2px solid var(--gold)", boxShadow: "0 0 0 4px var(--gold-dim)" }
                      : isCompleted
                        ? { background: "var(--gold)" }
                        : { background: "var(--surface-raised)" }
                  }
                  aria-label={day.isToday ? `Today - ${isCompleted ? "Completed" : "Not completed"}` : `${day.date.toLocaleDateString()} - ${isCompleted ? "Completed" : "Not completed"}`}
                >
                  {isCompleted ? (
                    <Check size={14} strokeWidth={3} style={{ color: "var(--text-on-gold)" }} />
                  ) : day.isToday ? (
                    <span className="text-xs font-bold" style={{ color: "var(--gold)" }}>{day.date.getDate()}</span>
                  ) : null}
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
            {[
              { bg: "var(--gold)", label: "Completed" },
              { bg: "var(--surface-raised)", label: "Missed", border: "1px solid var(--border)" },
              { bg: "var(--surface-card)", label: "Today", border: "2px solid var(--gold)" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ background: item.bg, border: item.border }} />
                <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl p-5 mt-4" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>30-Day Reading Plan</h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Gospel of John</p>
            </div>
            <div className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: "var(--gold-dim)", color: "var(--gold-light)" }}>
              {progressPercent}%
            </div>
          </div>

          <div className="relative h-4 rounded-full overflow-hidden" style={{ background: "var(--surface-raised)" }}>
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%`, background: "linear-gradient(90deg, var(--gold) 0%, var(--gold-light) 100%)", boxShadow: "0 0 12px rgba(201,168,76,0.4)" }}
            />
            <div
              className="absolute inset-y-0 left-0 rounded-full opacity-30"
              style={{ width: `${progressPercent}%`, background: "linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 50%)" }}
            />
          </div>

          <div className="flex items-center justify-between mt-3">
            <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Day {Math.min(daysCompleted, totalDays)} of {totalDays}</span>
            <span className="text-xs font-medium" style={{ color: "var(--gold)" }}>{daysRemaining} days left</span>
          </div>

          <button
            onClick={markToday}
            className="w-full mt-4 py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
            style={
              todayComplete
                ? { background: "var(--gold-dim)", color: "var(--gold-light)", border: "1px solid var(--gold)" }
                : { background: "var(--purple-deep)", color: "var(--text-on-primary)", boxShadow: "0 4px 16px rgba(74,50,104,0.25)" }
            }
            aria-pressed={todayComplete}
          >
            {todayComplete ? "Today Complete" : "Mark Today Complete"}
          </button>
        </div>

        <div
          className="rounded-2xl p-5 mt-4 text-center"
          style={{ background: "var(--gold-dim)", border: "1px solid rgba(201,168,76,0.2)" }}
        >
          <p className="text-sm font-medium italic font-serif leading-relaxed" style={{ color: "var(--purple-deep)" }}>
            &ldquo;Your word is a lamp for my feet, a light on my path.&rdquo;
          </p>
          <p className="text-xs mt-2 font-semibold" style={{ color: "var(--gold)" }}>Psalm 119:105</p>
        </div>
      </div>
    </div>
  )
}
