import { format, startOfDay } from 'date-fns'
import {
  Briefcase,
  GitMerge,
  CheckSquare,
  ClipboardList,
  AlertTriangle,
  Calendar,
  Users,
  Clock,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useInitiatives } from '@/hooks/useInitiatives'
import { useDailyUpdates } from '@/hooks/useDailyUpdates'
import { useShmTasks } from '@/hooks/useShmTasks'
import { useShmOutreach } from '@/hooks/useShmOutreach'
import { useProfiles } from '@/hooks/useProfiles'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, accent, sub }: {
  label: string
  value: number | string
  icon: React.ElementType
  accent: string
  sub?: string
}) {
  return (
    <Card>
      <CardBody className="flex items-center gap-4 py-5">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${accent}`}>
          <Icon size={20} className="text-white" strokeWidth={2} />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white leading-none">{value}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">{label}</p>
          {sub && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
        </div>
      </CardBody>
    </Card>
  )
}

// ─── Priority / status helpers ────────────────────────────────────────────────
const priorityVariant = { urgent: 'red', high: 'orange', medium: 'yellow', low: 'gray' } as const
const priorityOrder   = { urgent: 0, high: 1, medium: 2, low: 3 }

// ─── Avatar ───────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  'bg-blue-600', 'bg-emerald-600', 'bg-violet-600',
  'bg-orange-500', 'bg-rose-600', 'bg-teal-600',
]

function Avatar({ name, index }: { name: string; index?: number }) {
  const color = AVATAR_COLORS[(index ?? 0) % AVATAR_COLORS.length]
  return (
    <div className={`w-6 h-6 rounded-full ${color} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

// ─── Admin Team Overview ───────────────────────────────────────────────────────
function AdminDashboard() {
  const today = format(startOfDay(new Date()), 'yyyy-MM-dd')

  const { data: initiatives }  = useInitiatives()
  const { data: todayUpdates } = useDailyUpdates(today, today)
  const { data: tasks }        = useShmTasks()
  const { data: profiles }     = useProfiles()

  const activeProjects = initiatives?.filter(i => i.status === 'in_progress').length ?? 0
  const allOpenTasks   = (tasks ?? []).filter(t => t.status !== 'done' && t.status !== 'cancelled')
  const teamSize       = profiles?.length ?? 0
  const standupsToday  = todayUpdates?.length ?? 0
  const pendingCount   = Math.max(0, teamSize - standupsToday)

  // Build profile index for colors
  const profileIndex = new Map(profiles?.map((p, i) => [p.id, i]) ?? [])

  const urgentAndHigh = allOpenTasks
    .filter(t => t.priority === 'urgent' || t.priority === 'high')
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    .slice(0, 8)

  return (
    <div className="space-y-6">

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Projects"
          value={activeProjects}
          icon={Briefcase}
          accent="bg-blue-600"
        />
        <StatCard
          label="Open Tasks · All Team"
          value={allOpenTasks.length}
          icon={CheckSquare}
          accent="bg-orange-500"
        />
        <StatCard
          label="Standups Today"
          value={standupsToday}
          icon={ClipboardList}
          accent="bg-emerald-600"
          sub={`${pendingCount} pending`}
        />
        <StatCard
          label="Team Members"
          value={teamSize}
          icon={Users}
          accent="bg-violet-600"
        />
      </div>

      {/* ── Main panels ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Today's Standups — ALL team */}
        <Card>
          <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">Today's Standups</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                All team · {format(new Date(), 'MMM d')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={standupsToday > 0 ? 'green' : 'gray'}>
                {standupsToday}/{teamSize} submitted
              </Badge>
            </div>
          </div>
          <CardBody className="p-0">
            {!todayUpdates || todayUpdates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Clock size={24} className="text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">No standups submitted yet today</p>
                {pendingCount > 0 && (
                  <p className="text-xs text-slate-400 mt-1">{pendingCount} team member{pendingCount > 1 ? 's' : ''} yet to submit</p>
                )}
              </div>
            ) : (
              <ul className="divide-y divide-gray-50 dark:divide-slate-800">
                {todayUpdates.map((update) => (
                  <li key={update.id} className="px-6 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Avatar name={update.profiles.full_name} index={profileIndex.get(update.user_id)} />
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{update.profiles.full_name}</p>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 ml-8">
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

            {/* Pending members section */}
            {pendingCount > 0 && profiles && (
              <div className="px-6 py-3 border-t border-gray-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Pending</p>
                <div className="flex flex-wrap gap-2">
                  {profiles
                    .filter(p => !todayUpdates?.some(u => u.user_id === p.id))
                    .map((p, i) => (
                      <div key={p.id} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <Avatar name={p.full_name} index={i} />
                        <span>{p.full_name}</span>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        {/* High-priority team tasks */}
        <Card>
          <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">High-Priority Tasks</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Urgent & high · all team</p>
            </div>
            <Badge variant="orange">{urgentAndHigh.length}</Badge>
          </div>
          <CardBody className="p-0">
            {urgentAndHigh.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CheckSquare size={24} className="text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">No urgent or high-priority tasks</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50 dark:divide-slate-800">
                {urgentAndHigh.map(task => (
                  <li key={task.id} className="px-6 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Avatar name={task.profiles.full_name} index={profileIndex.get(task.assignee_id)} />
                        <span className="text-xs text-slate-400">{task.profiles.full_name}</span>
                      </div>
                    </div>
                    <Badge variant={priorityVariant[task.priority]}>{task.priority}</Badge>
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

// ─── Personal (non-admin) Dashboard ───────────────────────────────────────────
function UserDashboard() {
  const { profile } = useAuth()
  const today = format(startOfDay(new Date()), 'yyyy-MM-dd')

  const { data: initiatives }  = useInitiatives()
  const { data: todayUpdates } = useDailyUpdates(today, today)
  const { data: tasks }        = useShmTasks()
  const { data: outreach }     = useShmOutreach()

  const activeProjects = initiatives?.filter(i => i.status === 'in_progress').length ?? 0
  const openStudies    = outreach?.filter(o => o.stage !== 'closed_won').length ?? 0
  const standupsToday  = todayUpdates?.length ?? 0

  const myOpenTasks = (tasks ?? [])
    .filter(t => t.assignee_id === profile?.id && t.status !== 'done' && t.status !== 'cancelled')
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  return (
    <div className="space-y-6">

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Projects"    value={activeProjects} icon={Briefcase}     accent="bg-blue-600"    />
        <StatCard label="Open As-Is Studies" value={openStudies}    icon={GitMerge}      accent="bg-slate-700"   />
        <StatCard label="My Open Tasks"      value={myOpenTasks.length} icon={CheckSquare} accent="bg-orange-500" />
        <StatCard label="Standups Today"     value={standupsToday}  icon={ClipboardList} accent="bg-emerald-600" />
      </div>

      {/* ── Main Content ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* My Open Tasks */}
        <Card>
          <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 dark:text-white">My Open Tasks</h2>
            <Badge variant="gray">{myOpenTasks.length}</Badge>
          </div>
          <CardBody className="p-0">
            {myOpenTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CheckSquare size={24} className="text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">You're all caught up!</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50 dark:divide-slate-800">
                {myOpenTasks.slice(0, 8).map(task => (
                  <li key={task.id} className="px-6 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{task.title}</p>
                      {task.due_date && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          Due {format(new Date(task.due_date + 'T12:00:00'), 'MMM d')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Badge variant={priorityVariant[task.priority]}>{task.priority}</Badge>
                      {task.status === 'in_review' && <Badge variant="yellow">review</Badge>}
                      {task.status === 'in_progress' && <Badge variant="blue">in progress</Badge>}
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
            <h2 className="font-semibold text-slate-900 dark:text-white">Today's Standups</h2>
            <Badge variant={standupsToday > 0 ? 'green' : 'gray'}>{standupsToday} submitted</Badge>
          </div>
          <CardBody className="p-0">
            {!todayUpdates || todayUpdates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <ClipboardList size={24} className="text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">No standups yet today</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50 dark:divide-slate-800">
                {todayUpdates.map(update => (
                  <li key={update.id} className="px-6 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                        {update.profiles.full_name.charAt(0).toUpperCase()}
                      </div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{update.profiles.full_name}</p>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 ml-8">
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

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { profile, isAdmin } = useAuth()

  const greeting =
    new Date().getHours() < 12 ? 'Good morning' :
    new Date().getHours() < 17 ? 'Good afternoon' :
    'Good evening'

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {isAdmin ? 'Team Overview' : `${greeting}, ${profile?.full_name?.split(' ')[0]}`}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 flex items-center gap-1.5">
          <Calendar size={13} />
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
          {isAdmin && (
            <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">
              Admin View
            </span>
          )}
        </p>
      </div>

      {isAdmin ? <AdminDashboard /> : <UserDashboard />}
    </div>
  )
}
