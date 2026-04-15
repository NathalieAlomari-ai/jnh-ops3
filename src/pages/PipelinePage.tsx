import { useState, useCallback } from 'react'
import { Plus, Mail, FileText, Pencil, Trash2, GripVertical } from 'lucide-react'
import { format } from 'date-fns'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useShmOutreach, useCreateShmOutreach, useUpdateShmOutreach, useDeleteShmOutreach } from '@/hooks/useShmOutreach'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import type { ShmOutreach, PreserviceStage } from '@/types/database'

// ─── Kanban column definitions ────────────────────────────────────────────────
interface ColumnDef {
  id: PreserviceStage
  label: string
  sublabel: string
  headerColor: string
  dotColor: string
}

const COLUMNS: ColumnDef[] = [
  { id: 'as_is_study',               label: 'Discovery / Lead',             sublabel: 'Initial contact & scoping', headerColor: 'border-t-slate-400',   dotColor: 'bg-slate-400'   },
  { id: 'gap_analysis',              label: 'As-Is Study in Progress',       sublabel: 'Active assessment',         headerColor: 'border-t-blue-500',    dotColor: 'bg-blue-500'    },
  { id: 'solution_scope',            label: 'Solution Scope',                sublabel: 'Design & architecture',     headerColor: 'border-t-orange-400',  dotColor: 'bg-orange-400'  },
  { id: 'technical_financial_offer', label: 'Technical & Financial Offer',   sublabel: 'Proposal submitted',        headerColor: 'border-t-purple-500',  dotColor: 'bg-purple-500'  },
  { id: 'closed_won',                label: 'Closed / Won',                  sublabel: 'Contract signed',           headerColor: 'border-t-emerald-500', dotColor: 'bg-emerald-500' },
]

// ─── Deal form ────────────────────────────────────────────────────────────────
function DealForm({ initial, defaultStage, onClose }: {
  initial?: Partial<ShmOutreach>
  defaultStage?: PreserviceStage
  onClose: () => void
}) {
  const { profile } = useAuth()
  const create = useCreateShmOutreach()
  const update = useUpdateShmOutreach()

  const [form, setForm] = useState({
    contact_name:      initial?.contact_name      ?? '',
    company:           initial?.company           ?? '',
    contact_email:     initial?.contact_email     ?? '',
    stage:             (initial?.stage ?? defaultStage ?? 'as_is_study') as PreserviceStage,
    notes:             initial?.notes             ?? '',
    last_contact_date: initial?.last_contact_date ?? '',
    owner_id:          initial?.owner_id          ?? profile?.id ?? '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      ...form,
      contact_email:     form.contact_email     || null,
      notes:             form.notes             || null,
      last_contact_date: form.last_contact_date || null,
    }
    if (initial?.id) {
      await update.mutateAsync({ id: initial.id, updates: payload })
    } else {
      await create.mutateAsync(payload as Omit<ShmOutreach, 'id' | 'created_at' | 'updated_at'>)
    }
    onClose()
  }

  const saving = create.isPending || update.isPending
  const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="deal_contact" className="block text-sm font-medium text-gray-700 mb-1">Contact Name <span className="text-red-500">*</span></label>
          <input id="deal_contact" required className={inputCls} value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} />
        </div>
        <div>
          <label htmlFor="deal_company" className="block text-sm font-medium text-gray-700 mb-1">Company <span className="text-red-500">*</span></label>
          <input id="deal_company" required className={inputCls} value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="deal_email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input id="deal_email" type="email" className={inputCls} value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} />
        </div>
        <div>
          <label htmlFor="deal_stage" className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
          <select id="deal_stage" className={inputCls} value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value as PreserviceStage }))}>
            {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="deal_notes" className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea id="deal_notes" rows={3} className={inputCls} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
      </div>
      <div>
        <label htmlFor="deal_contact_date" className="block text-sm font-medium text-gray-700 mb-1">Last Contact Date</label>
        <input id="deal_contact_date" type="date" className={inputCls} value={form.last_contact_date} onChange={e => setForm(f => ({ ...f, last_contact_date: e.target.value }))} />
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  )
}

