import { useState, useCallback, useMemo } from 'react'
import {
  Plus, Mail, Pencil, Trash2, GripVertical,
  LayoutGrid, List, TrendingUp, AlertCircle, Trophy, Calendar,
  ChevronUp, ChevronDown, ChevronsUpDown,
} from 'lucide-react'
import { format, isPast, parseISO, differenceInDays } from 'date-fns'
import {
  DndContext, DragOverlay, PointerSensor,
  useSensor, useSensors, useDroppable, useDraggable,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useShmOutreach, useCreateShmOutreach, useUpdateShmOutreach, useDeleteShmOutreach } from '@/hooks/useShmOutreach'
import { useInitiatives } from '@/hooks/useInitiatives'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import type { ShmOutreach, PreserviceStage, DealPriority, DealStatus } from '@/types/database'

// ─── Types ───────────────────────────────────────────────────────────────────
type ViewMode = 'kanban' | 'table'
type SortKey = 'company' | 'deal_value' | 'next_followup_date' | 'priority' | null
type SortDir = 'asc' | 'desc'
type DealWithProfile = ShmOutreach & { profiles: { full_name: string } }

// ─── Column definitions ───────────────────────────────────────────────────────
interface ColumnDef { id: PreserviceStage; label: string; sublabel: string; headerColor: string; dotColor: string }

const COLUMNS: ColumnDef[] = [
  { id: 'as_is_study',               label: 'Discovery / Lead',           sublabel: 'Initial contact & scoping', headerColor: 'border-t-slate-400',   dotColor: 'bg-slate-400'   },
  { id: 'gap_analysis',              label: 'As-Is Study in Progress',     sublabel: 'Active assessment',         headerColor: 'border-t-blue-500',    dotColor: 'bg-blue-500'    },
  { id: 'solution_scope',            label: 'Solution Scope',              sublabel: 'Design & architecture',     headerColor: 'border-t-indigo-500',  dotColor: 'bg-indigo-500'  },
  { id: 'technical_financial_offer', label: 'Technical & Financial Offer', sublabel: 'Proposal submitted',        headerColor: 'border-t-purple-500',  dotColor: 'bg-purple-500'  },
  { id: 'closed_won',                label: 'Closed / Won',                sublabel: 'Contract signed',           headerColor: 'border-t-emerald-500', dotColor: 'bg-emerald-500' },
]

// ─── Priority & Status configs ────────────────────────────────────────────────
const PRIORITY_ORDER: Record<DealPriority, number> = { low: 0, medium: 1, high: 2 }

const PRIORITY_BADGE: Record<DealPriority, string> = {
  low:    'bg-slate-100 text-slate-500',
  medium: 'bg-amber-50 text-amber-600',
  high:   'bg-red-50 text-red-600',
}
const PRIORITY_LABEL: Record<DealPriority, string> = { low: 'Low', medium: 'Med', high: 'High' }

const STATUS_BADGE: Record<DealStatus, string> = {
  active:  'bg-green-50 text-green-700',
  stalled: 'bg-orange-50 text-orange-600',
  won:     'bg-emerald-50 text-emerald-700',
  lost:    'bg-red-50 text-red-500',
}
const STATUS_LABEL: Record<DealStatus, string> = { active: 'Active', stalled: 'Stalled', won: 'Won', lost: 'Lost' }

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatValue(v: number | null | undefined): string {
  if (!v) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)
}

function isOverdue(date: string | null | undefined): boolean {
  if (!date) return false
  return isPast(parseISO(date + 'T23:59:59'))
}

