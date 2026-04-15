import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface WeeklySummaryReport {
  standup_digest: string
  task_progress: string
  strategy_update: string
  action_items_risks: string
}

interface N8nWebhookResponse {
  success: true
  week_start: string
  week_end: string
  cached: boolean
  id: string
  report: {
    standup_digest: string
    task_progress: string
    strategy_update: string
    action_items_risks: string
  }
  generated_at: string
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function getCurrentWeekBounds(): { weekStart: string; weekEnd: string } {
  const now = new Date()
  const day = now.getDay()          // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    weekStart: monday.toISOString().split('T')[0],
    weekEnd: sunday.toISOString().split('T')[0],
  }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
serve(async (req) => {
  // ── Only accept POST
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  // ── 1. Validate the shared secret
  //    n8n should send: Authorization: Bearer <N8N_WEBHOOK_SECRET>
  const webhookSecret = Deno.env.get('N8N_WEBHOOK_SECRET')
  if (!webhookSecret) {
    console.error('[n8n-webhook] N8N_WEBHOOK_SECRET secret is not set')
    return jsonResponse({ error: 'Server misconfiguration' }, 500)
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  if (authHeader !== `Bearer ${webhookSecret}`) {
    console.warn('[n8n-webhook] Rejected request — invalid or missing Authorization header')
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { weekStart, weekEnd } = getCurrentWeekBounds()

    // ── 2. Idempotency check — return the cached summary if it already exists
    //    This handles cases where the cron fires twice or the user already generated manually.
    const { data: existing } = await supabase
      .from('ai_summaries')
      .select('id, report_content, week_start, week_end, created_at, status')
      .eq('summary_type', 'weekly_standup')
      .eq('week_start', weekStart)
      .eq('status', 'done')
      .maybeSingle()

    if (existing?.report_content) {
      const report = existing.report_content as WeeklySummaryReport
      const responsePayload: N8nWebhookResponse = {
        success: true,
        week_start: existing.week_start,
        week_end: existing.week_end ?? weekEnd,
        cached: true,
        id: existing.id,
        report,
        generated_at: existing.created_at,
      }
      console.log(`[n8n-webhook] Returning cached summary ${existing.id} for week ${weekStart}`)
      return jsonResponse(responsePayload)
    }

    // ── 3. Delegate to generate-weekly-summary function
    //    We call it directly via a supabase.functions.invoke-equivalent HTTP call
    //    using the shared secret as auth, so generate-weekly-summary doesn't require a user JWT.
    const generateUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-weekly-summary`

    console.log(`[n8n-webhook] Invoking generate-weekly-summary for week ${weekStart}`)
    const genRes = await fetch(generateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Pass the same secret so generate-weekly-summary accepts this as an n8n trigger
        'Authorization': `Bearer ${webhookSecret}`,
      },
      body: JSON.stringify({
        week_start: weekStart,
        triggered_by: 'n8n',
      }),
    })

    if (!genRes.ok) {
      const errBody = await genRes.text()
      console.error(`[n8n-webhook] generate-weekly-summary failed (${genRes.status}): ${errBody}`)
      return jsonResponse({
        error: `Summary generation failed: ${errBody}`,
        week_start: weekStart,
      }, 502)
    }

    const genData = await genRes.json()

    // ── 4. Shape the response for n8n
    //    n8n can map these fields directly into WhatsApp / Gmail templates.
    const report = genData.summary as WeeklySummaryReport
    const now = new Date().toISOString()

    const responsePayload: N8nWebhookResponse = {
      success: true,
      week_start: weekStart,
      week_end: weekEnd,
      cached: genData.cached ?? false,
      id: genData.id,
      report,
      generated_at: now,
    }

    console.log(`[n8n-webhook] Summary ${genData.id} ready for week ${weekStart}`)
    return jsonResponse(responsePayload)
  } catch (err) {
    console.error('[n8n-webhook] Unhandled error:', err)
    return jsonResponse({ error: (err as Error).message }, 500)
  }
})
