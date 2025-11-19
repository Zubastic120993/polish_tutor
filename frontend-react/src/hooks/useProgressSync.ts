import { useCallback, useMemo, useState } from 'react'

const BASE_XP = 10
const PASS_BONUS = 5

function calculateXp(score: number, passed: boolean) {
  const weighted = Math.round(score * 20)
  return Math.max(1, BASE_XP + weighted + (passed ? PASS_BONUS : 0))
}

function deriveCefr(xp: number) {
  if (xp >= 300) return 'A2'
  if (xp >= 150) return 'A1'
  return 'A0'
}

export function useProgressSync() {
  const [xp, setXp] = useState(0)
  const [streak, setStreak] = useState(0)
  const [xpFloatDelta, setXpFloatDelta] = useState(0)
  const [xpFloatKey, setXpFloatKey] = useState(0)
  const [streakPulseKey, setStreakPulseKey] = useState(0)

  const applyResult = useCallback((score: number, passed: boolean) => {
    const xpGain = calculateXp(score, passed)
    setXp((prev) => prev + xpGain)
    setStreak((prev) => {
      const next = passed ? prev + 1 : 0
      if (next > prev) {
        setStreakPulseKey((key) => key + 1)
      }
      return next
    })

    const xpDelta = passed ? xpGain : 0
    if (xpDelta > 0) {
      setXpFloatDelta(xpDelta)
      setXpFloatKey((key) => key + 1)
    }
  }, [])

  const cefrLevel = useMemo(() => deriveCefr(xp), [xp])

  return { xp, streak, cefrLevel, applyResult, xpFloatDelta, xpFloatKey, streakPulseKey }
}
