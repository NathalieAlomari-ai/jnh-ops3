import { format, startOfDay } from 'date-fns'
import { Target, ClipboardList, CheckSquare, Megaphone } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useInitiatives } from '@/hooks/useInitiatives'
import { useDailyUpdates } from '@/hooks/useDailyUpdates'
import { useShmTasks } from '@/hooks/useShmTasks'
import { useShmOutreach } from '@/hooks/useShmOutreach'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: number; icon: React.ElementType; color: string
}) {
  return (
    <Card>
      <CardBody className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={22} className="text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </CardBody>
    </Card>
  )
}

export default function DashboardPage() {
  const { profile } = useAuth()
  const today = format(startOfDay(new Date()), 'yyyy-MM-dd')

  const { data: initiatives } = useInitiatives()
  const { data: todayUpdates } = useDailyUpdates(today)
  const { data: tasks } = useShmTasks()
  const { data: outreach } = useShmOutreach()

  const activeInitiatives = initiatives?.filter(i => i.status === 'in_progress').length ?? 0
  const todayStandups = todayUpdates?.length ?? 0
  const openTasks = tasks?.filter(t => t.status !== 'done' && t.status !== 'cancelled').length ?? 0
  const activeOutreach = outreach?.filter(o => !['won', 'lost'].includes(o.stage)).length ?? 0

  const myTasks = tasks?.filter(t => t.assignee_id === profile?.id && t.status !== 'done' && t.status !== 'cancelled') ?? []
  const recentStandups = todayUpdates?.slice(0, 5) ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
          {profile?.full_name?.split(' ')[0]}
        </h1>
        <p className="text-gray-500 text-sm mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Initiatives" value={activeInitiatives} icon={Target} color="bg-indigo-500" />
        <StatCard label="Standups Today" value={todayStandups} icon={ClipboardList} color="bg-emerald-500" />
        <StatCard label="Open Tasks" value={openTasks} icon={CheckSquare} color="bg-orange-500" />
        <StatCard label="Active Outreach" value={activeOutreach} icon={Megaphone} color="bg-purple-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Tasks */}
        <Card>
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">My Open Tasks</h2>
          </div>
          <CardBody className="p-0">
            {myTasks.length === 0 ? (
              <p className="px-6 py-8 text-sm text-gray-400 text-center">No open tasks assigned to you</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {myTasks.slice(0, 6).map(task => (
                  <li key={task.id} className="px-6 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                    </div>
                    <Badge variant={
                      task.priority === 'urgent' ? 'red' :
                      task.priority === 'high' ? 'orange' :
                      task.priority === 'medium' ? 'yellow' : 'gray'
                    }>
                      {task.priority}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* Today's Standups */}
        <Card>
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Today's Standups</h2>
          </div>
          <CardBody className="p-0">
            {recentStandups.length === 0 ? (
              <p className="px-6 py-8 text-sm text-gray-400 text-center">No standups posted yet today</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {recentStandups.map(update => (
                  <li key={update.id} className="px-6 py-3">
                    <p className="text-sm font-medium text-gray-900">{update.profiles.full_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{update.did_today}</p>
                    {update.blockers && (
                      <Badge variant="red" className="mt-1">Blocker</Badge>
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
