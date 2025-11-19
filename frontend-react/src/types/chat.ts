export type ChatSender = 'tutor' | 'user' | 'feedback'

export type FeedbackTone = 'success' | 'warning' | 'error'

export interface ChatMessage {
  id: string
  sender: ChatSender
  text: string
  audioUrl?: string
  score?: number
  hint?: string
  tone?: FeedbackTone
  transcriptSource?: 'typed' | 'speech'
}
