import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { prompt, steps } = await request.json()

    const url = `https://text-to-image.callaback.com/generate?prompt=${encodeURIComponent(prompt || 'cyberpunk cat')}&num_steps=${steps || 20}`
    
    console.log('Calling image API:', url)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Dashboard/1.0)',
        'Accept': 'image/png,image/*,*/*'
      }
    })

    console.log('Image API Response:', response.status, response.headers.get('content-type'))

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Image API Error:', errorText)
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    const imageBlob = await response.blob()
    console.log('Image blob size:', imageBlob.size)
    
    return new NextResponse(imageBlob, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': 'inline; filename="generated-image.png"'
      }
    })

  } catch (error) {
    console.error('Text-to-Image API Error:', error)
    return NextResponse.json(
      { error: `Failed to generate image: ${error.message}` },
      { status: 500 }
    )
  }
}
