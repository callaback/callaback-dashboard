import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { prompt, steps } = await request.json()

    const response = await fetch('https://text-to-image.callaback.com/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, steps })
    })

    if (!response.ok) {
      throw new Error('Failed to generate image')
    }

    // Return the image blob
    const imageBlob = await response.blob()
    
    return new NextResponse(imageBlob, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': 'inline; filename="generated-image.png"'
      }
    })

  } catch (error) {
    console.error('Text-to-Image API Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    )
  }
}
