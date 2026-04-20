/**
 * n8n Webhook Integration
 * Set VITE_N8N_WEBHOOK_URL in your .env.local to activate.
 * All calls are fire-and-forget — failures are logged but never block the UI.
 */

const WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL as string | undefined

// ─── Payload Types ────────────────────────────────────────────────────────────

export interface MeetingScheduledPayload {
  event: 'meeting.scheduled'
  meeting: {
    id: string
    title: string
    date: string
    time: string
    notes: string
    created_at: string
  }
  attendees: { id: string; name: string }[]
}

export interface TaskAssignedPayload {
  event: 'task.assigned'
  task: {
    title: string
    description: string | null
    status: string
    priority: string
    due_date: string | null
  }
  assignee: {
    id: string
    name: string
  }
}

export type WebhookPayload = MeetingScheduledPayload | TaskAssignedPayload

// ─── Core trigger ────────────────────────────────────────────────────────────

export async function triggerWebhook(payload: WebhookPayload): Promise<void> {
  if (!WEBHOOK_URL) {
    console.info('[n8n] VITE_N8N_WEBHOOK_URL not set — skipping webhook for', payload.event)
    return
  }
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, source: 'jnh-ops-platform' }),
    })
    if (!res.ok) {
      console.warn('[n8n] Webhook responded with status', res.status)
    }
  } catch (err) {
    // Non-blocking — user experience must never degrade due to webhook failures
    console.error('[n8n] Webhook request failed:', err)
  }
}
