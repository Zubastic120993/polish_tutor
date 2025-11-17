import type { LessonPhrase } from '../types/lesson'
import { KeyPhrasesPanel } from './KeyPhrasesPanel'

interface Props {
  phrases: LessonPhrase[]
  onPlayPhrase: (phrase: LessonPhrase) => void
}

export function KeyPhraseCard({ phrases, onPlayPhrase }: Props) {
  return <KeyPhrasesPanel phrases={phrases} onPlayPhrase={onPlayPhrase} />
}
