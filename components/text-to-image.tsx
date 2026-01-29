"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Image, Download } from "lucide-react"

export function TextToImage() {
  const [prompt, setPrompt] = useState("")
  const [steps, setSteps] = useState(20)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)

  const generateImage = async () => {
    if (!prompt.trim() || isGenerating) return

    setIsGenerating(true)
    setGeneratedImage(null)

    try {
      const response = await fetch('/api/ai/text-to-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: prompt.trim(),
          steps: steps 
        })
      })

      if (response.ok) {
        const contentType = response.headers.get('content-type')
        
        if (contentType && contentType.includes('image')) {
          const blob = await response.blob()
          const imageUrl = URL.createObjectURL(blob)
          setGeneratedImage(imageUrl)
        } else {
          // Handle JSON error response
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to generate image')
        }
      } else {
        throw new Error(`HTTP ${response.status}: Failed to generate image`)
      }
    } catch (error) {
      console.error('Error generating image:', error)
      alert(`Failed to generate image: ${error.message}. Please try again.`)
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadImage = () => {
    if (!generatedImage) return

    const link = document.createElement('a')
    link.href = generatedImage
    link.download = `generated-image-${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 shrink-0">
        <CardTitle className="text-lg flex items-center gap-2">
          <Image className="h-5 w-5" />
          Text to Image
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0 gap-4">
        <div className="space-y-3">
          <div>
            <Label htmlFor="prompt">Prompt</Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image you want to generate..."
              className="resize-none"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="steps">Number of Steps (1-50)</Label>
            <Input
              id="steps"
              type="number"
              min="1"
              max="50"
              value={steps}
              onChange={(e) => setSteps(parseInt(e.target.value) || 20)}
              className="w-24"
            />
          </div>

          <Button
            onClick={generateImage}
            disabled={!prompt.trim() || isGenerating}
            className="w-full"
          >
            {isGenerating ? 'Generating...' : 'Generate Image'}
          </Button>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          {isGenerating ? (
            <div className="flex-1 flex items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Generating your image...</p>
              </div>
            </div>
          ) : generatedImage ? (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 flex items-center justify-center min-h-0">
                <img
                  src={generatedImage}
                  alt="Generated image"
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              </div>
              <Button
                onClick={downloadImage}
                variant="outline"
                className="mt-3 gap-2"
              >
                <Download className="h-4 w-4" />
                Download Image
              </Button>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg">
              <p className="text-sm text-muted-foreground">Generated image will appear here</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
