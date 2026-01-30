import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()

    // Call the correct API endpoint
    const response = await fetch('https://llm.callaback.com/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; Dashboard/1.0)',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({ message: message })
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    // Parse the SSE stream
    const responseText = await response.text()
    let fullResponse = ''
    
    // Extract response from SSE data
    const lines = responseText.split('\n')
    for (const line of lines) {
      if (line.startsWith('data: ') && !line.includes('[DONE]')) {
        try {
          const data = JSON.parse(line.slice(6))
          if (data.response) {
            fullResponse += data.response
          }
        } catch (e) {
          // Skip invalid JSON lines
        }
      }
    }

    return NextResponse.json({ 
      response: fullResponse || 'No response received'
    })

  } catch (error) {
    console.error('AI Chat API Error:', error)
    
    return NextResponse.json({ 
      response: `Echo: "${message}" (AI service temporarily unavailable - this is a fallback response)`
    })
  }
}
