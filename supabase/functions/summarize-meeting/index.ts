import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

// ─── CORS ─────────────────────────────────────────────────────────────────────
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) return jsonResponse({ error: 'ANTHROPIC_API_KEY not configured' }, 500)

    const { notes, meeting_title } = await req.json()

    if (!notes || typeof notes !== 'string') {
      return jsonResponse({ error: 'notes is required' }, 400)
    }

    const title = meeting_title ?? 'team meeting'

    const prompt =
      `You are analyzing notes from a team meeting titled '${title}'. ` +
      `Summarize the following notes into three sections: ` +
      `1) Key Decisions Made 2) Action Items (with owners if mentioned) 3) Next Steps. ` +
      `Be concise. Notes: ${notes}\n\n` +
      `Respond ONLY with a valid JSON object — no markdown fences, no extra text. ` +
      `The JSON must have exactly these three keys:\n` +
      `{ "key_decisions": "...", "action_items": "...", "next_steps": "..." }`

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      throw new Error(`Claude API error (${claudeRes.status}): ${errText}`)
    }

    const claude = await claudeRes.json()
    const rawText: string = claude.content?.[0]?.text ?? ''

    let result: { key_decisions: string; action_items: string; next_steps: string }
    try {
      result = JSON.parse(rawText)
      if (
        typeof result.key_decisions !== 'string' ||
        typeof result.action_items !== 'string' ||
        typeof result.next_steps !== 'string'
      ) {
        throw new Error('Missing required keys')
      }
    } catch {
      // Fallback: put the raw text in key_decisions
      result = {
        key_decisions: rawText,
        action_items: 'Could not parse structured response.',
        next_steps: '',
      }
    }

    return jsonResponse(result)
  } catch (err) {
    console.error('[summarize-meeting]', err)
    return jsonResponse({ error: (err as Error).message }, 500)
  }
})
