import type { LessonNextResponse } from '../types/api'
import type { LessonManifest, LessonPhrase } from '../types/lesson'
import { apiFetch } from '../lib/apiClient'

const BASE = import.meta.env.VITE_API_BASE ?? ''

export async function fetchLessonManifest(lessonId: string): Promise<LessonManifest> {
  console.log(`[lesson-v2] fetching manifest for ${lessonId}`)
  try {
    const data = await apiFetch<{ lesson_id: string; phrases: LessonPhrase[] }>(`${BASE}/api/v2/lesson/${lessonId}`)
    console.log(`[lesson-v2] manifest ready for ${lessonId} (${data.phrases.length} phrases)`)
    return {
      lessonId: data.lesson_id,
      phrases: data.phrases,
    }
  } catch (error) {
    console.error(`[lesson-v2] manifest error for ${lessonId}`, error)
    throw error
  }
}

export async function fetchLessonStep(lessonId: string, index: number): Promise<LessonNextResponse> {
  console.log(`[lesson-v2] fetching step ${index} for ${lessonId}`)
  try {
    const response = await apiFetch<LessonNextResponse>(`${BASE}/api/v2/lesson/${lessonId}/next?index=${index}`)
    console.log(
      `[lesson-v2] step ready ${index} for ${lessonId} (audio: ${response.audio_url ? 'yes' : 'no'})`,
    )
    console.log('[lesson-v2][debug-audio]', response.audio_url)
    return response
  } catch (error) {
    console.error(`[lesson-v2] step error for ${lessonId} at index ${index}`, error)
    throw error
  }
}
