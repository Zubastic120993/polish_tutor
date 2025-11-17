import type { ChatMessage } from '../../types/chat'
import { PlayButton } from '../controls/PlayButton'

interface Props {
  message: ChatMessage
  onReplay: () => void
}

export function TutorMessage({ message, onReplay }: Props) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-full bg-blue-200 px-3 py-1 text-sm font-semibold text-blue-800">Tutor</div>
      <div className="flex max-w-[75%] flex-col gap-2 rounded-2xl bg-blue-50 px-4 py-2 text-slate-900 shadow">
        <p className="text-base">{message.text}</p>
        <div className="flex items-center gap-2 text-sm text-blue-700">
          <PlayButton onClick={onReplay} label="Replay" />
        </div>
      </div>
    </div>
  )
}
