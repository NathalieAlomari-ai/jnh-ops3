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

    // Verify caller is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response('Unauthorized', { status: 401 })

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) return new Response('Unauthorized', { status: 401 })

    const { week_start } = await req.json()
    if (!week_start) return new Response('Missing week_start', { status: 400 })

    const weekEnd = new Date(week_start)
    weekEnd.setDate(weekEnd.getDate() + 6)
    const weekEndStr = weekEnd.toISOString().split('T')[0]

    // Fetch standups for the week
    const { data: updates, error: fetchError } = await supabase
      .from('daily_updates')
      .select('*, profiles(full_name)')
      .gte('update_date', week_start)
      .lte('update_date', weekEndStr)
      .order('update_date')
      .order('created_at')

    if (fetchError) throw fetchError

    if (!updates || updates.length === 0) {
      return new Response(
        JSON.stringify({ summary: 'No standups found for this week.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build prompt
    const standupText = updates.map((u: any) =>
      `${u.profiles.full_name} (${u.update_date}):\n` +
      `  Did: ${u.did_today}\n` +
      `  Blockers: ${u.blockers || 'None'}\n` +
      `  Plans: ${u.plan_tomorrow || 'N/A'}`
    ).join('\n\n')

    // Call Claude API
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('CLAUDE_API_KEY')!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `Summarize the following team standups for the week of ${week_start}. ` +
            `Highlight: (1) key accomplishments, (2) recurring blockers, (3) cross-team dependencies. ` +
            `Keep it concise, use bullet points. Format with clear sections.\n\n${standupText}`,
        }],
      }),
    })

    if (!claudeRes.ok) {
      const err = await claudeRes.text()
      throw new Error(`Claude API error: ${err}`)
    }

    const claude = await claudeRes.json()
    const summary = claude.content[0].text

    // Store in ai_summaries
    await supabase.from('ai_summaries').insert({
      summary_type: 'weekly_standup',
      week_start,
      content: summary,
      generated_by: user.id,
    })

    return new Response(
      JSON.stringify({ summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
