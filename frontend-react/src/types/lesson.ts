export interface LessonPhrase {
  id: string
  pl: string
  en: string
  audioUrl?: string
}

export interface LessonManifest {
  lessonId: string
  phrases: LessonPhrase[]
}

export interface LessonData {
  id: string
  phrases: LessonPhrase[]
}
