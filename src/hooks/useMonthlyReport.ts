import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { MonthlyReport } from '@/types/database'

interface GenerateReportParams {
  month?: string           // 'yyyy-MM', defaults to current month
  mode?: 'individual' | 'unified'
  user_id?: string         // admin: specific user
}

interface GenerateReportResult {
  report: MonthlyReport
  id: string
  month_start: string
  month_end: string
  cached: boolean
}

export function useGenerateMonthlyReport() {
  return useMutation<GenerateReportResult, Error, GenerateReportParams>({
    mutationFn: async (params) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const { data, error } = await supabase.functions.invoke('generate-monthly-report', {
        body: params,
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (error) throw new Error(error.message ?? 'Edge Function error')
      if (data?.error) throw new Error(data.error)

      return data as GenerateReportResult
    },
  })
}
