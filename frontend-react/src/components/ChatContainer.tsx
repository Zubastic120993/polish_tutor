
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, type Ref } from 'react'
import type { ChatMessage } from '../types/chat'
import { TutorBubble } from './TutorBubble'
import { UserMessage } from './messages/UserMessage'
import { TypingIndicator } from './messages/TypingIndicator'
import { FeedbackCard } from './FeedbackCard'

type Props = {
  messages: ChatMessage[]
  onPlayAudio: (url?: string) => void
  showTyping?: boolean
  className?: string
  containerRef?: Ref<HTMLDivElement>
}

export function ChatContainer({ messages, onPlayAudio, showTyping, className = '', containerRef }: Props) {
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, showTyping])

  return (
    <div
      ref={containerRef}
      className={`flex h-full min-h-0 flex-col gap-5 overflow-y-auto rounded-3xl border border-slate-100 bg-gradient-to-b from-white to-slate-50 px-5 py-6 shadow-inner shadow-slate-200 ${className}`}
    >
      <AnimatePresence initial={false}>
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: 'spring', stiffness: 140, damping: 18 }}
          >
            {message.sender === 'tutor' && (
              <TutorBubble message={message} onReplay={() => onPlayAudio(message.audioUrl)} />
            )}
            {message.sender === 'user' && <UserMessage message={message} />}
            {message.sender === 'feedback' && (
              <FeedbackCard
                text={message.text}
                hint={message.hint}
                score={message.score}
                tone={message.tone ?? 'warning'}
              />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
      {showTyping && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  )
}
