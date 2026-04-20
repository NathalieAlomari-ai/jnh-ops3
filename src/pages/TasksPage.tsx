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
import { triggerWebhook } from '@/lib/webhook'
import type { ShmTask, TaskStatus, TaskPriority } from '@/types/database'

const STATUSES: TaskStatus[] = ['todo', 'in_progress', 'in_review', 'done', 'cancelled']
const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent']

const statusColors: Record<TaskStatus, 'gray' | 'blue' | 'yellow' | 'green' | 'red'> = {
  todo: 'gray', in_progress: 'blue', in_review: 'yellow', done: 'green', cancelled: 'red',
}

const priorityColors: Record<TaskPriority, 'gray' | 'yellow' | 'orange' | 'red'> = {
  low: 'gray', medium: 'yellow', high: 'orange', urgent: 'red',
}

const AVATAR_COLORS = [
  'bg-blue-600', 'bg-emerald-600', 'bg-violet-600',
  'bg-orange-500', 'bg-rose-600', 'bg-teal-600', 'bg-amber-600',
]

function AssigneeAvatar({ name, index }: { name: string; index: number }) {
  const color = AVATAR_COLORS[index % AVATAR_COLORS.length]
  return (
    <div className={`w-7 h-7 rounded-full ${color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
         title={name}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

// ─── Task Form ─────────────────────────────────────────────────────────────────
function TaskForm({ initial, onClose }: { initial?: Partial<ShmTask>; onClose: () => void }) {
  const { profile } = useAuth()
  const { data: profiles } = useProfiles()
  const { data: initiatives } = useInitiatives()
  const create = useCreateShmTask()
  const update = useUpdateShmTask()

  const [form, setForm] = useState({
    title:        initial?.title ?? '',
    description:  initial?.description ?? '',
    status:       (initial?.status      ?? 'todo')   as TaskStatus,
    priority:     (initial?.priority    ?? 'medium') as TaskPriority,
    assignee_id:  initial?.assignee_id  ?? profile?.id ?? '',
    initiative_id: initial?.initiative_id ?? '',
    due_date:     initial?.due_date ?? '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      ...form,
      description:   form.description   || null,
      initiative_id: form.initiative_id || null,
      due_date:      form.due_date      || null,
    }
    if (initial?.id) {
      await update.mutateAsync({ id: initial.id, updates: payload })
    } else {
      await create.mutateAsync(payload as Omit<ShmTask, 'id' | 'created_at' | 'updated_at'>)
      // n8n webhook — notify about task assignment
      const assignee = profiles?.find(p => p.id === form.assignee_id)
      if (assignee) {
        triggerWebhook({
          event: 'task.assigned',
          task: {
            title:        payload.title,
            description:  payload.description,
            status:       payload.status,
            priority:     payload.priority,
            due_date:     payload.due_date,
          },
          assignee: { id: assignee.id, name: assignee.full_name },
        })
      }
    }
    onClose()
  }

  const saving = create.isPending || update.isPending
  const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelCls = 'block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelCls}>Title *</label>
        <input required className={inputCls}
          value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
      </div>
      <div>
        <label className={labelCls}>Description</label>
        <textarea rows={3} className={inputCls}
          value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Status</label>
          <select className={inputCls}
            value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as TaskStatus }))}>
            {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Priority</label>
          <select className={inputCls}
            value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as TaskPriority }))}>
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Assignee</label>
          <select className={inputCls}
            value={form.assignee_id} onChange={e => setForm(f => ({ ...f, assignee_id: e.target.value }))}>
            {profiles?.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Due Date</label>
          <input type="date" className={inputCls}
            value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Initiative</label>
        <select className={inputCls}
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

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function TasksPage() {
  const { data: tasks, isLoading } = useShmTasks()
  const { data: profiles } = useProfiles()
  const { isAdmin, profile } = useAuth()
  const deleteTask = useDeleteShmTask()
  const updateTask = useUpdateShmTask()
  const [showForm, setShowForm]   = useState(false)
  const [editing, setEditing]     = useState<ShmTask | null>(null)
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all')
  const [filterAssignee, setFilterAssignee] = useState<string>('all')

  useRealtimeSubscription('shm_tasks', ['shm_tasks'])

  // Build a stable color index for assignees
  const profileColorIndex = new Map(profiles?.map((p, i) => [p.id, i]) ?? [])

  const filtered = (tasks ?? []).filter(t => {
    const statusOk   = filterStatus   === 'all' || t.status      === filterStatus
    const assigneeOk = filterAssignee === 'all' || t.assignee_id === filterAssignee
    return statusOk && assigneeOk
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Task Board</h1>
          {isAdmin && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              All team · {(tasks ?? []).filter(t => t.status !== 'done' && t.status !== 'cancelled').length} open tasks
            </p>
          )}
        </div>
        <Button onClick={() => setShowForm(true)}><Plus size={16} /> New Task</Button>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        {/* Status filter */}
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Status:</span>
          {(['all', ...STATUSES] as const).map(s => (
            <button key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filterStatus === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
              }`}
            >
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {/* Assignee filter — admin only */}
        {isAdmin && profiles && profiles.length > 0 && (
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Assignee:</span>
            <button
              onClick={() => setFilterAssignee('all')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filterAssignee === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200'
              }`}
            >
              Everyone
            </button>
            {profiles.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setFilterAssignee(p.id)}
                className={`flex items-center gap-1.5 pl-1.5 pr-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filterAssignee === p.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200'
                }`}
              >
                <div className={`w-4 h-4 rounded-full ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-white text-[9px] font-bold`}>
                  {p.full_name.charAt(0)}
                </div>
                {p.full_name.split(' ')[0]}
              </button>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <p className="text-slate-400 dark:text-slate-500 text-sm">Loading…</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(task => (
            <Card key={task.id}>
              <CardBody className="flex items-start gap-4">
                {/* Assignee avatar — prominent for admin */}
                {isAdmin && (
                  <div className="flex-shrink-0 pt-0.5">
                    <AssigneeAvatar
                      name={task.profiles.full_name}
                      index={profileColorIndex.get(task.assignee_id) ?? 0}
                    />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-gray-900 dark:text-white">{task.title}</h3>
                    <Badge variant={statusColors[task.status]}>{task.status.replace(/_/g, ' ')}</Badge>
                    <Badge variant={priorityColors[task.priority]}>{task.priority}</Badge>
                  </div>
                  {task.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{task.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    {/* Always show the assignee name with avatar for admin */}
                    <span className="flex items-center gap-1.5">
                      {!isAdmin && (
                        <div className={`w-4 h-4 rounded-full ${AVATAR_COLORS[(profileColorIndex.get(task.assignee_id) ?? 0) % AVATAR_COLORS.length]} flex items-center justify-center text-white text-[9px] font-bold`}>
                          {task.profiles.full_name.charAt(0)}
                        </div>
                      )}
                      <span className={isAdmin ? 'font-medium text-slate-600 dark:text-slate-300' : ''}>
                        {task.profiles.full_name}
                      </span>
                    </span>
                    {task.due_date && (
                      <span>Due: {format(new Date(task.due_date + 'T12:00:00'), 'MMM d')}</span>
                    )}
                  </div>
                </div>

                {(isAdmin || task.assignee_id === profile?.id) && (
                  <div className="flex gap-1 flex-shrink-0">
                    <select
                      value={task.status}
                      onChange={e => updateTask.mutate({ id: task.id, updates: { status: e.target.value as TaskStatus } })}
                      className="text-xs border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 rounded-md px-2 py-1 focus:outline-none"
                    >
                      {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
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
          {!filtered.length && (
            <p className="text-center text-slate-400 dark:text-slate-500 py-12 text-sm">No tasks found</p>
          )}
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
