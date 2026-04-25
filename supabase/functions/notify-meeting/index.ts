import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface MeetingPayload {
  title: string
  date: string   // 'yyyy-MM-dd'
  time: string   // 'HH:mm'
  notes?: string
}

interface AttendeeInput {
  id: string
  name: string
}

interface RequestBody {
  meeting: MeetingPayload
  attendees: AttendeeInput[]
}

interface AttendeeProfile {
  id: string
  name: string
  email: string | null
  whatsapp_number: string | null
}

interface NotifyResult {
  success: boolean
  emails_sent: number
  whatsapp_sent: number
  failures: { channel: string; recipient: string; reason: string }[]
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

// ─── EMAIL (Resend) ───────────────────────────────────────────────────────────

function buildEmailHtml(meeting: MeetingPayload, attendees: AttendeeProfile[]): string {
  const attendeesHtml = attendees
    .map(a => `<li style="margin:4px 0;color:#374151;">${a.name}</li>`)
    .join('')

  const notesSection = meeting.notes?.trim()
    ? `<tr><td style="padding:0 32px 24px;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:600;text-transform:uppercase;
                  letter-spacing:.05em;color:#6b7280;">Notes</p>
        <p style="margin:0;font-size:15px;color:#374151;white-space:pre-wrap;line-height:1.6;">
          ${meeting.notes}
        </p>
       </td></tr>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Meeting Scheduled</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" style="max-width:560px;background:#fff;border-radius:12px;
                               overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
      <tr>
        <td style="background:linear-gradient(135deg,#1d4ed8,#0ea5e9);padding:32px;text-align:center;">
          <p style="margin:0 0 8px;font-size:28px;">📅</p>
          <h1 style="margin:0;font-size:20px;font-weight:700;color:#fff;letter-spacing:-.01em;">
            Meeting Scheduled
          </h1>
        </td>
      </tr>
      <tr>
        <td style="padding:32px 32px 0;">
          <h2 style="margin:0;font-size:22px;font-weight:700;color:#111827;letter-spacing:-.01em;">
            ${meeting.title}
          </h2>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:10px;padding:16px 20px;">
                <table cellpadding="0" cellspacing="0"><tr>
                  <td style="padding-right:32px;">
                    <p style="margin:0 0 2px;font-size:11px;font-weight:600;text-transform:uppercase;
                              letter-spacing:.08em;color:#3b82f6;">Date</p>
                    <p style="margin:0;font-size:16px;font-weight:700;color:#1d4ed8;">${meeting.date}</p>
                  </td>
                  <td>
                    <p style="margin:0 0 2px;font-size:11px;font-weight:600;text-transform:uppercase;
                              letter-spacing:.08em;color:#3b82f6;">Time</p>
                    <p style="margin:0;font-size:16px;font-weight:700;color:#1d4ed8;">${meeting.time}</p>
                  </td>
                </tr></table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:0 32px 24px;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:600;text-transform:uppercase;
                    letter-spacing:.05em;color:#6b7280;">Attendees</p>
          <ul style="margin:0;padding-left:18px;">${attendeesHtml}</ul>
        </td>
      </tr>
      ${notesSection}
      <tr><td style="padding:0 32px;"><hr style="border:none;border-top:1px solid #e5e7eb;margin:0;"/></td></tr>
      <tr>
        <td style="padding:20px 32px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">
            This message was sent from JNH Operations Platform
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body></html>`
}

async function sendEmail(
  apiKey: string,
  fromEmail: string,
  toEmail: string,
  subject: string,
  html: string,
): Promise<{ ok: boolean; detail: string }> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: fromEmail, to: [toEmail], subject, html }),
    })
    const body = await res.json()
    if (!res.ok) return { ok: false, detail: body?.message ?? `HTTP ${res.status}` }
    return { ok: true, detail: body?.id ?? 'sent' }
  } catch (err) {
    return { ok: false, detail: (err as Error).message }
  }
}

// ─── WHATSAPP (Twilio) ────────────────────────────────────────────────────────

