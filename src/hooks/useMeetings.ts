import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface MeetingAttendee {
  id: string
  name: string
}

export interface Meeting {
  id: string
  title: string
  date: string          // 'yyyy-MM-dd'
  time: string          // 'HH:mm'
  end_time: string | null  // 'HH:mm' or null
  attendees: MeetingAttendee[]
  notes: string
  summary: string | null
  created_at: string
}

const QUERY_KEY = ['meetings']

// ─── useMeetings ─────────────────────────────────────────────────────────────
// Preserves the same { meetings, addMeeting, deleteMeeting } interface so that
// MeetingsPage and ScheduleForm need no changes.
//
// addMeeting constructs the Meeting object locally (with a pre-generated UUID),
// fires the Supabase insert in the background, and returns the local object
// synchronously — keeping the webhook call in ScheduleForm working as-is.

export function useMeetings() {
  const queryClient = useQueryClient()

  const { data: meetings = [] } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meetings')
        .select('id, title, date, time, end_time, notes, summary, attendees, created_at')
        .order('date', { ascending: true })
        .order('time', { ascending: true })
      if (error) throw error

      return (data ?? []).map<Meeting>(row => ({
        id:          row.id,
        title:       row.title,
        date:        row.date,
        time:        row.time,
        end_time:    row.end_time ?? null,
        notes:       row.notes ?? '',
        summary:     row.summary ?? null,
        attendees:   row.attendees as MeetingAttendee[],
        created_at:  row.created_at,
      }))
    },
  })

  const addMutation = useMutation({
    mutationFn: async (entry: Meeting & { created_by: string }) => {
      const { error } = await supabase.from('meetings').insert({
        id:         entry.id,
        title:      entry.title,
        date:       entry.date,
        time:       entry.time,
        end_time:   entry.end_time || null,
        notes:      entry.notes || null,
        attendees:  entry.attendees,
        created_by: entry.created_by,
        created_at: entry.created_at,
      })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('meetings').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })

  const saveSummaryMutation = useMutation({
    mutationFn: async ({ id, summary }: { id: string; summary: string }) => {
      const { error } = await supabase.from('meetings').update({ summary }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })

  // Synchronous so ScheduleForm can use the returned Meeting for the webhook
  // immediately, while the insert runs in the background.
  const addMeeting = useCallback(
    (payload: Omit<Meeting, 'id' | 'created_at'>): Meeting => {
      const entry: Meeting = {
        ...payload,
        id:         crypto.randomUUID(),
        created_at: new Date().toISOString(),
      }

      supabase.auth.getUser().then(({ data }) => {
        const userId = data.user?.id
        if (!userId) return
        addMutation.mutate({ ...entry, created_by: userId })
      })

      return entry
    },
    [addMutation]
  )

  const deleteMeeting = useCallback(
    (id: string) => deleteMutation.mutate(id),
    [deleteMutation]
  )

  const saveSummary = useCallback(
    (id: string, summary: string) => saveSummaryMutation.mutate({ id, summary }),
    [saveSummaryMutation]
  )

  return { meetings, addMeeting, deleteMeeting, saveSummary }
}
