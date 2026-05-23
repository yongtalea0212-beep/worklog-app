export async function POST(request) {
  try {
    const { prompt } = await request.json()

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    const data = await res.json()
    
    // debug: log ทั้งก้อนเพื่อดูว่า structure เป็นยังไง
    console.log('Anthropic raw response:', JSON.stringify(data))
    
    const text = data?.content?.[0]?.text ?? ''
    console.log('Extracted text:', text)
    
    return Response.json({ text })

  } catch (error) {
    console.error('Route error:', error)
    return Response.json({ text: '' }, { status: 500 })
  }
}