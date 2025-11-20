import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { apiFetch } from '../lib/apiClient'
import type { WeeklyStatsResponse } from '../types/weekly'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })
}

export function WeeklyStatsPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<WeeklyStatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchWeeklyStats = async () => {
      try {
        const data = await apiFetch<WeeklyStatsResponse>(`${API_BASE}/api/v2/practice/weekly-stats?user_id=1`)
        setStats(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchWeeklyStats()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-100">
        <div className="text-slate-500">Loading...</div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-100">
        <div className="text-red-500">Error: {error ?? 'Failed to load stats'}</div>
      </div>
    )
  }

  // Prepare chart data
  const chartData = stats.days.map(day => ({
    date: day.date.slice(5), // e.g., "11-20"
    xp: day.xp,
    minutes: Math.floor(day.time_seconds / 60)
  }))

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
            Weekly Progress
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Your Last 7 Days</h1>
        </div>

        {/* Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6 rounded-xl bg-slate-50 p-5"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-slate-500">Sessions</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{stats.total_sessions}</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-slate-500">XP</p>
              <p className="mt-2 text-3xl font-bold text-amber-600">{stats.total_xp}</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-slate-500">Time</p>
              <p className="mt-2 text-3xl font-bold text-blue-600">
                {formatDuration(stats.total_time_seconds)}
              </p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-slate-500">Active Days</p>
              <p className="mt-2 text-3xl font-bold text-emerald-600">{stats.weekly_streak}</p>
            </div>
          </div>
        </motion.div>

        {/* XP Chart */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="mt-8 rounded-xl bg-white p-5 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-slate-600 mb-3">
            XP Over Last 7 Days
          </h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="xp" fill="#f59e0b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Time Chart */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.25 }}
          className="mt-6 rounded-xl bg-white p-5 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-slate-600 mb-3">
            Time Spent (Minutes)
          </h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="minutes" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Daily Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.35 }}
          className="mt-8 rounded-xl bg-white p-4 shadow-lg"
        >
          <h2 className="mb-4 text-lg font-bold text-slate-900">Daily Breakdown</h2>
          <div className="space-y-4">
            {stats.days.map((day) => (
              <div
                key={day.date}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">{formatDate(day.date)}</p>
                  <p className="text-xs text-slate-500">
                    {day.sessions} {day.sessions === 1 ? 'session' : 'sessions'}
                  </p>
                </div>
                <div className="flex gap-6 text-right">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">XP</p>
                    <p className="text-lg font-bold text-amber-600">{day.xp}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">Time</p>
                    <p className="text-lg font-bold text-blue-600">
                      {formatDuration(day.time_seconds)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.45 }}
          className="mt-8 flex flex-col gap-3"
        >
          <button
            type="button"
            onClick={() => navigate('/badges')}
            className="w-full rounded-full bg-amber-500 px-4 py-3 font-semibold text-white shadow hover:bg-amber-400"
          >
            🏆 View Achievements
          </button>
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="w-full rounded-full bg-blue-500 px-4 py-3 font-semibold text-white shadow hover:bg-blue-400 transition active:scale-95"
          >
            👤 View Profile →
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full rounded-full border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 shadow hover:bg-slate-50"
          >
            Back to Home
          </button>
        </motion.div>
      </div>
    </div>
  )
}

