import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLessonManifest, fetchLessonStep } from '../api/lessonV2'

const META_TTL = 5 * 60 * 1000

export function useLessonV2(lessonId: string | undefined) {
  const queryClient = useQueryClient()
  const [phraseIndex, setPhraseIndex] = useState(0)

  // Track what lessonId we've seen and whether we've already reset for it
  const previousLessonIdRef = useRef<string | undefined>(undefined)
  const hasResetRef = useRef(false)

  const clearLessonCache = useCallback(
    (targetLessonId: string) => {
      console.log(`[lesson-v2] clearing cache for ${targetLessonId}`)
      queryClient.removeQueries({
        queryKey: ['lesson-v2-manifest', targetLessonId],
        exact: true,
      })
      queryClient.removeQueries({
        queryKey: ['lesson-v2-step', targetLessonId],
        exact: false,
      })
      queryClient.invalidateQueries({
        queryKey: ['lesson-v2-manifest', targetLessonId],
      })
      queryClient.invalidateQueries({
        queryKey: ['lesson-v2-step', targetLessonId],
      })
    },
    [queryClient],
  )

  // Single source of truth for what a "hard reset" does
  const hardReset = useCallback(
    (targetLessonId: string) => {
      console.log(`[lesson-v2] hard reset for ${targetLessonId}`)
      setPhraseIndex(0)
      clearLessonCache(targetLessonId)
    },
    [clearLessonCache],
  )

  const resetLesson = useCallback(() => {
    if (!lessonId) return
    hardReset(lessonId)
    previousLessonIdRef.current = lessonId
    hasResetRef.current = true
  }, [lessonId, hardReset])

  /**
   * Effect: respond to lessonId changes.
   *
   * - On very first mount (undefined -> someId): treat current state as "already initialized"
   *   and DO NOT hard reset again (avoids nuking any pre-fetched steps).
   * - On actual lesson switches (id1 -> id2): do a hard reset once.
   * - On re-renders with same lessonId: skip reset.
   */
  useEffect(() => {
    if (!lessonId) {
      return
    }

    const prev = previousLessonIdRef.current
    const lessonIdChanged = prev !== lessonId

    // Initial mount: previous is undefined, now we have a lessonId
    if (prev === undefined) {
      console.log(
        `[lesson-v2] initial mount for lessonId: ${lessonId} (no hard reset)`,
      )
      previousLessonIdRef.current = lessonId
      hasResetRef.current = true
    } else if (lessonIdChanged) {
      console.log(`[lesson-v2] lessonId changed: ${prev} -> ${lessonId}`)
      previousLessonIdRef.current = lessonId
      hasResetRef.current = false
      // Perform the reset exactly once per new lessonId
      hardReset(lessonId)
    } else if (hasResetRef.current) {
      console.log(`[lesson-v2] skipping reset - already reset for ${lessonId}`)
    } else {
      // Need to reset for this lessonId
      hasResetRef.current = true
      hardReset(lessonId)
    }

    // Cleanup: reset refs on unmount so next mount is treated as fresh
    return () => {
      console.log('[lesson-v2] unmounting, clearing refs')
      previousLessonIdRef.current = undefined
      hasResetRef.current = false
    }
  }, [lessonId, hardReset])

  const manifestQuery = useQuery({
    queryKey: ['lesson-v2-manifest', lessonId],
    queryFn: () => fetchLessonManifest(lessonId!),
    enabled: Boolean(lessonId),
    staleTime: META_TTL,
  })

  const lessonQuery = useQuery({
    queryKey: ['lesson-v2-step', lessonId, phraseIndex],
    queryFn: () => fetchLessonStep(lessonId!, phraseIndex),
    enabled: Boolean(lessonId),
    retry: 1,
  })

  const loadNextPhrase = useCallback(() => {
    setPhraseIndex((prev) => prev + 1)
  }, [])

  const currentPhrase = manifestQuery.data?.phrases[phraseIndex] ?? null

  return {
    manifest: manifestQuery.data ?? null,
    manifestError: manifestQuery.error as Error | null,
    manifestLoading: manifestQuery.isLoading,
    currentPhrase,
    tutorTurn: lessonQuery.data ?? null,
    lessonError: lessonQuery.error as Error | null,
    lessonLoading: lessonQuery.isFetching,
    refetchLesson: lessonQuery.refetch,
    phraseIndex,
    loadNextPhrase,
    resetLesson,
  }
}