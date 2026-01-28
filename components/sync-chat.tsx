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

  // Fetch messages for current session
  async function fetchMessages() {
    setIsLoading(true)
    
    if (activeTab === 'sms' && phoneNumber) {
      // Fetch SMS messages for this phone number
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
        
        // Extract participants from SMS
        const senders = [...new Set(smsData.map(m => m.from_number))]
        const receivers = [...new Set(smsData.map(m => m.to_number))]
        const allParticipants = [...new Set([...senders, ...receivers, identity])]
        setParticipants(allParticipants)
      }
      
    } else {
      // Fetch chat messages
      const { data: chatData, error: chatError } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true })
        .limit(100)
      
      if (!chatError && chatData) {
        setMessages(chatData)
        // Update participants from message senders
        const senders = [...new Set(chatData.map((m) => m.sender_identity))]
        setParticipants([...new Set([identity, ...senders])])
      }
    }
    
    setIsLoading(false)
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
        // Don't add to local state - let real-time subscription handle it
        await fetchMessages() // Refresh to get the sent message
      }
    } catch (error) {
      console.error("Error sending SMS:", error)
    }
  }

  // Send chat message
  async function sendChatMessage(message: string) {
    const { error } = await supabase.from("chat_messages").insert({
      session_id: sessionId,
      sender_identity: identity,
      message: message.trim(),
    })

    if (!error) {
      setNewMessage("")
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
      await sendChatMessage(newMessage)
    }
  }

  useEffect(() => {
    fetchMessages()

    // Subscribe to real-time messages
    let channel
    
    if (activeTab === 'chat') {
      channel = supabase
        .channel(`chat-${sessionId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_messages",
            filter: `session_id=eq.${sessionId}`,
          },
          (payload) => {
            const newMsg = payload.new as Message
            setMessages((prev) => {
              // Avoid duplicates
              if (prev.find(m => m.id === newMsg.id)) return prev
              return [...prev, newMsg]
            })
            if (!participants.includes(newMsg.sender_identity)) {
              setParticipants((prev) => [...new Set([...prev, newMsg.sender_identity])])
            }
          }
        )
        .subscribe()
    } else if (activeTab === 'sms' && phoneNumber) {
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`
      
      channel = supabase
        .channel(`sms-${formattedPhone}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "interactions",
          },
          (payload) => {
            const newInteraction = payload.new
            if (newInteraction.type === 'sms' && 
                (newInteraction.from_number === formattedPhone || 
                 newInteraction.to_number === formattedPhone)) {
              const newMsg: Message = {
                id: newInteraction.id,
                sender_identity: newInteraction.from_number,
                message: newInteraction.body || "",
                created_at: newInteraction.created_at,
                session_id: `sms-${newInteraction.from_number.replace('+', '')}`,
                metadata: {
                  type: 'sms',
                  direction: newInteraction.direction,
                  twilio_sid: newInteraction.twilio_sid,
                  to_number: newInteraction.to_number
                },
                source: 'sms'
              }
              
              setMessages((prev) => {
                if (prev.find(m => m.id === newMsg.id)) return prev
                return [...prev, newMsg]
              })
              
              const newParticipants = [
                newInteraction.from_number,
                newInteraction.to_number,
                ...participants
              ]
              setParticipants([...new Set(newParticipants)])
            }
          }
        )
        .subscribe()
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [sessionId, activeTab, phoneNumber])

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

  const getMessageIcon = (message: Message) => {
    if (message.metadata?.type === 'sms') {
      return <Smartphone className="h-3 w-3 mr-1" />
    }
    return null
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
            <Badge variant="outline" className="gap-1">
              <Users className="h-3 w-3" />
              {participants.length}
            </Badge>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchMessages}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'chat' | 'sms')} className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chat">Web Chat</TabsTrigger>
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
                const isInbound = message.metadata?.direction === 'inbound'
                
                return (
                  <div
                    key={`${message.id}-${message.created_at}`}
                    className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {getMessageIcon(message)}
                      <span className="text-xs text-muted-foreground">
                        {isSMS ? (
                          <>
                            {message.sender_identity}
                            {isInbound ? ' → You' : ' → You'}
                          </>
                        ) : (
                          message.sender_identity
                        )}
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
                          : isSMS && isInbound
                          ? "bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100"
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
          <Button size="icon" onClick={handleSend} disabled={!newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