// ─── Draggable Deal Card ──────────────────────────────────────────────────────
function DealCard({
  deal,
  onEdit,
  onDelete,
  isDragging = false,
}: {
  deal: ShmOutreach & { profiles: { full_name: string } }
  onEdit: () => void
  onDelete: () => void
  isDragging?: boolean
}) {
  const { isAdmin, profile } = useAuth()
  const canEdit = isAdmin || deal.owner_id === profile?.id

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: dragging,
  } = useDraggable({ id: deal.id, data: { deal } })

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-lg border border-gray-200 p-3 shadow-sm group transition-shadow hover:shadow-md ${
        dragging || isDragging ? 'opacity-40 shadow-lg ring-2 ring-blue-400' : ''
      }`}
    >
      {/* Card header */}
      <div className="flex items-start gap-2">
        {canEdit && (
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 p-0.5 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none flex-shrink-0"
            aria-label="Drag to reorder"
          >
            <GripVertical size={14} />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 text-sm leading-snug truncate">{deal.company}</p>
          <p className="text-xs text-slate-500 truncate mt-0.5">{deal.contact_name}</p>
        </div>
        {canEdit && (
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button
              onClick={onEdit}
              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              aria-label={`Edit ${deal.company}`}
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={onDelete}
              className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
              aria-label={`Delete ${deal.company}`}
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="mt-2 space-y-1">
        {deal.contact_email && (
          <p className="text-xs text-slate-400 flex items-center gap-1 truncate">
            <Mail size={10} className="flex-shrink-0" />
            {deal.contact_email}
          </p>
        )}
        {deal.notes && (
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{deal.notes}</p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-gray-50">
        <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-white text-[9px] font-bold">
          {deal.profiles.full_name.charAt(0).toUpperCase()}
        </div>
        {deal.last_contact_date && (
          <p className="text-[10px] text-slate-400">
            {format(new Date(deal.last_contact_date + 'T12:00:00'), 'MMM d')}
          </p>
        )}
        {deal.stage === 'technical_financial_offer' && (
          <button
            className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-0.5 font-medium"
            title="BRD generation coming soon"
            disabled
          >
            <FileText size={10} />
            BRD
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Droppable Column ─────────────────────────────────────────────────────────
function KanbanColumn({
  column,
  deals,
  onAddCard,
  onEdit,
  onDelete,
}: {
  column: ColumnDef
  deals: Array<ShmOutreach & { profiles: { full_name: string } }>
  onAddCard: (stage: PreserviceStage) => void
  onEdit: (deal: ShmOutreach) => void
  onDelete: (id: string) => void
}) {
  const { isOver, setNodeRef } = useDroppable({ id: column.id })

  return (
    <div className="flex flex-col w-72 flex-shrink-0">
      {/* Column header */}
      <div className={`bg-white rounded-t-xl border border-b-0 border-gray-200 px-4 pt-4 pb-3 border-t-4 ${column.headerColor}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${column.dotColor}`} />
            <h3 className="text-sm font-semibold text-slate-800 leading-tight">{column.label}</h3>
          </div>
          <span className="text-xs font-semibold text-slate-400 bg-gray-100 rounded-md px-1.5 py-0.5">
            {deals.length}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mt-0.5 ml-4">{column.sublabel}</p>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-[200px] bg-gray-50 rounded-b-xl border border-t-0 border-gray-200 p-2 space-y-2 transition-colors ${
          isOver ? 'bg-blue-50 border-blue-200' : ''
        }`}
      >
        {deals.map(deal => (
          <DealCard
            key={deal.id}
            deal={deal}
            onEdit={() => onEdit(deal)}
            onDelete={() => onDelete(deal.id)}
          />
        ))}

        {/* Add card button */}
        <button
          id={`add-deal-${column.id}`}
          onClick={() => onAddCard(column.id)}
          className="w-full flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-600 hover:bg-gray-200 transition-colors"
        >
          <Plus size={13} />
          Add card
        </button>
      </div>
    </div>
  )
}

