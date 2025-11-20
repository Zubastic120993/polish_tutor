import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { PracticeSummary } from '../types/practice'
import type { BadgeBase, AllBadgesResponse } from '../types/badges'
import { DEFAULT_LESSON_ID } from '../constants/lessons'
import { apiFetch } from '../lib/apiClient'
import { BadgeUnlockModal } from '../components/badges/BadgeUnlockModal'

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function PracticeSummaryPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [unlockedBadges, setUnlockedBadges] = useState<BadgeBase[] | null>(null)

  const summary: PracticeSummary =
    (location.state as PracticeSummary | undefined) ?? {
      packId: 'daily_pack',
      total: 0,
      correct: 0,
      attempts: [],
    }

  const accuracy = summary.total ? Math.round((summary.correct / summary.total) * 100) : 0

  // Fetch badge data when unlocked_badges are present
  useEffect(() => {
    const fetchUnlockedBadges = async () => {
      if (summary.unlocked_badges && summary.unlocked_badges.length > 0) {
        try {
          // Fetch all badges
          const allBadgesData = await apiFetch<AllBadgesResponse>(`${API_BASE}/api/v2/badges/all`)
          
          // Create a map of badge codes to badge objects
          const badgeMap = new Map(
            allBadgesData.badges.map(b => [b.code, b])
          )
          
          // Resolve badge codes to full badge objects
          const resolved = summary.unlocked_badges
            .map(code => badgeMap.get(code))
            .filter((badge): badge is BadgeBase => badge !== undefined)
          
          if (resolved.length > 0) {
            setUnlockedBadges(resolved)
          }
        } catch (error) {
          console.error('Failed to fetch badge data:', error)
        }
      }
    }

    fetchUnlockedBadges()
  }, [summary.unlocked_badges])

  return (
    <>
      {/* Badge Unlock Modal */}
      {unlockedBadges && unlockedBadges.length > 0 && (
        <BadgeUnlockModal
          badges={unlockedBadges}
          onComplete={() => setUnlockedBadges(null)}
        />
      )}

      {/* Summary Page */}
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-100 px-4 py-12">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-lg rounded-3xl bg-white p-10 text-center shadow-xl"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
          Daily Practice
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Pack complete!</h1>
        <p className="mt-1 text-sm text-slate-500">Pack ID: {summary.packId}</p>

        <div className="mt-8 grid grid-cols-2 gap-4 text-left">
          <div className="rounded-2xl bg-blue-50 p-5">
            <p className="text-xs font-semibold uppercase text-blue-600">Accuracy</p>
            <p className="mt-2 text-3xl font-bold text-blue-800">{accuracy}%</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-5">
            <p className="text-xs font-semibold uppercase text-emerald-600">Correct</p>
            <p className="mt-2 text-3xl font-bold text-emerald-800">
              {summary.correct}/{summary.total}
            </p>
          </div>
        </div>

        {/* XP Breakdown */}
        {summary.xp_total !== undefined && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="mt-6 rounded-2xl bg-amber-50 p-5 text-left"
          >
            <p className="text-xs font-semibold uppercase text-amber-600">XP Breakdown</p>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <div className="flex justify-between">
                <span>XP from phrases:</span>
                <span className="font-semibold">{summary.xp_from_phrases ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Session bonus:</span>
                <span className="font-semibold text-amber-700">+{summary.xp_session_bonus ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Streak bonus:</span>
                <span className="font-semibold text-amber-700">+{summary.xp_streak_bonus ?? 0}</span>
              </div>
              <div className="my-2 border-t border-amber-200"></div>
              <div className="flex justify-between text-base font-bold text-amber-900">
                <span>Total XP:</span>
                <span>{summary.xp_total}</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Streak Info */}
        {summary.streak_after !== undefined && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="mt-4 rounded-2xl bg-violet-50 p-5 text-left"
          >
            <p className="text-xs font-semibold uppercase text-violet-600">Streak</p>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <div className="flex justify-between">
                <span>Streak before:</span>
                <span className="font-semibold">{summary.streak_before ?? 0} days</span>
              </div>
              <div className="flex justify-between">
                <span>Streak now:</span>
                <span className="font-semibold text-violet-700">{summary.streak_after} days</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Session Duration */}
        {summary.session_duration !== undefined && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="mt-4 rounded-2xl bg-slate-100 p-5 text-left"
          >
            <p className="text-xs font-semibold uppercase text-slate-600">Session Duration</p>
            <p className="mt-2 text-2xl font-bold text-slate-800">
              {formatDuration(summary.session_duration)}
            </p>
          </motion.div>
        )}

        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => navigate('/practice', { replace: true })}
            className="w-full rounded-full bg-blue-600 px-4 py-3 text-white shadow hover:bg-blue-500"
          >
            Do again
          </button>
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
          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/badge-history')}
              className="text-sm text-amber-600 hover:underline"
            >
              View History →
            </button>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/lesson/${DEFAULT_LESSON_ID}`, { replace: true })}
            className="w-full rounded-full border border-slate-200 px-4 py-3 font-semibold text-slate-700 shadow hover:bg-slate-50"
          >
            Return Home
          </button>
        </div>
      </motion.div>
    </div>
    </>
  )
}
