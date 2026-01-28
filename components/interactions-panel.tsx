"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Phone,
  MessageSquare,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Clock,
  User,
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight,
  Voicemail,
  Mail,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Interaction {
  id: string
  type: "call" | "sms" | "voicemail"
  direction: "inbound" | "outbound"
  from_number: string
  to_number: string
  status: string
  duration_seconds?: number
  content?: string
  is_auto_response?: boolean
  is_missed_call?: boolean
  dial_call_status?: string
  answered?: boolean
  twilio_sid: string
  contact_id?: string
  client_id?: string
  created_at: string
  contacts?: {
    name: string
    phone: string
  }
  clients?: {
    name: string
  }
}

interface ScheduledFollowup {
  id: string
  client_id: string
  contact_id?: string
  interaction_id?: string
  scheduled_for: string
  executed_at?: string
  status: "scheduled" | "sent" | "cancelled" | "failed"
  type: "sms" | "email" | "call"
  template_name?: string
  delay_minutes?: number
  created_at: string
  updated_at: string
  contacts?: {
    name: string
    phone: string
  }
}

interface Lead {
  id: string
  client_id: string
  contact_id?: string
  source: string
  status: "new" | "contacted" | "qualified" | "converted" | "lost"
  phone?: string
  follow_up_required: boolean
  priority: "low" | "medium" | "high"
  created_at: string
  contacts?: {
    name: string
    phone: string
  }
}

