import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import type { LineupEntry, Match, Player, Season, Standing } from './types'

export const keys = {
  season: ['season', 'active'] as const,
  standings: (seasonId: number) => ['standings', seasonId] as const,
  matches: (seasonId: number) => ['matches', seasonId] as const,
  players: ['players'] as const,
}

export function useActiveSeason() {
  return useQuery({
    queryKey: keys.season,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .eq('is_active', true)
        .maybeSingle()
      if (error) throw error
      return data as Season | null
    },
  })
}

export function useStandings(seasonId: number | undefined) {
  return useQuery({
    queryKey: keys.standings(seasonId ?? 0),
    enabled: !!seasonId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('season_standings')
        .select('*')
        .eq('season_id', seasonId!)
      if (error) throw error
      return (data as Standing[]).sort(
        (a, b) =>
          b.points - a.points ||
          b.goals - a.goals ||
          b.mvps - a.mvps ||
          a.name.localeCompare(b.name),
      )
    },
  })
}

export function useMatches(seasonId: number | undefined) {
  return useQuery({
    queryKey: keys.matches(seasonId ?? 0),
    enabled: !!seasonId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matches')
        .select(
          'id, played_at, score_a, score_b, notes, match_players(team, goals, assists, is_goalkeeper, players(name, nickname))',
        )
        .eq('season_id', seasonId!)
        .order('played_at', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as Match[]
    },
  })
}

export function usePlayers() {
  return useQuery({
    queryKey: keys.players,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('players')
        .select('id, name, nickname, avatar_url, email, user_id')
        .order('name')
      if (error) throw error
      return data as Player[]
    },
  })
}

export function useAddPlayer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name: string; nickname?: string; email?: string }) => {
      const { error } = await supabase.from('players').insert({
        name: input.name.trim(),
        nickname: input.nickname?.trim() || null,
        email: input.email?.trim().toLowerCase() || null,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.players }),
  })
}

export function useRegisterMatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      seasonId: number
      playedAt: string
      scoreA: number
      scoreB: number
      lineup: LineupEntry[]
      notes?: string
    }) => {
      const { data, error } = await supabase.rpc('register_match', {
        p_season_id: input.seasonId,
        p_played_at: input.playedAt,
        p_score_a: input.scoreA,
        p_score_b: input.scoreB,
        p_players: input.lineup,
        p_notes: input.notes?.trim() || null,
      })
      if (error) throw error
      return data as string
    },
    onSuccess: (_id, input) => {
      qc.invalidateQueries({ queryKey: keys.standings(input.seasonId) })
      qc.invalidateQueries({ queryKey: keys.matches(input.seasonId) })
    },
  })
}
