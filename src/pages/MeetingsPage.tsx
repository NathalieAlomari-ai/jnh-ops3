import { useState, useMemo } from 'react'
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns'
import {
  CalendarDays, Plus, Clock, Users, Trash2,
  CalendarCheck, CalendarClock, StickyNote, Check,
} from 'lucide-react'
import { useMeetings } from '@/hooks/useMeetings'
import type { Meeting } from '@/hooks/useMeetings'
import { useProfiles } from '@/hooks/useProfiles'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { triggerWebhook } from '@/lib/webhook'
import { supabase } from '@/lib/supabase'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function dateLabel(date: string): { label: string; variant: 'green' | 'blue' | 'gray' } {
  const d = parseISO(date)
  if (isToday(d))                          return { label: 'Today',    variant: 'green' }
  if (isTomorrow(d))                       return { label: 'Tomorrow', variant: 'blue'  }
  if (isPast(parseISO(`${date}T23:59`)))   return { label: 'Past',     variant: 'gray'  }
  return { label: format(d, 'MMM d'), variant: 'blue' }
}

const AVATAR_COLORS = ['#007bff','#0cc0df','#7c3aed','#059669','#db2777','#2563eb']
function avatarColor(i: number) { return AVATAR_COLORS[i % AVATAR_COLORS.length] }

