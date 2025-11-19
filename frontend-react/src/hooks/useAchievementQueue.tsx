import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { MotivationSoundKey } from '../lib/motivationSounds'

export interface Achievement {
  id: string
  type: 'streak_milestone' | 'daily_goal' | 'lesson_complete' | 'xp_milestone' | 'perfect_streak'
  title: string
  message: string
  color: 'orange' | 'green' | 'blue' | 'yellow' | 'red'
  soundEffect?: MotivationSoundKey
  duration?: number
}

interface AchievementInput extends Omit<Achievement, 'id'> {
  id?: string
}

interface AchievementQueueContextValue {
  currentAchievement: Achievement | null
  pushAchievement: (achievement: AchievementInput) => void
  completeAchievement: () => void
  clearQueue: () => void
  queueLength: number
}

const AchievementQueueContext = createContext<AchievementQueueContextValue | null>(null)

function createAchievementId(base: AchievementInput) {
  return base.id ?? `${base.type}-${base.title}-${Date.now()}`
}

export function AchievementQueueProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<Achievement[]>([])
  const [currentAchievement, setCurrentAchievement] = useState<Achievement | null>(null)
  const queueRef = useRef<Achievement[]>([])
  const currentRef = useRef<Achievement | null>(null)

  useEffect(() => {
    queueRef.current = queue
  }, [queue])

  useEffect(() => {
    currentRef.current = currentAchievement
  }, [currentAchievement])

  const pushAchievement = useCallback((input: AchievementInput) => {
    setQueue((prev) => {
      const normalized: Achievement = {
        ...input,
        id: createAchievementId(input),
        duration: input.duration ?? 1800,
      }

      const dedupeKey = `${normalized.type}-${normalized.title}`
      const isCurrentDuplicate = currentRef.current
        ? `${currentRef.current.type}-${currentRef.current.title}` === dedupeKey
        : false
      const queuedDuplicate = prev.some((pending) => `${pending.type}-${pending.title}` === dedupeKey)

      if (isCurrentDuplicate || queuedDuplicate) {
        return prev
      }

      if (!currentRef.current && prev.length === 0) {
        setCurrentAchievement(normalized)
        return prev
      }

      return [...prev, normalized]
    })
  }, [])

  useEffect(() => {
    if (currentAchievement || queueRef.current.length === 0) {
      return
    }

    setQueue((prev) => {
      if (prev.length === 0) {
        return prev
      }
      const [next, ...rest] = prev
      setCurrentAchievement(next)
      return rest
    })
  }, [currentAchievement])

  const completeAchievement = useCallback(() => {
    setCurrentAchievement(null)
  }, [])

  const clearQueue = useCallback(() => {
    setQueue([])
    setCurrentAchievement(null)
  }, [])

  const value = useMemo<AchievementQueueContextValue>(() => {
    return {
      currentAchievement,
      pushAchievement,
      completeAchievement,
      clearQueue,
      queueLength: queue.length + (currentAchievement ? 1 : 0),
    }
  }, [clearQueue, completeAchievement, currentAchievement, pushAchievement, queue.length])

  return <AchievementQueueContext.Provider value={value}>{children}</AchievementQueueContext.Provider>
}

export function useAchievementQueue() {
  const context = useContext(AchievementQueueContext)
  if (!context) {
    throw new Error('useAchievementQueue must be used within an AchievementQueueProvider')
  }
  return context
}
