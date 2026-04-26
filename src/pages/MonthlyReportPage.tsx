import { useState } from 'react'
import {
  Sparkles, ChevronDown, BarChart3, Lightbulb, Megaphone,
  Users, Building2, AppWindow, Handshake, PackageCheck, Loader2,
  FileText, RefreshCw, AlertCircle, Download, Mail,
} from 'lucide-react'
import { useGenerateMonthlyReport } from '@/hooks/useMonthlyReport'
import { useAuth } from '@/hooks/useAuth'
import { useProfiles } from '@/hooks/useProfiles'
import { Card, CardBody } from '@/components/ui/Card'
import { triggerWebhook } from '@/lib/webhook'
import type { MonthlyReport, MonthlyTagSection } from '@/types/database'

// ─── Tag metadata ─────────────────────────────────────────────────────────────
const TAG_META: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  Ideas:        { icon: Lightbulb,    color: '#2563eb', bg: 'rgba(37,99,235,0.10)' },
  Outreach:     { icon: Megaphone,    color: '#0cc0df', bg: 'rgba(12,192,223,0.10)' },
  Meetings:     { icon: Users,        color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)' },
  Entities:     { icon: Building2,    color: '#ef4444', bg: 'rgba(239,68,68,0.10)'  },
  Applications: { icon: AppWindow,    color: '#10b981', bg: 'rgba(16,185,129,0.10)' },
  Partnerships: { icon: Handshake,    color: '#007bff', bg: 'rgba(0,123,255,0.10)'  },
  Deliverables: { icon: PackageCheck, color: '#f97316', bg: 'rgba(249,115,22,0.10)' },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getMonthOptions() {
  const options: { value: string; label: string }[] = []
  const now = new Date()
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    options.push({ value, label })
  }
  return options
}