// ─── Multi-Attendee Picker ────────────────────────────────────────────────────
function AttendeePicker({
  profiles,
  selected,
  onChange,
}: {
  profiles: { id: string; full_name: string }[]
  selected: Set<string>
  onChange: (next: Set<string>) => void
}) {
  const allSelected = profiles.length > 0 && selected.size === profiles.length

  function toggleAll() {
    if (allSelected) {
      onChange(new Set())
    } else {
      onChange(new Set(profiles.map(p => p.id)))
    }
  }

  function toggle(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else               next.add(id)
    onChange(next)
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1.5px solid var(--border)' }}
    >
      {/* Select All row */}
      <button
        type="button"
        onClick={toggleAll}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
        style={{
          background: allSelected ? 'rgba(0,123,255,0.06)' : 'var(--surface-2)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {/* Checkbox */}
        <span
          className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
          style={{
            background: allSelected ? '#007bff' : 'transparent',
            border: `2px solid ${allSelected ? '#007bff' : 'var(--border-strong)'}`,
          }}
        >
          {allSelected && <Check size={10} className="text-white" strokeWidth={3} />}
        </span>
        <span className="text-[13px] font-semibold" style={{ color: 'var(--t1)' }}>
          Select All Members
        </span>
        {selected.size > 0 && (
          <span
            className="ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(0,123,255,0.12)', color: '#007bff' }}
          >
            {selected.size} selected
          </span>
        )}
      </button>

      {/* Individual members */}
      <div className="max-h-48 overflow-y-auto" style={{ background: 'var(--surface)' }}>
        {profiles.map((p, i) => {
          const checked = selected.has(p.id)
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.id)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
              style={{
                background: checked ? 'rgba(0,123,255,0.05)' : 'transparent',
                borderTop: i === 0 ? 'none' : '1px solid var(--border)',
              }}
              onMouseEnter={e => !checked && ((e.currentTarget as HTMLElement).style.background = 'var(--surface-2)')}
              onMouseLeave={e => !checked && ((e.currentTarget as HTMLElement).style.background = 'transparent')}
            >
              {/* Checkbox */}
              <span
                className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                style={{
                  background: checked ? '#007bff' : 'transparent',
                  border: `2px solid ${checked ? '#007bff' : 'var(--border-strong)'}`,
                }}
              >
                {checked && <Check size={10} className="text-white" strokeWidth={3} />}
              </span>

              {/* Avatar */}
              <div
                className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
                style={{ background: avatarColor(i) }}
              >
                {p.full_name.charAt(0).toUpperCase()}
              </div>

              <span
                className="text-[13px] font-medium truncate"
                style={{ color: checked ? 'var(--t1)' : 'var(--t2)' }}
              >
                {p.full_name}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Schedule Form ────────────────────────────────────────────────────────────
function ScheduleForm({ onClose }: { onClose: () => void }) {
  const { data: profiles = [] } = useProfiles()
  const { addMeeting } = useMeetings()

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const nowTime  = format(new Date(), 'HH:mm')

  const [title, setTitle]           = useState('')
  const [date, setDate]             = useState(todayStr)
  const [time, setTime]             = useState(nowTime)
  const [endTime, setEndTime]       = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [notes, setNotes]           = useState('')
  const [saving, setSaving]         = useState(false)
  const [notifying, setNotifying]   = useState(false)
  const [status, setStatus]         = useState<{ ok: boolean; message: string } | null>(null)

  const inputCls = [
    'w-full px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all',
    'border-[1.5px]',
  ].join(' ')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (selectedIds.size === 0) return

    const attendees = profiles
      .filter(p => selectedIds.has(p.id))
      .map(p => ({ id: p.id, name: p.full_name }))

    const autoTitle = title.trim() ||
      (attendees.length === 1
        ? `Meeting with ${attendees[0].name}`
        : `Team meeting — ${attendees.map(a => a.name.split(' ')[0]).join(', ')}`)

    // Phase 1: save the meeting
    setSaving(true)
    const meeting = addMeeting({ title: autoTitle, date, time, end_time: endTime || null, attendees, notes, summary: null })
    setSaving(false)

    // n8n webhook — fire and forget
    triggerWebhook({
      event: 'meeting.scheduled',
      meeting: {
        id:         meeting.id,
        title:      meeting.title,
        date:       meeting.date,
        time:       meeting.time,
        end_time:   meeting.end_time ?? undefined,
        notes:      meeting.notes,
        created_at: meeting.created_at,
      },
      attendees,
    })

    // Phase 2: send notifications via edge function
    setNotifying(true)
    try {
      const { data, error } = await supabase.functions.invoke('notify-meeting', {
        body: {
          meeting: { title: meeting.title, date: meeting.date, time: meeting.time, end_time: meeting.end_time, notes: meeting.notes },
          attendees,
        },
      })

      if (error) throw error
      
      // If the edge function ran but Twilio/Resend reported failures, it returns success: false
      if (data && data.success === false) {
        console.error('Notification failures detailed report:', data)
        throw new Error('Not all notifications succeeded')
      }

      setStatus({ ok: true, message: 'Meeting scheduled! Team notified via email & WhatsApp.' })
      setTimeout(onClose, 2000)
    } catch (err) {
      console.error('Submission error:', err)
      setStatus({ ok: false, message: 'Meeting saved but notifications failed — please check Console for details.' })
    } finally {
      setNotifying(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-[12px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--t3)' }}>
          Meeting Title
        </label>
        <input
          className={inputCls}
          placeholder="e.g. Weekly 1-on-1"
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--t1)' }}
        />
      </div>

      {/* Attendees */}
      <div>
        <label className="block text-[12px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--t3)' }}>
          Attendees <span className="text-red-500 normal-case tracking-normal">*</span>
        </label>
        <AttendeePicker
          profiles={profiles}
          selected={selectedIds}
          onChange={setSelectedIds}
        />
        {selectedIds.size === 0 && (
          <p className="text-[11px] mt-1.5" style={{ color: 'var(--t3)' }}>Select at least one team member.</p>
        )}
      </div>

      {/* Date */}
      <div>
        <label className="block text-[12px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--t3)' }}>
          Date <span className="text-red-500">*</span>
        </label>
        <input
          required
          type="date"
          className={inputCls}
          value={date}
          onChange={e => setDate(e.target.value)}
          style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--t1)' }}
        />
      </div>

      {/* Start + End Time */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[12px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--t3)' }}>
            Start Time <span className="text-red-500">*</span>
          </label>
          <input
            required
            type="time"
            className={inputCls}
            value={time}
            onChange={e => setTime(e.target.value)}
            style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--t1)' }}
          />
        </div>
        <div>
          <label className="block text-[12px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--t3)' }}>
            End Time
          </label>
          <input
            type="time"
            className={inputCls}
            value={endTime}
            onChange={e => setEndTime(e.target.value)}
            style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--t1)' }}
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-[12px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--t3)' }}>
          Notes
        </label>
        <textarea
          rows={3}
          className={inputCls}
          placeholder="Agenda, discussion points…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--t1)', resize: 'none' }}
        />
      </div>

      {/* Status banner */}
      {status && (
        <div
          className="rounded-xl px-4 py-3 text-[13px] font-medium"
          style={{
            background: status.ok ? 'rgba(5,150,105,0.08)' : 'rgba(217,119,6,0.08)',
            border: `1.5px solid ${status.ok ? 'rgba(5,150,105,0.25)' : 'rgba(217,119,6,0.3)'}`,
            color: status.ok ? '#059669' : '#b45309',
          }}
        >
          {status.ok ? '✅ ' : '⚠️ '}{status.message}
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <Button type="submit" disabled={saving || notifying || !!status || selectedIds.size === 0}>
          {saving ? 'Scheduling…' : notifying ? 'Notifying team…' : 'Schedule Meeting'}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          {status ? 'Close' : 'Cancel'}
        </Button>
      </div>
    </form>
  )
}

// ─── Summary Modal ────────────────────────────────────────────────────────────
function SummaryModal({
  meeting,
  onClose,
  onSaved,
}: {
  meeting: Meeting
  onClose: () => void
  onSaved: (summary: string) => void
}) {
  const { saveSummary } = useMeetings()

  const [notes, setNotes]           = useState(meeting.notes ?? '')
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [result, setResult]         = useState<{
    key_decisions: string
    action_items: string
    next_steps: string
  } | null>(null)

  // Pre-fill with existing summary sections if already saved
  const existingSummary = meeting.summary
  const [savedBanner, setSavedBanner] = useState(false)

  async function handleGenerate() {
    if (!notes.trim()) return
    setGenerating(true)
    setError(null)
    setResult(null)
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('summarize-meeting', {
        body: { notes: notes.trim(), meeting_title: meeting.title },
      })
      if (fnErr) throw fnErr
      if (data?.error) throw new Error(data.error)
      setResult(data)
    } catch (err) {
      setError((err as Error).message ?? 'Something went wrong')
    } finally {
      setGenerating(false)
    }
  }

  async function handleSave() {
    if (!result) return
    setSaving(true)
    const summaryText =
      `Key Decisions:\n${result.key_decisions}\n\nAction Items:\n${result.action_items}\n\nNext Steps:\n${result.next_steps}`
    try {
      const { error: updateErr } = await supabase
        .from('meetings')
        .update({ summary: summaryText })
        .eq('id', meeting.id)
      if (updateErr) throw updateErr
      saveSummary(meeting.id, summaryText)
      onSaved(summaryText)
      setSavedBanner(true)
      setTimeout(onClose, 1500)
    } catch (err) {
      setError((err as Error).message ?? 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all border-[1.5px]'

  return (
    <div className="space-y-4">
      {/* Existing summary preview */}
      {existingSummary && !result && (
        <div
          className="rounded-xl px-4 py-3 text-[12px]"
          style={{ background: 'rgba(5,150,105,0.06)', border: '1.5px solid rgba(5,150,105,0.2)', color: 'var(--t2)', whiteSpace: 'pre-wrap' }}
        >
          <p className="font-semibold text-[11px] uppercase tracking-wide mb-1.5" style={{ color: '#059669' }}>Saved Summary</p>
          {existingSummary}
        </div>
      )}

      {/* Notes textarea */}
      <div>
        <label className="block text-[12px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--t3)' }}>
          Meeting Notes
        </label>
        <textarea
          rows={5}
          className={inputCls}
          placeholder="Paste or type the meeting notes here…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--t1)', resize: 'vertical' }}
        />
      </div>

      <Button onClick={handleGenerate} disabled={generating || !notes.trim()}>
        {generating ? 'Generating…' : '✨ Generate AI Summary'}
      </Button>

      {/* Error */}
      {error && (
        <div
          className="rounded-xl px-4 py-3 text-[13px]"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1.5px solid rgba(239,68,68,0.25)', color: '#ef4444' }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-3">
          {(
            [
              { key: 'key_decisions', label: 'Key Decisions' },
              { key: 'action_items',  label: 'Action Items'  },
              { key: 'next_steps',    label: 'Next Steps'    },
            ] as { key: keyof typeof result; label: string }[]
          ).map(({ key, label }) => (
            <div
              key={key}
              className="rounded-xl px-4 py-3"
              style={{ background: 'var(--surface-2)', border: '1.5px solid var(--border)' }}
            >
              <p className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--t3)' }}>
                {label}
              </p>
              <p className="text-[13px] whitespace-pre-wrap" style={{ color: 'var(--t1)' }}>
                {result[key]}
              </p>
            </div>
          ))}

          {savedBanner ? (
            <div
              className="rounded-xl px-4 py-3 text-[13px] font-medium"
              style={{ background: 'rgba(5,150,105,0.08)', border: '1.5px solid rgba(5,150,105,0.25)', color: '#059669' }}
            >
              ✅ Summary saved!
            </div>
          ) : (
            <div className="flex gap-3">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save Summary'}
              </Button>
              <Button variant="secondary" onClick={onClose}>Discard</Button>
            </div>
          )}
        </div>
      )}

      {!result && (
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
      )}
    </div>
  )
}

// ─── Meeting Card ─────────────────────────────────────────────────────────────
function MeetingCard({ meeting, onDelete }: { meeting: Meeting; onDelete: () => void }) {
  const { label, variant } = dateLabel(meeting.date)
  const isPastMeeting = isPast(parseISO(`${meeting.date}T${meeting.time}`))
  const [showSummary, setShowSummary] = useState(false)

  return (
    <>
      <Card className={isPastMeeting ? 'opacity-55' : ''}>
        <CardBody className="flex items-start gap-4 py-4">

          {/* Date badge */}
          <div
            className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(0,123,255,0.08)', border: '1.5px solid rgba(0,123,255,0.16)' }}
          >
            <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#007bff' }}>
              {format(parseISO(meeting.date), 'MMM')}
            </span>
            <span className="text-[18px] font-bold leading-tight" style={{ color: '#007bff' }}>
              {format(parseISO(meeting.date), 'd')}
            </span>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <h3 className="font-semibold text-sm" style={{ color: 'var(--t1)' }}>
                {meeting.title}
              </h3>
              <Badge variant={variant}>{label}</Badge>
              {isPastMeeting && <Badge variant="gray">Completed</Badge>}
              {meeting.summary && (
                <Badge variant="green">Summary Saved</Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs" style={{ color: 'var(--t2)' }}>
              {/* Time range */}
              <span className="flex items-center gap-1.5">
                <Clock size={12} style={{ color: 'var(--t3)' }} />
                <span className="font-medium" style={{ color: 'var(--t1)' }}>
                  {meeting.time}
                  {meeting.end_time && (
                    <> <span style={{ color: 'var(--t3)' }}>→</span> {meeting.end_time}</>
                  )}
                </span>
              </span>
              {/* Attendee avatars + full names */}
              <span className="flex items-center gap-1.5">
                <Users size={12} style={{ color: 'var(--t3)' }} />
                <div className="flex -space-x-1">
                  {meeting.attendees.slice(0, 4).map((a, i) => (
                    <div
                      key={a.id}
                      title={a.name}
                      className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                      style={{ background: avatarColor(i), boxShadow: '0 0 0 2px var(--surface)' }}
                    >
                      {a.name.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {meeting.attendees.length > 4 && (
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                      style={{ background: 'var(--surface-2)', color: 'var(--t2)', boxShadow: '0 0 0 2px var(--surface)' }}
                    >
                      +{meeting.attendees.length - 4}
                    </div>
                  )}
                </div>
                <span title={meeting.attendees.map(a => a.name).join(', ')}>
                  {meeting.attendees.map(a => a.name).join(', ')}
                </span>
              </span>
            </div>

            {meeting.notes && (
              <div className="mt-2 flex items-start gap-1.5">
                <StickyNote size={11} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--t3)' }} />
                <p className="text-xs line-clamp-2" style={{ color: 'var(--t2)' }}>{meeting.notes}</p>
              </div>
            )}

            {/* Add Summary button — past meetings only */}
            {isPastMeeting && (
              <button
                onClick={() => setShowSummary(true)}
                className="mt-2.5 inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-colors"
                style={{ background: 'rgba(124,58,237,0.08)', color: '#7c3aed', border: '1.5px solid rgba(124,58,237,0.2)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.14)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.08)' }}
              >
                📝 {meeting.summary ? 'View / Edit Summary' : 'Add Summary'}
              </button>
            )}
          </div>

          {/* Delete */}
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg transition-colors flex-shrink-0"
            style={{ color: 'var(--t3)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t3)'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            aria-label="Delete meeting"
          >
            <Trash2 size={14} />
          </button>
        </CardBody>
      </Card>

      <Modal open={showSummary} title={`Meeting Summary — ${meeting.title}`} onClose={() => setShowSummary(false)}>
        <SummaryModal
          meeting={meeting}
          onClose={() => setShowSummary(false)}
          onSaved={() => setShowSummary(false)}
        />
      </Modal>
    </>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ onSchedule }: { onSchedule: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-20 text-center rounded-2xl"
      style={{ border: '1.5px dashed var(--border-strong)', background: 'var(--surface)' }}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'rgba(0,123,255,0.08)' }}
      >
        <CalendarDays size={26} style={{ color: '#007bff' }} />
      </div>
      <h3 className="text-base font-bold mb-1" style={{ color: 'var(--t1)' }}>No meetings scheduled</h3>
      <p className="text-sm mb-6 max-w-xs" style={{ color: 'var(--t2)' }}>
        Schedule your first team meeting to keep everyone aligned.
      </p>
      <Button onClick={onSchedule}><Plus size={14} /> Schedule Meeting</Button>
    </div>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHead({ label }: { label: string }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.10em] mb-3" style={{ color: 'var(--t3)' }}>
      {label}
    </p>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function MeetingsPage() {
  const { meetings, deleteMeeting } = useMeetings()
  const [showForm, setShowForm] = useState(false)

  const { upcoming, past } = useMemo(() => {
    const upcoming: Meeting[] = []
    const past: Meeting[]     = []
    for (const m of meetings) {
      if (isPast(parseISO(`${m.date}T${m.time}`))) past.push(m)
      else                                           upcoming.push(m)
    }
    return { upcoming, past: past.slice().reverse() }
  }, [meetings])

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--t1)' }}>Meeting Schedule</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--t2)' }}>
            {format(new Date(), 'EEEE, MMMM d, yyyy')} · {meetings.length} meeting{meetings.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}><Plus size={14} /> Schedule Meeting</Button>
      </div>

      {/* Stats */}
      {meetings.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {[
            { count: upcoming.length, label: 'Upcoming',  icon: CalendarClock, color: '#007bff' },
            { count: past.length,     label: 'Completed', icon: CalendarCheck, color: '#059669' },
          ].map(({ count, label, icon: Icon, color }) => (
            <Card key={label}>
              <CardBody className="flex items-center gap-3 py-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                     style={{ background: `${color}1a` }}>
                  <Icon size={18} style={{ color }} />
                </div>
                <div>
                  <p className="text-xl font-bold" style={{ color: 'var(--t1)' }}>{count}</p>
                  <p className="text-xs font-medium" style={{ color: 'var(--t2)' }}>{label}</p>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {meetings.length === 0 && <EmptyState onSchedule={() => setShowForm(true)} />}

      {upcoming.length > 0 && (
        <div>
          <SectionHead label="Upcoming" />
          <div className="space-y-2">
            {upcoming.map(m => (
              <MeetingCard key={m.id} meeting={m}
                onDelete={() => { if (confirm('Remove this meeting?')) deleteMeeting(m.id) }} />
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <SectionHead label="Past Meetings" />
          <div className="space-y-2">
            {past.map(m => (
              <MeetingCard key={m.id} meeting={m}
                onDelete={() => { if (confirm('Remove this meeting?')) deleteMeeting(m.id) }} />
            ))}
          </div>
        </div>
      )}

      <Modal open={showForm} title="Schedule a Meeting" onClose={() => setShowForm(false)}>
        <ScheduleForm onClose={() => setShowForm(false)} />
      </Modal>
    </div>
  )
}
