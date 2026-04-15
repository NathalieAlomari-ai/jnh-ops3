import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

// Called by n8n to dispatch Slack or email notifications.
// n8n handles the actual Slack/email sending; this function is a
// validated proxy that confirms the request came from an authorized source.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationPayload {
  channel: 'slack' | 'email'
  message: string
  recipients?: string[]
  slack_channel?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Validate n8n secret
  const n8nSecret = req.headers.get('x-n8n-secret')
  if (n8nSecret !== Deno.env.get('N8N_WEBHOOK_SECRET')) {
    return new Response('Unauthorized', { status: 401 })
  }

  const payload: NotificationPayload = await req.json()

  // This function acknowledges the request.
  // n8n reads the response and handles the actual dispatch.
  console.log('Notification dispatched:', JSON.stringify(payload))

  return new Response(
    JSON.stringify({ success: true, received: payload }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
