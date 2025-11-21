// Celebration snapshot stored for replay

export interface BadgeItem {
  code: string
  name: string
  icon: string
}

export interface CelebrationSnapshot {
  sessionId: number
  timestamp: string

  xpGained: number

  levelBefore: number
  levelAfter: number

  newBadges: BadgeItem[]
}

export function saveCelebrationSnapshot(snapshot: CelebrationSnapshot) {
  localStorage.setItem('celebration_last', JSON.stringify(snapshot))
}

export function loadCelebrationSnapshot(): CelebrationSnapshot | null {
  const raw = localStorage.getItem('celebration_last')
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

