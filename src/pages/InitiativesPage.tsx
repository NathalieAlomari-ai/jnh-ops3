import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, Briefcase } from 'lucide-react'
import { format } from 'date-fns'
import { useInitiatives, useCreateInitiative, useUpdateInitiative, useDeleteInitiative } from '@/hooks/useInitiatives'
import { useProfiles } from '@/hooks/useProfiles'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import type { Initiative, InitiativeStatus } from '@/types/database'

const STATUSES: InitiativeStatus[] = ['planning', 'in_progress', 'on_hold', 'completed', 'cancelled']

const statusVariant: Record<InitiativeStatus, 'gray' | 'blue' | 'green' | 'yellow' | 'red'> = {
  planning: 'gray', in_progress: 'blue', on_hold: 'yellow', completed: 'green', cancelled: 'red',
}

const statusLabel: Record<InitiativeStatus, string> = {
  planning: 'Planning', in_progress: 'In Progress', on_hold: 'On Hold', completed: 'Completed', cancelled: 'Cancelled',
}

// ─── Form ──────────────────────────────────────────────────────────────────────
function ProjectForm({ initial, onClose }: { initial?: Partial<Initiative>; onClose: () => void }) {
  const { profile } = useAuth()
  const { data: profiles } = useProfiles()
  const create = useCreateInitiative()
  const update = useUpdateInitiative()

  const [form, setForm] = useState({
    name:        initial?.name        ?? '',
    description: initial?.description ?? '',
    status:      (initial?.status     ?? 'planning') as InitiativeStatus,
    owner_id:    initial?.owner_id    ?? profile?.id ?? '',
    start_date:  initial?.start_date  ?? '',
    target_date: initial?.target_date ?? '',
    // layer fields kept for DB compatibility but not exposed in UI
    layer_see:    initial?.layer_see    ?? false,
    layer_know:   initial?.layer_know   ?? false,
    layer_decide: initial?.layer_decide ?? false,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      ...form,
      start_date:  form.start_date  || null,
      target_date: form.target_date || null,
      description: form.description || null,
    }
    if (initial?.id) {
      await update.mutateAsync({ id: initial.id, updates: payload })
    } else {
      await create.mutateAsync(payload as Omit<Initiative, 'id' | 'created_at' | 'updated_at'>)
    }
    onClose()
  }

  const saving = create.isPending || update.isPending
  const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white focus:border-transparent transition-shadow'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="proj_name" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Project Name <span className="text-red-500">*</span></label>
        <input id="proj_name" required className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      </div>
      <div>
        <label htmlFor="proj_desc" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Description</label>
        <textarea id="proj_desc" rows={3} className={inputCls} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="proj_status" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Status</label>
          <select id="proj_status" className={inputCls} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as InitiativeStatus }))}>
            {STATUSES.map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="proj_owner" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Owner</label>
          <select id="proj_owner" className={inputCls} value={form.owner_id} onChange={e => setForm(f => ({ ...f, owner_id: e.target.value }))}>
            {profiles?.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="proj_start" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Start Date</label>
          <input id="proj_start" type="date" className={inputCls} value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
        </div>
        <div>
          <label htmlFor="proj_target" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Target Date</label>
          <input id="proj_target" type="date" className={inputCls} value={form.target_date} onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))} />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function InitiativesPage() {
  const { data: initiatives, isLoading } = useInitiatives()
  const { isAdmin } = useAuth()
  const deleteInitiative = useDeleteInitiative()
  const [showForm, setShowForm]   = useState(false)
  const [editing, setEditing]     = useState<Initiative | null>(null)
  const [filterStatus, setFilter] = useState<InitiativeStatus | 'all'>('all')

  const filtered = useMemo(() =>
    (initiatives ?? []).filter(i => filterStatus === 'all' ? true : i.status === filterStatus),
    [initiatives, filterStatus]
  )

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="text-sm text-slate-500 mt-1">Active client deployments and internal initiatives</p>
        </div>
        {isAdmin && (
          <Button id="new-project-btn" onClick={() => setShowForm(true)}>
            <Plus size={16} /> New Project
          </Button>
        )}
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {(['all', ...STATUSES] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              filterStatus === s
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-slate-900 text-slate-600 border border-gray-200 dark:border-slate-700 hover:bg-slate-50 dark:bg-slate-800'
            }`}
          >
            {s === 'all' ? 'All' : statusLabel[s]}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-3" />
              <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 py-16 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center">
            <Briefcase size={28} className="text-gray-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 mb-1">No projects yet</h3>
          <p className="text-sm text-slate-500 mb-4">Create your first project to get started</p>
          {isAdmin && <Button onClick={() => setShowForm(true)}><Plus size={16} /> New Project</Button>}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(initiative => (
            <Card key={initiative.id} className="transition-shadow duration-150 hover:shadow-md">
              <CardBody className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-900">{initiative.name}</h3>
                    <Badge variant={statusVariant[initiative.status]}>{statusLabel[initiative.status]}</Badge>
                  </div>
                  {initiative.description && (
                    <p className="text-sm text-slate-500 mt-1">{initiative.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                    <span>Owner: {initiative.profiles.full_name}</span>
                    {initiative.target_date && (
                      <span>Target: {format(new Date(initiative.target_date), 'MMM d, yyyy')}</span>
                    )}
                    {initiative.start_date && (
                      <span>Started: {format(new Date(initiative.start_date), 'MMM d, yyyy')}</span>
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex gap-1 flex-shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(initiative)} aria-label={`Edit ${initiative.name}`}>
                      <Pencil size={14} />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => {
                      if (confirm('Delete this project?')) deleteInitiative.mutate(initiative.id)
                    }} aria-label={`Delete ${initiative.name}`}>
                      <Trash2 size={14} className="text-red-500" />
                    </Button>
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showForm} title="New Project" onClose={() => setShowForm(false)}>
        <ProjectForm onClose={() => setShowForm(false)} />
      </Modal>
      {editing && (
        <Modal open title="Edit Project" onClose={() => setEditing(null)}>
          <ProjectForm initial={editing} onClose={() => setEditing(null)} />
        </Modal>
      )}
    </div>
  )
}
