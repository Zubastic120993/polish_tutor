export type PracticeType = 'review' | 'new' | 'dialog' | 'pronunciation'

export interface PhraseItem {
  id: string
  polish: string
  english: string
  audioUrl?: string
  expectedResponses?: string[]
}

export interface PracticePack {
  packId: string
  reviewPhrases: PhraseItem[]
  newPhrases?: PhraseItem[]
  dialog?: any
  pronunciationDrill?: any
}

export interface PracticeAttemptSummary {
  phraseId: string
  passed: boolean
  score: number
}

export interface PracticeSummary {
  packId: string
  total: number
  correct: number
  attempts: PracticeAttemptSummary[]
  // New backend fields
  xp_from_phrases?: number
  xp_session_bonus?: number
  xp_streak_bonus?: number
  xp_total?: number
  session_duration?: number
  streak_before?: number
  streak_after?: number
  perfect_day?: boolean
  unlocked_badges?: string[] // Badge codes
}
