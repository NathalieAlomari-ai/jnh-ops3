import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── CORS ─────────────────────────────────────────────────────────────────────
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
}

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface WeeklySummaryReport {
  standup_digest: string
  task_progress: string
  strategy_update: string
  action_items_risks: string
}

interface RequestBody {
  week_start?: string   // ISO date e.g. "2026-04-13"
  triggered_by?: 'manual' | 'n8n'
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function getWeekBounds(weekStartInput?: string): { weekStart: string; weekEnd: string } {
  const base = weekStartInput ? new Date(weekStartInput) : new Date()
  // Align to the most recent Monday if no explicit start given
  if (!weekStartInput) {
    const day = base.getDay() // 0=Sun, 1=Mon … 6=Sat
    const diff = day === 0 ? -6 : 1 - day
    base.setDate(base.getDate() + diff)
  }
  const end = new Date(base)
  end.setDate(end.getDate() + 6)
  return {
    weekStart: base.toISOString().split('T')[0],
    weekEnd: end.toISOString().split('T')[0],
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
serve(async (req) => {
  // Preflight
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    // ── 1. Auth: Accept either a Supabase JWT (manual trigger from UI)
    //            or the N8N_WEBHOOK_SECRET (automated internal call from n8n-webhook)
    const authHeader = req.headers.get('Authorization') ?? ''
    const webhookSecret = Deno.env.get('N8N_WEBHOOK_SECRET')!
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')!

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,   // service role: bypasses RLS
    )

    let userId: string | null = null
    let triggerSource: 'manual' | 'n8n' = 'manual'

    // Allow n8n-webhook Edge Function to call this via the shared secret
    if (authHeader === `Bearer ${webhookSecret}`) {
      triggerSource = 'n8n'
    } else {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error } = await supabase.auth.getUser(token)
      if (error || !user) return jsonResponse({ error: 'Unauthorized' }, 401)
      userId = user.id
    }

    // ── 2. Parse body
    let body: RequestBody = {}
    try { body = await req.json() } catch { /* empty body is fine */ }

    const { weekStart, weekEnd } = getWeekBounds(body.week_start)
    const resolvedTrigger = body.triggered_by ?? triggerSource

    // ── 3. Check idempotency — skip if a 'done' summary for this week already exists
    const { data: existing } = await supabase
      .from('ai_summaries')
      .select('id, report_content, status')
      .eq('summary_type', 'weekly_standup')
      .eq('week_start', weekStart)
      .in('status', ['done'])
      .maybeSingle()

    if (existing?.report_content) {
      return jsonResponse({ summary: existing.report_content, cached: true, id: existing.id })
    }

    // ── 4. Insert a 'generating' placeholder row so concurrent calls don't double-fire
    const insertPayload: Record<string, unknown> = {
      summary_type: 'weekly_standup',
      week_start: weekStart,
      week_end: weekEnd,
      content: '',
      status: 'generating',
      triggered_by: resolvedTrigger,
    }
    if (userId) insertPayload.generated_by = userId

    const { data: placeholder, error: insertErr } = await supabase
      .from('ai_summaries')
      .insert(insertPayload)
      .select('id')
      .single()

    if (insertErr) throw new Error(`Failed to create placeholder: ${insertErr.message}`)
    const summaryId: string = placeholder.id

    // ── 5. Fetch week data in parallel
    const [standupsRes, tasksRes, initiativesRes] = await Promise.all([
      supabase
        .from('daily_updates')
        .select('*, profiles(full_name, job_title)')
        .gte('update_date', weekStart)
        .lte('update_date', weekEnd)
        .order('update_date')
        .order('created_at'),
      supabase
        .from('shm_tasks')
        .select('*, profiles(full_name)')
        .or(`created_at.gte.${weekStart},updated_at.gte.${weekStart}`)
        .not('status', 'eq', 'cancelled'),
      supabase
        .from('initiatives')
        .select('*, profiles(full_name)')
        .in('status', ['planning', 'in_progress'])
        .order('updated_at', { ascending: false })
        .limit(20),
    ])

    if (standupsRes.error) throw standupsRes.error
    if (tasksRes.error) throw tasksRes.error
    if (initiativesRes.error) throw initiativesRes.error

    const standups = standupsRes.data ?? []
    const tasks = tasksRes.data ?? []
    const initiatives = initiativesRes.data ?? []

    // ── 6. Build context text blocks
    const standupText = standups.length === 0
      ? 'No standups submitted this week.'
      : standups.map((u: {
          profiles?: { full_name?: string }
          update_date: string
          did_today: string
          blockers?: string
          plan_tomorrow?: string
        }) =>
          `• ${u.profiles?.full_name ?? 'Unknown'} (${u.update_date})\n` +
          `  Did:      ${u.did_today}\n` +
          `  Blockers: ${u.blockers || 'None'}\n` +
          `  Tomorrow: ${u.plan_tomorrow || 'N/A'}`
        ).join('\n\n')

    const tasksText = tasks.length === 0
      ? 'No active tasks this week.'
      : tasks.map((t: {
          priority: string
          title: string
          status: string
          profiles?: { full_name?: string }
        }) =>
          `• [${t.priority.toUpperCase()}] ${t.title} — ${t.status} (${t.profiles?.full_name ?? 'Unassigned'})`
        ).join('\n')

    const initiativesText = initiatives.length === 0
      ? 'No active initiatives.'
      : initiatives.map((i: {
          name: string
          status: string
          profiles?: { full_name?: string }
          target_date?: string
        }) =>
          `• ${i.name} [${i.status}] — Owner: ${i.profiles?.full_name ?? 'Unknown'}` +
          (i.target_date ? ` | Target: ${i.target_date}` : '')
        ).join('\n')

    // ── 7. Call Claude with Prompt Caching (beta)
    //    The large context block is marked cache_control: ephemeral so it is reused
    //    across calls within the same 5-minute cache window (saves input tokens).
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31',   // Enable prompt caching
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        system: [
          {
            type: 'text',
            text:
              'You are an expert operations analyst for JNH, a digital transformation consultancy. ' +
              'Your task is to generate a concise, professional weekly ops report in JSON format. ' +
              'Respond ONLY with a valid JSON object — no markdown fences, no extra text. ' +
              'The JSON must contain exactly these four keys:\n' +
              '{\n' +
              '  "standup_digest": "...",\n' +
              '  "task_progress": "...",\n' +
              '  "strategy_update": "...",\n' +
              '  "action_items_risks": "..."\n' +
              '}\n' +
              'Each value should be a well-structured, human-readable summary (2-5 short paragraphs or bullet points). ' +
              'Use **bold** for emphasis. Be factual — only reference data provided.',
          },
          {
            type: 'text',
            // ↓ This block is cached — the large data payload that rarely changes mid-run
            text:
              `=== WEEK: ${weekStart} to ${weekEnd} ===\n\n` +
              `--- TEAM STANDUPS ---\n${standupText}\n\n` +
              `--- ACTIVE TASKS ---\n${tasksText}\n\n` +
              `--- STRATEGIC INITIATIVES ---\n${initiativesText}`,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [
          {
            role: 'user',
            content: `Generate the weekly summary report for the week of ${weekStart}.`,
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

    // ── 8. Parse Claude's JSON response
    let reportContent: WeeklySummaryReport
    try {
      reportContent = JSON.parse(rawText)
      // Validate all 4 required keys are present
      const required: (keyof WeeklySummaryReport)[] = [
        'standup_digest', 'task_progress', 'strategy_update', 'action_items_risks'
      ]
      for (const key of required) {
        if (typeof reportContent[key] !== 'string') throw new Error(`Missing key: ${key}`)
      }
    } catch {
      // Fallback: store raw text in standup_digest so nothing is lost
      reportContent = {
        standup_digest: rawText,
        task_progress: 'Parse error — see standup_digest for raw output.',
        strategy_update: '',
        action_items_risks: '',
      }
    }

    // ── 9. Persist the completed summary
    const { error: updateErr } = await supabase
      .from('ai_summaries')
      .update({
        report_content: reportContent,
        content: reportContent.standup_digest,  // keep text column in sync for legacy queries
        status: 'done',
      })
      .eq('id', summaryId)

    if (updateErr) throw new Error(`Failed to save summary: ${updateErr.message}`)

    // ── 10. Return
    return jsonResponse({
      summary: reportContent,
      id: summaryId,
      week_start: weekStart,
      week_end: weekEnd,
      cached: false,
      // Expose cache stats from Anthropic if available (useful for cost tracking)
      usage: claude.usage ?? null,
    })
  } catch (err) {
    console.error('[generate-weekly-summary]', err)
    return jsonResponse({ error: (err as Error).message }, 500)
  }
})
