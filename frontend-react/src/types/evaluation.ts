export type EvaluationDifficulty = 'easy' | 'medium' | 'hard'

export type EvaluationRecommendation =
  | 'proceed'
  | 'slow_down'
  | 'repeat_focus_word'
  | 'repeat_core'
  | 'full_retry'

export type EvaluationErrorType = 'pronunciation' | 'word_choice' | 'missing_word' | 'order' | null

export interface EvaluationMetadata {
  difficulty: EvaluationDifficulty
  recommendation: EvaluationRecommendation
  error_type?: EvaluationErrorType
  focus_word?: string | null
}
