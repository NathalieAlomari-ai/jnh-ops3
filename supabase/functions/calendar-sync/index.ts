import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Called by n8n every 15 minutes with calendar events payload.
// Matches events to team profiles by email and can optionally
// update initiative dates or create meeting records.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CalendarEvent {
  title: string
  start: string       // ISO datetime
  end: string         // ISO datetime
  attendees: string[] // email addresses
  meeting_url?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const n8nSecret = req.headers.get('x-n8n-secret')
  if (n8nSecret !== Deno.env.get('N8N_WEBHOOK_SECRET')) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { events }: { events: CalendarEvent[] } = await req.json()

  // Fetch all team profiles to match attendees by email
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name')

  const profileByEmail = Object.fromEntries(
    (profiles ?? []).map((p: any) => [p.email.toLowerCase(), p])
  )

  const results = []
  for (const event of events ?? []) {
    const matchedAttendees = event.attendees
      .map(e => profileByEmail[e.toLowerCase()])
      .filter(Boolean)

    results.push({
      event: event.title,
      start: event.start,
      matched_attendees: matchedAttendees.map((p: any) => p.full_name),
    })
  }

  console.log('Calendar sync processed:', results.length, 'events')

  return new Response(
    JSON.stringify({ success: true, processed: results }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
