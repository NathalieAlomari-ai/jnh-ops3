import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, Eye, BarChart3, Brain } from 'lucide-react'
import { format } from 'date-fns'
import { useInitiatives, useCreateInitiative, useUpdateInitiative, useDeleteInitiative } from '@/hooks/useInitiatives'
import { useProfiles } from '@/hooks/useProfiles'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import type { Initiative, InitiativeStatus } from '@/types/database'

const statusColors: Record<InitiativeStatus, 'gray' | 'blue' | 'green' | 'yellow' | 'red'> = {
  planning: 'gray', in_progress: 'blue', on_hold: 'yellow', completed: 'green', cancelled: 'red',
}

const STATUSES: InitiativeStatus[] = ['planning', 'in_progress', 'on_hold', 'completed', 'cancelled']

const LAYERS = [
  { key: 'layer_see' as const, label: 'SEE', sublabel: 'Vision / Sensors', icon: Eye, color: 'indigo' },
  { key: 'layer_know' as const, label: 'KNOW', sublabel: 'Dashboards', icon: BarChart3, color: 'emerald' },
  { key: 'layer_decide' as const, label: 'DECIDE', sublabel: 'LLM / Reports', icon: Brain, color: 'amber' },
]

function LayerIndicators({ initiative }: { initiative: Initiative }) {
  return (
    <div className="flex items-center gap-2 mt-2.5">
      {LAYERS.map(({ key, label, icon: Icon, color }) => {
        const active = initiative[key]
        return (
          <span
            key={key}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
              active
                ? `bg-${color}-100 text-${color}-700 border border-${color}-200`
                : 'bg-gray-50 text-gray-400 border border-gray-100'
            }`}
            title={`${label}: ${active ? 'Active' : 'Inactive'}`}
          >
            <Icon size={12} />
            {label}
          </span>
        )
      })}
    </div>
  )
}

function LayerToggles({ values, onChange }: {
  values: { layer_see: boolean; layer_know: boolean; layer_decide: boolean }
  onChange: (key: 'layer_see' | 'layer_know' | 'layer_decide', val: boolean) => void
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">AI Capability Layers</label>
      <div className="grid grid-cols-3 gap-3">
        {LAYERS.map(({ key, label, sublabel, icon: Icon }) => {
          const active = values[key]
          return (
            <button
              key={key}
              type="button"
              role="switch"
              aria-checked={active}
              aria-label={`${label} layer: ${sublabel}`}
              onClick={() => onChange(key, !active)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-150 min-h-[72px] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
                active
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'
              }`}
            >
              <Icon size={20} />
              <span className="text-xs font-bold">{label}</span>
              <span className="text-[10px] leading-tight text-center">{sublabel}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function InitiativeForm({ initial, onClose }: { initial?: Partial<Initiative>; onClose: () => void }) {
  const { profile } = useAuth()
  const { data: profiles } = useProfiles()
  const create = useCreateInitiative()
  const update = useUpdateInitiative()

  const [form, setForm] = useState({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    status: (initial?.status ?? 'planning') as InitiativeStatus,
    owner_id: initial?.owner_id ?? profile?.id ?? '',
    start_date: initial?.start_date ?? '',
    target_date: initial?.target_date ?? '',
    layer_see: initial?.layer_see ?? false,
    layer_know: initial?.layer_know ?? false,
    layer_decide: initial?.layer_decide ?? false,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      ...form,
      start_date: form.start_date || null,
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="init_name" className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
        <input id="init_name" required className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
          value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      </div>
      <div>
        <label htmlFor="init_desc" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea id="init_desc" rows={3} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
          value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="init_status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select id="init_status" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
            value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as InitiativeStatus }))}>
            {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="init_owner" className="block text-sm font-medium text-gray-700 mb-1">Owner</label>
          <select id="init_owner" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
            value={form.owner_id} onChange={e => setForm(f => ({ ...f, owner_id: e.target.value }))}>
            {profiles?.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="init_start" className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input id="init_start" type="date" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
            value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
        </div>
        <div>
          <label htmlFor="init_target" className="block text-sm font-medium text-gray-700 mb-1">Target Date</label>
          <input id="init_target" type="date" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
            value={form.target_date} onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))} />
        </div>
      </div>

      <LayerToggles
        values={{ layer_see: form.layer_see, layer_know: form.layer_know, layer_decide: form.layer_decide }}
        onChange={(key, val) => setForm(f => ({ ...f, [key]: val }))}
      />

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  )
}

export default function InitiativesPage() {
  const { data: initiatives, isLoading } = useInitiatives()
  const { isAdmin } = useAuth()
  const deleteInitiative = useDeleteInitiative()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Initiative | null>(null)

  const sorted = useMemo(() => initiatives ?? [], [initiatives])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service</h1>
          <p className="text-sm text-gray-500 mt-1">Initiatives categorized by AI capability layers: SEE, KNOW, DECIDE</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowForm(true)}>
            <Plus size={16} /> New Initiative
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-1/2 mb-2" />
              <div className="flex gap-2 mt-3">
                <div className="h-6 bg-gray-100 rounded w-16" />
                <div className="h-6 bg-gray-100 rounded w-16" />
                <div className="h-6 bg-gray-100 rounded w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
            <Eye size={28} className="text-gray-400" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">No initiatives yet</h3>
          <p className="text-sm text-gray-500 mb-4">Create your first service initiative to get started</p>
          {isAdmin && <Button onClick={() => setShowForm(true)}><Plus size={16} /> New Initiative</Button>}
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(initiative => (
            <Card key={initiative.id} className="transition-shadow duration-150 hover:shadow-md">
              <CardBody className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{initiative.name}</h3>
                    <Badge variant={statusColors[initiative.status]}>
                      {initiative.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  {initiative.description && (
                    <p className="text-sm text-gray-500 mt-1">{initiative.description}</p>
                  )}
                  <LayerIndicators initiative={initiative} />
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span>Owner: {initiative.profiles.full_name}</span>
                    {initiative.target_date && (
                      <span>Due: {format(new Date(initiative.target_date), 'MMM d, yyyy')}</span>
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex gap-1 flex-shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(initiative)} aria-label={`Edit ${initiative.name}`}>
                      <Pencil size={14} />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => {
                      if (confirm('Delete this initiative?')) deleteInitiative.mutate(initiative.id)
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

      <Modal open={showForm} title="New Initiative" onClose={() => setShowForm(false)}>
        <InitiativeForm onClose={() => setShowForm(false)} />
      </Modal>
      {editing && (
        <Modal open title="Edit Initiative" onClose={() => setEditing(null)}>
          <InitiativeForm initial={editing} onClose={() => setEditing(null)} />
        </Modal>
      )}
    </div>
  )
}
