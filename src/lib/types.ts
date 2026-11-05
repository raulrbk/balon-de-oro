// Tipos escritos a mano para la fase 1.
// Sustitúyelos por los generados con `npm run types` cuando puedas.

export type Season = {
  id: number
  year: number
  name: string
  is_active: boolean
  pts_win: number
  pts_draw: number
  pts_goal: number
  pts_assist: number
  pts_clean_sheet: number
  pts_mvp: number
  min_attendance: number
}

export type Player = {
  id: string
  name: string
  nickname: string | null
  avatar_url: string | null
  email: string | null
  user_id: string | null
}

export type Standing = {
  season_id: number
  player_id: string
  name: string
  nickname: string | null
  avatar_url: string | null
  played: number
  wins: number
  draws: number
  losses: number
  goals: number
  assists: number
  clean_sheets: number
  mvps: number
  points: number
  season_matches: number
  eligible: boolean
}

export type Team = 'A' | 'B'

export type MatchPlayer = {
  team: Team
  goals: number
  assists: number
  is_goalkeeper: boolean
  players: { name: string; nickname: string | null } | null
}

export type Match = {
  id: string
  played_at: string
  score_a: number
  score_b: number
  notes: string | null
  match_players: MatchPlayer[]
}

export type LineupEntry = {
  player_id: string
  team: Team
  goals: number
  assists: number
  is_goalkeeper: boolean
}

export const displayName = (p: { name: string; nickname: string | null }) =>
  p.nickname || p.name
