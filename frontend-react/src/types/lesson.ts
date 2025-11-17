export interface LessonPhrase {
  id: string
  pl: string
  en: string
  audioUrl?: string
}

export interface LessonData {
  id: string
  phrases: LessonPhrase[]
}
