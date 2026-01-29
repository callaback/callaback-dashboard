import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { prompt, steps } = await request.json()

    const url = new URL('https://text-to-image.callaback.com/generate')
    url.searchParams.set('prompt', prompt || 'cyberpunk cat')
    url.searchParams.set('num_steps', (steps || 20).toString())

    const response = await fetch(url.toString(), {
      method: 'GET'
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

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
      { error: 'Failed to generate image. Please try again.' },
      { status: 500 }
    )
  }
}
