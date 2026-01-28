"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Users, Copy, Check, MessageSquare, RefreshCw, Phone, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@/lib/supabase/client"

// Import Twilio Sync
declare global {
  interface Window {
    Twilio: any;
  }
}

interface Message {
  id: string
  sender_identity: string
  message: string
  created_at: string
  session_id: string
  metadata?: {
    type?: string
    direction?: string
    twilio_sid?: string
    to_number?: string
  }
  source?: 'chat' | 'sms'
}

interface SyncChatProps {
  sessionId: string
  identity: string
  phoneNumber?: string
  onSessionChange?: (sessionId: string) => void
}

export function SyncChat({ sessionId, identity, phoneNumber, onSessionChange }: SyncChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [participants, setParticipants] = useState<string[]>([identity])
  const [copied, setCopied] = useState(false)
  const [editingSession, setEditingSession] = useState(false)
  const [tempSessionId, setTempSessionId] = useState(sessionId)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'chat' | 'sms'>('chat')
  const [syncClient, setSyncClient] = useState<any>(null)
  const [syncDocument, setSyncDocument] = useState<any>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const scrollRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const supabase = createClient()

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Initialize Twilio Sync
  useEffect(() => {
    const initializeSync = async () => {
      try {
        // Get Twilio token from your API
        const response = await fetch('/api/twilio/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identity })
        })
        
        if (!response.ok) throw new Error('Failed to get token')
        
        const { token } = await response.json()
        
        // Load Twilio SDK if not already loaded
        if (!window.Twilio) {
          const script = document.createElement('script')
          script.src = 'https://sdk.twilio.com/js/sync/releases/3.0.0/twilio-sync.min.js'
          script.onload = () => initializeSyncClient(token)
          script.onerror = () => {
            console.error('Failed to load Twilio SDK')
            setConnectionStatus('disconnected')
          }
          document.head.appendChild(script)
        } else {
          initializeSyncClient(token)
        }
      } catch (error) {
        console.error('Failed to initialize Sync:', error)
        setConnectionStatus('disconnected')
      }
    }

    const initializeSyncClient = async (token: string) => {
      try {
        const client = new window.Twilio.Sync.Client(token)
        setSyncClient(client)
        
        client.on('connectionStateChanged', (state: string) => {
          console.log('Sync connection state:', state)
          setConnectionStatus(state === 'connected' ? 'connected' : 'disconnected')
        })

        client.on('tokenAboutToExpire', async () => {
          console.log('Token about to expire, refreshing...')
          try {
            const response = await fetch('/api/twilio/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ identity })
            })
            const { token: newToken } = await response.json()
            client.updateToken(newToken)
          } catch (error) {
            console.error('Failed to refresh token:', error)
          }
        })

        // Open or create sync document for this session
        const docName = `chat-${sessionId}`
        console.log('Opening sync document:', docName)
        const document = await client.document(docName)
        setSyncDocument(document)
        
        // Load existing messages
        const data = document.value || { messages: [], participants: [identity] }
        setMessages(data.messages || [])
        setParticipants(data.participants || [identity])
        
        // Listen for updates
        document.on('updated', (event: any) => {
          console.log('Document updated:', event.value)
          const { messages: newMessages, participants: newParticipants } = event.value
          setMessages(newMessages || [])
          setParticipants(newParticipants || [identity])
        })
        
        setConnectionStatus('connected')
        setIsLoading(false)
        
      } catch (error) {
        console.error('Sync client error:', error)
        setConnectionStatus('disconnected')
        setIsLoading(false)
      }
    }

    if (activeTab === 'chat') {
      initializeSync()
    } else {
      fetchSMSMessages()
    }

    return () => {
      if (syncClient) {
        syncClient.shutdown()
      }
    }
  }, [sessionId, identity, activeTab])

  // Fetch SMS messages (fallback for SMS tab)
  async function fetchSMSMessages() {
    setIsLoading(true)
    
    if (phoneNumber) {
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`
      
      const { data: smsData, error: smsError } = await supabase
        .from("interactions")
        .select("*")
        .or(`and(from_number.eq.${formattedPhone},type.eq.sms),and(to_number.eq.${formattedPhone},type.eq.sms)`)
        .order("created_at", { ascending: true })
        .limit(100)
      
      if (!smsError && smsData) {
        const smsMessages: Message[] = smsData.map(sms => ({
          id: sms.id,
          sender_identity: sms.from_number,
          message: sms.body || "",
          created_at: sms.created_at,
          session_id: `sms-${sms.from_number.replace('+', '')}`,
          metadata: {
            type: 'sms',
            direction: sms.direction,
            twilio_sid: sms.twilio_sid,
            to_number: sms.to_number
          },
          source: 'sms'
        }))
        
        setMessages(smsMessages)
        
        const senders = [...new Set(smsData.map(m => m.from_number))]
        const receivers = [...new Set(smsData.map(m => m.to_number))]
        const allParticipants = [...new Set([...senders, ...receivers, identity])]
        setParticipants(allParticipants)
      }
    }
    
    setIsLoading(false)
  }

  // Send message via Twilio Sync
  const sendSyncMessage = async (message: string) => {
    if (!syncDocument) {
      console.error('No sync document available')
      return
    }

    const newMsg: Message = {
      id: `${Date.now()}-${Math.random()}`,
      sender_identity: identity,
      message: message.trim(),
      created_at: new Date().toISOString(),
      session_id: sessionId,
      source: 'chat'
    }

    try {
      console.log('Sending sync message:', newMsg)
      const currentData = syncDocument.value || { messages: [], participants: [identity] }
      const updatedMessages = [...(currentData.messages || []), newMsg]
      const updatedParticipants = [...new Set([...(currentData.participants || []), identity])]
      
      await syncDocument.set({
        messages: updatedMessages,
        participants: updatedParticipants
      })
      
      console.log('Message sent successfully')
      setNewMessage("")
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  // Send SMS message
  async function sendSMS(to: string, message: string) {
    try {
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: to,
          message: message,
          from: phoneNumber
        })
      })
      
      if (response.ok) {
        setNewMessage("")
        await fetchSMSMessages()
      }
    } catch (error) {
      console.error("Error sending SMS:", error)
    }
  }

  const handleSend = async () => {
    if (!newMessage.trim()) return

    if (activeTab === 'sms' && phoneNumber) {
      const recipient = participants.find(p => p !== identity && p.includes('+'))
      if (recipient) {
        await sendSMS(recipient, newMessage.trim())
      } else {
        alert("Please select a recipient for SMS")
      }
    } else {
      await sendSyncMessage(newMessage)
    }
  }

  const copySessionLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}?session=${sessionId}&identity=guest`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSessionChange = () => {
    if (tempSessionId && tempSessionId !== sessionId) {
      onSessionChange?.(tempSessionId)
    }
    setEditingSession(false)
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const getConnectionBadge = () => {
    const colors = {
      connecting: 'bg-yellow-500',
      connected: 'bg-green-500',
      disconnected: 'bg-red-500'
    }
    
    return (
      <div className="flex items-center gap-1">
        <div className={`w-2 h-2 rounded-full ${colors[connectionStatus]}`} />
        <span className="text-xs capitalize">{connectionStatus}</span>
      </div>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Sync Chat
          </CardTitle>
          <div className="flex items-center gap-2">
            {activeTab === 'chat' && getConnectionBadge()}
            <Badge variant="outline" className="gap-1">
              <Users className="h-3 w-3" />
              {participants.length}
            </Badge>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={activeTab === 'sms' ? fetchSMSMessages : undefined}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'chat' | 'sms')} className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chat">Sync Chat</TabsTrigger>
            <TabsTrigger value="sms" disabled={!phoneNumber}>
              <Smartphone className="h-3 w-3 mr-2" />
              SMS
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex items-center gap-2 mt-2">
          {editingSession ? (
            <div className="flex items-center gap-2 flex-1">
              <Input
                value={tempSessionId}
                onChange={(e) => setTempSessionId(e.target.value)}
                placeholder="Session ID"
                className="h-8 text-sm"
              />
              <Button size="sm" variant="default" onClick={handleSessionChange}>
                <Check className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <div className="flex-1 text-sm">
                <span className="text-muted-foreground">
                  {activeTab === 'sms' ? 'Phone:' : 'Session:'}
                </span>{" "}
                <button
                  onClick={() => setEditingSession(true)}
                  className="font-mono text-primary hover:underline"
                >
                  {activeTab === 'sms' ? phoneNumber || 'No phone' : sessionId}
                </button>
              </div>
              <Button size="sm" variant="outline" onClick={copySessionLink} className="h-8 bg-transparent">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-1 mt-2">
          {participants.map((p) => (
            <Badge
              key={p}
              variant={p === identity ? "default" : "secondary"}
              className="text-xs"
            >
              {p.includes('+') ? <Phone className="h-3 w-3 mr-1" /> : null}
              {p}
              {p === identity && " (you)"}
            </Badge>
          ))}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0 p-4">
        <div className="flex-1 overflow-y-auto mb-3" ref={scrollRef}>
          <div className="space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Loading messages...
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No messages yet</p>
                <p className="text-xs mt-1">
                  {activeTab === 'sms' ? 'Send an SMS to get started!' : 'Start the conversation!'}
                </p>
              </div>
            ) : (
              messages.map((message) => {
                const isOwn = message.sender_identity === identity
                const isSMS = message.metadata?.type === 'sms'
                
                return (
                  <div
                    key={`${message.id}-${message.created_at}`}
                    className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {isSMS && <Smartphone className="h-3 w-3" />}
                      <span className="text-xs text-muted-foreground">
                        {message.sender_identity}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(message.created_at)}
                      </span>
                      {isSMS && (
                        <Badge variant="outline" className="text-xs h-4 px-1">
                          SMS
                        </Badge>
                      )}
                    </div>
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                        isOwn
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {message.message}
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-3 border-t border-border shrink-0">
          <Input
            placeholder={
              activeTab === 'sms'
                ? `Type SMS to ${participants.find(p => p !== identity && p.includes('+')) || 'recipient'}...`
                : "Type a message..."
            }
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="flex-1"
          />
          <Button 
            size="icon" 
            onClick={handleSend} 
            disabled={!newMessage.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

