import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface TaskPayload {
  title: string
  description?: string | null
  priority: string
  due_date?: string | null
}

interface PersonRef {
  id: string
  name: string
}

interface RequestBody {
  task: TaskPayload
  assignee: PersonRef
  assigned_by: PersonRef
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// ─── WHATSAPP (Twilio) ────────────────────────────────────────────────────────

function buildWhatsAppMessage(task: TaskPayload, assignedBy: PersonRef): string {
  const lines = [
    '📋 *New Task Assigned*',
    '',
    `You have a new task from *${assignedBy.name}*:`,
    '',
    `*${task.title}*`,
    `⚡ Priority: ${task.priority}`,
  ]
  if (task.due_date) {
    lines.push(`📅 Due: ${task.due_date}`)
  }
  if (task.description?.trim()) {
    lines.push('', task.description.trim())
  }
  lines.push('', '_Sent from JNH Ops Platform_')
  return lines.join('\n')
}

async function sendWhatsApp(
  accountSid: string,
  authToken: string,
  fromNumber: string,
  toNumber: string,
  body: string,
): Promise<{ ok: boolean; detail: string }> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
  const credentials = btoa(`${accountSid}:${authToken}`)

  const params = new URLSearchParams({
    From: `whatsapp:${fromNumber}`,
    To:   `whatsapp:${toNumber}`,
    Body: body,
  })

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type':  'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })
    const data = await res.json()
    if (!res.ok) return { ok: false, detail: data?.message ?? `HTTP ${res.status}` }
    return { ok: true, detail: data?.sid ?? 'sent' }
  } catch (err) {
    return { ok: false, detail: (err as Error).message }
  }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const { task, assignee, assigned_by } = body

  if (!task?.title || !assignee?.id) {
    return jsonResponse({ error: 'task.title and assignee.id are required' }, 400)
  }

  const twilioSid   = Deno.env.get('TWILIO_ACCOUNT_SID')    ?? ''
  const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN')     ?? ''
  const twilioFrom  = Deno.env.get('TWILIO_WHATSAPP_FROM')  ?? ''

  if (!twilioSid || !twilioToken || !twilioFrom) {
    console.warn('[notify-task] Twilio env vars not configured — skipping WhatsApp')
    return jsonResponse({ success: true, whatsapp_sent: 0, skipped: true })
  }

  // Look up assignee's WhatsApp number
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('whatsapp_number')
    .eq('id', assignee.id)
    .single()

  if (profileError) {
    console.error('[notify-task] Failed to fetch assignee profile:', profileError.message)
    return jsonResponse({ error: 'Failed to fetch assignee profile' }, 500)
  }

  if (!profile?.whatsapp_number) {
    console.log(`[notify-task] Assignee ${assignee.name} has no WhatsApp number — skipping`)
    return jsonResponse({ success: true, whatsapp_sent: 0, skipped: true })
  }

  const message = buildWhatsAppMessage(task, assigned_by)
  const result = await sendWhatsApp(twilioSid, twilioToken, twilioFrom, profile.whatsapp_number, message)

  if (result.ok) {
    console.log(`[notify-task] WhatsApp sent to ${assignee.name} (${profile.whatsapp_number})`)
    return jsonResponse({ success: true, whatsapp_sent: 1 })
  } else {
    console.warn(`[notify-task] WhatsApp failed for ${assignee.name}: ${result.detail}`)
    return jsonResponse({ success: false, whatsapp_sent: 0, error: result.detail }, 500)
  }
})
