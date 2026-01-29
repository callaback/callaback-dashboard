"use client"

import { useState, useCallback, useEffect } from "react"
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, Delete, User, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn, formatPhoneNumber as formatPhoneNumberUtil, formatDuration as formatDurationUtil } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useConfetti } from "@/hooks/useConfetti"

interface Contact {
  id: string
  name: string
  phone: string
  client_id?: string
}

interface PhoneDialerProps {
  twilioNumber: string
  contacts?: Contact[]
  onSelectContact?: (contact: Contact) => void
  onMakeCall?: (phoneNumber: string, contact?: Contact) => void
  onEndCall?: () => void
  isCallActive?: boolean
  callDuration?: number
  currentCall?: {
    to: string
    contact?: Contact
    status: "ringing" | "in-progress" | "ended"
  }
}

export function PhoneDialer({ 
  twilioNumber, 
  contacts = [], 
  onSelectContact,
  onMakeCall,
  onEndCall,
  isCallActive: externalIsCallActive,
  callDuration: externalCallDuration,
  currentCall
}: PhoneDialerProps) {
  const [phoneNumber, setPhoneNumber] = useState("")
  const [isMuted, setIsMuted] = useState(false)
  const [isSpeakerOn, setIsSpeakerOn] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [callInterval, setCallInterval] = useState<NodeJS.Timeout | null>(null)
  const [recentCalls, setRecentCalls] = useState<Contact[]>([])
  const [isLoadingContacts, setIsLoadingContacts] = useState(false)
  const [showAddContact, setShowAddContact] = useState(false)
  const [newContactName, setNewContactName] = useState("")
  const [showConfetti, setShowConfetti] = useState(false)

  const supabase = createClient()

  // Use confetti hook
  useConfetti(showConfetti)

  // Use external call state if provided, otherwise internal state
  const isCallActive = externalIsCallActive !== undefined ? externalIsCallActive : false
  const currentCallDuration = externalCallDuration !== undefined ? externalCallDuration : callDuration

  const dialPadButtons = [
    { digit: "1", letters: "" },
    { digit: "2", letters: "ABC" },
    { digit: "3", letters: "DEF" },
    { digit: "4", letters: "GHI" },
    { digit: "5", letters: "JKL" },
    { digit: "6", letters: "MNO" },
    { digit: "7", letters: "PQRS" },
    { digit: "8", letters: "TUV" },
    { digit: "9", letters: "WXYZ" },
    { digit: "*", letters: "" },
    { digit: "0", letters: "+" },
    { digit: "#", letters: "" },
  ]

  // Load recent calls from interactions
  useEffect(() => {
    async function loadRecentCalls() {
      setIsLoadingContacts(true)
      try {
        const { data, error } = await supabase
          .from("interactions")
          .select(`
            from_number,
            contacts!inner (id, name, phone)
          `)
          .eq("type", "call")
          .order("created_at", { ascending: false })
          .limit(10)
          
        if (!error && data) {
          // Extract unique contacts from recent calls
          const uniqueContacts = new Map()
          data.forEach(item => {
            if (item.contacts && !uniqueContacts.has(item.contacts.id)) {
              uniqueContacts.set(item.contacts.id, item.contacts)
            }
          })
          setRecentCalls(Array.from(uniqueContacts.values()))
        }
      } catch (error) {
        console.error("Error loading recent calls:", error)
      } finally {
        setIsLoadingContacts(false)
      }
    }
    
    loadRecentCalls()
  }, [])

  const handleDigitPress = useCallback((digit: string) => {
    if (phoneNumber.length < 20) { // Increased for international numbers
      setPhoneNumber((prev) => prev + digit)
    }
  }, [phoneNumber.length])

  const handleDelete = useCallback(() => {
    setPhoneNumber((prev) => prev.slice(0, -1))
  }, [])

  const handleCall = () => {
    if (!phoneNumber && !isCallActive) return
    
    if (isCallActive) {
      // End call
      if (onEndCall) {
        onEndCall()
      } else {
        setIsMuted(false)
        setIsSpeakerOn(false)
      }
      if (callInterval) {
        clearInterval(callInterval)
        setCallInterval(null)
      }
      setCallDuration(0)
      setPhoneNumber("")
    } else {
      // Start call
      const contact = contacts.find(
        (c) => c.phone.replace(/\D/g, "") === phoneNumber.replace(/\D/g, "")
      ) || recentCalls.find(
        (c) => c.phone.replace(/\D/g, "") === phoneNumber.replace(/\D/g, "")
      )
      
      if (onMakeCall) {
        onMakeCall(phoneNumber, contact)
      }
      
      // Start duration timer if not externally managed
      if (externalCallDuration === undefined) {
        const interval = setInterval(() => {
          setCallDuration((prev) => prev + 1)
        }, 1000)
        setCallInterval(interval)
      }
    }
  }

  const handleContactSelect = (contact: Contact) => {
    setPhoneNumber(contact.phone)
    onSelectContact?.(contact)
  }

  const handleSaveContact = async () => {
    if (!newContactName.trim() || !phoneNumber.trim()) {
      toast.error("Please enter both name and phone number")
      return
    }

    try {
      const { data, error } = await supabase
        .from("contacts")
        .insert({
          name: newContactName.trim(),
          phone: phoneNumber,
          created_at: new Date().toISOString()
        })
        .select()

      if (error) throw error

      toast.success(`Contact ${newContactName} saved`)
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 100)
      setNewContactName("")
      setShowAddContact(false)
      
      // Refresh contacts if callback provided
      if (data && data[0]) {
        const newContact = data[0] as Contact
        setRecentCalls(prev => [newContact, ...prev])
      }
    } catch (error) {
      console.error("Error saving contact:", error)
      toast.error("Failed to save contact")
    }
  }

  // Determine matching contact
  const matchingContact = contacts.find(
    (c) => c.phone.replace(/\D/g, "") === phoneNumber.replace(/\D/g, "")
  ) || recentCalls.find(
    (c) => c.phone.replace(/\D/g, "") === phoneNumber.replace(/\D/g, "")
  )

  // Determine current call contact
  const currentCallContact = currentCall?.contact || contacts.find(
    (c) => c.phone.replace(/\D/g, "") === currentCall?.to.replace(/\D/g, "")
  ) || recentCalls.find(
    (c) => c.phone.replace(/\D/g, "") === currentCall?.to.replace(/\D/g, "")
  )

  // Get all available contacts (passed contacts + recent calls)
  const allContacts = [...contacts, ...recentCalls.filter(rc => 
    !contacts.some(c => c.id === rc.id)
  )]

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Web Dialer
          </span>
          <Badge variant="outline" className="text-xs font-normal">
            {formatPhoneNumberUtil(twilioNumber)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {/* Call Status Display */}
        <div className="bg-secondary/50 rounded-lg p-4 mb-4">
          {isCallActive ? (
            <div className="text-center">
              {currentCallContact ? (
                <div className="flex items-center justify-center gap-2 mb-2">
                  <User className="h-5 w-5 text-primary" />
                  <div>
                    <div className="text-sm font-medium">{currentCallContact.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatPhoneNumberUtil(currentCallContact.phone)}
                    </div>
                  </div>
                </div>
              ) : currentCall?.to ? (
                <div className="mb-2">
                  <div className="text-sm font-medium">Calling...</div>
                  <div className="text-sm text-muted-foreground">
                    {formatPhoneNumberUtil(currentCall.to)}
                  </div>
                </div>
              ) : null}
              
              <div className="text-2xl font-mono text-primary animate-pulse">
                {formatDurationUtil(currentCallDuration)}
              </div>
              <div className="text-xs text-muted-foreground mt-1 capitalize">
                {currentCall?.status || "in progress"}
              </div>
            </div>
          ) : (
            <div className="text-center">
              {matchingContact ? (
                <div className="flex items-center justify-center gap-2 mb-1">
                  <User className="h-4 w-4 text-primary" />
                  <span className="text-sm text-primary font-medium">{matchingContact.name}</span>
                </div>
              ) : phoneNumber ? (
                <div className="text-sm text-muted-foreground mb-1">Ready to call</div>
              ) : (
                <div className="text-sm text-muted-foreground mb-1">Enter phone number</div>
              )}
              
              <div className="text-2xl font-mono tracking-wider min-h-[2rem]">
                {formatPhoneNumberUtil(phoneNumber) || "Enter number"}
              </div>
              
              {/* Add Contact Button */}
              {phoneNumber && !matchingContact && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-xs"
                  onClick={() => setShowAddContact(true)}
                >
                  <UserPlus className="h-3 w-3 mr-1" />
                  Save as Contact
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Contacts List */}
        {!isCallActive && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Contacts</p>
              <Badge variant="outline" className="text-[10px]">
                {allContacts.length}
              </Badge>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {allContacts.map((contact) => (
                <Button
                  key={contact.id}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start text-xs h-8 px-2",
                    contact.phone.replace(/\D/g, "") === phoneNumber.replace(/\D/g, "") 
                      ? "bg-primary/10 text-primary" 
                      : ""
                  )}
                  onClick={() => handleContactSelect(contact)}
                >
                  <User className="h-3 w-3 mr-2" />
                  <div className="flex-1 text-left">
                    <div className="font-medium">{contact.name}</div>
                    <div className="text-muted-foreground">{formatPhoneNumberUtil(contact.phone)}</div>
                  </div>
                </Button>
              ))}
              {allContacts.length === 0 && (
                <div className="text-center py-4 text-xs text-muted-foreground">
                  No contacts yet
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add Contact Modal */}
        {showAddContact && (
          <div className="mb-4 p-3 border rounded-lg bg-secondary/50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Save Contact</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAddContact(false)
                  setNewContactName("")
                }}
              >
                ×
              </Button>
            </div>
            <div className="space-y-2">
              <Input
                placeholder="Contact name"
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                className="text-sm"
              />
              <div className="text-xs text-muted-foreground">
                Phone: {formatPhoneNumberUtil(phoneNumber)}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveContact}
                  className="flex-1"
                >
                  Save Contact
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAddContact(false)
                    setNewContactName("")
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Dial Pad */}
        <div className="grid grid-cols-3 gap-1.5 mb-4">
          {dialPadButtons.map(({ digit, letters }) => (
            <Button
              key={digit}
              variant="secondary"
              className="h-12 flex flex-col items-center justify-center gap-0 hover:bg-primary/10 transition-all"
              onClick={() => handleDigitPress(digit)}
              disabled={isCallActive}
            >
              <span className="text-lg font-semibold">{digit}</span>
              {letters && <span className="text-[10px] text-muted-foreground">{letters}</span>}
            </Button>
          ))}
        </div>

        {/* Call Controls */}
        <div className="flex items-center justify-center gap-3 mt-auto pt-3 border-t">
          {isCallActive && (
            <>
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  "h-10 w-10 rounded-full transition-all",
                  isMuted 
                    ? "bg-destructive/20 border-destructive text-destructive" 
                    : "hover:bg-primary/10"
                )}
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  "h-10 w-10 rounded-full transition-all",
                  isSpeakerOn 
                    ? "bg-primary/20 border-primary text-primary" 
                    : "hover:bg-primary/10"
                )}
                onClick={() => setIsSpeakerOn(!isSpeakerOn)}
              >
                {isSpeakerOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
            </>
          )}
          
          <Button
            size="icon"
            className={cn(
              "h-12 w-12 rounded-full transition-all",
              isCallActive
                ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground animate-pulse"
                : phoneNumber
                ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                : "bg-primary/30 text-primary-foreground/50 cursor-not-allowed"
            )}
            onClick={handleCall}
            disabled={!phoneNumber && !isCallActive}
          >
            {isCallActive ? <PhoneOff className="h-6 w-6" /> : <Phone className="h-6 w-6" />}
          </Button>

          {!isCallActive && phoneNumber && (
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive transition-all"
              onClick={handleDelete}
            >
              <Delete className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
