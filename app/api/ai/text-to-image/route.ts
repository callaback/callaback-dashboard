import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { prompt, steps } = await request.json()

    const response = await fetch('https://text-to-image.callaback.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        prompt: prompt,
        num_inference_steps: steps || 20,
        model: '@cf/stabilityai/stable-diffusion-xl-base-1.0'
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    // Check if response is JSON or binary
    const contentType = response.headers.get('content-type')
    
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json()
      if (data.result && data.result.image) {
        // Convert base64 to blob
        const base64Data = data.result.image
        const binaryData = atob(base64Data)
        const bytes = new Uint8Array(binaryData.length)
        for (let i = 0; i < binaryData.length; i++) {
          bytes[i] = binaryData.charCodeAt(i)
        }
        
        return new NextResponse(bytes, {
          headers: {
            'Content-Type': 'image/png',
            'Content-Disposition': 'inline; filename="generated-image.png"'
          }
        })
      }
    }

    // If it's already a blob/binary response
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
