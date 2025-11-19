import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../lib/apiClient'
import { useAchievementQueue } from './useAchievementQueue'

const API_BASE = import.meta.env.VITE_API_BASE ?? ''
const REFRESH_INTERVAL = 2 * 60 * 1000
const GC_INTERVAL = REFRESH_INTERVAL * 3

const DEFAULT_CEFR = 'A0'
const DEFAULT_XP = 0
const DEFAULT_STREAK = 0

const CEFR_THRESHOLDS = [
  { level: 'A0', min: 0, max: 600 },
  { level: 'A1', min: 600, max: 1500 },
  { level: 'A2', min: 1500, max: 3000 },
  { level: 'B1', min: 3000, max: 5000 },
  { level: 'B2', min: 5000, max: Infinity },
]

const BASE_XP = 10
const PASS_BONUS = 5

function calculateXp(score: number, passed: boolean) {
  const weighted = Math.round(score * 20)
  return Math.max(1, BASE_XP + weighted + (passed ? PASS_BONUS : 0))
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function getThreshold(level: string) {
  return CEFR_THRESHOLDS.find((threshold) => threshold.level === level) ?? CEFR_THRESHOLDS[0]
}

interface UserProgressResponse {
  cefr_level: string
  current_lesson: string
  lesson_index: number
}

interface UserStatsResponse {
  xp: number
  streak: number
  total_attempts: number
  total_passed: number
}

export function useProgressSync() {
  const [xp, setXp] = useState(DEFAULT_XP)
  const [streak, setStreak] = useState(DEFAULT_STREAK)
  const [cefrLevel, setCefrLevel] = useState(DEFAULT_CEFR)
  const [xpFloatDelta, setXpFloatDelta] = useState(0)
  const [xpFloatKey, setXpFloatKey] = useState(0)
  const [streakPulseKey, setStreakPulseKey] = useState(0)
  const xpPendingRef = useRef(false)
  const streakChangeRef = useRef<'increase' | 'decrease' | null>(null)
  const statsHydratedRef = useRef(false)
  const milestoneTrackerRef = useRef<Set<string>>(new Set())
  const { pushAchievement } = useAchievementQueue()

  const progressQuery = useQuery({
    queryKey: ['user', 'progress'],
    queryFn: () => apiFetch<UserProgressResponse>(`${API_BASE}/api/v2/user/progress`),
    staleTime: REFRESH_INTERVAL,
    gcTime: GC_INTERVAL,
    refetchInterval: REFRESH_INTERVAL,
    refetchIntervalInBackground: true,
    retry: 1,
  })

  const statsQuery = useQuery({
    queryKey: ['user', 'stats'],
    queryFn: () => apiFetch<UserStatsResponse>(`${API_BASE}/api/v2/user/stats`),
    staleTime: REFRESH_INTERVAL,
    gcTime: GC_INTERVAL,
    refetchInterval: REFRESH_INTERVAL,
    refetchIntervalInBackground: true,
    retry: 1,
  })

  useEffect(() => {
    if (!progressQuery.data?.cefr_level) return
    setCefrLevel(progressQuery.data.cefr_level ?? DEFAULT_CEFR)
  }, [progressQuery.data])

  useEffect(() => {
    if (!statsQuery.data) return
    const serverXp = statsQuery.data.xp ?? DEFAULT_XP
    const serverStreak = statsQuery.data.streak ?? DEFAULT_STREAK
    const wasHydrated = statsHydratedRef.current
    if (!wasHydrated) {
      statsHydratedRef.current = true
    }

    setXp((prev) => {
      if (!wasHydrated) {
        xpPendingRef.current = false
        return serverXp
      }
      if (xpPendingRef.current) {
        if (serverXp >= prev) {
          xpPendingRef.current = false
          return serverXp
        }
        return prev
      }
      return serverXp > prev ? serverXp : prev
    })

    setStreak((prev) => {
      if (!wasHydrated) {
        streakChangeRef.current = null
        return serverStreak
      }

      const localChange = streakChangeRef.current
      if (!localChange) {
        return serverStreak
      }

      if (localChange === 'increase' && serverStreak >= prev) {
        streakChangeRef.current = null
        return serverStreak
      }

      if (localChange === 'decrease' && serverStreak <= prev) {
        streakChangeRef.current = null
        return serverStreak
      }

      return prev
    })
  }, [statsQuery.data])

  useEffect(() => {
    const tracker = milestoneTrackerRef.current
    const streakMilestones = [10, 20, 50, 100]
    streakMilestones.forEach((milestone) => {
      const key = `streak-${milestone}`
      if (streak >= milestone && !tracker.has(key)) {
        pushAchievement({
          type: 'streak_milestone',
          title: `🔥 ${milestone}-day streak!`,
          message: 'Amazing consistency!',
          color: 'orange',
          soundEffect: 'streakBoost',
        })
        tracker.add(key)
      } else if (streak < milestone && tracker.has(key)) {
        tracker.delete(key)
      }
    })

    const perfectWeekKey = 'perfect-week'
    if (streak === 7 && !tracker.has(perfectWeekKey)) {
      pushAchievement({
        type: 'perfect_streak',
        title: '🔥 Perfect week!',
        message: '7 days without missing a beat.',
        color: 'red',
        soundEffect: 'perfectStreak',
      })
      tracker.add(perfectWeekKey)
    } else if (streak < 7 && tracker.has(perfectWeekKey)) {
      tracker.delete(perfectWeekKey)
    }
  }, [pushAchievement, streak])

  useEffect(() => {
    if (xp <= 0 || xp % 100 !== 0) {
      return
    }
    const tracker = milestoneTrackerRef.current
    const key = `xp-${xp}`
    if (tracker.has(key)) {
      return
    }
    pushAchievement({
      type: 'xp_milestone',
      title: `⭐ ${xp} XP earned!`,
      message: 'Keep it up!',
      color: 'yellow',
      soundEffect: 'achievementBanner',
    })
    tracker.add(key)
  }, [pushAchievement, xp])

  const applyResult = useCallback((score: number, passed: boolean) => {
    const xpGain = calculateXp(score, passed)
    xpPendingRef.current = true
    setXp((prev) => prev + xpGain)
    setStreak((prev) => {
      const next = passed ? prev + 1 : 0
      if (next > prev) {
        setStreakPulseKey((key) => key + 1)
      }
      streakChangeRef.current = passed ? 'increase' : 'decrease'
      return next
    })

    const xpDelta = passed && statsHydratedRef.current ? xpGain : 0
    if (xpDelta > 0) {
      setXpFloatDelta(xpDelta)
      setXpFloatKey((key) => key + 1)
    }
    return xpGain
  }, [])

  const hasProgressData = Boolean(progressQuery.data)
  const isHydrated = statsHydratedRef.current && hasProgressData
  const isLoading = !isHydrated

  const currentThreshold = useMemo(() => getThreshold(cefrLevel), [cefrLevel])
  const xpBandSpan = currentThreshold.max - currentThreshold.min
  const cefrProgress =
    currentThreshold.max === Infinity
      ? 1
      : clamp((xp - currentThreshold.min) / xpBandSpan, 0, 1)

  const xpToNext =
    currentThreshold.max === Infinity ? 0 : Math.max(0, Math.ceil(currentThreshold.max - xp))

  const xpLevelProgress =
    currentThreshold.max === Infinity ? 1 : clamp((xp - currentThreshold.min) / xpBandSpan, 0, 1)

  return {
    xp,
    streak,
    cefrLevel,
    applyResult,
    xpFloatDelta,
    xpFloatKey,
    streakPulseKey,
    isLoading,
    xpToNext,
    xpLevelProgress,
    cefrProgress,
  }
}
