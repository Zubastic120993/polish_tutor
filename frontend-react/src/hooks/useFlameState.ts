import { useEffect, useRef, useState } from 'react'

export type FlameMode = 'idle' | 'boost' | 'perfect' | 'collapse' | 'sleep'

const PERFECT_STREAK_THRESHOLD = 10
const BOOST_DURATION = 400
const COLLAPSE_DURATION = 320
const IDLE_TIMEOUT = 5 * 60 * 1000
const IDLE_CHECK_INTERVAL = 60 * 1000

export function useFlameState(streak: number, pulseKey: number) {
  const [flameMode, setFlameMode] = useState<FlameMode>('idle')
  const [sparkTrigger, setSparkTrigger] = useState(0)
  const [isPerfectStreak, setIsPerfectStreak] = useState(false)
  const lastActivityRef = useRef(Date.now())
  const prevStreakRef = useRef(streak)
  const boostTimeoutRef = useRef<number | null>(null)
  const collapseTimeoutRef = useRef<number | null>(null)
  const boostLockRef = useRef(false)
  const collapseLockRef = useRef(false)

  const hasWindow = typeof window !== 'undefined'

  useEffect(() => {
    if (!hasWindow) {
      return
    }
    return () => {
      if (boostTimeoutRef.current) {
        window.clearTimeout(boostTimeoutRef.current)
      }
      if (collapseTimeoutRef.current) {
        window.clearTimeout(collapseTimeoutRef.current)
      }
    }
  }, [hasWindow])

  useEffect(() => {
    setIsPerfectStreak(streak >= PERFECT_STREAK_THRESHOLD)
  }, [streak])

  useEffect(() => {
    if (!hasWindow || pulseKey === 0) {
      return
    }
    boostLockRef.current = true
    lastActivityRef.current = Date.now()
    setFlameMode('boost')
    setSparkTrigger((prev) => prev + 1)
    if (boostTimeoutRef.current) {
      window.clearTimeout(boostTimeoutRef.current)
    }
    boostTimeoutRef.current = window.setTimeout(() => {
      boostLockRef.current = false
      setFlameMode((current) => {
        if (collapseLockRef.current) {
          return current
        }
        return streak >= PERFECT_STREAK_THRESHOLD ? 'perfect' : 'idle'
      })
    }, BOOST_DURATION)
  }, [hasWindow, pulseKey, streak])

  useEffect(() => {
    const previous = prevStreakRef.current
    if (streak === previous) {
      return
    }
    prevStreakRef.current = streak

    if (streak === 0 && previous > 0) {
      if (!hasWindow) {
        setFlameMode('collapse')
        setTimeout(() => setFlameMode('idle'), COLLAPSE_DURATION)
        return
      }
      collapseLockRef.current = true
      lastActivityRef.current = Date.now()
      setFlameMode('collapse')
      if (collapseTimeoutRef.current) {
        window.clearTimeout(collapseTimeoutRef.current)
      }
      collapseTimeoutRef.current = window.setTimeout(() => {
        collapseLockRef.current = false
        setFlameMode('idle')
      }, COLLAPSE_DURATION)
      return
    }

    lastActivityRef.current = Date.now()
    const perfect = streak >= PERFECT_STREAK_THRESHOLD

    if (flameMode === 'sleep') {
      setFlameMode(perfect ? 'perfect' : 'idle')
      return
    }

    if (boostLockRef.current || collapseLockRef.current) {
      return
    }

    if (perfect && flameMode !== 'perfect') {
      setFlameMode('perfect')
    } else if (!perfect && flameMode === 'perfect') {
      setFlameMode('idle')
    }
  }, [flameMode, hasWindow, streak])

  useEffect(() => {
    if (!hasWindow) {
      return
    }
    const intervalId = window.setInterval(() => {
      if (boostLockRef.current || collapseLockRef.current) {
        return
      }
      const idleTime = Date.now() - lastActivityRef.current
      if (idleTime >= IDLE_TIMEOUT) {
        setFlameMode((current) => (current === 'sleep' ? current : 'sleep'))
      }
    }, IDLE_CHECK_INTERVAL)

    return () => window.clearInterval(intervalId)
  }, [hasWindow])

  return { flameMode, sparkTrigger, isPerfectStreak }
}
