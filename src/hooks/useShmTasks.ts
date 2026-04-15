import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ShmTask, ShmTaskWithProfile } from '@/types/database'

export function useShmTasks() {
  return useQuery({
    queryKey: ['shm_tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shm_tasks')
        .select('*, profiles(full_name, avatar_url)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as ShmTaskWithProfile[]
    },
  })
}

export function useCreateShmTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: Omit<ShmTask, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('shm_tasks')
        .insert(values)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shm_tasks'] }),
  })
}

export function useUpdateShmTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ShmTask> }) => {
      // Optimistic update
      queryClient.setQueryData(['shm_tasks'], (old: ShmTaskWithProfile[] | undefined) =>
        old?.map(t => t.id === id ? { ...t, ...updates } : t) ?? []
      )
      const { data, error } = await supabase
        .from('shm_tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['shm_tasks'] }),
  })
}

export function useDeleteShmTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('shm_tasks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shm_tasks'] }),
  })
}
