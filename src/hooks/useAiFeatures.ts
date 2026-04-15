import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { AiSummary, WeeklySummaryReport } from '@/types/database'

// ─── Generic query for all AI summary types ──────────────────────────────────
export function useAiSummaries(type?: 'weekly_standup' | 'outreach_draft') {
  return useQuery({
    queryKey: ['ai_summaries', type],
    queryFn: async () => {
      let query = supabase
        .from('ai_summaries')
        .select('*')
        .order('created_at', { ascending: false })
      if (type) query = query.eq('summary_type', type)
      const { data, error } = await query
      if (error) throw error
      return data as AiSummary[]
    },
  })
}

// ─── Typed query specifically for weekly summaries (admin view) ───────────────
export function useWeeklySummaries() {
  return useQuery({
    queryKey: ['weekly_summaries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_summaries')
        .select('*')
        .eq('summary_type', 'weekly_standup')
        .order('week_start', { ascending: false })
      if (error) throw error
      return (data ?? []) as AiSummary[]
    },
  })
}

// ─── Generate a weekly summary via the new Edge Function ─────────────────────
export function useGenerateWeeklySummary() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (weekStart: string) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Not authenticated')

      const { data, error } = await supabase.functions.invoke('generate-weekly-summary', {
        body: { week_start: weekStart, triggered_by: 'manual' },
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (error) throw error

      const result = data as {
        summary: WeeklySummaryReport
        id: string
        week_start: string
        week_end: string
        cached: boolean
        usage: unknown
      }
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly_summaries'] })
      queryClient.invalidateQueries({ queryKey: ['ai_summaries'] })
    },
  })
}

// ─── Legacy mutation (kept for backward-compat with existing usages) ──────────
export function useWeeklySummary() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (weekStart: string) => {
      const { data: { session } } = await supabase.auth.getSession()
      const { data, error } = await supabase.functions.invoke('summarize-standups', {
        body: { week_start: weekStart },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      if (error) throw error
      return data as { summary: string }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai_summaries'] }),
  })
}

// ─── Outreach draft (unchanged) ───────────────────────────────────────────────
export function useOutreachDraft() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (outreachId: string) => {
      const { data: { session } } = await supabase.auth.getSession()
      const { data, error } = await supabase.functions.invoke('draft-outreach-email', {
        body: { outreach_id: outreachId },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      if (error) throw error
      return data as { draft: string }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai_summaries'] }),
  })
}
