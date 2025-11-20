/**
 * Profile types for user statistics
 */

export interface ProfileBadge {
  code: string
  name: string
  icon?: string
}

export interface ProfileResponse {
  user_id: number
  total_xp: number
  total_sessions: number
  current_streak: number
  level: number
  next_level_xp: number
  xp_for_next_level: number
  best_badges: ProfileBadge[]
}

