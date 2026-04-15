import { useState } from 'react'
import { format, subDays, startOfWeek } from 'date-fns'
import { Plus, AlertTriangle, Sparkles } from 'lucide-react'
import { useDailyUpdates, useCreateDailyUpdate } from '@/hooks/useDailyUpdates'
import { useAiSummaries, useWeeklySummary } from '@/hooks/useAiFeatures'
import { useAuth } from '@/hooks/useAuth'
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

function StandupForm({ onClose }: { onClose: () => void }) {
  const { profile } = useAuth()
  const create = useCreateDailyUpdate()
  const [form, setForm] = useState({ did_today: '', blockers: '', plan_tomorrow: '' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await create.mutateAsync({
      user_id: profile!.id,
      update_date: format(new Date(), 'yyyy-MM-dd'),
      did_today: form.did_today,
      blockers: form.blockers || null,
      plan_tomorrow: form.plan_tomorrow || null,
    })
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">What did you do today? *</label>
        <textarea required rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={form.did_today} onChange={e => setForm(f => ({ ...f, did_today: e.target.value }))} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Blockers</label>
        <textarea rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Leave empty if none"
          value={form.blockers} onChange={e => setForm(f => ({ ...f, blockers: e.target.value }))} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Plan for tomorrow</label>
        <textarea rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={form.plan_tomorrow} onChange={e => setForm(f => ({ ...f, plan_tomorrow: e.target.value }))} />
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Posting…' : 'Post Standup'}</Button>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  )
}

export default function StandupsPage() {
  const [showForm, setShowForm] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const { isAdmin } = useAuth()

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const last7Days = format(subDays(new Date(), 7), 'yyyy-MM-dd')

  const { data: updates } = useDailyUpdates(last7Days)
  const { data: summaries } = useAiSummaries('weekly_standup')
  const generateSummary = useWeeklySummary()

  // Enable realtime on daily_updates
  useRealtimeSubscription('daily_updates', ['daily_updates'])

  const latestSummary = summaries?.[0]

  async function handleGenerateSummary() {
    await generateSummary.mutateAsync(weekStart)
    setShowSummary(true)
  }

  // Group by date
  const grouped: Record<string, typeof updates> = {}
  updates?.forEach(u => {
    const d = u.update_date
    if (!grouped[d]) grouped[d] = []
    grouped[d]!.push(u)
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Daily Standups</h1>
        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="secondary" onClick={handleGenerateSummary} disabled={generateSummary.isPending}>
              <Sparkles size={16} />
              {generateSummary.isPending ? 'Generating…' : 'Weekly Summary'}
            </Button>
          )}
          <Button onClick={() => setShowForm(true)}>
            <Plus size={16} /> Post Standup
          </Button>
        </div>
      </div>

      {Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a)).map(([date, dayUpdates]) => (
        <div key={date}>
          <h2 className="text-sm font-semibold text-gray-500 mb-3">
            {format(new Date(date + 'T12:00:00'), 'EEEE, MMMM d')}
          </h2>
          <div className="space-y-3">
            {dayUpdates?.map(update => (
              <Card key={update.id}>
                <CardBody>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-bold flex-shrink-0">
                        {update.profiles.full_name.charAt(0)}
                      </div>
                      <span className="font-medium text-gray-900 text-sm">{update.profiles.full_name}</span>
                    </div>
                    {update.blockers && <Badge variant="red"><AlertTriangle size={10} className="mr-1" />Blocker</Badge>}
                  </div>
                  <div className="mt-3 space-y-2 text-sm">
                    <div>
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Did Today</span>
                      <p className="text-gray-700 mt-0.5">{update.did_today}</p>
                    </div>
                    {update.blockers && (
                      <div>
                        <span className="text-xs font-medium text-red-500 uppercase tracking-wide">Blockers</span>
                        <p className="text-red-600 mt-0.5">{update.blockers}</p>
                      </div>
                    )}
                    {update.plan_tomorrow && (
                      <div>
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tomorrow</span>
                        <p className="text-gray-700 mt-0.5">{update.plan_tomorrow}</p>
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {!Object.keys(grouped).length && (
        <p className="text-center text-gray-400 py-12 text-sm">No standups in the last 7 days</p>
      )}

      <Modal open={showForm} title="Post Daily Standup" onClose={() => setShowForm(false)}>
        <StandupForm onClose={() => setShowForm(false)} />
      </Modal>

      <Modal open={showSummary && !!latestSummary} title="Weekly Summary" onClose={() => setShowSummary(false)} size="lg">
        <CardHeader>
          <p className="text-xs text-gray-400">Generated by Claude AI · Week of {weekStart}</p>
        </CardHeader>
        <div className="prose prose-sm max-w-none mt-4 text-gray-700 whitespace-pre-wrap">
          {latestSummary?.content}
        </div>
      </Modal>
    </div>
  )
}
