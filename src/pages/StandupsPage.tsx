import { useState } from 'react'
import { format, subDays, startOfWeek } from 'date-fns'
import { Plus, AlertTriangle, Sparkles, CheckCircle2, Circle } from 'lucide-react'
import { useDailyUpdates, useCreateDailyUpdate } from '@/hooks/useDailyUpdates'
import { useProfiles } from '@/hooks/useProfiles'
import { useAiSummaries, useWeeklySummary } from '@/hooks/useAiFeatures'
import { useAuth } from '@/hooks/useAuth'
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

const inputCls = 'w-full px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all border-[1.5px]'
const inputStyle = { borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--t1)' }

function StandupForm({ onClose }: { onClose: () => void }) {
  const { profile } = useAuth()
  const create = useCreateDailyUpdate()
  const [form, setForm] = useState({ did_today: '', blockers: '', plan_tomorrow: '' })
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!profile?.id) {
      setError('Profile not loaded — please refresh the page and try again.')
      return
    }
    try {
      await create.mutateAsync({
        user_id: profile.id,
        update_date: format(new Date(), 'yyyy-MM-dd'),
        did_today: form.did_today,
        blockers: form.blockers || null,
        plan_tomorrow: form.plan_tomorrow || null,
        contribution_tags: [],
      })
      onClose()
    } catch (err) {
      console.error('[Standup] Failed to post:', err)
      setError((err as Error).message ?? 'Failed to post standup. Please try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-[12px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--t3)' }}>
          What did you do today? <span className="text-red-500 normal-case tracking-normal">*</span>
        </label>
        <textarea
          required
          rows={3}
          className={inputCls}
          value={form.did_today}
          onChange={e => setForm(f => ({ ...f, did_today: e.target.value }))}
          style={{ ...inputStyle, resize: 'none' }}
        />
      </div>
      <div>
        <label className="block text-[12px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--t3)' }}>
          Blockers
        </label>
        <textarea
          rows={2}
          className={inputCls}
          placeholder="Leave empty if none"
          value={form.blockers}
          onChange={e => setForm(f => ({ ...f, blockers: e.target.value }))}
          style={{ ...inputStyle, resize: 'none' }}
        />
      </div>
      <div>
        <label className="block text-[12px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--t3)' }}>
          Plan for tomorrow
        </label>
        <textarea
          rows={2}
          className={inputCls}
          value={form.plan_tomorrow}
          onChange={e => setForm(f => ({ ...f, plan_tomorrow: e.target.value }))}
          style={{ ...inputStyle, resize: 'none' }}
        />
      </div>

      {error && (
        <div
          className="rounded-xl px-4 py-3 text-[13px]"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1.5px solid rgba(239,68,68,0.25)', color: '#ef4444' }}
        >
          ⚠️ {error}
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <Button type="submit" disabled={create.isPending || !form.did_today.trim()}>
          {create.isPending ? 'Posting…' : 'Post Standup'}
        </Button>
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
  const today = format(new Date(), 'yyyy-MM-dd')

  const { data: updates } = useDailyUpdates(last7Days)
  const { data: profiles } = useProfiles()
  const { data: summaries } = useAiSummaries('weekly_standup')
  const generateSummary = useWeeklySummary()

  // Enable realtime on daily_updates
  useRealtimeSubscription('daily_updates', ['daily_updates'])

  const latestSummary = summaries?.[0]

  async function handleGenerateSummary() {
    await generateSummary.mutateAsync(weekStart)
    setShowSummary(true)
  }

  // Who has posted today
  const postedTodayIds = new Set(
    updates?.filter(u => u.update_date === today).map(u => u.user_id) ?? []
  )

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
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--t1)' }}>Daily Standups</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--t2)' }}>
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
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

      {/* Today's status — who has posted */}
      {profiles && profiles.length > 0 && (
        <Card>
          <CardBody className="py-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.10em] mb-3" style={{ color: 'var(--t3)' }}>
              Today's Check-in
            </p>
            <div className="flex flex-wrap gap-3">
              {profiles.map(p => {
                const posted = postedTodayIds.has(p.id)
                return (
                  <div key={p.id} className="flex flex-col items-center gap-1.5" title={posted ? `${p.full_name} — posted` : `${p.full_name} — not posted yet`}>
                    <div className="relative">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-bold"
                        style={{
                          background: posted
                            ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
                            : 'var(--surface-2)',
                          border: `2px solid ${posted ? '#059669' : 'var(--border-strong)'}`,
                          color: posted ? '#fff' : 'var(--t3)',
                        }}
                      >
                        {p.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div
                        className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ background: 'var(--surface)' }}
                      >
                        {posted
                          ? <CheckCircle2 size={14} style={{ color: '#059669' }} />
                          : <Circle size={14} style={{ color: 'var(--t3)' }} />
                        }
                      </div>
                    </div>
                    <span className="text-[10px] font-medium max-w-[52px] text-center leading-tight truncate" style={{ color: posted ? 'var(--t1)' : 'var(--t3)' }}>
                      {p.full_name.split(' ')[0]}
                    </span>
                  </div>
                )
              })}
            </div>
            <p className="text-[11px] mt-3" style={{ color: 'var(--t3)' }}>
              {postedTodayIds.size} of {profiles.length} posted today
            </p>
          </CardBody>
        </Card>
      )}

      {Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a)).map(([date, dayUpdates]) => (
        <div key={date}>
          <p className="text-[10px] font-bold uppercase tracking-[0.10em] mb-3" style={{ color: 'var(--t3)' }}>
            {format(new Date(date + 'T12:00:00'), 'EEEE, MMMM d')}
            {date === today && (
              <span
                className="ml-2 px-1.5 py-0.5 rounded text-[9px]"
                style={{ background: 'rgba(5,150,105,0.12)', color: '#059669' }}
              >
                TODAY
              </span>
            )}
          </p>
          <div className="space-y-3">
            {dayUpdates?.map(update => (
              <Card key={update.id}>
                <CardBody>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #007bff 0%, #0cc0df 100%)' }}
                      >
                        {update.profiles.full_name.charAt(0)}
                      </div>
                      <span className="font-semibold text-sm" style={{ color: 'var(--t1)' }}>
                        {update.profiles.full_name}
                      </span>
                    </div>
                    {update.blockers && (
                      <Badge variant="red">
                        <AlertTriangle size={10} className="mr-1" />Blocker
                      </Badge>
                    )}
                  </div>
                  <div className="mt-3 space-y-2.5 text-sm">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--t3)' }}>
                        Did Today
                      </span>
                      <p className="mt-0.5" style={{ color: 'var(--t1)' }}>{update.did_today}</p>
                    </div>
                    {update.blockers && (
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: '#ef4444' }}>
                          Blockers
                        </span>
                        <p className="mt-0.5" style={{ color: '#ef4444' }}>{update.blockers}</p>
                      </div>
                    )}
                    {update.plan_tomorrow && (
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--t3)' }}>
                          Tomorrow
                        </span>
                        <p className="mt-0.5" style={{ color: 'var(--t2)' }}>{update.plan_tomorrow}</p>
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
        <div
          className="text-center py-16 rounded-2xl"
          style={{ border: '1.5px dashed var(--border-strong)', background: 'var(--surface)' }}
        >
          <p className="text-sm" style={{ color: 'var(--t3)' }}>No standups in the last 7 days</p>
        </div>
      )}

      <Modal open={showForm} title="Post Daily Standup" onClose={() => setShowForm(false)}>
        <StandupForm onClose={() => setShowForm(false)} />
      </Modal>

      <Modal open={showSummary && !!latestSummary} title="Weekly Summary" onClose={() => setShowSummary(false)} size="lg">
        <CardHeader>
          <p className="text-xs text-gray-400">Generated by Claude AI · Week of {weekStart}</p>
        </CardHeader>
        <div className="prose prose-sm max-w-none mt-4 text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
          {latestSummary?.content}
        </div>
      </Modal>
    </div>
  )
}
