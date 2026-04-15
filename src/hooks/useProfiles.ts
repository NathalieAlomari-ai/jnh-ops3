import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/database'

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name')
      if (error) throw error
      return data as Profile[]
    },
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Profile> }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Profile
    },

    // ── Optimistic update: patch the cache immediately, revert on error ──
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['profiles'] })
      const previous = queryClient.getQueryData<Profile[]>(['profiles'])

      queryClient.setQueryData<Profile[]>(['profiles'], old =>
        old?.map(p => (p.id === id ? { ...p, ...updates } : p)) ?? old
      )

      return { previous }
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['profiles'], context.previous)
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
    },
  })
}
