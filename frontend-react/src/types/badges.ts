export interface BadgeBase {
  code: string
  name: string
  description: string
  icon?: string
}

export interface UserBadge extends BadgeBase {
  unlocked_at: string
}

export interface AllBadgesResponse {
  badges: BadgeBase[]
}

export interface UserBadgesResponse {
  badges: UserBadge[]
}

