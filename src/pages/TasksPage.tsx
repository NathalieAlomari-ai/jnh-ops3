import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { useShmTasks, useCreateShmTask, useUpdateShmTask, useDeleteShmTask } from '@/hooks/useShmTasks'
import { useProfiles } from '@/hooks/useProfiles'
import { useInitiatives } from '@/hooks/useInitiatives'
import { useAuth } from '@/hooks/useAuth'
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import type { ShmTask, TaskStatus, TaskPriority } from '@/types/database'

const STATUSES: TaskStatus[] = ['todo', 'in_progress', 'in_review', 'done', 'cancelled']
const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent']

const statusColors: Record<TaskStatus, 'gray' | 'blue' | 'yellow' | 'green' | 'red'> = {
  todo: 'gray', in_progress: 'blue', in_review: 'yellow', done: 'green', cancelled: 'red',
}

const priorityColors: Record<TaskPriority, 'gray' | 'yellow' | 'orange' | 'red'> = {
  low: 'gray', medium: 'yellow', high: 'orange', urgent: 'red',
}

function TaskForm({ initial, onClose }: { initial?: Partial<ShmTask>; onClose: () => void }) {
  const { profile } = useAuth()
  const { data: profiles } = useProfiles()
  const { data: initiatives } = useInitiatives()
  const create = useCreateShmTask()
  const update = useUpdateShmTask()

  const [form, setForm] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    status: (initial?.status ?? 'todo') as TaskStatus,
    priority: (initial?.priority ?? 'medium') as TaskPriority,
    assignee_id: initial?.assignee_id ?? profile?.id ?? '',
    initiative_id: initial?.initiative_id ?? '',
    due_date: initial?.due_date ?? '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      ...form,
      description: form.description || null,
      initiative_id: form.initiative_id || null,
      due_date: form.due_date || null,
    }
    if (initial?.id) {
      await update.mutateAsync({ id: initial.id, updates: payload })
    } else {
      await create.mutateAsync(payload as Omit<ShmTask, 'id' | 'created_at' | 'updated_at'>)
    }
    onClose()
  }

  const saving = create.isPending || update.isPending

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
        <input required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as TaskStatus }))}>
            {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as TaskPriority }))}>
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
          <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.assignee_id} onChange={e => setForm(f => ({ ...f, assignee_id: e.target.value }))}>
            {profiles?.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
          <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Initiative</label>
        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={form.initiative_id} onChange={e => setForm(f => ({ ...f, initiative_id: e.target.value }))}>
          <option value="">— None —</option>
          {initiatives?.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  )
}

export default function TasksPage() {
  const { data: tasks, isLoading } = useShmTasks()
  const { isAdmin, profile } = useAuth()
  const deleteTask = useDeleteShmTask()
  const updateTask = useUpdateShmTask()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<ShmTask | null>(null)
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all')

  useRealtimeSubscription('shm_tasks', ['shm_tasks'])

  const filtered = tasks?.filter(t =>
    filterStatus === 'all' ? true : t.status === filterStatus
  ) ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">SHM Tasks</h1>
        <Button onClick={() => setShowForm(true)}><Plus size={16} /> New Task</Button>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {(['all', ...STATUSES] as const).map(s => (
          <button key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filterStatus === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {isLoading ? <p className="text-gray-400 text-sm">Loading…</p> : (
        <div className="space-y-2">
          {filtered.map(task => (
            <Card key={task.id}>
              <CardBody className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-gray-900">{task.title}</h3>
                    <Badge variant={statusColors[task.status]}>{task.status.replace('_', ' ')}</Badge>
                    <Badge variant={priorityColors[task.priority]}>{task.priority}</Badge>
                  </div>
                  {task.description && <p className="text-sm text-gray-500 mt-1">{task.description}</p>}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span>{task.profiles.full_name}</span>
                    {task.due_date && <span>Due: {format(new Date(task.due_date + 'T12:00:00'), 'MMM d')}</span>}
                  </div>
                </div>
                {(isAdmin || task.assignee_id === profile?.id) && (
                  <div className="flex gap-1 flex-shrink-0">
                    <select
                      value={task.status}
                      onChange={e => updateTask.mutate({ id: task.id, updates: { status: e.target.value as TaskStatus } })}
                      className="text-xs border border-gray-200 rounded-md px-2 py-1 focus:outline-none"
                    >
                      {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </select>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(task)}>
                      <Pencil size={14} />
                    </Button>
                    {isAdmin && (
                      <Button size="sm" variant="ghost" onClick={() => {
                        if (confirm('Delete task?')) deleteTask.mutate(task.id)
                      }}>
                        <Trash2 size={14} className="text-red-500" />
                      </Button>
                    )}
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
          {!filtered.length && <p className="text-center text-gray-400 py-12 text-sm">No tasks found</p>}
        </div>
      )}

      <Modal open={showForm} title="New Task" onClose={() => setShowForm(false)}>
        <TaskForm onClose={() => setShowForm(false)} />
      </Modal>
      {editing && (
        <Modal open title="Edit Task" onClose={() => setEditing(null)}>
          <TaskForm initial={editing} onClose={() => setEditing(null)} />
        </Modal>
      )}
    </div>
  )
}
