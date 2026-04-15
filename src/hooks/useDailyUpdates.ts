import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { DailyUpdate, DailyUpdateWithProfile } from '@/types/database'

export function useDailyUpdates(dateFrom?: string) {
  return useQuery({
    queryKey: ['daily_updates', dateFrom],
    queryFn: async () => {
      let query = supabase
        .from('daily_updates')
        .select('*, profiles(full_name, avatar_url)')
        .order('update_date', { ascending: false })
        .order('created_at', { ascending: false })
      if (dateFrom) query = query.gte('update_date', dateFrom)
      const { data, error } = await query
      if (error) throw error
      return data as DailyUpdateWithProfile[]
    },
  })
}

export function useCreateDailyUpdate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: Omit<DailyUpdate, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('daily_updates')
        .upsert(values, { onConflict: 'user_id,update_date' })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['daily_updates'] }),
  })
}

export function useDeleteDailyUpdate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('daily_updates').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['daily_updates'] }),
  })
}
