// Route Handlers are not cached by default — every generation hits the model fresh.
export async function POST(request) {
  try {
    const body = await request.json()
    const { prompt, system } = body

    if (!prompt || typeof prompt !== 'string') {
      return Response.json({ text: '', error: 'Missing prompt' }, { status: 400 })
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json({ text: '', error: 'AI is not configured' }, { status: 503 })
    }

    // Clamp tokens — rich 12-slide reports need a large budget, single edits need little.
    const maxTokens = Math.min(Math.max(Number(body.max_tokens) || 1200, 256), 16000)

    const messages = [{ role: 'user', content: prompt }]
    const payload = {
      model: 'claude-sonnet-4-5',
      max_tokens: maxTokens,
      messages,
    }
    if (system && typeof system === 'string') payload.system = system

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
    })

    const data = await res.json()

    if (!res.ok) {
      const message = data?.error?.message || 'AI request failed'
      return Response.json({ text: '', error: message }, { status: res.status })
    }

    const text = Array.isArray(data?.content)
      ? data.content.filter(b => b?.type === 'text').map(b => b.text).join('')
      : (data?.content?.[0]?.text ?? '')

    return Response.json({ text })
  } catch (error) {
    return Response.json({ text: '', error: error?.message || 'Server error' }, { status: 500 })
  }
}
