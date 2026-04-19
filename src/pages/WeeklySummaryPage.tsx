import { useState, useMemo } from 'react'
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  parseISO,
} from 'date-fns'
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Users,
  CheckSquare,
  TrendingUp,
  AlertTriangle,
  Calendar,
  RefreshCw,
  FileText,
  User,
} from 'lucide-react'
import { useWeeklySummaries, useGenerateWeeklySummary } from '@/hooks/useAiFeatures'
import { useDailyUpdates } from '@/hooks/useDailyUpdates'
import { useProfiles } from '@/hooks/useProfiles'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { WeeklySummaryReport } from '@/types/database'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getMondayOf(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 })
}

function getSundayOf(date: Date): Date {
  return endOfWeek(date, { weekStartsOn: 1 })
}

const AVATAR_COLORS = [
  'bg-blue-600', 'bg-emerald-600', 'bg-violet-600',
  'bg-orange-500', 'bg-rose-600', 'bg-teal-600', 'bg-amber-600',
]

// ─── Section definitions ──────────────────────────────────────────────────────
const SECTIONS: {
  key: keyof WeeklySummaryReport
  label: string
  icon: React.ElementType
  color: string
  bg: string
}[] = [
  { key: 'standup_digest',     label: 'Team Stand-up Digest',  icon: Users,         color: 'text-blue-600',    bg: 'bg-blue-50 dark:bg-blue-900/20'     },
  { key: 'task_progress',      label: 'Task Progress',         icon: CheckSquare,   color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  { key: 'strategy_update',    label: 'Strategy Update',       icon: TrendingUp,    color: 'text-blue-600',    bg: 'bg-blue-50 dark:bg-blue-900/20'     },
  { key: 'action_items_risks', label: 'Action Items & Risks',  icon: AlertTriangle, color: 'text-orange-600',  bg: 'bg-orange-50 dark:bg-orange-900/20' },
]

// ─── Report content renderer ──────────────────────────────────────────────────
function ReportContent({ text }: { text: string }) {
  const lines = text.split('\n').filter(Boolean)
  return (
    <div className="space-y-1.5 text-sm text-gray-700 dark:text-slate-300">
      {lines.map((line, i) => {
        const isBullet = line.trimStart().startsWith('•') || line.trimStart().startsWith('-')
        const parsed   = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        return (
          <p
            key={i}
            className={isBullet ? 'flex gap-2' : ''}
            dangerouslySetInnerHTML={{
              __html: isBullet
                ? `<span class="text-slate-400 flex-shrink-0">•</span><span>${parsed.replace(/^[\s•\-]+/, '')}</span>`
                : parsed,
            }}
          />
        )
      })}
    </div>
  )
}

// ─── Per-member standup breakdown ─────────────────────────────────────────────
function WeeklyStandupBreakdown({
  weekStart,
  weekEnd,
}: {
  weekStart: string
  weekEnd: string
}) {
  const { data: updates, isLoading } = useDailyUpdates(weekStart, weekEnd)
  const { data: profiles } = useProfiles()
  const profileColorIndex = new Map(profiles?.map((p, i) => [p.id, i]) ?? [])

  // Group updates by user
  const byMember = useMemo(() => {
    const map = new Map<string, { name: string; colorIdx: number; updates: typeof updates }>()
    for (const u of updates ?? []) {
      if (!map.has(u.user_id)) {
        map.set(u.user_id, {
          name:     u.profiles.full_name,
          colorIdx: profileColorIndex.get(u.user_id) ?? 0,
          updates:  [],
        })
      }
      map.get(u.user_id)!.updates!.push(u)
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [updates, profiles])

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />)}
      </div>
    )
  }

  if (!updates || updates.length === 0) {
    return (
      <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-sm">
        No standups recorded for this week.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {byMember.map(({ name, colorIdx, updates: memberUpdates }) => {
        const color = AVATAR_COLORS[colorIdx % AVATAR_COLORS.length]
        return (
          <Card key={name}>
            <CardBody className="p-4">
              {/* Member header */}
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-full ${color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                  {name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{name}</p>
                  <p className="text-xs text-slate-400">{memberUpdates!.length} standup{memberUpdates!.length > 1 ? 's' : ''} this week</p>
                </div>
              </div>

              {/* Daily entries */}
              <div className="space-y-3 ml-10">
                {memberUpdates!.map(u => (
                  <div key={u.id} className="border-l-2 border-slate-100 dark:border-slate-700 pl-3">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      {format(parseISO(u.update_date), 'EEEE, MMM d')}
                    </p>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      <span className="font-medium">Did: </span>{u.did_today}
                    </p>
                    {u.plan_tomorrow && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                        <span className="font-medium">Plan: </span>{u.plan_tomorrow}
                      </p>
                    )}
                    {u.blockers && (
                      <div className="flex items-start gap-1 mt-1">
                        <AlertTriangle size={11} className="text-orange-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-orange-600 leading-relaxed">{u.blockers}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )
      })}
    </div>
  )
}

// ─── AI Report Document View ──────────────────────────────────────────────────
function AiReportDocument({ report }: { report: WeeklySummaryReport }) {
  // Combine all sections into a readable document
  const documentText = SECTIONS
    .map(s => `## ${s.label}\n\n${report[s.key]}`)
    .join('\n\n---\n\n')

  return (
    <div className="space-y-1">
      {/* Textarea-style document */}
      <div
        className="w-full min-h-[320px] p-5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 leading-relaxed overflow-y-auto resize-y font-mono whitespace-pre-wrap"
        style={{ maxHeight: 520 }}
        aria-label="AI-generated weekly report"
      >
        {documentText}
      </div>
      <p className="text-xs text-slate-400 text-right">AI-generated · Claude</p>
    </div>
  )
}

// ─── AI Report Sections ───────────────────────────────────────────────────────
function AiReportSections({ report }: { report: WeeklySummaryReport }) {
  return (
    <div className="divide-y divide-gray-50 dark:divide-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl overflow-hidden">
      {SECTIONS.map(({ key, label, icon: Icon, color, bg }) => (
        <div key={key} className="px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
              <Icon size={14} className={color} />
            </div>
            <h3 className={`text-sm font-semibold ${color}`}>{label}</h3>
          </div>
          <ReportContent text={report[key] || '—'} />
        </div>
      ))}
    </div>
  )
}

// ─── Generating state ─────────────────────────────────────────────────────────
function GeneratingBanner() {
  return (
    <Card>
      <CardBody className="flex items-center gap-4 py-5">
        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 animate-pulse">
          <Sparkles size={18} className="text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Loader2 size={14} className="text-blue-500 animate-spin" />
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Generating AI report…</p>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Claude is analysing standups, tasks, and initiatives. This usually takes 10–20 seconds.
          </p>
          <div className="mt-3 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-400 rounded-full animate-pulse w-3/4" />
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function WeeklySummaryPage() {
  const { isAdmin } = useAuth()
  const today = new Date()
  const [selectedMonday, setSelectedMonday] = useState<Date>(getMondayOf(today))
  const [reportView, setReportView] = useState<'sections' | 'document'>('sections')

  const { data: summaries, isLoading: listLoading } = useWeeklySummaries()
  const generate = useGenerateWeeklySummary()

  const weekStartStr = format(selectedMonday, 'yyyy-MM-dd')
  const weekEndStr   = format(getSundayOf(selectedMonday), 'yyyy-MM-dd')

  const existingSummary = summaries?.find(s => s.week_start === weekStartStr)
  const report = existingSummary?.report_content as WeeklySummaryReport | null

  const isCurrentOrFuture = getMondayOf(selectedMonday) >= getMondayOf(today)

  function prevWeek() { setSelectedMonday(d => subWeeks(getMondayOf(d), 1)) }
  function nextWeek() {
    const next = addWeeks(getMondayOf(selectedMonday), 1)
    if (next <= getMondayOf(today)) setSelectedMonday(next)
  }

  return (
    <div className="space-y-6">

      {/* ── Page Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Weekly Summary</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Team standup breakdown + AI-generated report for the week.
          </p>
        </div>

        {/* Generate button — visible to all, admin can generate */}
        {isAdmin && (
          <Button
            variant="primary"
            onClick={() => generate.mutate(weekStartStr)}
            disabled={generate.isPending}
          >
            {generate.isPending
              ? <><Loader2 size={15} className="animate-spin" /> Generating…</>
              : existingSummary?.status === 'done'
              ? <><RefreshCw size={15} /> Regenerate Report</>
              : <><Sparkles size={15} /> Generate AI Report</>
            }
          </Button>
        )}
      </div>

      {/* ── Week Selector ── */}
      <Card>
        <CardBody className="flex items-center gap-4 py-3">
          <Calendar size={16} className="text-slate-400 flex-shrink-0" />
          <span className="text-sm text-slate-500 font-medium">Week</span>

          <div className="flex items-center gap-2">
            <button
              onClick={prevWeek}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label="Previous week"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="min-w-[220px] text-center">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {format(selectedMonday, 'MMM d')} – {format(getSundayOf(selectedMonday), 'MMM d, yyyy')}
              </span>
              {isCurrentOrFuture && (
                <span className="ml-2 text-xs text-blue-500 font-medium">Current week</span>
              )}
            </div>

            <button
              onClick={nextWeek}
              disabled={isCurrentOrFuture}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label="Next week"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {existingSummary && (
            <Badge
              variant={existingSummary.status === 'done' ? 'green' : existingSummary.status === 'error' ? 'red' : 'yellow'}
              className="ml-auto"
            >
              {existingSummary.status === 'done' ? 'Report ready' : existingSummary.status}
            </Badge>
          )}
          {generate.isError && (
            <p className="ml-auto text-xs text-red-500">
              {(generate.error as Error)?.message ?? 'Generation failed'}
            </p>
          )}
        </CardBody>
      </Card>

      {/* ── Generating banner ── */}
      {generate.isPending && <GeneratingBanner />}

      {/* ── Two-column layout: standups + AI report ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">

        {/* LEFT: Team standup breakdown */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <User size={15} className="text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
              Team Standups
            </h2>
            <span className="text-xs text-slate-400">
              {format(selectedMonday, 'MMM d')} – {format(getSundayOf(selectedMonday), 'MMM d')}
            </span>
          </div>
          <WeeklyStandupBreakdown weekStart={weekStartStr} weekEnd={weekEndStr} />
        </div>

        {/* RIGHT: AI Report */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-blue-500" />
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                AI Report
              </h2>
            </div>
            {report && (
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                <button
                  onClick={() => setReportView('sections')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    reportView === 'sections'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Sections
                </button>
                <button
                  onClick={() => setReportView('document')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    reportView === 'document'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <FileText size={12} className="inline mr-1" />
                  Document
                </button>
              </div>
            )}
          </div>

          {/* No report yet */}
          {!generate.isPending && !report && (
            <Card>
              <CardBody className="py-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-3">
                  <Sparkles size={24} className="text-blue-400" />
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">No report yet</p>
                <p className="text-xs text-slate-400 max-w-xs mx-auto mb-4">
                  {isAdmin
                    ? 'Click "Generate AI Report" to have Claude analyse this week\'s standups, tasks, and strategic initiatives.'
                    : 'An AI report for this week has not been generated yet. Ask your admin to generate one.'}
                </p>
                {isAdmin && (
                  <Button
                    variant="primary"
                    onClick={() => generate.mutate(weekStartStr)}
                    disabled={generate.isPending}
                  >
                    <Sparkles size={15} />
                    Generate AI Report
                  </Button>
                )}
              </CardBody>
            </Card>
          )}

          {/* Error state */}
          {existingSummary?.status === 'error' && (
            <Card>
              <CardBody>
                <p className="text-sm text-red-500">Generation failed for this week.</p>
                {existingSummary.content && (
                  <p className="text-xs text-slate-400 mt-1">{existingSummary.content}</p>
                )}
              </CardBody>
            </Card>
          )}

          {/* Report content */}
          {report && !generate.isPending && (
            reportView === 'sections'
              ? <AiReportSections report={report} />
              : <AiReportDocument report={report} />
          )}
        </div>

      </div>

      {/* ── Past summaries list ── */}
      {!listLoading && summaries && summaries.length > 1 && (
        <div>
          <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">
            Previous Reports
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {summaries
              .filter(s => s.week_start !== weekStartStr)
              .map(s => (
                <button
                  key={s.id}
                  onClick={() => s.week_start && setSelectedMonday(getMondayOf(parseISO(s.week_start)))}
                  className="text-left p-4 rounded-xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-200 dark:hover:border-blue-700 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {s.week_start
                        ? `${format(parseISO(s.week_start), 'MMM d')} – ${format(endOfWeek(parseISO(s.week_start), { weekStartsOn: 1 }), 'MMM d')}`
                        : '—'}
                    </p>
                    <Badge variant={s.status === 'done' ? 'green' : 'gray'} className="text-[10px]">
                      {s.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400">
                    {format(parseISO(s.created_at), 'MMM d, yyyy')}
                  </p>
                </button>
              ))}
          </div>
        </div>
      )}

    </div>
  )
}