// ─── Tag Section Card ─────────────────────────────────────────────────────────
function TagSection({ section }: { section: MonthlyTagSection }) {
  const [expanded, setExpanded] = useState(true)
  const meta = TAG_META[section.tag]
  const Icon = meta?.icon ?? FileText

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        boxShadow: 'var(--shadow-xs)',
      }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors"
        style={{
          background: meta?.bg ?? 'transparent',
          borderBottom: expanded ? '1px solid var(--border)' : 'none',
        }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: meta?.color ?? 'var(--blue)', opacity: 0.85 }}
        >
          <Icon size={15} color="#fff" strokeWidth={2} />
        </div>
        <span
          className="font-semibold text-sm flex-1"
          style={{ color: meta?.color ?? 'var(--t1)', fontFamily: 'var(--font-display)' }}
        >
          {section.tag}
        </span>
        <ChevronDown
          size={15}
          style={{
            color: 'var(--t3)',
            transform: expanded ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
          }}
        />
      </button>

      {/* Body */}
      {expanded && (
        <div className="px-5 py-4 space-y-3">
          {section.summary && (
            <p
              className="text-sm leading-relaxed"
              style={{ color: 'var(--t2)' }}
              dangerouslySetInnerHTML={{
                __html: section.summary.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
              }}
            />
          )}
          {section.highlights && section.highlights.length > 0 && (
            <ul className="space-y-1.5">
              {section.highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--t2)' }}>
                  <span
                    className="mt-[6px] w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: meta?.color ?? 'var(--blue)' }}
                  />
                  <span dangerouslySetInnerHTML={{
                    __html: h.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
                  }} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Report Display ───────────────────────────────────────────────────────────
function ReportDisplay({ report }: { report: MonthlyReport }) {
  return (
    <div className="space-y-5">
      {/* Executive Summary */}
      <Card>
        <CardBody className="space-y-2">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} style={{ color: 'var(--blue)' }} />
            <h3 className="font-semibold text-sm" style={{ color: 'var(--t1)', fontFamily: 'var(--font-display)' }}>
              Executive Summary
            </h3>
          </div>
          <p
            className="text-sm leading-relaxed"
            style={{ color: 'var(--t2)' }}
            dangerouslySetInnerHTML={{
              __html: report.executive_summary.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
            }}
          />
        </CardBody>
      </Card>

      {/* Tag sections */}
      <div className="space-y-3">
        {report.sections.map((section, i) => (
          <TagSection key={i} section={section} />
        ))}
      </div>

      {/* Overall Impact */}
      {report.overall_impact && (
        <div
          className="rounded-xl px-5 py-4"
          style={{
            background: 'linear-gradient(135deg, rgba(0,123,255,0.06) 0%, rgba(12,192,223,0.06) 100%)',
            border: '1px solid rgba(0,123,255,0.15)',
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--blue)' }}>
            Overall Impact
          </p>
          <p
            className="text-sm leading-relaxed"
            style={{ color: 'var(--t1)' }}
            dangerouslySetInnerHTML={{
              __html: report.overall_impact.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
            }}
          />
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function MonthlyReportPage() {
  const { isAdmin, profile } = useAuth()
  const { data: profiles } = useProfiles()
  const generate = useGenerateMonthlyReport()

  const monthOptions = getMonthOptions()
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value)
  const [mode, setMode] = useState<'individual' | 'unified'>('individual')
  const [targetUserId, setTargetUserId] = useState<string>('')
  const [report, setReport] = useState<MonthlyReport | null>(null)
  const [cached, setCached] = useState(false)
  const [emailStatus, setEmailStatus] = useState<{ ok: boolean; message: string } | null>(null)
  const [emailSending, setEmailSending] = useState(false)

  function buildReportText(r: MonthlyReport): string {
    const lines: string[] = [
      `JNH SYSTEMS — MONTHLY REPORT`,
      `${r.month}`,
      ``,
      `EXECUTIVE SUMMARY`,
      r.executive_summary,
      ``,
    ]
    r.sections.forEach(s => {
      lines.push(`── ${s.tag.toUpperCase()} ──`)
      lines.push(s.summary)
      if (s.highlights?.length) {
        s.highlights.forEach(h => lines.push(`  • ${h}`))
      }
      lines.push(``)
    })
    if (r.overall_impact) {
      lines.push(`OVERALL IMPACT`)
      lines.push(r.overall_impact)
    }
    return lines.join('\n')
  }

  function handleDownload() {
    if (!report) return
    const text = buildReportText(report)
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `JNH_Report_${selectedMonth}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleEmail() {
    if (!report || !profile) return
    setEmailSending(true)
    setEmailStatus(null)
    try {
      await triggerWebhook({
        event: 'report.generated',
        report: {
          month: report.month ?? selectedMonthLabel,
          mode,
          executive_summary: report.executive_summary,
          overall_impact: report.overall_impact,
          sections: report.sections,
        },
        recipient: {
          id: profile.id,
          name: profile.full_name,
        },
      })
      setEmailStatus({ ok: true, message: 'Report sent to your email via n8n.' })
    } catch (err) {
      setEmailStatus({ ok: false, message: (err as Error).message ?? 'Failed to send email.' })
    } finally {
      setEmailSending(false)
    }
  }

  async function handleGenerate() {
    const params: Parameters<typeof generate.mutateAsync>[0] = {
      month: selectedMonth,
      mode,
    }
    if (mode === 'individual' && isAdmin && targetUserId) {
      params.user_id = targetUserId
    }
    const result = await generate.mutateAsync(params)
    setReport(result.report)
    setCached(result.cached)
  }

  const selectedMonthLabel = monthOptions.find(o => o.value === selectedMonth)?.label ?? selectedMonth

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--t1)', fontFamily: 'var(--font-display)' }}>
            Monthly Report
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--t3)' }}>
            Generated from your daily standups and tasks for the selected month
          </p>
        </div>
      </div>

      {/* Controls card */}
      <Card>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Month picker */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--t3)' }}>
                Month
              </label>
              <select
                value={selectedMonth}
                onChange={e => { setSelectedMonth(e.target.value); setReport(null) }}
                className="w-full px-3 py-2 rounded-lg text-sm border"
                style={{
                  background: 'var(--surface-2)',
                  borderColor: 'var(--border-strong)',
                  color: 'var(--t1)',
                }}
              >
                {monthOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Mode picker — admin only */}
            {isAdmin && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--t3)' }}>
                  Report Type
                </label>
                <div className="flex gap-2">
                  {(['individual', 'unified'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => { setMode(m); setReport(null) }}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                      style={{
                        background: mode === m
                          ? 'linear-gradient(135deg, #007bff 0%, #0cc0df 100%)'
                          : 'var(--surface-2)',
                        color: mode === m ? '#fff' : 'var(--t2)',
                        border: `1px solid ${mode === m ? 'transparent' : 'var(--border-strong)'}`,
                      }}
                    >
                      {m === 'individual' ? 'Individual' : 'Unified (All)'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Target user — admin individual mode */}
          {isAdmin && mode === 'individual' && profiles && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--t3)' }}>
                Team Member
              </label>
              <select
                value={targetUserId}
                onChange={e => { setTargetUserId(e.target.value); setReport(null) }}
                className="w-full px-3 py-2 rounded-lg text-sm border"
                style={{
                  background: 'var(--surface-2)',
                  borderColor: 'var(--border-strong)',
                  color: 'var(--t1)',
                }}
              >
                <option value="">My own report ({profile?.full_name})</option>
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Generate button */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleGenerate}
              disabled={generate.isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #007bff 0%, #0cc0df 100%)',
                color: '#fff',
                boxShadow: generate.isPending ? 'none' : 'var(--shadow-blue)',
              }}
            >
              {generate.isPending ? (
                <><Loader2 size={15} className="animate-spin" /> Generating…</>
              ) : (
                <><Sparkles size={15} /> Generate {mode === 'unified' ? 'Unified Report' : 'My Report'}</>
              )}
            </button>

            {report && (
              <button
                onClick={() => { setReport(null); handleGenerate() }}
                disabled={generate.isPending}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors"
                style={{ color: 'var(--t3)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}
              >
                <RefreshCw size={12} /> Regenerate
              </button>
            )}
          </div>

          {/* Error */}
          {generate.isError && (
            <div
              className="flex items-start gap-2 px-4 py-3 rounded-lg text-sm"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}
            >
              <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
              <span>{generate.error?.message ?? 'Generation failed. Please try again.'}</span>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Generating skeleton */}
      {generate.isPending && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-xl animate-pulse"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            />
          ))}
        </div>
      )}

      {/* Report */}
      {report && !generate.isPending && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2
                className="text-lg font-bold"
                style={{ color: 'var(--t1)', fontFamily: 'var(--font-display)' }}
              >
                {report.month ?? selectedMonthLabel}
                {mode === 'unified' && (
                  <span
                    className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(0,123,255,0.1)', color: 'var(--blue)' }}
                  >
                    Company-Wide
                  </span>
                )}
              </h2>
              {cached && (
                <span className="text-xs" style={{ color: 'var(--t3)' }}>Cached result</span>
              )}
            </div>

            {/* Export actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold transition-colors"
                style={{ background: 'var(--surface-2)', color: 'var(--t2)', border: '1px solid var(--border)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t1)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t2)' }}
                title="Download as text file"
              >
                <Download size={13} /> Download
              </button>
              <button
                onClick={handleEmail}
                disabled={emailSending}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold transition-colors disabled:opacity-50"
                style={{ background: 'rgba(0,123,255,0.08)', color: '#007bff', border: '1px solid rgba(0,123,255,0.2)' }}
                onMouseEnter={e => !emailSending && ((e.currentTarget as HTMLElement).style.background = 'rgba(0,123,255,0.14)')}
                onMouseLeave={e => !emailSending && ((e.currentTarget as HTMLElement).style.background = 'rgba(0,123,255,0.08)')}
                title="Email via n8n webhook"
              >
                <Mail size={13} /> {emailSending ? 'Sending…' : 'Email Report'}
              </button>
            </div>
          </div>

          {/* Email status */}
          {emailStatus && (
            <div
              className="rounded-xl px-4 py-3 text-[13px] font-medium"
              style={{
                background: emailStatus.ok ? 'rgba(5,150,105,0.08)' : 'rgba(217,119,6,0.08)',
                border: `1.5px solid ${emailStatus.ok ? 'rgba(5,150,105,0.25)' : 'rgba(217,119,6,0.3)'}`,
                color: emailStatus.ok ? '#059669' : '#b45309',
              }}
            >
              {emailStatus.ok ? '✅ ' : '⚠️ '}{emailStatus.message}
            </div>
          )}
          <ReportDisplay report={report} />
        </div>
      )}

      {/* Empty state */}
      {!report && !generate.isPending && !generate.isError && (
        <div
          className="rounded-xl flex flex-col items-center justify-center py-16 text-center"
          style={{ border: '1px dashed var(--border)', background: 'var(--surface)' }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
            style={{ background: 'rgba(0,123,255,0.08)' }}
          >
            <Sparkles size={22} style={{ color: 'var(--blue)' }} />
          </div>
          <p className="font-semibold text-sm" style={{ color: 'var(--t1)' }}>
            No report yet
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--t3)' }}>
            Select a month and click Generate to create your AI-powered contribution report
          </p>
        </div>
      )}
    </div>
  )
}
