import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../lib/apiClient'
import type { PracticePack, PhraseItem } from '../types/practice'

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

interface PracticePhraseResponse {
  id: string
  polish: string
  english: string
  audio_url?: string | null
  expected_responses?: string[] | null
}

interface PracticePackResponse {
  pack_id: string
  session_id?: number
  review_phrases: PracticePhraseResponse[]
  new_phrases?: PracticePhraseResponse[]
  dialog?: any
  pronunciation_drill?: any
}

const normalizeAudioUrl = (value?: string | null) => {
  if (!value) return undefined
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value
  }
  try {
    const base = API_BASE || (typeof window !== 'undefined' ? window.location.origin : '')
    return base ? new URL(value, base).toString() : value
  } catch {
    return value
  }
}

const mapPhrase = (item: PracticePhraseResponse): PhraseItem => ({
  id: item.id,
  polish: item.polish,
  english: item.english,
  audioUrl: normalizeAudioUrl(item.audio_url),
  expectedResponses: item.expected_responses || undefined,
})

export function useDailyPractice(userId = 1) {
  const query = useQuery({
    queryKey: ['practice', 'daily', userId],
    queryFn: () =>
      apiFetch<PracticePackResponse>(`${API_BASE}/api/v2/practice/daily?user_id=${userId}`),
    staleTime: 60 * 1000,
  })

  const practicePack = useMemo<PracticePack | null>(() => {
    if (!query.data) return null
    return {
      packId: query.data.pack_id,
      sessionId: query.data.session_id,
      reviewPhrases: (query.data.review_phrases ?? []).map(mapPhrase),
      newPhrases: query.data.new_phrases?.map(mapPhrase),
      dialog: query.data.dialog,
      pronunciationDrill: query.data.pronunciation_drill,
    }
  }, [query.data])

  return {
    practicePack,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error as Error | null,
    refetch: query.refetch,
  }
}
