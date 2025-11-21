import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { PracticeSummary } from '../types/practice'
import type { BadgeBase, AllBadgesResponse } from '../types/badges'
import { DEFAULT_LESSON_ID } from '../constants/lessons'
import { apiFetch } from '../lib/apiClient'
import { BadgeUnlockModal } from '../components/badges/BadgeUnlockModal'
import { useCelebration } from '../hooks/useCelebration'
import { XpGainToast } from '../components/celebration/XpGainToast'
import { LevelUpCelebrationModal } from '../components/celebration/LevelUpCelebrationModal'
import { CelebrationParticles } from '../components/celebration/CelebrationParticles'
import { saveCelebrationSnapshot, loadCelebrationSnapshot } from '../types/celebration'
import type { CelebrationSnapshot } from '../types/celebration'

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

  // Celebration hook
  const {
    fetchProfile,
    triggerCelebration,
    toastVisible,
    modalVisible,
    xpGained,
    newBadges,
    level,
    closeModal,
  } = useCelebration()

  const summary: PracticeSummary =
    (location.state as PracticeSummary | undefined) ?? {
      packId: 'daily_pack',
      total: 0,
      correct: 0,
      attempts: [],
    }

  // Store REAL backend session results
  const [sessionResult, setSessionResult] = useState<any | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [sessionError, setSessionError] = useState<string | null>(null)

  // Replay celebration state
  const [showReplayCelebration, setShowReplayCelebration] = useState(false)
  const [replayCelebrationData] = useState(() => loadCelebrationSnapshot())

  const accuracy = summary.total ? Math.round((summary.correct / summary.total) * 100) : 0

  // Call /end-session to finalize practice and trigger celebration
  useEffect(() => {
    const processSession = async () => {
      try {
        if (!summary.sessionId) {
          setSessionError('Missing sessionId — cannot finalize session.')
          setLoadingSession(false)
          return
        }

        // 1) Fetch profile BEFORE session (for level/badge diff)
        const profileBefore = await fetchProfile()

        // 2) Call backend to finalize the session
        const result = await apiFetch(`${API_BASE}/api/v2/practice/end-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: summary.sessionId,
            correct_phrases: summary.correct,
            total_phrases: summary.total,
            xp_from_phrases: summary.attempts.reduce((sum, a) => sum + (a.passed ? 10 : 0), 0),
          }),
        })

        // Store real backend response
        setSessionResult(result)

        // Save celebration snapshot for replay
        const snapshot: CelebrationSnapshot = {
          sessionId: summary.sessionId,
          timestamp: new Date().toISOString(),
          xpGained: (result.xp_total ?? 0) - (profileBefore?.total_xp ?? 0),
          levelBefore: profileBefore?.level ?? 1,
          levelAfter: result.level ?? profileBefore?.level ?? 1,
          newBadges: (result.unlocked_badges ?? []).map((code: string) => ({
            code,
            name: code,
            icon: '🏆',
          })),
        }
        saveCelebrationSnapshot(snapshot)

        // 3) Trigger celebration (XP toast, level-up modal, badge modal)
        await triggerCelebration(profileBefore)
      } catch (err: any) {
        console.error('Error finalizing session:', err)
        setSessionError(err?.message ?? 'Unknown error')
      } finally {
        setLoadingSession(false)
      }
    }

    processSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch badge data when unlocked_badges are present from backend result
  useEffect(() => {
    const fetchUnlockedBadges = async () => {
      const badges = sessionResult?.unlocked_badges
      if (badges && badges.length > 0) {
        try {
          // Fetch all badges
          const allBadgesData = await apiFetch<AllBadgesResponse>(`${API_BASE}/api/v2/badges/all`)
          
          // Create a map of badge codes to badge objects
          const badgeMap = new Map(
            allBadgesData.badges.map(b => [b.code, b])
          )
          
          // Resolve badge codes to full badge objects
          const resolved = badges
            .map((code: string) => badgeMap.get(code))
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
  }, [sessionResult?.unlocked_badges])

  return (
    <>
      {/* XP Gain Toast */}
      {toastVisible && (
        <XpGainToast
          visible={toastVisible}
          xp={xpGained}
          onClose={() => {}}
        />
      )}

      {/* Level-Up Celebration Modal */}
      {modalVisible && level && (
        <LevelUpCelebrationModal
          visible={modalVisible}
          level={level}
          xpGained={xpGained}
          newBadges={newBadges}
          onClose={closeModal}
        />
      )}

      {/* Badge Unlock Modal */}
      {unlockedBadges && unlockedBadges.length > 0 && (
        <BadgeUnlockModal
          badges={unlockedBadges}
          onComplete={() => setUnlockedBadges(null)}
        />
      )}

      {/* Replay Celebration Modal */}
      {showReplayCelebration && replayCelebrationData && (
        <>
          <CelebrationParticles count={60} />
          <LevelUpCelebrationModal
            visible={showReplayCelebration}
            level={replayCelebrationData.levelAfter}
            xpGained={replayCelebrationData.xpGained}
            newBadges={replayCelebrationData.newBadges}
            onClose={() => setShowReplayCelebration(false)}
          />
        </>
      )}

      {/* Summary Page */}
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-100 px-4 py-12">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-lg rounded-3xl bg-white p-10 text-center shadow-xl"
      >
        {/* Loading state while waiting for backend */}
        {loadingSession && (
          <div className="text-center py-10">
            <p className="text-lg font-medium text-slate-600">Finalizing your session…</p>
            <p className="text-sm text-slate-400 mt-2">Calculating XP, streak, badges…</p>
          </div>
        )}

        {/* Error state */}
        {sessionError && (
          <div className="text-center py-6">
            <p className="text-red-600 font-medium mb-4">Error finalizing session: {sessionError}</p>
            <button
              onClick={() => navigate('/practice')}
              className="px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-500"
            >
              Return to Practice
            </button>
          </div>
        )}

        {/* Main content - only show after sessionResult arrives */}
        {!loadingSession && !sessionError && sessionResult && (
          <>
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

            {/* XP Breakdown - using REAL backend data */}
            {sessionResult.xp_total !== undefined && (
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
                    <span className="font-semibold">{sessionResult.xp_from_phrases ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Session bonus:</span>
                    <span className="font-semibold text-amber-700">+{sessionResult.xp_session_bonus ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Streak bonus:</span>
                    <span className="font-semibold text-amber-700">+{sessionResult.xp_streak_bonus ?? 0}</span>
                  </div>
                  <div className="my-2 border-t border-amber-200"></div>
                  <div className="flex justify-between text-base font-bold text-amber-900">
                    <span>Total XP:</span>
                    <span>{sessionResult.xp_total}</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Streak Info - using REAL backend data */}
            {sessionResult.streak_after !== undefined && (
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
                    <span className="font-semibold">{sessionResult.streak_before ?? 0} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Streak now:</span>
                    <span className="font-semibold text-violet-700">{sessionResult.streak_after} days</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Session Duration - using REAL backend data */}
            {sessionResult.session_duration_seconds !== undefined && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.3 }}
                className="mt-4 rounded-2xl bg-slate-100 p-5 text-left"
              >
                <p className="text-xs font-semibold uppercase text-slate-600">Session Duration</p>
                <p className="mt-2 text-2xl font-bold text-slate-800">
                  {formatDuration(sessionResult.session_duration_seconds)}
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
              
              {/* Replay Celebration Button */}
              {replayCelebrationData && (
                <button
                  type="button"
                  onClick={() => setShowReplayCelebration(true)}
                  className="w-full rounded-full bg-purple-600 px-4 py-3 font-semibold text-white shadow hover:bg-purple-700 transition"
                >
                  ✨ Replay Celebration
                </button>
              )}
              
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
          </>
        )}
      </motion.div>
    </div>
    </>
  )
}
