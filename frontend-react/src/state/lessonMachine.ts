export type LessonState =
  | 'IDLE'
  | 'TUTOR_PROMPT'
  | 'RECORDING'
  | 'STT'
  | 'EVALUATING'
  | 'FEEDBACK'
  | 'NEXT'
  | 'COMPLETE'

export type LessonEvent =
  | 'PROMPT_READY'
  | 'ENABLE_RECORDING'
  | 'BEGIN_STT'
  | 'TRANSCRIPT_READY'
  | 'REQUEST_EVAL'
  | 'SHOW_FEEDBACK'
  | 'RETRY'
  | 'ADVANCE'
  | 'FINISH'

export function nextState(current: LessonState, event: LessonEvent): LessonState {
  switch (current) {
    case 'IDLE':
      return event === 'PROMPT_READY' ? 'TUTOR_PROMPT' : current
    case 'TUTOR_PROMPT':
      return event === 'ENABLE_RECORDING' ? 'RECORDING' : current
    case 'RECORDING':
      if (event === 'BEGIN_STT') return 'STT'
      if (event === 'REQUEST_EVAL') return 'EVALUATING'
      return current
    case 'STT':
      return event === 'TRANSCRIPT_READY' ? 'EVALUATING' : current
    case 'EVALUATING':
      return event === 'SHOW_FEEDBACK' ? 'FEEDBACK' : current
    case 'FEEDBACK':
      if (event === 'ADVANCE') return 'NEXT'
      if (event === 'RETRY') return 'RECORDING'
      if (event === 'FINISH') return 'COMPLETE'
      return current
    case 'NEXT':
      if (event === 'PROMPT_READY') return 'TUTOR_PROMPT'
      if (event === 'FINISH') return 'COMPLETE'
      return current
    case 'COMPLETE':
    default:
      return 'COMPLETE'
  }
}
