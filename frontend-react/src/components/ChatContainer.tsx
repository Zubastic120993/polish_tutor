
import { useEffect, useRef } from 'react'
import type { ChatMessage } from '../types/chat'
import { TutorMessage } from './messages/TutorMessage'
import { UserMessage } from './messages/UserMessage'
import { FeedbackMessage } from './messages/FeedbackMessage'
import { TypingIndicator } from './messages/TypingIndicator'

type Props = {
  messages: ChatMessage[]
  onPlayAudio: (url?: string) => void
  showTyping?: boolean
}

export function ChatContainer({ messages, onPlayAudio, showTyping }: Props) {
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, showTyping])

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto rounded-2xl bg-white p-4 shadow-inner">
      {messages.map((message) => {
        if (message.sender === 'tutor') {
          return (
            <TutorMessage
              key={message.id}
              message={message}
              onReplay={() => onPlayAudio(message.audioUrl)}
            />
          )
        }
        if (message.sender === 'user') {
          return <UserMessage key={message.id} message={message} />
        }
        return <FeedbackMessage key={message.id} message={message} />
      })}
      {showTyping && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  )
}
