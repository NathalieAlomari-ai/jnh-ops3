import { format, startOfDay } from 'date-fns'
import { Briefcase, GitMerge, CheckSquare, ClipboardList, AlertTriangle, Calendar } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useInitiatives } from '@/hooks/useInitiatives'
import { useDailyUpdates } from '@/hooks/useDailyUpdates'
import { useShmTasks } from '@/hooks/useShmTasks'
import { useShmOutreach } from '@/hooks/useShmOutreach'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, accent }: {
  label: string; value: number | string; icon: React.ElementType; accent: string
}) {
  return (
    <Card>
      <CardBody className="flex items-center gap-4 py-5">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${accent}`}>
          <Icon size={20} className="text-white" strokeWidth={2} />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900 leading-none">{value}</p>
          <p className="text-xs text-slate-500 mt-1 font-medium">{label}</p>
        </div>
      </CardBody>
    </Card>
  )
}

// ─── Priority badge mapping ────────────────────────────────────────────────────
const priorityVariant = { urgent: 'red', high: 'orange', medium: 'yellow', low: 'gray' } as const
const priorityOrder   = { urgent: 0, high: 1, medium: 2, low: 3 }

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { profile } = useAuth()
  const today = format(startOfDay(new Date()), 'yyyy-MM-dd')

  const { data: initiatives }  = useInitiatives()
  const { data: todayUpdates } = useDailyUpdates(today)
  const { data: tasks }        = useShmTasks()
  const { data: outreach }     = useShmOutreach()

  // ── Stats ──
  const activeProjects = initiatives?.filter(i => i.status === 'in_progress').length ?? 0
  const openStudies    = outreach?.filter(o => o.stage !== 'closed_won').length ?? 0
  const standupsToday  = todayUpdates?.length ?? 0

  const myOpenTasks = (tasks ?? [])
    .filter(t => t.assignee_id === profile?.id && t.status !== 'done' && t.status !== 'cancelled')
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  const myOpenCount = myOpenTasks.length

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'},{' '}
          {profile?.full_name?.split(' ')[0]}
        </h1>
        <p className="text-slate-500 text-sm mt-1 flex items-center gap-1.5">
          <Calendar size={13} />
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Projects"   value={activeProjects} icon={Briefcase}    accent="bg-blue-600"    />
        <StatCard label="Open As-Is Studies" value={openStudies}   icon={GitMerge}     accent="bg-slate-700"   />
        <StatCard label="My Open Tasks"      value={myOpenCount}   icon={CheckSquare}  accent="bg-orange-500"  />
        <StatCard label="Standups Today"     value={standupsToday} icon={ClipboardList} accent="bg-emerald-600" />
      </div>

      {/* ── Main Content ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* My Open Tasks */}
        <Card>
          <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">My Open Tasks</h2>
            <Badge variant="gray">{myOpenCount}</Badge>
          </div>
          <CardBody className="p-0">
            {myOpenTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CheckSquare size={24} className="text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">You're all caught up!</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {myOpenTasks.slice(0, 8).map(task => (
                  <li key={task.id} className="px-6 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{task.title}</p>
                      {task.due_date && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          Due {format(new Date(task.due_date + 'T12:00:00'), 'MMM d')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Badge variant={priorityVariant[task.priority]}>{task.priority}</Badge>
                      {task.status === 'in_review' && (
                        <Badge variant="yellow">review</Badge>
                      )}
                      {task.status === 'in_progress' && (
                        <Badge variant="blue">in progress</Badge>
                      )}
                    </div>
                  </li>
                ))}
                {myOpenTasks.length > 8 && (
                  <li className="px-6 py-2 text-xs text-center text-slate-400">
                    +{myOpenTasks.length - 8} more tasks — see Task Board
                  </li>
                )}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* Today's Standups */}
        <Card>
          <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Today's Standups</h2>
            <Badge variant={standupsToday > 0 ? 'green' : 'gray'}>{standupsToday} submitted</Badge>
          </div>
          <CardBody className="p-0">
            {!todayUpdates || todayUpdates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <ClipboardList size={24} className="text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">No standups yet today</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {todayUpdates.map(update => (
                  <li key={update.id} className="px-6 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                        {update.profiles.full_name.charAt(0).toUpperCase()}
                      </div>
                      <p className="text-sm font-semibold text-slate-900">{update.profiles.full_name}</p>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 ml-8">
                      {update.did_today}
                    </p>
                    {update.blockers && (
                      <div className="flex items-center gap-1 ml-8 mt-1">
                        <AlertTriangle size={11} className="text-orange-500" />
                        <p className="text-xs text-orange-600 line-clamp-1">{update.blockers}</p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

      </div>
    </div>
  )
}
