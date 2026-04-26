import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type DocumentCategory = 'Report' | 'Meeting Notes' | 'Template' | 'Reference' | 'Other'

export const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  'Report', 'Meeting Notes', 'Template', 'Reference', 'Other',
]

export interface Document {
  id: string
  title: string
  url: string
  description: string | null
  category: DocumentCategory
  created_by: string | null
  created_at: string
}

const QUERY_KEY = ['documents']

export function useDocuments() {
  const queryClient = useQueryClient()

  const { data: documents = [], isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Document[]
    },
  })

  const addMutation = useMutation({
    mutationFn: async (entry: Omit<Document, 'id' | 'created_at' | 'created_by'>) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data, error } = await supabase
        .from('documents')
        .insert({ ...entry, created_by: user.id })
        .select()
        .single()
      if (error) throw error
      return data as Document
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('documents').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })

  const addDocument = useCallback(
    (entry: Omit<Document, 'id' | 'created_at' | 'created_by'>) =>
      addMutation.mutateAsync(entry),
    [addMutation]
  )

  const deleteDocument = useCallback(
    (id: string) => deleteMutation.mutate(id),
    [deleteMutation]
  )

  return {
    documents,
    isLoading,
    addDocument,
    deleteDocument,
    isAdding: addMutation.isPending,
    addError: addMutation.error,
  }
}
