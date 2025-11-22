import { useEffect, useState, useMemo } from "react"
import { useNavigate, Link } from "react-router-dom"
import { motion } from "framer-motion"
import { loadCelebrationSnapshot } from "../types/celebration"
import { DEFAULT_LESSON_ID } from "../constants/lessons"
import { GreetingCard } from "../components/GreetingCard"
import { XpHeroCard } from "../components/dashboard/XpHeroCard"
import { DailyGoalCard } from "../components/dashboard/DailyGoalCard"
import { WeeklyXpChart } from "../components/dashboard/WeeklyXpChart"
import { DailyActivityTimeline } from "../components/DailyActivityTimeline"
import {
  GreetingCardSkeleton,
  XpHeroCardSkeleton,
  DailyGoalCardSkeleton,
  WeeklyXpChartSkeleton,
  DailyActivityTimelineSkeleton,
} from "../components/skeletons"
import { LevelUpCelebrationModal } from "../components/celebration/LevelUpCelebrationModal"
import { CelebrationParticles } from "../components/celebration/CelebrationParticles"
// Goal utilities
import { parseGoalText } from "../utils/goalParser"
import { computeGoalProgress } from "../utils/goalProgress"
import { loadGoalStreak, computeGoalStreak, saveGoalStreak } from "../utils/goalStreak"
import { apiFetch } from "../lib/apiClient"
import type { ProfileResponse } from "../types/profile"

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

// ---- TIME-BASED GLOW FUNCTION ----
function getTimeBasedGlow() {
  const hour = new Date().getHours()

  // Morning (5–12): warm amber glow
  if (hour >= 5 && hour < 12) {
    return "radial-gradient(circle at center, rgba(251, 191, 36, 0.15), rgba(251, 191, 36, 0.05), transparent 70%)"
  }

  // Afternoon (12–17): neutral soft daylight glow
  if (hour >= 12 && hour < 17) {
    return "radial-gradient(circle at center, rgba(148, 163, 184, 0.1), rgba(148, 163, 184, 0.05), transparent 70%)"
  }

  // Evening/Night (17–5): subtle indigo glow
  return "radial-gradient(circle at center, rgba(129, 140, 248, 0.12), rgba(129, 140, 248, 0.05), transparent 70%)"
}

// ---- STREAK-THEMED GLOW FUNCTION ----
function getStreakGlow() {
  // Orange/red fire-themed radial glow for Goal Streak Widget
  return "radial-gradient(circle at center, rgba(251, 146, 60, 0.12), rgba(239, 68, 68, 0.08), transparent 70%)"
}

