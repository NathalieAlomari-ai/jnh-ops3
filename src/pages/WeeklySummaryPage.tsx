import { useState } from 'react'
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, parseISO } from 'date-fns'
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Users,
  CheckSquare,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Clock,
  Zap,
  RefreshCw,
} from 'lucide-react'
import { useWeeklySummaries, useGenerateWeeklySummary } from '@/hooks/useAiFeatures'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { AiSummary, WeeklySummaryReport } from '@/types/database'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getMondayOf(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 })
}

function formatWeekRange(weekStart: string, weekEnd?: string | null): string {
  const start = parseISO(weekStart)
  const end = weekEnd ? parseISO(weekEnd) : endOfWeek(start, { weekStartsOn: 1 })
  return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`
}

function statusVariant(status: string): 'green' | 'yellow' | 'orange' | 'red' | 'gray' {
  if (status === 'done') return 'green'
  if (status === 'generating') return 'yellow'
  if (status === 'pending') return 'orange'
  if (status === 'error') return 'red'
  return 'gray'
}

// ─── Section definitions ──────────────────────────────────────────────────────
const SECTIONS: {
  key: keyof WeeklySummaryReport
  label: string
  icon: React.ElementType
  color: string
  bg: string
}[] = [
  { key: 'standup_digest',      label: 'Team Stand-up Digest',   icon: Users,         color: 'text-indigo-600',  bg: 'bg-indigo-50'  },
  { key: 'task_progress',       label: 'Task Progress',          icon: CheckSquare,   color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { key: 'strategy_update',     label: 'Strategy Update',        icon: TrendingUp,    color: 'text-blue-600',    bg: 'bg-blue-50'    },
  { key: 'action_items_risks',  label: 'Action Items & Risks',   icon: AlertTriangle, color: 'text-orange-600',  bg: 'bg-orange-50'  },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionContent({ text }: { text: string }) {
  // Render **bold** markdown and bullet points gracefully
  const lines = text.split('\n').filter(Boolean)
  return (
    <div className="space-y-1.5 text-sm text-gray-700">
      {lines.map((line, i) => {
        const isBullet = line.trimStart().startsWith('•') || line.trimStart().startsWith('-')
        // Replace **bold** markers with <strong>
        const parsed = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        return (
          <p
            key={i}
            className={isBullet ? 'flex gap-2' : ''}
            dangerouslySetInnerHTML={{ __html: isBullet ? `<span class="text-gray-400 flex-shrink-0">•</span><span>${parsed.replace(/^[\s•\-]+/, '')}</span>` : parsed }}
          />
        )
      })}
    </div>
  )
}

function SummaryCard({ summary }: { summary: AiSummary }) {
  const [expanded, setExpanded] = useState(false)
  const report = summary.report_content as WeeklySummaryReport | null
  const hasReport = report && typeof report === 'object'

  return (
    <Card className="overflow-hidden transition-shadow duration-200 hover:shadow-md">
      {/* ── Card Header ── */}
      <button
        id={`summary-card-${summary.id}`}
        onClick={() => setExpanded(v => !v)}
        className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-inset"
        aria-expanded={expanded}
        aria-controls={`summary-body-${summary.id}`}
      >
        <CardHeader className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
              <Sparkles size={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate">
                Week of {summary.week_start ? formatWeekRange(summary.week_start, summary.week_end) : '—'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                <Clock size={11} />
                Generated {format(parseISO(summary.created_at), 'MMM d, yyyy · h:mm a')}
                {summary.triggered_by === 'n8n' && (
                  <span className="ml-1 inline-flex items-center gap-0.5 text-purple-500">
                    <Zap size={10} />
                    n8n
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant={statusVariant(summary.status ?? 'done')}>
              {summary.status ?? 'done'}
            </Badge>
            {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </div>
        </CardHeader>
      </button>

      {/* ── Expanded Body ── */}
      {expanded && (
        <div id={`summary-body-${summary.id}`}>
          {!hasReport ? (
            <CardBody>
              <p className="text-sm text-gray-400 italic">
                {summary.status === 'error'
                  ? 'Generation failed. Try regenerating this week.'
                  : summary.status === 'generating'
                  ? 'Summary is currently being generated…'
                  : 'No structured report content available for this entry.'}
              </p>
              {summary.content && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{summary.content}</p>
                </div>
              )}
            </CardBody>
          ) : (
            <div className="divide-y divide-gray-50">
              {SECTIONS.map(({ key, label, icon: Icon, color, bg }) => (
                <div key={key} className="px-6 py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon size={14} className={color} />
                    </div>
                    <h3 className={`text-sm font-semibold ${color}`}>{label}</h3>
                  </div>
                  <SectionContent text={report[key] || '—'} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

function GeneratingCard() {
  return (
    <Card className="overflow-hidden">
      <CardBody className="flex items-center gap-4 py-5">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0 animate-pulse">
          <Sparkles size={18} className="text-indigo-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Loader2 size={14} className="text-indigo-500 animate-spin flex-shrink-0" />
            <p className="text-sm font-semibold text-gray-900">Generating weekly summary…</p>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Claude is analysing standups, tasks, and initiatives. This usually takes 10–20 seconds.
          </p>
          {/* Progress bar */}
          <div className="mt-3 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-400 rounded-full animate-[pulse_1.5s_ease-in-out_infinite] w-3/4" />
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

function EmptyState({ onGenerate }: { onGenerate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
        <Sparkles size={28} className="text-indigo-400" />
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1">No summaries yet</h3>
      <p className="text-sm text-gray-500 max-w-xs mb-6">
        Generate your first weekly report. Claude will analyse standups, tasks, and strategic initiatives.
      </p>
      <Button id="empty-generate-btn" onClick={onGenerate} variant="primary">
        <Sparkles size={15} />
        Generate First Summary
      </Button>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function WeeklySummaryPage() {
  const today = new Date()
  const [selectedMonday, setSelectedMonday] = useState<Date>(getMondayOf(today))

  const { data: summaries, isLoading: listLoading, error: listError } = useWeeklySummaries()
  const generate = useGenerateWeeklySummary()

  const weekStartStr = format(selectedMonday, 'yyyy-MM-dd')

  // Find if the selected week already has a summary
  const existingSummary = summaries?.find(s => s.week_start === weekStartStr)

  function handleGenerate() {
    generate.mutate(weekStartStr)
  }

  const isGenerating = generate.isPending

  // ── Week navigation
  function prevWeek() { setSelectedMonday(d => subWeeks(getMondayOf(d), 1)) }
  function nextWeek() {
    const next = addWeeks(getMondayOf(selectedMonday), 1)
    if (next <= getMondayOf(today)) setSelectedMonday(next)
  }
  const isCurrentOrFuture = getMondayOf(selectedMonday) >= getMondayOf(today)

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Weekly Summary</h1>
          <p className="text-sm text-gray-500 mt-1">
            AI-generated reports covering standups, tasks, strategy, and risks.
          </p>
        </div>

        {/* Generate button */}
        <Button
          id="generate-weekly-summary-btn"
          variant="primary"
          onClick={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating
            ? <><Loader2 size={15} className="animate-spin" /> Generating…</>
            : existingSummary?.status === 'done'
            ? <><RefreshCw size={15} /> Regenerate</>
            : <><Sparkles size={15} /> Generate Now</>
          }
        </Button>
      </div>

      {/* ── Week Selector ── */}
      <Card>
        <CardBody className="flex items-center gap-4 py-3">
          <Calendar size={16} className="text-gray-400 flex-shrink-0" />
          <span className="text-sm text-gray-500 font-medium">Week</span>

          <div className="flex items-center gap-2">
            <button
              id="week-prev-btn"
              onClick={prevWeek}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              aria-label="Previous week"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="min-w-[200px] text-center">
              <span className="text-sm font-semibold text-gray-900">
                {format(selectedMonday, 'MMM d')} – {format(endOfWeek(selectedMonday, { weekStartsOn: 1 }), 'MMM d, yyyy')}
              </span>
              {isCurrentOrFuture && (
                <span className="ml-2 text-xs text-indigo-500 font-medium">Current week</span>
              )}
            </div>

            <button
              id="week-next-btn"
              onClick={nextWeek}
              disabled={isCurrentOrFuture}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              aria-label="Next week"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Status badge for selected week */}
          {existingSummary && (
            <Badge variant={statusVariant(existingSummary.status ?? 'done')} className="ml-auto">
              {existingSummary.status === 'done' ? 'Summary available' : existingSummary.status}
            </Badge>
          )}
          {generate.isError && (
            <p className="ml-auto text-xs text-red-500">
              {(generate.error as Error)?.message ?? 'Generation failed'}
            </p>
          )}
        </CardBody>
      </Card>

      {/* ── Summary for selected week ── */}
      {isGenerating && <GeneratingCard />}

      {!isGenerating && existingSummary && (
        <SummaryCard key={existingSummary.id} summary={existingSummary} />
      )}

      {!isGenerating && !existingSummary && !listLoading && (
        <Card>
          <CardBody className="py-3">
            <p className="text-sm text-gray-400 text-center">
              No summary generated for this week yet. Click "Generate Now" to create one.
            </p>
          </CardBody>
        </Card>
      )}

      {/* ── Past Summaries list ── */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          All Summaries
        </h2>

        {listLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {listError && (
          <Card>
            <CardBody>
              <p className="text-sm text-red-500">Failed to load summaries: {(listError as Error).message}</p>
            </CardBody>
          </Card>
        )}

        {!listLoading && !listError && summaries && summaries.length === 0 && (
          <EmptyState onGenerate={handleGenerate} />
        )}

        {!listLoading && !listError && summaries && summaries.length > 0 && (
          <div className="space-y-3">
            {summaries.map(s => (
              <SummaryCard key={s.id} summary={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