function daysSinceContact(date: string | null | undefined): number | null {
  if (!date) return null
  return differenceInDays(new Date(), parseISO(date + 'T12:00:00'))
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string; sub?: string
  icon: React.ElementType; accent: string
}) {
  return (
    <div className="rounded-xl px-5 py-4 flex items-center gap-4"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${accent}`}>
        <Icon size={18} className="text-white" strokeWidth={2} />
      </div>
      <div>
        <p className="text-xl font-bold leading-none" style={{ color: 'var(--t1)', fontFamily: 'var(--font-display)' }}>{value}</p>
        <p className="text-xs mt-1" style={{ color: 'var(--t3)' }}>{label}</p>
        {sub && <p className="text-[11px] mt-0.5 font-medium" style={{ color: 'var(--t2)' }}>{sub}</p>}
      </div>
    </div>
  )
}

// ─── Deal Form ────────────────────────────────────────────────────────────────
function DealForm({ initial, defaultStage, onClose, initiatives }: {
  initial?: Partial<ShmOutreach>
  defaultStage?: PreserviceStage
  onClose: () => void
  initiatives: Array<{ id: string; name: string }>
}) {
  const { profile } = useAuth()
  const create = useCreateShmOutreach()
  const update = useUpdateShmOutreach()

  const [form, setForm] = useState({
    contact_name:         initial?.contact_name         ?? '',
    company:              initial?.company              ?? '',
    contact_email:        initial?.contact_email        ?? '',
    stage:                (initial?.stage ?? defaultStage ?? 'as_is_study') as PreserviceStage,
    notes:                initial?.notes                ?? '',
    last_contact_date:    initial?.last_contact_date    ?? '',
    owner_id:             initial?.owner_id             ?? profile?.id ?? '',
    deal_value:           initial?.deal_value           ?? ('' as unknown as number),
    priority:             (initial?.priority            ?? 'medium') as DealPriority,
    next_followup_date:   initial?.next_followup_date   ?? '',
    deal_status:          (initial?.deal_status         ?? 'active') as DealStatus,
    linked_initiative_id: initial?.linked_initiative_id ?? '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      ...form,
      contact_email:        form.contact_email        || null,
      notes:                form.notes                || null,
      last_contact_date:    form.last_contact_date    || null,
      deal_value:           form.deal_value ? Number(form.deal_value) : null,
      next_followup_date:   form.next_followup_date   || null,
      linked_initiative_id: form.linked_initiative_id || null,
    }
    if (initial?.id) {
      await update.mutateAsync({ id: initial.id, updates: payload })
    } else {
      await create.mutateAsync(payload as Omit<ShmOutreach, 'id' | 'created_at' | 'updated_at'>)
    }
    onClose()
  }

  const saving = create.isPending || update.isPending
  const cls = 'w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none transition-shadow'

  const field = (style: React.CSSProperties = {}) => ({
    className: cls,
    style: { border: '1px solid var(--border-strong)', background: 'var(--surface-2)', color: 'var(--t1)', ...style },
  })

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Row 1: contact + company */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--t3)' }}>Contact Name <span className="text-red-500">*</span></label>
          <input required {...field()} value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--t3)' }}>Company <span className="text-red-500">*</span></label>
          <input required {...field()} value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
        </div>
      </div>

      {/* Row 2: email + stage */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--t3)' }}>Email</label>
          <input type="email" {...field()} value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--t3)' }}>Stage</label>
          <select {...field()} value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value as PreserviceStage }))}>
            {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
      </div>

      {/* Row 3: deal value + priority */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--t3)' }}>Deal Value (USD)</label>
          <input type="number" min="0" step="500" placeholder="e.g. 45000" {...field()} value={form.deal_value ?? ''} onChange={e => setForm(f => ({ ...f, deal_value: e.target.value as unknown as number }))} />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--t3)' }}>Priority</label>
          <select {...field()} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as DealPriority }))}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      {/* Row 4: followup + status */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--t3)' }}>Next Follow-up Date</label>
          <input type="date" {...field()} value={form.next_followup_date} onChange={e => setForm(f => ({ ...f, next_followup_date: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--t3)' }}>Status</label>
          <select {...field()} value={form.deal_status} onChange={e => setForm(f => ({ ...f, deal_status: e.target.value as DealStatus }))}>
            <option value="active">Active</option>
            <option value="stalled">Stalled</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </select>
        </div>
      </div>

      {/* Row 5: linked initiative */}
      <div>
        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--t3)' }}>Linked Project (optional)</label>
        <select {...field()} value={form.linked_initiative_id} onChange={e => setForm(f => ({ ...f, linked_initiative_id: e.target.value }))}>
          <option value="">— None —</option>
          {initiatives.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      </div>

      {/* Row 6: last contact + notes */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--t3)' }}>Last Contact Date</label>
          <input type="date" {...field()} value={form.last_contact_date} onChange={e => setForm(f => ({ ...f, last_contact_date: e.target.value }))} />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--t3)' }}>Notes</label>
        <textarea rows={3} {...field()} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
      </div>

      <div className="flex gap-3 pt-1">
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : (initial?.id ? 'Update' : 'Add Deal')}</Button>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  )
}

// ─── Deal Card (Kanban) ───────────────────────────────────────────────────────
function DealCard({ deal, onEdit, onDelete, initiativeName, isDragging = false }: {
  deal: DealWithProfile
  onEdit: () => void
  onDelete: () => void
  initiativeName?: string
  isDragging?: boolean
}) {
  const { isAdmin, profile } = useAuth()
  const canEdit = isAdmin || deal.owner_id === profile?.id

  const { attributes, listeners, setNodeRef, transform, isDragging: dragging } = useDraggable({
    id: deal.id, data: { deal }, disabled: !canEdit,
  })

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined
  const overdue = isOverdue(deal.next_followup_date)
  const stale = (daysSinceContact(deal.last_contact_date) ?? 0) > 14
  const priority = (deal.priority ?? 'medium') as DealPriority
  const status = (deal.deal_status ?? 'active') as DealStatus

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, background: 'var(--surface)', border: '1px solid var(--border)' }}
      className={`rounded-xl p-3 shadow-sm group transition-all hover:shadow-md ${dragging || isDragging ? 'opacity-40 shadow-lg ring-2 ring-blue-400' : ''}`}
    >
      {/* Header row */}
      <div className="flex items-start gap-1.5">
        {canEdit && (
          <button {...attributes} {...listeners}
            className="mt-0.5 p-0.5 flex-shrink-0 cursor-grab active:cursor-grabbing touch-none"
            style={{ color: 'var(--t3)' }} aria-label="Drag">
            <GripVertical size={13} />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-snug truncate" style={{ color: 'var(--t1)' }}>{deal.company}</p>
          <p className="text-xs truncate mt-0.5" style={{ color: 'var(--t3)' }}>{deal.contact_name}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {status === 'stalled' && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${STATUS_BADGE.stalled}`}>Stalled</span>
          )}
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${PRIORITY_BADGE[priority]}`}>
            {PRIORITY_LABEL[priority]}
          </span>
          {canEdit && (
            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-0.5">
              <button onClick={onEdit} className="p-1 rounded transition-colors" style={{ color: 'var(--t3)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--t1)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--t3)')}
                aria-label={`Edit ${deal.company}`}><Pencil size={11} /></button>
              <button onClick={onDelete} className="p-1 rounded transition-colors" style={{ color: 'var(--t3)' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--t3)')}
                aria-label={`Delete ${deal.company}`}><Trash2 size={11} /></button>
            </div>
          )}
        </div>
      </div>

      {/* Value + follow-up row */}
      <div className="flex items-center gap-3 mt-2">
        {deal.deal_value ? (
          <span className="text-xs font-semibold" style={{ color: 'var(--t1)' }}>{formatValue(deal.deal_value)}</span>
        ) : null}
        {deal.next_followup_date && (
          <span className={`text-[11px] flex items-center gap-0.5 ${overdue ? 'text-red-500 font-semibold' : ''}`}
            style={!overdue ? { color: 'var(--t3)' } : {}}>
            <Calendar size={10} />
            {format(parseISO(deal.next_followup_date), 'MMM d')}
            {overdue && ' ⚠'}
          </span>
        )}
        {stale && !deal.next_followup_date && (
          <span className="text-[10px] text-amber-500 font-medium">Stale</span>
        )}
      </div>

      {/* Linked initiative */}
      {initiativeName && (
        <p className="text-[11px] mt-1 truncate" style={{ color: 'var(--orange)' }}>
          🔗 {initiativeName}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2.5 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
            style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)' }}>
            {deal.profiles.full_name.charAt(0).toUpperCase()}
          </div>
          {deal.contact_email && (
            <span className="text-[10px]" style={{ color: 'var(--t3)' }}>
              <Mail size={9} className="inline mr-0.5" />{deal.contact_email.split('@')[0]}
            </span>
          )}
        </div>
        {deal.last_contact_date && (
          <p className="text-[10px]" style={{ color: 'var(--t3)' }}>
            {format(parseISO(deal.last_contact_date + 'T12:00:00'), 'MMM d')}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Kanban Column ────────────────────────────────────────────────────────────
function KanbanColumn({ column, deals, onAddCard, onEdit, onDelete, initiativeMap }: {
  column: ColumnDef
  deals: DealWithProfile[]
  onAddCard: (stage: PreserviceStage) => void
  onEdit: (deal: ShmOutreach) => void
  onDelete: (id: string) => void
  initiativeMap: Record<string, string>
}) {
  const { isOver, setNodeRef } = useDroppable({ id: column.id })
  const colValue = deals.reduce((s, d) => s + (d.deal_value ?? 0), 0)

  return (
    <div className="flex flex-col w-72 flex-shrink-0">
      {/* Header */}
      <div className={`rounded-t-xl border border-b-0 px-4 pt-4 pb-3 border-t-4 ${column.headerColor}`}
        style={{ background: 'var(--surface)', borderColor: undefined, borderLeftColor: 'var(--border)', borderRightColor: 'var(--border)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${column.dotColor}`} />
            <h3 className="text-sm font-semibold leading-tight" style={{ color: 'var(--t1)' }}>{column.label}</h3>
          </div>
          <div className="flex items-center gap-1.5">
            {colValue > 0 && (
              <span className="text-[10px] font-semibold" style={{ color: 'var(--t2)' }}>{formatValue(colValue)}</span>
            )}
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-md" style={{ background: 'var(--surface-2)', color: 'var(--t3)' }}>
              {deals.length}
            </span>
          </div>
        </div>
        <p className="text-[11px] mt-0.5 ml-4" style={{ color: 'var(--t3)' }}>{column.sublabel}</p>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-[200px] rounded-b-xl border border-t-0 p-2 space-y-2 transition-colors ${isOver ? 'ring-2 ring-blue-400 ring-inset' : ''}`}
        style={{ background: isOver ? 'rgba(37,99,235,0.04)' : 'var(--surface-2)', borderColor: 'var(--border)' }}
      >
        {deals.map(deal => (
          <DealCard
            key={deal.id}
            deal={deal}
            onEdit={() => onEdit(deal)}
            onDelete={() => onDelete(deal.id)}
            initiativeName={deal.linked_initiative_id ? initiativeMap[deal.linked_initiative_id] : undefined}
          />
        ))}
        <button
          onClick={() => onAddCard(column.id)}
          className="w-full flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors"
          style={{ color: 'var(--t3)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface)'; (e.currentTarget as HTMLElement).style.color = 'var(--t2)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--t3)' }}
        >
          <Plus size={13} /> Add card
        </button>
      </div>
    </div>
  )
}

// ─── Drag Overlay ─────────────────────────────────────────────────────────────
function DragOverlayCard({ deal }: { deal: DealWithProfile }) {
  return (
    <div className="rounded-xl border shadow-xl p-3 w-72 rotate-1 opacity-95"
      style={{ background: 'var(--surface)', borderColor: 'var(--orange)' }}>
      <p className="font-semibold text-sm" style={{ color: 'var(--t1)' }}>{deal.company}</p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--t3)' }}>{deal.contact_name}</p>
      {deal.deal_value && <p className="text-xs font-semibold mt-1" style={{ color: 'var(--t2)' }}>{formatValue(deal.deal_value)}</p>}
    </div>
  )
}

// ─── Table View ───────────────────────────────────────────────────────────────
function TableView({ deals, onEdit, onDelete, initiativeMap }: {
  deals: DealWithProfile[]
  onEdit: (deal: ShmOutreach) => void
  onDelete: (id: string) => void
  initiativeMap: Record<string, string>
}) {
  const { isAdmin, profile } = useAuth()
  const [sortKey, setSortKey] = useState<SortKey>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const sorted = useMemo(() => {
    if (!sortKey) return deals
    return [...deals].sort((a, b) => {
      let av: number | string = 0, bv: number | string = 0
      if (sortKey === 'company') { av = a.company.toLowerCase(); bv = b.company.toLowerCase() }
      if (sortKey === 'deal_value') { av = a.deal_value ?? 0; bv = b.deal_value ?? 0 }
      if (sortKey === 'next_followup_date') { av = a.next_followup_date ?? '9999'; bv = b.next_followup_date ?? '9999' }
      if (sortKey === 'priority') { av = PRIORITY_ORDER[a.priority ?? 'medium']; bv = PRIORITY_ORDER[b.priority ?? 'medium'] }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [deals, sortKey, sortDir])

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ChevronsUpDown size={12} style={{ color: 'var(--t3)' }} />
    return sortDir === 'asc' ? <ChevronUp size={12} style={{ color: 'var(--orange)' }} /> : <ChevronDown size={12} style={{ color: 'var(--orange)' }} />
  }

  const th = 'text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap'
  const td = 'px-3 py-3 text-sm align-middle'

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
            <tr>
              <th className={th} style={{ color: 'var(--t3)' }}>
                <button className="flex items-center gap-1 hover:text-current" style={{ color: 'var(--t3)' }} onClick={() => handleSort('company')}>
                  Company <SortIcon k="company" />
                </button>
              </th>
              <th className={th} style={{ color: 'var(--t3)' }}>Contact</th>
              <th className={th} style={{ color: 'var(--t3)' }}>Stage</th>
              <th className={th} style={{ color: 'var(--t3)' }}>
                <button className="flex items-center gap-1" style={{ color: 'var(--t3)' }} onClick={() => handleSort('priority')}>
                  Priority <SortIcon k="priority" />
                </button>
              </th>
              <th className={th} style={{ color: 'var(--t3)' }}>
                <button className="flex items-center gap-1" style={{ color: 'var(--t3)' }} onClick={() => handleSort('deal_value')}>
                  Value <SortIcon k="deal_value" />
                </button>
              </th>
              <th className={th} style={{ color: 'var(--t3)' }}>Status</th>
              <th className={th} style={{ color: 'var(--t3)' }}>
                <button className="flex items-center gap-1" style={{ color: 'var(--t3)' }} onClick={() => handleSort('next_followup_date')}>
                  Follow-up <SortIcon k="next_followup_date" />
                </button>
              </th>
              <th className={th} style={{ color: 'var(--t3)' }}>Owner</th>
              <th className={th} style={{ color: 'var(--t3)' }}></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((deal, i) => {
              const overdue = isOverdue(deal.next_followup_date)
              const canEdit = isAdmin || deal.owner_id === profile?.id
              const stage = COLUMNS.find(c => c.id === deal.stage)
              const priority = (deal.priority ?? 'medium') as DealPriority
              const status = (deal.deal_status ?? 'active') as DealStatus

              return (
                <tr key={deal.id}
                  style={{
                    borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                    background: deal.deal_status === 'lost' ? 'rgba(239,68,68,0.03)' : 'transparent',
                  }}>
                  <td className={td}>
                    <div>
                      <p className="font-semibold" style={{ color: 'var(--t1)' }}>{deal.company}</p>
                      {deal.linked_initiative_id && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--orange)' }}>🔗 {initiativeMap[deal.linked_initiative_id]}</p>
                      )}
                    </div>
                  </td>
                  <td className={td}>
                    <p className="text-sm" style={{ color: 'var(--t2)' }}>{deal.contact_name}</p>
                    {deal.contact_email && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--t3)' }}>{deal.contact_email}</p>
                    )}
                  </td>
                  <td className={td}>
                    <div className="flex items-center gap-1.5">
                      {stage && <span className={`w-2 h-2 rounded-full flex-shrink-0 ${stage.dotColor}`} />}
                      <span className="text-xs" style={{ color: 'var(--t2)' }}>{stage?.label ?? deal.stage}</span>
                    </div>
                  </td>
                  <td className={td}>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${PRIORITY_BADGE[priority]}`}>
                      {PRIORITY_LABEL[priority]}
                    </span>
                  </td>
                  <td className={td}>
                    <span className="font-semibold text-sm" style={{ color: 'var(--t1)' }}>{formatValue(deal.deal_value)}</span>
                  </td>
                  <td className={td}>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${STATUS_BADGE[status]}`}>
                      {STATUS_LABEL[status]}
                    </span>
                  </td>
                  <td className={td}>
                    {deal.next_followup_date ? (
                      <span className={`text-xs font-medium ${overdue ? 'text-red-500' : ''}`}
                        style={!overdue ? { color: 'var(--t2)' } : {}}>
                        {overdue && '⚠ '}
                        {format(parseISO(deal.next_followup_date), 'MMM d, yyyy')}
                      </span>
                    ) : <span style={{ color: 'var(--t3)' }}>—</span>}
                  </td>
                  <td className={td}>
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)' }}>
                        {deal.profiles.full_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs truncate max-w-[80px]" style={{ color: 'var(--t2)' }}>{deal.profiles.full_name}</span>
                    </div>
                  </td>
                  <td className={td}>
                    {canEdit && (
                      <div className="flex gap-1">
                        <button onClick={() => onEdit(deal)} className="p-1.5 rounded transition-colors" style={{ color: 'var(--t3)' }}
                          onMouseEnter={e => (e.currentTarget.style.color = 'var(--t1)')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--t3)')}
                          aria-label={`Edit ${deal.company}`}><Pencil size={13} /></button>
                        <button onClick={() => onDelete(deal.id)} className="p-1.5 rounded transition-colors" style={{ color: 'var(--t3)' }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--t3)')}
                          aria-label={`Delete ${deal.company}`}><Trash2 size={13} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-sm" style={{ color: 'var(--t3)' }}>
                  No deals match your filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PipelinePage() {
  const { data: outreach, isLoading } = useShmOutreach()
  const { data: initiativeData } = useInitiatives()
  const updateOutreach = useUpdateShmOutreach()
  const deleteOutreach = useDeleteShmOutreach()

  const [showForm, setShowForm]       = useState(false)
  const [newCardStage, setNewCardStage] = useState<PreserviceStage>('as_is_study')
  const [editing, setEditing]         = useState<ShmOutreach | null>(null)
  const [activeId, setActiveId]       = useState<string | null>(null)
  const [viewMode, setViewMode]       = useState<ViewMode>('kanban')
  const [search, setSearch]           = useState('')
  const [filterPriority, setFilterPriority] = useState<DealPriority | 'all'>('all')
  const [filterStatus, setFilterStatus]     = useState<DealStatus | 'all'>('all')
  const [stageOverrides, setStageOverrides] = useState<Record<string, PreserviceStage>>({})

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  // Build initiative lookup map
  const initiativeMap = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    initiativeData?.forEach(i => { map[i.id] = i.name })
    return map
  }, [initiativeData])

  const initiatives = useMemo(() => initiativeData?.map(i => ({ id: i.id, name: i.name })) ?? [], [initiativeData])

  // Apply stage overrides
  const allDeals: DealWithProfile[] = useMemo(() =>
    (outreach ?? []).map(d => ({ ...d, stage: stageOverrides[d.id] ?? d.stage })) as DealWithProfile[],
  [outreach, stageOverrides])

  // Stats (always from all non-lost deals)
  const activeDeals  = allDeals.filter(d => (d.deal_status ?? 'active') !== 'lost')
  const pipelineVal  = activeDeals.reduce((s, d) => s + (d.deal_value ?? 0), 0)
  const overdueCount = activeDeals.filter(d => isOverdue(d.next_followup_date)).length
  const wonCount     = allDeals.filter(d => d.stage === 'closed_won' || d.deal_status === 'won').length

  // Filtered deals
  const filteredDeals = useMemo(() => {
    let list = allDeals
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(d => d.company.toLowerCase().includes(q) || d.contact_name.toLowerCase().includes(q))
    }
    if (filterPriority !== 'all') list = list.filter(d => (d.priority ?? 'medium') === filterPriority)
    if (filterStatus !== 'all') list = list.filter(d => (d.deal_status ?? 'active') === filterStatus)
    return list
  }, [allDeals, search, filterPriority, filterStatus])

  // Kanban excludes 'lost' deals
  const kanbanDeals = filteredDeals.filter(d => (d.deal_status ?? 'active') !== 'lost')

  const activeDeal = activeId ? (kanbanDeals.find(d => d.id === activeId) ?? null) : null

  const handleDragStart = useCallback((e: DragStartEvent) => setActiveId(e.active.id as string), [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (!over) return
    const dealId = active.id as string
    const newStage = over.id as PreserviceStage
    const currentStage = stageOverrides[dealId] ?? allDeals.find(d => d.id === dealId)?.stage
    if (newStage === currentStage) return
    setStageOverrides(prev => ({ ...prev, [dealId]: newStage }))
    updateOutreach.mutate(
      { id: dealId, updates: { stage: newStage } },
      {
        onError: () => setStageOverrides(prev => { const n = { ...prev }; delete n[dealId]; return n }),
        onSuccess: () => setStageOverrides(prev => { const n = { ...prev }; delete n[dealId]; return n }),
      }
    )
  }, [allDeals, stageOverrides, updateOutreach])

  function handleDelete(id: string) {
    if (confirm('Delete this deal?')) deleteOutreach.mutate(id)
  }

  const selectCls = 'px-3 py-2 rounded-lg text-sm border transition-colors focus:outline-none'
  const selectStyle = { background: 'var(--surface)', borderColor: 'var(--border-strong)', color: 'var(--t1)' }

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--t1)', fontFamily: 'var(--font-display)' }}>Pipeline</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--t3)' }}>As-Is Studies & Business Development</p>
        </div>
        <Button onClick={() => { setNewCardStage('as_is_study'); setShowForm(true) }}>
          <Plus size={15} /> New Deal
        </Button>
      </div>

      {/* ── Stats bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Active Deals"      value={String(activeDeals.length)}  icon={TrendingUp}   accent="bg-blue-600" />
        <StatCard label="Pipeline Value"    value={formatValue(pipelineVal)}     icon={Trophy}       accent="bg-emerald-600" />
        <StatCard label="Overdue Follow-ups" value={String(overdueCount)}        icon={AlertCircle}  accent={overdueCount > 0 ? 'bg-red-500' : 'bg-slate-400'} />
        <StatCard label="Closed / Won"      value={String(wonCount)}             icon={Trophy}       accent="bg-purple-600" />
      </div>

      {/* ── Filter bar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          placeholder="Search company or contact…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={selectCls + ' flex-1 min-w-[180px]'}
          style={selectStyle}
        />
        <select className={selectCls} style={selectStyle} value={filterPriority} onChange={e => setFilterPriority(e.target.value as DealPriority | 'all')}>
          <option value="all">All priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select className={selectCls} style={selectStyle} value={filterStatus} onChange={e => setFilterStatus(e.target.value as DealStatus | 'all')}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="stalled">Stalled</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
        </select>

        {/* View toggle */}
        <div className="flex rounded-lg overflow-hidden flex-shrink-0" style={{ border: '1px solid var(--border-strong)' }}>
          {(['kanban', 'table'] as ViewMode[]).map(m => (
            <button key={m} onClick={() => setViewMode(m)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors"
              style={{
                background: viewMode === m ? 'var(--orange)' : 'var(--surface)',
                color: viewMode === m ? '#fff' : 'var(--t2)',
              }}>
              {m === 'kanban' ? <><LayoutGrid size={13} /> Kanban</> : <><List size={13} /> Table</>}
            </button>
          ))}
        </div>
      </div>

      {/* ── Board ── */}
      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map(col => (
            <div key={col.id} className="w-72 flex-shrink-0 space-y-2">
              <div className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--surface-2)' }} />
              {[1, 2].map(i => <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: 'var(--surface)' }} />)}
            </div>
          ))}
        </div>
      ) : viewMode === 'kanban' ? (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-6">
            {COLUMNS.map(col => (
              <KanbanColumn
                key={col.id}
                column={col}
                deals={kanbanDeals.filter(d => d.stage === col.id) as DealWithProfile[]}
                onAddCard={stage => { setNewCardStage(stage); setShowForm(true) }}
                onEdit={setEditing}
                onDelete={handleDelete}
                initiativeMap={initiativeMap}
              />
            ))}
          </div>
          <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
            {activeDeal && <DragOverlayCard deal={activeDeal} />}
          </DragOverlay>
        </DndContext>
      ) : (
        <TableView
          deals={filteredDeals}
          onEdit={setEditing}
          onDelete={handleDelete}
          initiativeMap={initiativeMap}
        />
      )}

      {/* ── Modals ── */}
      <Modal open={showForm} title="New Deal" onClose={() => setShowForm(false)} size="lg">
        <DealForm defaultStage={newCardStage} onClose={() => setShowForm(false)} initiatives={initiatives} />
      </Modal>
      {editing && (
        <Modal open title="Edit Deal" onClose={() => setEditing(null)} size="lg">
          <DealForm initial={editing} onClose={() => setEditing(null)} initiatives={initiatives} />
        </Modal>
      )}
    </div>
  )
}
