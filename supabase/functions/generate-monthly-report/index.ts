import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── CORS ─────────────────────────────────────────────────────────────────────
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface MonthlyTagSection {
  tag: string
  summary: string
  highlights: string[]
}

interface MonthlyReport {
  month: string
  executive_summary: string
  sections: MonthlyTagSection[]
  overall_impact: string
}

interface RequestBody {
  month?: string          // "2026-04" — defaults to current month
  mode?: 'individual' | 'unified'   // defaults to 'individual'
  user_id?: string        // admin can request a specific user's report
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function getMonthBounds(monthStr?: string): { monthStart: string; monthEnd: string; label: string } {
  const base = monthStr ? new Date(`${monthStr}-01`) : new Date()
  const year = base.getFullYear()
  const month = base.getMonth()
  const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const lastDay = new Date(year, month + 1, 0).getDate()
  const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`
  const label = base.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  return { monthStart, monthEnd, label }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const CONTRIBUTION_TAGS = [
  'Ideas', 'Outreach', 'Meetings', 'Entities',
  'Applications', 'Partnerships', 'Deliverables',
]

const SYSTEM_PROMPT = `You are an expert operations analyst for JNH Systems, a digital transformation consultancy.
Your task is to generate a structured monthly contribution report grouped by the JNH Contribution Tags framework.

The seven Contribution Tags are:
- Ideas: New concepts, strategies, process improvements, creative thinking
- Outreach: External communications, business development contacts, follow-ups
- Meetings: Internal/external meetings, presentations, demos, workshops
- Entities: Legal, corporate, or organisational entity work
- Applications: Software tools, platforms, application development or configuration
- Partnerships: Partner/vendor relationship management, MoUs, alliance work
- Deliverables: Completed outputs — reports, proposals, decks, documents, etc.

Respond ONLY with a valid JSON object — no markdown fences, no extra text.
The JSON must contain exactly these keys:
{
  "month": "<Month Year>",
  "executive_summary": "<2-3 sentence overview of the month's contributions>",
  "sections": [
    {
      "tag": "<one of the 7 tags>",
      "summary": "<paragraph describing contributions under this tag>",
      "highlights": ["<bullet 1>", "<bullet 2>", ...]
    }
  ],
  "overall_impact": "<1-2 sentences on overall impact and momentum>"
}

Only include sections for tags that have relevant contributions.
Use **bold** for emphasis within strings. Be factual — only reference data provided.`

// ─── MAIN ─────────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')!

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // ── 1. Auth
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) return jsonResponse({ error: 'Unauthorized' }, 401)

    // ── 2. Check admin status
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = callerProfile?.role === 'admin'

    // ── 3. Parse body
    let body: RequestBody = {}
    try { body = await req.json() } catch { /* empty ok */ }

    const mode = body.mode ?? 'individual'
    const { monthStart, monthEnd, label } = getMonthBounds(body.month)

    // For unified mode: admin only
    if (mode === 'unified' && !isAdmin) {
      return jsonResponse({ error: 'Admin access required for unified reports' }, 403)
    }

    // ── 4. Resolve which user(s) to fetch data for
    let targetUserIds: string[]
    if (mode === 'unified') {
      // All users
      const { data: profiles } = await supabase.from('profiles').select('id')
      targetUserIds = (profiles ?? []).map((p: { id: string }) => p.id)
    } else if (body.user_id && isAdmin) {
      // Admin requesting a specific user
      targetUserIds = [body.user_id]
    } else {
      // Own report
      targetUserIds = [user.id]
    }

    // ── 5. Check cache — skip if done report exists for this month + mode + user scope
    const cacheKey = mode === 'unified' ? 'ALL' : targetUserIds[0]
    const { data: cached } = await supabase
      .from('ai_summaries')
      .select('id, report_content, status')
      .eq('summary_type', 'monthly_report')
      .eq('week_start', monthStart)    // reusing week_start field for month_start
      .eq('generated_by', cacheKey)
      .in('status', ['done'])
      .maybeSingle()

    if (cached?.report_content) {
      return jsonResponse({ report: cached.report_content, cached: true, id: cached.id })
    }

    // ── 6. Insert generating placeholder
    const { data: placeholder, error: insertErr } = await supabase
      .from('ai_summaries')
      .insert({
        summary_type: 'monthly_report',
        week_start: monthStart,
        week_end: monthEnd,
        content: '',
        status: 'generating',
        triggered_by: 'manual',
        generated_by: cacheKey,
      })
      .select('id')
      .single()

    if (insertErr) throw new Error(`Failed to create placeholder: ${insertErr.message}`)
    const summaryId: string = placeholder.id

    // ── 7. Fetch month data
    const [standupsRes, tasksRes, profilesRes] = await Promise.all([
      supabase
        .from('daily_updates')
        .select('*, profiles(full_name, job_title)')
        .in('user_id', targetUserIds)
        .gte('update_date', monthStart)
        .lte('update_date', monthEnd)
        .order('update_date'),
      supabase
        .from('shm_tasks')
        .select('*, profiles(full_name)')
        .in('assignee_id', targetUserIds)
        .or(`created_at.gte.${monthStart}T00:00:00,updated_at.gte.${monthStart}T00:00:00`)
        .lte('created_at', `${monthEnd}T23:59:59`)
        .not('status', 'eq', 'cancelled'),
      supabase
        .from('profiles')
        .select('id, full_name, job_title, department')
        .in('id', targetUserIds),
    ])

    if (standupsRes.error) throw standupsRes.error
    if (tasksRes.error) throw tasksRes.error

    const standups = standupsRes.data ?? []
    const tasks = tasksRes.data ?? []
    const profiles = profilesRes.data ?? []

    // ── 8. Build context text
    const modeLabel = mode === 'unified' ? 'Company-Wide Unified Report' : 'Individual Contribution Report'

    let contextText = `=== ${modeLabel.toUpperCase()} — ${label} ===\n\n`

    if (profiles.length > 0) {
      contextText += `--- TEAM MEMBERS IN SCOPE ---\n`
      contextText += profiles.map((p: { full_name: string; job_title?: string; department?: string }) =>
        `• ${p.full_name}${p.job_title ? ` (${p.job_title})` : ''}${p.department ? ` — ${p.department}` : ''}`
      ).join('\n') + '\n\n'
    }

    if (standups.length === 0) {
      contextText += `--- DAILY STANDUPS ---\nNo standups submitted this month.\n\n`
    } else {
      contextText += `--- DAILY STANDUPS (${standups.length} entries) ---\n`
      contextText += standups.map((u: {
        profiles?: { full_name?: string }
        update_date: string
        contribution_tags?: string[]
        did_today: string
        blockers?: string
        plan_tomorrow?: string
      }) => {
        const tagsStr = u.contribution_tags?.length
          ? ` [Tags: ${u.contribution_tags.join(', ')}]`
          : ''
        return (
          `• ${u.profiles?.full_name ?? 'Unknown'} — ${u.update_date}${tagsStr}\n` +
          `  Done: ${u.did_today}\n` +
          (u.blockers ? `  Blockers: ${u.blockers}\n` : '') +
          (u.plan_tomorrow ? `  Tomorrow: ${u.plan_tomorrow}` : '')
        )
      }).join('\n\n') + '\n\n'
    }

    if (tasks.length === 0) {
      contextText += `--- TASKS ---\nNo tasks this month.\n\n`
    } else {
      contextText += `--- TASKS (${tasks.length} total) ---\n`
      contextText += tasks.map((t: {
        priority: string
        title: string
        status: string
        profiles?: { full_name?: string }
        contribution_tags?: string[]
        description?: string
      }) => {
        const tagsStr = t.contribution_tags?.length
          ? ` [Tags: ${t.contribution_tags.join(', ')}]`
          : ''
        return `• [${t.priority.toUpperCase()}] ${t.title} — ${t.status} (${t.profiles?.full_name ?? 'Unassigned'})${tagsStr}` +
          (t.description ? `\n  ${t.description}` : '')
      }).join('\n') + '\n\n'
    }

    contextText += `--- CONTRIBUTION TAGS FRAMEWORK ---\n`
    contextText += CONTRIBUTION_TAGS.map(tag => `• ${tag}`).join('\n')
    contextText += `\n\nPlease categorise each contribution under the most relevant tag(s) and generate the structured monthly report.`

    // ── 9. Call Claude API
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 3000,
        system: [
          {
            type: 'text',
            text: SYSTEM_PROMPT,
          },
          {
            type: 'text',
            text: contextText,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [
          {
            role: 'user',
            content: `Generate the ${modeLabel} for ${label}.`,
          },
        ],
      }),
    })

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      await supabase
        .from('ai_summaries')
        .update({ status: 'error', content: errText })
        .eq('id', summaryId)
      throw new Error(`Claude API error (${claudeRes.status}): ${errText}`)
    }

    const claude = await claudeRes.json()
    const rawText: string = claude.content?.[0]?.text ?? ''

    // ── 10. Parse Claude's JSON response
    let reportContent: MonthlyReport
    try {
      // Strip any accidental markdown fences
      const cleaned = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
      reportContent = JSON.parse(cleaned)
      if (!reportContent.executive_summary || !Array.isArray(reportContent.sections)) {
        throw new Error('Invalid report structure')
      }
    } catch {
      reportContent = {
        month: label,
        executive_summary: 'Report generated — see raw output below.',
        sections: [{ tag: 'Deliverables', summary: rawText, highlights: [] }],
        overall_impact: '',
      }
    }

    // ── 11. Persist
    const { error: updateErr } = await supabase
      .from('ai_summaries')
      .update({
        report_content: reportContent as unknown as Record<string, unknown>,
        content: reportContent.executive_summary,
        status: 'done',
      })
      .eq('id', summaryId)

    if (updateErr) throw new Error(`Failed to save report: ${updateErr.message}`)

    return jsonResponse({
      report: reportContent,
      id: summaryId,
      month_start: monthStart,
      month_end: monthEnd,
      cached: false,
      usage: claude.usage ?? null,
    })
  } catch (err) {
    console.error('[generate-monthly-report]', err)
    return jsonResponse({ error: (err as Error).message }, 500)
  }
})
