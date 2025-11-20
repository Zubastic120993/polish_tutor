/**
 * Badge history types
 */

export interface BadgeHistoryItem {
  code: string
  name: string
  description: string
  icon?: string
  unlocked_at: string // ISO date string
}

export interface BadgeHistoryResponse {
  history: BadgeHistoryItem[]
}

