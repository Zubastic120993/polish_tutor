export type ChatSender = 'tutor' | 'user' | 'feedback'

export interface ChatMessage {
  id: string
  sender: ChatSender
  text: string
  audioUrl?: string
  score?: number
}
