import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response('Unauthorized', { status: 401 })

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) return new Response('Unauthorized', { status: 401 })

    const { outreach_id } = await req.json()
    if (!outreach_id) return new Response('Missing outreach_id', { status: 400 })

    // Fetch outreach record
    const { data: outreach, error: fetchError } = await supabase
      .from('shm_outreach')
      .select('*, profiles(full_name)')
      .eq('id', outreach_id)
      .single()

    if (fetchError || !outreach) return new Response('Outreach record not found', { status: 404 })

    // Build prompt
    const prompt = `Draft a professional, concise outreach email for the following context:

Contact: ${outreach.contact_name}
Company: ${outreach.company}
${outreach.contact_email ? `Email: ${outreach.contact_email}` : ''}
Pipeline Stage: ${outreach.stage.replace('_', ' ')}
${outreach.notes ? `Previous Notes: ${outreach.notes}` : ''}
${outreach.last_contact_date ? `Last Contact: ${outreach.last_contact_date}` : ''}
Sender: ${(outreach as { profiles: { full_name: string } }).profiles.full_name}

Write a professional email that:
- Is warm but direct
- References the current stage context naturally
- Has a clear, specific call-to-action
- Is no longer than 150 words
- Includes a subject line at the top (format: "Subject: ...")

Output only the email text.`

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('CLAUDE_API_KEY')!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!claudeRes.ok) {
      const err = await claudeRes.text()
      throw new Error(`Claude API error: ${err}`)
    }

    const claude = await claudeRes.json()
    const draft = claude.content[0].text

    // Store draft
    await supabase.from('ai_summaries').insert({
      summary_type: 'outreach_draft',
      reference_id: outreach_id,
      content: draft,
      generated_by: user.id,
    })

    return new Response(
      JSON.stringify({ draft }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