export function DashboardPage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<ProfileResponse | null>(null)
  const [goalStreak, setGoalStreak] = useState(() => loadGoalStreak())
  const [streakCelebration, setStreakCelebration] = useState(false)
  const [showReplay, setShowReplay] = useState(false)
  const replayData = loadCelebrationSnapshot()

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await apiFetch<ProfileResponse>(
          `${API_BASE}/api/v2/user/1/profile-info`
        )
        setProfile(data)

        // 🎯 Compute goal streak
        const parsedGoal = parseGoalText(data.goal_text || "")
        const progress = computeGoalProgress(
          parsedGoal,
          (data as any).xp_today ?? 0,
          (data as any).minutes_today ?? 0,
          (data as any).sessions_today ?? 0,
          (data as any).did_practice_today ?? false
        )

        const didAchieveToday = progress?.completed ?? false

        setGoalStreak((prevStreak) => {
          const next = computeGoalStreak(
            prevStreak.lastAchievedDate,
            didAchieveToday,
            prevStreak.currentStreak
          )

          // Trigger small celebration when streak grows
          if (next.currentStreak > prevStreak.currentStreak && didAchieveToday) {
            setStreakCelebration(true)
            setTimeout(() => setStreakCelebration(false), 2500)
          }

          saveGoalStreak(next)
          return next
        })
      } catch (err) {
        console.error("Failed to load profile:", err)
      }
    }
    loadProfile()
  }, [])

  // SMART REMINDER DATA
  const parsedGoal = useMemo(
    () => parseGoalText(profile?.goal_text ?? ''),
    [profile?.goal_text],
  )

  const goalProgress = useMemo(() => {
    if (!profile) return null
    return computeGoalProgress(
      parsedGoal,
      (profile as any).xp_today ?? 0,
      (profile as any).minutes_today ?? 0,
      (profile as any).sessions_today ?? 0,
      (profile as any).did_practice_today ?? false,
    )
  }, [parsedGoal, profile])

  const practicedToday = Boolean((profile as any)?.did_practice_today || (profile as any)?.xp_today > 0)

  const shouldShowReminder =
    !practicedToday ||
    (goalProgress && !goalProgress.completed) ||
    ((profile?.current_streak ?? 0) > 0 && !practicedToday)

  function getSmartReminderMessage() {
    const streak = profile?.current_streak ?? 0

    if (streak >= 3) {
      return `🔥 You're on a ${streak}-day streak — keep it going!`
    }

    if (goalProgress && goalProgress.target > 0) {
      if (goalProgress.progress >= 0.7) {
        return `You're close! Only ${goalProgress.target - goalProgress.current} left to reach your goal.`
      }
      if (goalProgress.progress > 0) {
        return `Keep going! You're ${Math.round(goalProgress.progress * 100)}% towards your daily goal.`
      }
      return `🎯 Complete your daily goal to stay on track!`
    }

    if (practicedToday) {
      return `Great work today! Ready for more practice?`
    }

    return `Don't forget to practice today! 💪`
  }

  const cards = [
    {
      title: "Daily Practice",
      desc: "Train Polish today",
      icon: "📝",
      color: "from-blue-50 to-blue-100",
      action: () => navigate("/practice"),
    },
    {
      title: "Lessons",
      desc: "Chat through your lessons",
      icon: "💬",
      color: "from-violet-50 to-violet-100",
      action: () => navigate(`/lesson/${DEFAULT_LESSON_ID}`),
    },
    {
      title: "Weekly Stats",
      desc: "Track weekly performance",
      icon: "📊",
      color: "from-emerald-50 to-emerald-100",
      action: () => navigate("/weekly-stats"),
    },
    {
      title: "Badges",
      desc: "View achievements",
      icon: "🏅",
      color: "from-yellow-50 to-yellow-100",
      action: () => navigate("/badges"),
    },
    {
      title: "Profile",
      desc: "Your XP, streak, goals",
      icon: "👤",
      color: "from-slate-50 to-slate-100",
      action: () => navigate("/profile"),
    },
    {
      title: "Settings",
      desc: "App preferences",
      icon: "⚙️",
      color: "from-slate-100 to-slate-200",
      action: () => navigate("/settings"),
    },
  ]

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white/98 to-slate-50 p-4 sm:p-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800">
              Dashboard
            </h1>
          </div>
          <GreetingCardSkeleton />
          <XpHeroCardSkeleton />
          <DailyGoalCardSkeleton />
          <WeeklyXpChartSkeleton />
          <DailyActivityTimelineSkeleton />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white/98 sm:via-white/95 to-slate-50 p-4 sm:p-6 pb-20">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800">
            Dashboard
          </h1>
          <motion.button
            whileHover={{ rotate: 90, scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate("/settings")}
            className="text-2xl hover:rotate-90 transition-transform p-2 -mr-2
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400
                       active:scale-95"
            aria-label="Settings"
          >
            ⚙️
          </motion.button>
        </div>

        {/* Daily Greeting Card */}
        {profile && <GreetingCard username={profile.username} />}

        {/* DAILY PRACTICE REMINDER BANNER */}
        {shouldShowReminder && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-2xl border border-amber-200 bg-amber-50 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 mb-4 sm:mb-6"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl text-amber-600">🔔</span>
              <p className="text-amber-800 font-semibold text-lg">
                {getSmartReminderMessage()}
              </p>
            </div>
            <Link
              to="/practice"
              className="relative flex-shrink-0 rounded-xl bg-amber-500 text-white px-4 py-2 
                         text-sm font-semibold transition-all duration-300 ease-out
                         hover:bg-amber-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400
                         active:scale-95 touch-target"
            >
              Start Practice
            </Link>
          </motion.div>
        )}

        {/* XP HERO WIDGET */}
        {profile && (
          <div className="relative mb-6 sm:mb-8 max-w-4xl mx-auto">
            {/* Time-based soft radial glow behind the card */}
            <div
              className="absolute inset-0 blur-3xl opacity-40 pointer-events-none -z-10"
              style={{
                background: getTimeBasedGlow(),
              }}
            />

            <XpHeroCard
              totalXp={profile.total_xp}
              level={profile.level}
              streak={profile.current_streak}
            />
          </div>
        )}

        {/* Daily Goal Widget */}
        <div className="max-w-4xl mx-auto mt-4 sm:mt-6 w-full">
          <DailyGoalCard
            goalText={profile?.goal_text ?? null}
            onGoalUpdated={(newGoal) => {
              if (profile) {
                setProfile({ ...profile, goal_text: newGoal })
              }
            }}
          />
        </div>

        {/* Goal Streak Widget */}
        {profile && (
          <div className="relative mt-4 mb-4 sm:mb-6 max-w-4xl mx-auto w-full px-4">
            {/* Orange/red radial glow behind the streak widget */}
            <div
              className="absolute inset-0 blur-3xl opacity-35 pointer-events-none -z-10"
              style={{
                background: getStreakGlow(),
              }}
            />
            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
              className="relative bg-white rounded-3xl p-4 sm:p-6 md:p-8 shadow-[0_6px_18px_rgba(15,23,42,0.06)] border border-slate-200
                         transition-all duration-300
                         hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)] active:scale-[0.98]
                         focus-within:ring-2 focus-within:ring-amber-400 cursor-pointer"
            >
              {/* Warm orange/red streak-themed gradient - consistent pattern */}
              <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-orange-50/50 via-red-50/30 to-transparent opacity-[0.25] sm:opacity-[0.35]" />
              {/* Celebration Burst */}
              {streakCelebration && (
                <CelebrationParticles count={22} size={10} opacity={0.3} />
              )}

              <div className="flex items-center justify-between relative z-10">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
                    Goal Streak
                  </p>
                  <p className="text-3xl font-extrabold mt-1 text-slate-900 flex items-center gap-3">
                    <motion.span
                      className="text-4xl mr-3"
                      animate={{
                        scale: [1, 1.12, 1],
                        opacity: [1, 0.85, 1],
                      }}
                      transition={{
                        duration: 2.4,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      whileHover={{ rotate: [0, -6, 6, -6, 0], scale: 1.2 }}
                    >
                      🔥
                    </motion.span>
                    {goalStreak.currentStreak}
                  </p>
                </div>

                {/* Perfect Goal Week */}
                {goalStreak.currentStreak >= 7 && (
                  <div className="text-green-600 font-semibold text-lg flex items-center gap-2">
                    🌟 Perfect Week!
                  </div>
                )}
              </div>

              <p className="text-sm mt-3 text-slate-600 relative z-10">
                {goalStreak.currentStreak === 0 &&
                  "Set a daily goal and complete it to start a streak"}
                {goalStreak.currentStreak === 1 &&
                  "Great start! Keep going!"}
                {goalStreak.currentStreak > 1 &&
                  `You've completed your goal for ${goalStreak.currentStreak} days in a row`}
              </p>
            </motion.div>
          </div>
        )}

        {/* Goal Progress Bar */}
        {goalProgress && parsedGoal && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="max-w-4xl mx-auto w-full mt-4 px-4"
          >
            <motion.div
              whileHover={{ scale: 1.01, y: -2 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="relative rounded-3xl bg-white 
                         shadow-[0_4px_14px_rgba(15,23,42,0.06)]
                         p-4 sm:p-6 md:p-8 mb-6 sm:mb-8 cursor-pointer
                         transition-all duration-300 ease-out"
            >
              {/* Subtle progress gradient - consistent pattern */}
              <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-blue-50/40 via-blue-50/20 to-transparent opacity-[0.28] sm:opacity-[0.4]" />
              
              <div className="flex items-center justify-between mb-2 relative z-10">
                <p className="text-sm font-semibold text-slate-700">
                  Daily Progress
                </p>

                {/* Progress Label */}
                <p className="text-sm font-medium text-slate-600">
                  {goalProgress.label}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="h-3 bg-slate-200 rounded-full overflow-hidden relative z-10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${goalProgress.progress * 100}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className={`h-full rounded-full ${
                    goalProgress.completed
                      ? "bg-emerald-500"
                      : "bg-blue-500"
                  }`}
                />
              </div>

              {/* Completion Glow */}
              {goalProgress.completed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="mt-3 text-sm font-semibold text-emerald-600 flex items-center gap-2 relative z-10"
                >
                  <span className="text-lg">✨</span> Goal Completed!
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* Weekly XP Chart */}
        <div className="max-w-4xl mx-auto px-4 w-full mt-4 sm:mt-6">
          <WeeklyXpChart />
        </div>

        {/* Daily Activity Timeline */}
        <div className="mt-4 sm:mt-6 max-w-4xl mx-auto px-4 w-full">
          <DailyActivityTimeline />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 mt-6 sm:mt-8">
          {cards.map((c) => (
            <motion.div
              key={c.title}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={c.action}
              className={`cursor-pointer rounded-3xl shadow-sm bg-gradient-to-br ${c.color} p-4 sm:p-6`}
            >
              <div className="text-4xl mb-4">{c.icon}</div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">{c.title}</h2>
              <p className="text-slate-600">{c.desc}</p>
            </motion.div>
          ))}

          {/* Replay Celebration card */}
          {replayData && (
            <motion.div
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setShowReplay(true)} 
              className="cursor-pointer rounded-3xl shadow-sm bg-gradient-to-br from-purple-50 to-purple-100 p-4 sm:p-6"
            >
              <div className="text-4xl mb-4">🎉</div>
              <h2 className="text-xl font-bold text-purple-900">Replay Celebration</h2>
              <p className="text-purple-700">
                Your last level up: Level {replayData.levelAfter}
              </p>
            </motion.div>
          )}
        </div>

        {/* REPLAY CELEBRATION MODAL */}
        {replayData && (
          <LevelUpCelebrationModal
            visible={showReplay}
            level={replayData.levelAfter}
            xpGained={replayData.xpGained}
            newBadges={replayData.newBadges}
            onClose={() => setShowReplay(false)}
          />
        )}

        {/* PARTICLES */}
        {showReplay && <CelebrationParticles count={60} />}
      </div>
    </div>
  )
}

