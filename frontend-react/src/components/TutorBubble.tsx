import { motion } from 'framer-motion'
import type { ChatMessage } from '../types/chat'

interface Props {
  message: ChatMessage
  onReplay: () => void
}

export function TutorBubble({ message, onReplay }: Props) {
  return (
    <motion.div
      className="flex items-start gap-3"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
    >
      <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold uppercase tracking-wide text-blue-700">
        AI
      </div>
      <div className="flex max-w-[75%] flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-slate-800 shadow-sm shadow-slate-200">
        <p className="text-base leading-relaxed">{message.text}</p>
        <button
          type="button"
          onClick={onReplay}
          disabled={!message.audioUrl}
          className="w-fit rounded-full border border-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Replay
        </button>
      </div>
    </motion.div>
  )
}
