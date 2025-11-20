// Generate all 60 A1 lessons
const A1_LESSONS = Array.from({ length: 60 }, (_, i) => {
  const lessonNum = String(i + 1).padStart(2, '0')
  return `A1_L${lessonNum}`
})

export const LESSON_SEQUENCE = [
  'lesson_mock_001', // Mock lesson for testing
  'p1', // Practice lesson
  ...A1_LESSONS, // A1_L01 through A1_L60
  'coffee_001', // Coffee themed lesson
]

export const DEFAULT_LESSON_ID = LESSON_SEQUENCE[0]

export function getNextLessonId(currentId?: string): string | null {
  if (!currentId) {
    return DEFAULT_LESSON_ID
  }
  const index = LESSON_SEQUENCE.indexOf(currentId)
  if (index === -1) {
    return DEFAULT_LESSON_ID
  }
  const nextIndex = index + 1
  return LESSON_SEQUENCE[nextIndex] ?? null
}
