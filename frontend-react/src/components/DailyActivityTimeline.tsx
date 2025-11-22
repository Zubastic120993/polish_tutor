import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { apiFetch } from "../lib/apiClient"
import type { WeeklyStatsResponse } from "../types/weekly"

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

interface TimelineEvent {
  time: string
  type: "xp" | "session" | "streak"
  value: number
  label: string
}

export function DailyActivityTimeline() {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const data = await apiFetch<WeeklyStatsResponse>(
          `${API_BASE}/api/v2/practice/weekly-stats?user_id=1`
        )

        const today = new Date().toISOString().slice(0, 10)

        const todayEntry = data.days.find((d) => d.date === today) ?? null

        if (!todayEntry) {
          setEvents([])
          setLoading(false)
          return
        }

        const todayEvents: TimelineEvent[] = []

        if (todayEntry.sessions > 0) {
          todayEvents.push({
            time: "08:00",
            type: "session",
            value: todayEntry.sessions,
            label: `${todayEntry.sessions} practice session${todayEntry.sessions > 1 ? "s" : ""}`
          })
        }

        if (todayEntry.xp > 0) {
          todayEvents.push({
            time: "12:00",
            type: "xp",
            value: todayEntry.xp,
            label: `+${todayEntry.xp} XP earned`
          })
        }

        if (todayEntry.time_seconds > 0) {
          const minutes = Math.floor(todayEntry.time_seconds / 60)
          todayEvents.push({
            time: "18:00",
            type: "streak",
            value: minutes,
            label: `Studied ${minutes} minutes`
          })
        }

        setEvents(todayEvents)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-4 sm:p-6 md:p-8 shadow-sm">
        <p className="text-slate-500 text-sm">Loading daily activity…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl p-4 sm:p-6 md:p-8 shadow-sm">
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-4 sm:p-6 md:p-8 shadow-sm">
        <p className="text-slate-500 text-sm">No activity yet today.</p>
      </div>
    )
  }

  const iconFor = (t: TimelineEvent) =>
    t.type === "xp" ? "⚡" : t.type === "session" ? "📘" : "🔥"

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative bg-white rounded-3xl p-4 sm:p-6 md:p-8 shadow-[0_4px_14px_rgba(15,23,42,0.06)]
                 transition-all duration-300 hover:shadow-md active:scale-[0.98]
                 focus-within:ring-2 focus-within:ring-amber-400"
    >
      {/* Subtle timeline gradient - consistent pattern */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-slate-50/40 via-slate-50/20 to-transparent opacity-[0.25] sm:opacity-[0.35]" />
      
      <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 sm:mb-4 relative z-10">Today's Activity</h2>
      <div className="space-y-4 relative z-10">
        {events.map((ev, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.15 }}
            className="flex items-start gap-3 cursor-pointer transition-transform duration-200
                       hover:scale-[1.02] active:scale-[0.97]
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400
                       touch-target"
          >
            <motion.div
              className="text-3xl"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.15 }}
              transition={{ type: "spring", stiffness: 260, damping: 16 }}
            >
              {iconFor(ev)}
            </motion.div>
            <div>
              <p className="font-medium text-slate-800">{ev.label}</p>
              <p className="text-xs text-slate-500">{ev.time}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

