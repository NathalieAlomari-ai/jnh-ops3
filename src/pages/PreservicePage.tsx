import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, Mail, FileText, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { useShmOutreach, useCreateShmOutreach, useUpdateShmOutreach, useDeleteShmOutreach } from '@/hooks/useShmOutreach'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import type { ShmOutreach, PreserviceStage } from '@/types/database'

const STAGES: PreserviceStage[] = [
  'as_is_study', 'gap_analysis', 'solution_scope', 'technical_financial_offer',
]

const STAGE_LABELS: Record<PreserviceStage, string> = {
  as_is_study: 'As-Is Study',
  gap_analysis: 'Gap Analysis',
  solution_scope: 'Solution Scope',
  technical_financial_offer: 'Technical & Financial Offer',
}

const stageColors: Record<PreserviceStage, 'gray' | 'blue' | 'yellow' | 'green'> = {
  as_is_study: 'gray',
  gap_analysis: 'blue',
  solution_scope: 'yellow',
  technical_financial_offer: 'green',
}

function StageStepper({ active, onSelect }: { active: PreserviceStage | 'all'; onSelect: (s: PreserviceStage | 'all') => void }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center gap-1">
        <button
          onClick={() => onSelect('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
            active === 'all' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          All
        </button>
        {STAGES.map((stage, idx) => (
          <div key={stage} className="flex items-center">
            {idx > 0 && <ChevronRight size={14} className="text-gray-300 mx-1 flex-shrink-0" />}
            <button
              onClick={() => onSelect(stage)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                active === stage
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${
                  active === stage ? 'bg-white' :
                  stageColors[stage] === 'gray' ? 'bg-gray-400' :
                  stageColors[stage] === 'blue' ? 'bg-blue-500' :
                  stageColors[stage] === 'yellow' ? 'bg-yellow-500' : 'bg-emerald-500'
                }`} />
                {STAGE_LABELS[stage]}
              </span>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function PreserviceForm({ initial, onClose }: { initial?: Partial<ShmOutreach>; onClose: () => void }) {
  const { profile } = useAuth()
  const create = useCreateShmOutreach()
  const update = useUpdateShmOutreach()

  const [form, setForm] = useState({
    contact_name: initial?.contact_name ?? '',
    company: initial?.company ?? '',
    contact_email: initial?.contact_email ?? '',
    stage: (initial?.stage ?? 'as_is_study') as PreserviceStage,
    notes: initial?.notes ?? '',
    last_contact_date: initial?.last_contact_date ?? '',
    owner_id: initial?.owner_id ?? profile?.id ?? '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      ...form,
      contact_email: form.contact_email || null,
      notes: form.notes || null,
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="contact_name" className="block text-sm font-medium text-gray-700 mb-1">Contact Name <span className="text-red-500">*</span></label>
          <input id="contact_name" required className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
            value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} />
        </div>
        <div>
          <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">Company <span className="text-red-500">*</span></label>
          <input id="company" required className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
            value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input id="contact_email" type="email" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
            value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} />
        </div>
        <div>
          <label htmlFor="stage" className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
          <select id="stage" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
            value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value as PreserviceStage }))}>
            {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea id="notes" rows={3} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
          value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
      </div>
      <div>
        <label htmlFor="last_contact" className="block text-sm font-medium text-gray-700 mb-1">Last Contact Date</label>
        <input id="last_contact" type="date" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
          value={form.last_contact_date} onChange={e => setForm(f => ({ ...f, last_contact_date: e.target.value }))} />
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  )
}

export default function PreservicePage() {
  const { data: outreach, isLoading } = useShmOutreach()
  const { isAdmin, profile } = useAuth()
  const deleteOutreach = useDeleteShmOutreach()
  const updateOutreach = useUpdateShmOutreach()

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<ShmOutreach | null>(null)
  const [filterStage, setFilterStage] = useState<PreserviceStage | 'all'>('all')

  const filtered = useMemo(() =>
    outreach?.filter(o => filterStage === 'all' ? true : o.stage === filterStage) ?? [],
    [outreach, filterStage]
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pre-service</h1>
          <p className="text-sm text-gray-500 mt-1">Study pipeline from As-Is analysis to Technical & Financial Offer</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus size={16} /> New Study
        </Button>
      </div>

      <StageStepper active={filterStage} onSelect={setFilterStage} />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
            <FileText size={28} className="text-gray-400" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">No studies yet</h3>
          <p className="text-sm text-gray-500 mb-4">Create your first pre-service study to get started</p>
          <Button onClick={() => setShowForm(true)}><Plus size={16} /> New Study</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => (
            <Card key={item.id} className="transition-shadow duration-150 hover:shadow-md">
              <CardBody className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{item.contact_name}</h3>
                    <span className="text-sm text-gray-500">@ {item.company}</span>
                    <Badge variant={stageColors[item.stage]}>{STAGE_LABELS[item.stage]}</Badge>
                  </div>
                  {item.contact_email && (
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      <Mail size={10} /> {item.contact_email}
                    </p>
                  )}
                  {item.notes && <p className="text-sm text-gray-500 mt-1.5 line-clamp-2">{item.notes}</p>}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span>Owner: {item.profiles.full_name}</span>
                    {item.last_contact_date && (
                      <span>Last contact: {format(new Date(item.last_contact_date + 'T12:00:00'), 'MMM d, yyyy')}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0 items-center">
                  {(isAdmin || item.owner_id === profile?.id) && (
                    <>
                      <select
                        value={item.stage}
                        onChange={e => updateOutreach.mutate({ id: item.id, updates: { stage: e.target.value as PreserviceStage } })}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        aria-label={`Change stage for ${item.contact_name}`}
                      >
                        {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                      </select>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(item)} aria-label={`Edit ${item.contact_name}`}>
                        <Pencil size={14} />
                      </Button>
                    </>
                  )}
                  {item.stage === 'technical_financial_offer' && (
                    <Button size="sm" variant="secondary" disabled title="BRD generation coming soon" aria-label="Generate BRD">
                      <FileText size={14} /> BRD
                    </Button>
                  )}
                  {isAdmin && (
                    <Button size="sm" variant="ghost" onClick={() => {
                      if (confirm('Delete this study?')) deleteOutreach.mutate(item.id)
                    }} aria-label={`Delete ${item.contact_name}`}>
                      <Trash2 size={14} className="text-red-500" />
                    </Button>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showForm} title="New Pre-service Study" onClose={() => setShowForm(false)}>
        <PreserviceForm onClose={() => setShowForm(false)} />
      </Modal>
      {editing && (
        <Modal open title="Edit Study" onClose={() => setEditing(null)}>
          <PreserviceForm initial={editing} onClose={() => setEditing(null)} />
        </Modal>
      )}
    </div>
  )
}
