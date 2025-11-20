export interface WeeklyStatsDay {
  date: string
  sessions: number
  xp: number
  time_seconds: number
}

export interface WeeklyStatsResponse {
  total_sessions: number
  total_xp: number
  total_time_seconds: number
  weekly_streak: number
  days: WeeklyStatsDay[]
}

