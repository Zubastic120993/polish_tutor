import type {
  EvaluationDifficulty,
  EvaluationErrorType,
  EvaluationRecommendation,
} from './evaluation'

export interface LessonNextResponse {
  lesson_id: string
  current_index: number
  total: number
  tutor_phrase: string
  expected_phrases: string[]
  audio_url?: string
}

export interface SpeechRecognitionResponse {
  transcript: string
  words: Array<{ word: string; start: number; end: number }>
}

export interface EvaluateRequestPayload {
  phrase_id: string
  user_transcript: string
  audio_url?: string | null
  expected_phrase?: string
}

export interface EvaluateResponsePayload {
  score: number
  feedback: string
  hint: string
  passed: boolean
  next_action: 'advance' | 'retry'
  difficulty: EvaluationDifficulty
  error_type?: EvaluationErrorType
  recommendation: EvaluationRecommendation
  focus_word?: string | null
}
