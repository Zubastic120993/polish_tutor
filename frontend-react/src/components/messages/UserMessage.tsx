import type { ChatMessage } from '../../types/chat'

interface Props {
  message: ChatMessage
}

export function UserMessage({ message }: Props) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[75%] rounded-2xl bg-green-100 px-4 py-2 text-right text-slate-900 shadow">
        <div className="mb-1 text-sm font-semibold text-green-700">You</div>
        <p>{message.text}</p>
      </div>
    </div>
  )
}
