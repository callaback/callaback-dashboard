import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()

    // Try different API patterns
    const attempts = [
      // Pattern 1: Direct POST to root
      {
        url: 'https://llm.callaback.com',
        method: 'POST',
        body: JSON.stringify({ message })
      },
      // Pattern 2: Form data
      {
        url: 'https://llm.callaback.com',
        method: 'POST',
        body: new URLSearchParams({ message }).toString(),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      },
      // Pattern 3: Query parameter
      {
        url: `https://llm.callaback.com?message=${encodeURIComponent(message)}`,
        method: 'GET'
      }
    ]

    for (const attempt of attempts) {
      try {
        const response = await fetch(attempt.url, {
          method: attempt.method,
          headers: {
            'Content-Type': 'application/json',
            ...attempt.headers
          },
          body: attempt.body
        })

        if (response.ok) {
          const text = await response.text()
          
          // Try to parse as JSON first
          try {
            const data = JSON.parse(text)
            return NextResponse.json({ 
              response: data.response || data.message || data.result || text
            })
          } catch {
            // If not JSON, return as text
            return NextResponse.json({ response: text })
          }
        }
      } catch (error) {
        console.log(`Attempt failed:`, error.message)
        continue
      }
    }

    // If all attempts fail, return a fallback
    return NextResponse.json({ 
      response: `I received your message: "${message}". However, I'm currently unable to connect to the AI service. Please try again later.`
    })

  } catch (error) {
    console.error('AI Chat API Error:', error)
    return NextResponse.json(
      { response: 'Sorry, the AI service is currently unavailable. Please try again later.' },
      { status: 200 }
    )
  }
}
