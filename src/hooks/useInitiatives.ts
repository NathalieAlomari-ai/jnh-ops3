import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Initiative, InitiativeWithProfile } from '@/types/database'

export function useInitiatives() {
  return useQuery({
    queryKey: ['initiatives'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('initiatives')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as InitiativeWithProfile[]
    },
  })
}

export function useCreateInitiative() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: Omit<Initiative, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('initiatives')
        .insert(values)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['initiatives'] }),
  })
}

export function useUpdateInitiative() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Initiative> }) => {
      const { data, error } = await supabase
        .from('initiatives')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['initiatives'] }),
  })
}

export function useDeleteInitiative() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('initiatives').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['initiatives'] }),
  })
}
