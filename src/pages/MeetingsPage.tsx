import { useState, useMemo } from 'react'
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns'
import {
  CalendarDays,
  Plus,
  Clock,
  User,
  Trash2,
  CalendarCheck,
  CalendarClock,
  StickyNote,
} from 'lucide-react'
import { useMeetings } from '@/hooks/useMeetings'
import { useProfiles } from '@/hooks/useProfiles'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatMeetingDate(date: string): string {
  const d = parseISO(date)
  if (isToday(d))    return 'Today'
  if (isTomorrow(d)) return 'Tomorrow'
  return format(d, 'EEEE, MMM d')
}

function dateLabel(date: string): { label: string; variant: 'green' | 'blue' | 'gray' } {
  const d = parseISO(date)
  if (isToday(d))         return { label: 'Today',    variant: 'green' }
  if (isTomorrow(d))      return { label: 'Tomorrow', variant: 'blue'  }
  if (isPast(parseISO(`${date}T23:59`))) return { label: 'Past', variant: 'gray' }
  return { label: format(d, 'MMM d'), variant: 'blue' }
}

// ─── Schedule Form ─────────────────────────────────────────────────────────────
function ScheduleForm({ onClose }: { onClose: () => void }) {
  const { data: profiles } = useProfiles()
  const { addMeeting } = useMeetings()

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const nowTime  = format(new Date(), 'HH:mm')

  const [form, setForm] = useState({
    title:       '',
    date:        todayStr,
    time:        nowTime,
    attendee_id: '',
    notes:       '',
  })
  const [saving, setSaving] = useState(false)

  const selectedProfile = profiles?.find(p => p.id === form.attendee_id)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.attendee_id) return
    setSaving(true)
    addMeeting({
      title:         form.title || `Meeting with ${selectedProfile?.full_name ?? 'Team Member'}`,
      date:          form.date,
      time:          form.time,
      attendee_id:   form.attendee_id,
      attendee_name: selectedProfile?.full_name ?? '',
      notes:         form.notes,
    })
    setSaving(false)
    onClose()
  }

  const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelCls = 'block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelCls}>Meeting Title</label>
        <input
          className={inputCls}
          placeholder="e.g. Weekly 1-on-1"
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
        />
      </div>

      <div>
        <label className={labelCls}>Team Member <span className="text-red-500">*</span></label>
        <select
          required
          className={inputCls}
          value={form.attendee_id}
          onChange={e => setForm(f => ({ ...f, attendee_id: e.target.value }))}
        >
          <option value="">— Select a team member —</option>
          {profiles?.map(p => (
            <option key={p.id} value={p.id}>{p.full_name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Date <span className="text-red-500">*</span></label>
          <input
            required
            type="date"
            className={inputCls}
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
          />
        </div>
        <div>
          <label className={labelCls}>Time <span className="text-red-500">*</span></label>
          <input
            required
            type="time"
            className={inputCls}
            value={form.time}
            onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>Notes</label>
        <textarea
          rows={3}
          className={inputCls}
          placeholder="Agenda items, discussion points…"
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={saving || !form.attendee_id}>
          {saving ? 'Saving…' : 'Schedule Meeting'}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  )
}

// ─── Meeting Card ──────────────────────────────────────────────────────────────
function MeetingCard({ meeting, onDelete }: {
  meeting: import('@/hooks/useMeetings').Meeting
  onDelete: () => void
}) {
  const { label, variant } = dateLabel(meeting.date)
  const isPastMeeting = isPast(parseISO(`${meeting.date}T${meeting.time}`))

  return (
    <Card className={isPastMeeting ? 'opacity-60' : ''}>
      <CardBody className="flex items-start gap-4 py-4">
        {/* Date block */}
        <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex flex-col items-center justify-center flex-shrink-0 border border-blue-100 dark:border-blue-800">
          <span className="text-[10px] font-semibold text-blue-500 uppercase tracking-wide leading-none">
            {format(parseISO(meeting.date), 'MMM')}
          </span>
          <span className="text-lg font-bold text-blue-600 dark:text-blue-400 leading-tight">
            {format(parseISO(meeting.date), 'd')}
          </span>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
              {meeting.title}
            </h3>
            <Badge variant={variant}>{label}</Badge>
            {isPastMeeting && <Badge variant="gray">Completed</Badge>}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {meeting.time}
            </span>
            <span className="flex items-center gap-1">
              <User size={12} />
              {meeting.attendee_name}
            </span>
          </div>

          {meeting.notes && (
            <div className="mt-2 flex items-start gap-1.5">
              <StickyNote size={12} className="text-slate-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                {meeting.notes}
              </p>
            </div>
          )}
        </div>

        {/* Delete */}
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
          aria-label="Delete meeting"
        >
          <Trash2 size={15} />
        </button>
      </CardBody>
    </Card>
  )
}

// ─── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ onSchedule }: { onSchedule: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-4">
        <CalendarDays size={28} className="text-blue-500" />
      </div>
      <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
        No meetings scheduled
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mb-6">
        Schedule your first team meeting to keep everyone aligned.
      </p>
      <Button onClick={onSchedule}>
        <Plus size={15} />
        Schedule Meeting
      </Button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function MeetingsPage() {
  const { meetings, deleteMeeting } = useMeetings()
  const [showForm, setShowForm] = useState(false)

  const now = new Date()

  const { upcoming, past } = useMemo(() => {
    const upcoming: typeof meetings = []
    const past: typeof meetings = []
    for (const m of meetings) {
      const dt = parseISO(`${m.date}T${m.time}`)
      if (isPast(dt)) past.push(m)
      else             upcoming.push(m)
    }
    return { upcoming, past: past.slice().reverse() }
  }, [meetings])

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Meeting Schedule</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {format(now, 'EEEE, MMMM d, yyyy')} · {meetings.length} meeting{meetings.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus size={15} />
          Schedule Meeting
        </Button>
      </div>

      {/* ── Stats row ── */}
      {meetings.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardBody className="flex items-center gap-3 py-4">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
                <CalendarClock size={18} className="text-white" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{upcoming.length}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Upcoming</p>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="flex items-center gap-3 py-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center flex-shrink-0">
                <CalendarCheck size={18} className="text-white" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{past.length}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Completed</p>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ── Empty state ── */}
      {meetings.length === 0 && (
        <EmptyState onSchedule={() => setShowForm(true)} />
      )}

      {/* ── Upcoming ── */}
      {upcoming.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">
            Upcoming
          </h2>
          <div className="space-y-2">
            {upcoming.map(m => (
              <MeetingCard
                key={m.id}
                meeting={m}
                onDelete={() => {
                  if (confirm('Remove this meeting?')) deleteMeeting(m.id)
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Past ── */}
      {past.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">
            Past Meetings
          </h2>
          <div className="space-y-2">
            {past.map(m => (
              <MeetingCard
                key={m.id}
                meeting={m}
                onDelete={() => {
                  if (confirm('Remove this meeting?')) deleteMeeting(m.id)
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Modal ── */}
      <Modal open={showForm} title="Schedule a Meeting" onClose={() => setShowForm(false)}>
        <ScheduleForm onClose={() => setShowForm(false)} />
      </Modal>
    </div>
  )
}
