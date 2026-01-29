import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()

    // Try the direct API call first
    const response = await fetch('https://llm.callaback.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        message: message,
        model: '@cf/meta/llama-3-8b-instruct'
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json({ 
      response: data.response || data.message || data.result || 'No response received'
    })

  } catch (error) {
    console.error('AI Chat API Error:', error)
    return NextResponse.json(
      { response: 'Sorry, the AI service is currently unavailable. Please try again later.' },
      { status: 200 }
    )
  }
}