export function InteractionsPanel() {
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [scheduledFollowups, setScheduledFollowups] = useState<ScheduledFollowup[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")

  const supabase = createClient()

  async function fetchData() {
    setIsLoading(true)
    
    try {
      // Fetch interactions with related data
      const { data: interactionsData, error: interactionsError } = await supabase
        .from("interactions")
        .select(`
          *,
          contacts (name, phone),
          clients (name)
        `)
        .order("created_at", { ascending: false })
        .limit(100) // Increased limit for better overview
    
      if (!interactionsError && interactionsData) {
        setInteractions(interactionsData)
      } else {
        console.error("Error fetching interactions:", interactionsError)
      }
    
      // Fetch scheduled follow-ups
      const { data: followUpsData, error: followUpsError } = await supabase
        .from("scheduled_followups")
        .select(`
          *,
          contacts (name, phone)
        `)
        .order("scheduled_for", { ascending: true })
        .limit(50)
    
      if (!followUpsError && followUpsData) {
        setScheduledFollowups(followUpsData)
      } else {
        console.error("Error fetching follow-ups:", followUpsError)
      }
    
      // Fetch leads (new leads need follow-up)
      const { data: leadsData, error: leadsError } = await supabase
        .from("leads")
        .select(`
          *,
          contacts (name, phone)
        `)
        .eq("follow_up_required", true)
        .eq("status", "new")
        .order("created_at", { ascending: false })
        .limit(50)
    
      if (!leadsError && leadsData) {
        setLeads(leadsData)
      } else {
        console.error("Error fetching leads:", leadsError)
      }
      
    } catch (error) {
      console.error("Error in fetchData:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    // Subscribe to real-time updates for all relevant tables
    const interactionsChannel = supabase
      .channel("interactions-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "interactions" },
        () => {
          fetchData()
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "interactions" },
        () => {
          fetchData()
        }
      )
      .subscribe()

    const followUpsChannel = supabase
      .channel("followups-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scheduled_followups" },
        () => {
          fetchData()
        }
      )
      .subscribe()

    const leadsChannel = supabase
      .channel("leads-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        () => {
          fetchData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(interactionsChannel)
      supabase.removeChannel(followUpsChannel)
      supabase.removeChannel(leadsChannel)
    }
  }, [])

  const filteredInteractions = interactions.filter((i) => {
    if (activeTab === "all") return true
    if (activeTab === "calls") return i.type === "call"
    if (activeTab === "sms") return i.type === "sms"
    if (activeTab === "voicemail") return i.type === "voicemail"
    if (activeTab === "missed") return i.is_missed_call === true
    if (activeTab === "auto") return i.is_auto_response === true
    return true
  })

  function getStatusColor(status: string) {
    switch (status) {
      case "completed":
      case "delivered":
      case "received":
      case "answered":
      case "sent":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      case "ringing":
      case "in-progress":
      case "queued":
      case "scheduled":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
      case "no-answer":
      case "busy":
      case "failed":
      case "undelivered":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  function getInteractionIcon(interaction: Interaction) {
    if (interaction.type === "sms") {
      if (interaction.is_auto_response) {
        return <Mail className="h-4 w-4 text-orange-500" />
      }
      return <MessageSquare className="h-4 w-4" />
    }
    
    if (interaction.type === "voicemail") {
      return <Voicemail className="h-4 w-4 text-purple-500" />
    }
    
    // For calls
    if (interaction.is_missed_call) {
      return <PhoneMissed className="h-4 w-4 text-red-500" />
    }
    
    if (interaction.direction === "inbound") {
      return <PhoneIncoming className="h-4 w-4 text-green-500" />
    }
    
    return <PhoneOutgoing className="h-4 w-4 text-blue-500" />
  }

  function formatPhoneNumber(phone: string) {
    // Format as (XXX) XXX-XXXX for US numbers
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      const match = cleaned.match(/^1(\d{3})(\d{3})(\d{4})$/)
      if (match) return `+1 (${match[1]}) ${match[2]}-${match[3]}`
    }
    if (cleaned.length === 10) {
      const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/)
      if (match) return `(${match[1]}) ${match[2]}-${match[3]}`
    }
    return phone
  }

  function formatDuration(seconds?: number) {
    if (!seconds || seconds === 0) return "--"
    if (seconds < 60) return `${seconds}s`
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins < 60) return `${mins}m ${secs}s`
    const hours = Math.floor(mins / 60)
    const remainingMins = mins % 60
    return `${hours}h ${remainingMins}m`
  }

  function formatTime(dateStr: string) {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  function getInteractionSummary(interaction: Interaction) {
    if (interaction.type === "sms" && interaction.content) {
      return interaction.content.length > 50 
        ? interaction.content.substring(0, 50) + "..." 
        : interaction.content
    }
    
    if (interaction.type === "call") {
      if (interaction.is_missed_call) return "Missed call"
      if (interaction.answered) return `Answered (${formatDuration(interaction.duration_seconds)})`
      return "Call"
    }
    
    if (interaction.type === "voicemail") {
      return `Voicemail (${formatDuration(interaction.duration_seconds)})`
    }
    
    return `${interaction.type} ${interaction.direction}`
  }

  // Calculate stats
  const stats = {
    total: interactions.length,
    missed: interactions.filter(i => i.is_missed_call).length,
    auto: interactions.filter(i => i.is_auto_response).length,
    pendingFollowups: scheduledFollowups.filter(f => f.status === "scheduled").length,
    newLeads: leads.filter(l => l.status === "new").length,
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Activity Dashboard
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="text-xs flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                {stats.total} total
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                {stats.missed} missed
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                {stats.auto} auto
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchData}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col pt-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-6 mb-3">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="calls" className="text-xs">Calls</TabsTrigger>
            <TabsTrigger value="sms" className="text-xs">SMS</TabsTrigger>
            <TabsTrigger value="voicemail" className="text-xs">Voicemail</TabsTrigger>
            <TabsTrigger value="missed" className="text-xs">Missed</TabsTrigger>
            <TabsTrigger value="auto" className="text-xs">Auto</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="flex-1 mt-0">
            <ScrollArea className="h-[280px]">
              {isLoading ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                  Loading activity...
                </div>
              ) : filteredInteractions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
                  <Phone className="h-8 w-8 mb-2 opacity-50" />
                  <p>No {activeTab === "all" ? "activity" : activeTab} yet</p>
                  <p className="text-xs mt-1">
                    {activeTab === "missed" 
                      ? "Missed calls will trigger automatic SMS follow-ups" 
                      : "All calls and messages will appear here"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredInteractions.map((interaction) => (
                    <div
                      key={interaction.id}
                      className="p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer group"
                      onClick={() => {
                        // You can add a detail view modal here
                        console.log("Interaction details:", interaction)
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="p-2 rounded-full bg-secondary/50 group-hover:bg-secondary">
                            {getInteractionIcon(interaction)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm truncate">
                                {interaction.contacts?.name || formatPhoneNumber(interaction.from_number)}
                              </span>
                              <div className="flex items-center gap-1">
                                {interaction.direction === "inbound" ? (
                                  <ArrowDownLeft className="h-3 w-3 text-muted-foreground" />
                                ) : (
                                  <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
                                )}
                                {interaction.is_auto_response && (
                                  <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 bg-orange-500/10 text-orange-600 border-orange-300">
                                    Auto
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {getInteractionSummary(interaction)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {interaction.clients?.name && (
                                <span className="inline-block mr-2 px-1.5 py-0.5 bg-primary/10 rounded text-primary">
                                  {interaction.clients.name}
                                </span>
                              )}
                              {formatTime(interaction.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <Badge 
                            variant="outline" 
                            className={`text-[10px] px-2 py-0.5 ${getStatusColor(interaction.status)}`}
                          >
                            {interaction.status.replace("-", " ")}
                          </Badge>
                          <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground justify-end">
                            <Clock className="h-3 w-3" />
                            {interaction.type === "call" || interaction.type === "voicemail" 
                              ? formatDuration(interaction.duration_seconds)
                              : formatTime(interaction.created_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Follow-ups & Leads Section */}
        {(scheduledFollowups.length > 0 || leads.length > 0) && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="grid grid-cols-2 gap-4">
              {/* Scheduled Follow-ups */}
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  Scheduled Follow-ups
                  {stats.pendingFollowups > 0 && (
                    <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0 h-4">
                      {stats.pendingFollowups}
                    </Badge>
                  )}
                </h4>
                <ScrollArea className="h-[80px]">
                  {scheduledFollowups.filter(f => f.status === "scheduled").length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No scheduled follow-ups</p>
                  ) : (
                    <div className="space-y-1.5">
                      {scheduledFollowups
                        .filter(f => f.status === "scheduled")
                        .slice(0, 3)
                        .map((followUp) => (
                          <div
                            key={followUp.id}
                            className="p-2 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="truncate flex-1 mr-2">
                                {followUp.contacts?.name || formatPhoneNumber(followUp.contacts?.phone || "Unknown")}
                              </span>
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-blue-500/10 text-blue-600">
                                {followUp.type}
                              </Badge>
                            </div>
                            <p className="text-muted-foreground text-[10px] mt-0.5">
                              {new Date(followUp.scheduled_for).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </p>
                          </div>
                        ))}
                    </div>
                  )}
                </ScrollArea>
              </div>

              {/* New Leads */}
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <User className="h-4 w-4 text-green-500" />
                  New Leads
                  {stats.newLeads > 0 && (
                    <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0 h-4">
                      {stats.newLeads}
                    </Badge>
                  )}
                </h4>
                <ScrollArea className="h-[80px]">
                  {leads.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No new leads</p>
                  ) : (
                    <div className="space-y-1.5">
                      {leads.slice(0, 3).map((lead) => (
                        <div
                          key={lead.id}
                          className={`p-2 rounded-md border text-xs ${
                            lead.priority === "high"
                              ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                              : lead.priority === "medium"
                              ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
                              : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="truncate flex-1 mr-2">
                              {lead.contacts?.name || formatPhoneNumber(lead.phone || "Unknown")}
                            </span>
                            <Badge 
                              variant="outline" 
                              className={`text-[9px] px-1.5 py-0 h-4 ${
                                lead.priority === "high"
                                  ? "bg-red-500/10 text-red-600"
                                  : lead.priority === "medium"
                                  ? "bg-yellow-500/10 text-yellow-600"
                                  : "bg-green-500/10 text-green-600"
                              }`}
                            >
                              {lead.priority}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground text-[10px] mt-0.5 capitalize">
                            {lead.source.replace("_", " ")}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
