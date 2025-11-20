import type { ReactNode } from 'react'
import type { PracticeType } from '../../types/practice'

interface Props {
  type: PracticeType
  review?: ReactNode
  new?: ReactNode
  dialog?: ReactNode
  pronunciation?: ReactNode
}

export function PracticeRouter({ type, review, new: newPractice, dialog, pronunciation }: Props) {
  if (type === 'review') {
    return <>{review}</>
  }
  if (type === 'new') {
    return <>{newPractice}</>
  }
  if (type === 'dialog') {
    return <>{dialog}</>
  }
  if (type === 'pronunciation') {
    return <>{pronunciation}</>
  }
  return null
}
