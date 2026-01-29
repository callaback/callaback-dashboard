"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { MessageCircle, Send } from "lucide-react"

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export function AIChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input })
      })

      const data = await response.json()
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response || data.message || 'Sorry, I could not process your request.',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Error connecting to AI service. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 shrink-0">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          AI Chat
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0 gap-3">
        <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Start a conversation with the AI assistant
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground ml-8'
                    : 'bg-muted mr-8'
                }`}
              >
                <div className="text-sm">{message.content}</div>
                <div className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="bg-muted p-3 rounded-lg mr-8">
              <div className="text-sm">AI is thinking...</div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            className="resize-none"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            size="sm"
            className="self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
