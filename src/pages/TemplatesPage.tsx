import { useState } from 'react'
import { Plus, Pencil, Trash2, Eye, BarChart3, Brain, Package, Zap } from 'lucide-react'
import { useTemplates, useCreateTemplate, useUpdateTemplate, useDeleteTemplate } from '@/hooks/useTemplates'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import type { Template } from '@/types/database'

const LAYERS = [
  { key: 'layer_see' as const, label: 'SEE', icon: Eye },
  { key: 'layer_know' as const, label: 'KNOW', icon: BarChart3 },
  { key: 'layer_decide' as const, label: 'DECIDE', icon: Brain },
]

function TemplateForm({ initial, onClose }: { initial?: Partial<Template>; onClose: () => void }) {
  const { profile } = useAuth()
  const create = useCreateTemplate()
  const update = useUpdateTemplate()

  const [form, setForm] = useState({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    category: initial?.category ?? 'general',
    layer_see: initial?.layer_see ?? false,
    layer_know: initial?.layer_know ?? false,
    layer_decide: initial?.layer_decide ?? false,
    config: initial?.config ?? {},
    created_by: initial?.created_by ?? profile?.id ?? '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      ...form,
      description: form.description || null,
    }
    if (initial?.id) {
      await update.mutateAsync({ id: initial.id, updates: payload })
    } else {
      await create.mutateAsync(payload as Omit<Template, 'id' | 'created_at' | 'updated_at'>)
    }
    onClose()
  }

  const saving = create.isPending || update.isPending

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="tpl_name" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Template Name <span className="text-red-500">*</span></label>
        <input id="tpl_name" required className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white focus:border-transparent transition-shadow"
          value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      </div>
      <div>
        <label htmlFor="tpl_desc" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Description</label>
        <textarea id="tpl_desc" rows={3} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white focus:border-transparent transition-shadow"
          value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      </div>
      <div>
        <label htmlFor="tpl_category" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Category</label>
        <input id="tpl_category" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white focus:border-transparent transition-shadow"
          placeholder="e.g. shm_fleet_management, shm_agent"
          value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
      </div>

      {/* Layer toggles */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Default AI Layers</label>
        <div className="grid grid-cols-3 gap-3">
          {LAYERS.map(({ key, label, icon: Icon }) => {
            const active = form[key]
            return (
              <button
                key={key}
                type="button"
                role="switch"
                aria-checked={active}
                aria-label={`${label} layer`}
                onClick={() => setForm(f => ({ ...f, [key]: !f[key] }))}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                  active
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 hover:border-gray-300'
                }`}
              >
                <Icon size={20} />
                <span className="text-xs font-bold">{label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  )
}

export default function TemplatesPage() {
  const { data: templates, isLoading } = useTemplates()
  const { isAdmin } = useAuth()
  const deleteTemplate = useDeleteTemplate()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Template | null>(null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Pre-configured project blueprints with SEE/KNOW/DECIDE defaults</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowForm(true)}>
            <Plus size={16} /> New Template
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-2/3 mb-3" />
              <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/2 mb-4" />
              <div className="flex gap-2">
                <div className="h-5 bg-slate-100 dark:bg-slate-800 rounded-full w-10" />
                <div className="h-5 bg-slate-100 dark:bg-slate-800 rounded-full w-10" />
                <div className="h-5 bg-slate-100 dark:bg-slate-800 rounded-full w-10" />
              </div>
            </div>
          ))}
        </div>
      ) : !templates?.length ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 py-16 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center">
            <Package size={28} className="text-gray-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">No templates yet</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Create your first project template to get started</p>
          {isAdmin && <Button onClick={() => setShowForm(true)}><Plus size={16} /> Create Template</Button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(tpl => (
            <Card key={tpl.id} className="transition-shadow duration-150 hover:shadow-md flex flex-col">
              <CardBody className="flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900">{tpl.name}</h3>
                    <Badge variant="purple" className="mt-1">{tpl.category}</Badge>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-0.5 flex-shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(tpl)} aria-label={`Edit ${tpl.name}`}>
                        <Pencil size={14} />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => {
                        if (confirm('Delete template?')) deleteTemplate.mutate(tpl.id)
                      }} aria-label={`Delete ${tpl.name}`}>
                        <Trash2 size={14} className="text-red-500" />
                      </Button>
                    </div>
                  )}
                </div>

                {tpl.description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">{tpl.description}</p>
                )}

                {/* Layer dots */}
                <div className="flex items-center gap-2 mt-auto pt-3 border-t border-gray-50">
                  {LAYERS.map(({ key, label, icon: Icon }) => (
                    <span
                      key={key}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                        tpl[key]
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      <Icon size={12} />
                      {label}
                    </span>
                  ))}
                </div>

                {/* Apply button placeholder */}
                <div className="mt-3">
                  <Button size="sm" variant="secondary" disabled className="w-full justify-center" title="Coming soon: auto-fill initiative from template">
                    <Zap size={14} /> Apply Template
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showForm} title="New Template" onClose={() => setShowForm(false)}>
        <TemplateForm onClose={() => setShowForm(false)} />
      </Modal>
      {editing && (
        <Modal open title="Edit Template" onClose={() => setEditing(null)}>
          <TemplateForm initial={editing} onClose={() => setEditing(null)} />
        </Modal>
      )}
    </div>
  )
}
