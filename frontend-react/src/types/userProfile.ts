/**
 * Local user profile types (client-side only)
 */

export interface LocalUserProfile {
  username: string
  avatar: string // emoji for now
}

export interface UserProfileResponse {
  user_id: number
  username: string
  avatar: string
  goal_text?: string | null
  goal_created_at?: string | null
}

export interface UserProfileUpdate {
  username: string
  avatar: string
  goal_text?: string | null
  goal_created_at?: string | null
}