// ─── Drag Overlay Card (non-interactive clone) ────────────────────────────────
function DragOverlayCard({ deal }: { deal: ShmOutreach & { profiles: { full_name: string } } }) {
  return (
    <div className="bg-white rounded-lg border border-blue-300 shadow-xl p-3 w-72 rotate-1 opacity-95">
      <p className="font-semibold text-slate-900 text-sm">{deal.company}</p>
      <p className="text-xs text-slate-500 mt-0.5">{deal.contact_name}</p>
      {deal.notes && <p className="text-xs text-slate-400 mt-1 line-clamp-1">{deal.notes}</p>}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PipelinePage() {
  const { data: outreach, isLoading } = useShmOutreach()
  const updateOutreach = useUpdateShmOutreach()
  const deleteOutreach = useDeleteShmOutreach()

  const [showForm, setShowForm] = useState(false)
  const [newCardStage, setNewCardStage] = useState<PreserviceStage>('as_is_study')
  const [editing, setEditing] = useState<ShmOutreach | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)

  // Optimistic stage map for instant UI moves
  const [stageOverrides, setStageOverrides] = useState<Record<string, PreserviceStage>>({})

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const deals = (outreach ?? []).map(deal => ({
    ...deal,
    stage: stageOverrides[deal.id] ?? deal.stage,
  }))

  const activeDeal = activeId ? deals.find(d => d.id === activeId) ?? null : null

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const dealId = active.id as string
    const newStage = over.id as PreserviceStage

    const currentStage = stageOverrides[dealId] ?? deals.find(d => d.id === dealId)?.stage
    if (newStage === currentStage) return

    // Optimistic update
    setStageOverrides(prev => ({ ...prev, [dealId]: newStage }))

    // Persist to DB (revert on error)
    updateOutreach.mutate(
      { id: dealId, updates: { stage: newStage } },
      {
        onError: () => {
          setStageOverrides(prev => {
            const next = { ...prev }
            delete next[dealId]
            return next
          })
        },
        onSuccess: () => {
          setStageOverrides(prev => {
            const next = { ...prev }
            delete next[dealId]
            return next
          })
        },
      }
    )
  }, [deals, stageOverrides, updateOutreach])

  function handleAddCard(stage: PreserviceStage) {
    setNewCardStage(stage)
    setShowForm(true)
  }

  function handleDelete(id: string) {
    if (confirm('Delete this study?')) deleteOutreach.mutate(id)
  }

  const totalOpen = deals.filter(d => d.stage !== 'closed_won').length
  const totalWon  = deals.filter(d => d.stage === 'closed_won').length

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">As-Is Studies</h1>
          <p className="text-sm text-slate-500 mt-1">
            {totalOpen} active &nbsp;·&nbsp; {totalWon} closed/won
          </p>
        </div>
        <Button id="new-deal-btn" onClick={() => { setNewCardStage('as_is_study'); setShowForm(true) }}>
          <Plus size={16} />
          New Study
        </Button>
      </div>

      {/* ── Kanban Board ── */}
      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map(col => (
            <div key={col.id} className="w-72 flex-shrink-0 space-y-2">
              <div className="h-16 bg-gray-200 rounded-xl animate-pulse" />
              {[1, 2].map(i => <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />)}
            </div>
          ))}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-6">
            {COLUMNS.map(col => (
              <KanbanColumn
                key={col.id}
                column={col}
                deals={deals.filter(d => d.stage === col.id) as Array<ShmOutreach & { profiles: { full_name: string } }>}
                onAddCard={handleAddCard}
                onEdit={setEditing}
                onDelete={handleDelete}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
            {activeDeal && (
              <DragOverlayCard deal={activeDeal as ShmOutreach & { profiles: { full_name: string } }} />
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* ── Modals ── */}
      <Modal open={showForm} title="New As-Is Study" onClose={() => setShowForm(false)}>
        <DealForm defaultStage={newCardStage} onClose={() => setShowForm(false)} />
      </Modal>
      {editing && (
        <Modal open title="Edit Study" onClose={() => setEditing(null)}>
          <DealForm initial={editing} onClose={() => setEditing(null)} />
        </Modal>
      )}
    </div>
  )
}
