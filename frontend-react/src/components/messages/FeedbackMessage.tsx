import type { ChatMessage } from '../../types/chat'
import { ScoreBadge } from '../controls/ScoreBadge'

interface Props {
  message: ChatMessage
}

export function FeedbackMessage({ message }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-[60%] flex-col items-center gap-2 rounded-2xl bg-yellow-100 px-4 py-2 text-center text-slate-900 shadow">
      <p className="text-sm font-medium">{message.text}</p>
      {typeof message.score === 'number' && <ScoreBadge score={message.score} />}
    </div>
  )
}
