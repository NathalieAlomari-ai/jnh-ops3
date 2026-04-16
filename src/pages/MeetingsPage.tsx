import { CalendarDays } from 'lucide-react'

export default function MeetingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Meeting Schedule</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Team meetings, stand-ups, and recurring sessions
        </p>
      </div>

      {/* Placeholder — full calendar integration coming soon */}
      <div className="flex flex-col items-center justify-center py-24 text-center bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-4">
          <CalendarDays size={28} className="text-blue-500" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
          Calendar coming soon
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
          This section will display your team's recurring meetings and one-off sessions.
        </p>
      </div>
    </div>
  )
}
