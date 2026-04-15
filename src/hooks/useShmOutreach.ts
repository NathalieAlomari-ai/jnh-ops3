import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ShmOutreach, ShmOutreachWithProfile } from '@/types/database'

export function useShmOutreach() {
  return useQuery({
    queryKey: ['shm_outreach'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shm_outreach')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as ShmOutreachWithProfile[]
    },
  })
}

export function useCreateShmOutreach() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: Omit<ShmOutreach, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('shm_outreach')
        .insert(values)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shm_outreach'] }),
  })
}

export function useUpdateShmOutreach() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ShmOutreach> }) => {
      const { data, error } = await supabase
        .from('shm_outreach')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shm_outreach'] }),
  })
}

export function useDeleteShmOutreach() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('shm_outreach').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shm_outreach'] }),
  })
}
