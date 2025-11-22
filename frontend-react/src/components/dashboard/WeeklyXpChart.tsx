import { useEffect, useState } from "react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts"
import { motion } from "framer-motion"
import { apiFetch } from "../../lib/apiClient"
import type { WeeklyStatsResponse } from "../../types/weekly"

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

interface DailyXpEntry {
  date: string
  xp: number
}

export function WeeklyXpChart() {
  const [data, setData] = useState<DailyXpEntry[]>([])
  const [loading, setLoading] = useState(true)

  // Add CSS animation for pulsing bars
  useEffect(() => {
    const styleId = 'weekly-xp-pulse-animation'
    if (document.getElementById(styleId)) return
    
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      @keyframes pulse-glow {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.85; }
      }
    `
    document.head.appendChild(style)
    return () => {
      const existingStyle = document.getElementById(styleId)
      if (existingStyle) {
        document.head.removeChild(existingStyle)
      }
    }
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch<WeeklyStatsResponse>(
          `${API_BASE}/api/v2/practice/weekly-stats?user_id=1`
        )
        const entries =
          res?.days?.map((d) => ({
            date: d.date.slice(5), // show MM-DD
            xp: d.xp ?? 0,
          })) ?? []

        setData(entries)
      } catch (err) {
        console.error("Failed to load weekly stats:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative bg-white rounded-3xl shadow-[0_4px_14px_rgba(15,23,42,0.06)] p-4 sm:p-6 md:p-8
                 transition-all duration-300 hover:shadow-md active:scale-[0.98]
                 focus-within:ring-2 focus-within:ring-amber-400 cursor-pointer"
    >
      {/* Subtle chart gradient - consistent pattern */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-amber-50/35 via-amber-50/20 to-transparent opacity-[0.25] sm:opacity-[0.35]" />
      
      <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 sm:mb-4 relative z-10">Weekly XP</h2>
      {loading ? (
        <div className="text-slate-500 text-sm relative z-10">Loading…</div>
      ) : (
        <div className="h-48 relative z-10">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="xp" fill="#f59e0b" radius={[6, 6, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.xp > 100 ? "#fbbf24" : "#f59e0b"}
                    opacity={entry.xp > 100 ? undefined : 1}
                    className="transition-all duration-200 hover:opacity-80 active:scale-y-90"
                    style={{
                      filter: entry.xp > 100 ? "drop-shadow(0 0 6px rgba(251, 191, 36, 0.5))" : "none",
                      animation: entry.xp > 100 ? "pulse-glow 1.8s ease-in-out infinite" : undefined,
                    }}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  )
}

