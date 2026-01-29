import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()

    // Simple direct POST to the service
    const response = await fetch('https://llm.callaback.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; Dashboard/1.0)',
        'Accept': '*/*'
      },
      body: JSON.stringify({ message: message })
    })

    const responseText = await response.text()
    console.log('Chat API Response:', response.status, responseText)

    if (response.ok) {
      // Try to parse as JSON
      try {
        const data = JSON.parse(responseText)
        return NextResponse.json({ 
          response: data.response || data.message || data.result || responseText
        })
      } catch {
        // Return as plain text if not JSON
        return NextResponse.json({ response: responseText })
      }
    } else {
      throw new Error(`HTTP ${response.status}: ${responseText}`)
    }

  } catch (error) {
    console.error('AI Chat API Error:', error)
    
    // Return a more helpful error message
    return NextResponse.json({ 
      response: `Echo: "${message}" (AI service temporarily unavailable - this is a fallback response)`
    })
  }
}
