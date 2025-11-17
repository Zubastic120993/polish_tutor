export type LessonState =
  | 'TUTOR_SPEAKING'
  | 'WAITING_FOR_USER'
  | 'RECORDING'
  | 'EVALUATING'
  | 'FEEDBACK'
  | 'NEXT_PHRASE'
  | 'FINISHED'

export type LessonEvent =
  | 'SHOW_TUTOR'
  | 'AWAIT_USER'
  | 'BEGIN_RECORDING'
  | 'EVALUATE'
  | 'SHOW_FEEDBACK'
  | 'ADVANCE'
  | 'COMPLETE'

export function nextState(current: LessonState, event: LessonEvent): LessonState {
  switch (current) {
    case 'TUTOR_SPEAKING':
      return event === 'AWAIT_USER' ? 'WAITING_FOR_USER' : current
    case 'WAITING_FOR_USER':
      if (event === 'BEGIN_RECORDING') return 'RECORDING'
      return current
    case 'RECORDING':
      if (event === 'EVALUATE') return 'EVALUATING'
      return current
    case 'EVALUATING':
      if (event === 'SHOW_FEEDBACK') return 'FEEDBACK'
      return current
    case 'FEEDBACK':
      if (event === 'ADVANCE') return 'NEXT_PHRASE'
      return current
    case 'NEXT_PHRASE':
      if (event === 'SHOW_TUTOR') return 'TUTOR_SPEAKING'
      if (event === 'COMPLETE') return 'FINISHED'
      return current
    case 'FINISHED':
    default:
      return 'FINISHED'
  }
}