function buildWhatsAppMessage(meeting: MeetingPayload): string {
  const lines = [
    '📅 *Meeting Scheduled*',
    '',
    `*${meeting.title}*`,
    `📆 Date: ${meeting.date}`,
    `⏰ Time: ${meeting.time}`,
  ]
  if (meeting.notes?.trim()) {
    lines.push('', meeting.notes.trim())
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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  // ── 1. Parse and validate request body
  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const { meeting, attendees } = body

  if (!meeting?.title || !meeting?.date || !meeting?.time) {
    return jsonResponse({ error: 'meeting.title, meeting.date, and meeting.time are required' }, 400)
  }
  if (!Array.isArray(attendees) || attendees.length === 0) {
    return jsonResponse({ error: 'attendees must be a non-empty array' }, 400)
  }

  // ── 2. Read env vars
  const resendApiKey    = Deno.env.get('RESEND_API_KEY')    ?? ''
  const fromEmail       = Deno.env.get('FROM_EMAIL')        ?? ''
  const twilioSid       = Deno.env.get('TWILIO_ACCOUNT_SID')   ?? ''
  const twilioToken     = Deno.env.get('TWILIO_AUTH_TOKEN')    ?? ''
  const twilioFrom      = Deno.env.get('TWILIO_WHATSAPP_FROM') ?? ''

  // ── 3. Look up profiles for all attendee IDs
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const attendeeIds = attendees.map(a => a.id)
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, whatsapp_number')
    .in('id', attendeeIds)

  if (profilesError) {
    console.error('[notify-meeting] Failed to fetch profiles:', profilesError.message)
    return jsonResponse({ error: 'Failed to fetch attendee profiles' }, 500)
  }

  // Merge profile contact info with the name from the request
  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))
  const enriched: AttendeeProfile[] = attendees.map(a => {
    const profile = profileMap.get(a.id)
    return {
      id:               a.id,
      name:             a.name,
      email:            profile?.email            ?? null,
      whatsapp_number:  profile?.whatsapp_number  ?? null,
    }
  })

  // ── 4. Send notifications concurrently, collecting results
  const result: NotifyResult = { success: true, emails_sent: 0, whatsapp_sent: 0, failures: [] }

  const emailHtml    = buildEmailHtml(meeting, enriched)
  const whatsAppBody = buildWhatsAppMessage(meeting)
  const subject      = `Meeting Scheduled: ${meeting.title}`

  const tasks: Promise<void>[] = []

  for (const attendee of enriched) {
    // Email
    if (attendee.email && resendApiKey && fromEmail) {
      tasks.push(
        sendEmail(resendApiKey, fromEmail, attendee.email, subject, emailHtml).then(r => {
          if (r.ok) {
            result.emails_sent++
            console.log(`[notify-meeting] Email sent to ${attendee.email}`)
          } else {
            result.failures.push({ channel: 'email', recipient: attendee.email!, reason: r.detail })
            console.warn(`[notify-meeting] Email failed for ${attendee.email}: ${r.detail}`)
          }
        })
      )
    }

    // WhatsApp
    if (attendee.whatsapp_number && twilioSid && twilioToken && twilioFrom) {
      tasks.push(
        sendWhatsApp(twilioSid, twilioToken, twilioFrom, attendee.whatsapp_number, whatsAppBody).then(r => {
          if (r.ok) {
            result.whatsapp_sent++
            console.log(`[notify-meeting] WhatsApp sent to ${attendee.whatsapp_number}`)
          } else {
            result.failures.push({ channel: 'whatsapp', recipient: attendee.whatsapp_number!, reason: r.detail })
            console.warn(`[notify-meeting] WhatsApp failed for ${attendee.whatsapp_number}: ${r.detail}`)
          }
        })
      )
    }
  }

  await Promise.all(tasks)

  if (result.failures.length > 0) result.success = false

  console.log(
    `[notify-meeting] Done — emails: ${result.emails_sent}, whatsapp: ${result.whatsapp_sent}, failures: ${result.failures.length}`
  )

  return jsonResponse(result)
})
