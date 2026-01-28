"use client"

import { useState, useEffect } from "react"
import { Plus, Calendar, User, Tag, Trash2, Clock, CheckCircle2, Circle, FileText, Phone, MessageSquare, PhoneMissed, Star, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { 
  cn,
  formatPhoneNumber, 
  formatTimeAgo, 
  formatDuration,
  getStatusColor,
  truncateText,
  generateInitials
} from "@/lib/utils"

interface Lead {
  id: string
  client_id: string
  contact_id?: string
  source: "missed_call" | "website" | "referral" | "direct_call" | "sms" | "other"
  status: "new" | "contacted" | "qualified" | "converted" | "lost"
  first_interaction_id?: string
  last_interaction_at?: string
  phone?: string
  email?: string
  notes: string
  follow_up_required: boolean
  priority: "low" | "medium" | "high"
  converted_at?: string
  created_at: string
  updated_at: string
  contacts?: {
    name: string
    phone: string
  }
  interactions?: {
    type: string
    direction: string
    created_at: string
  }[]
  clients?: {
    name: string
  }
}

interface Interaction {
  id: string
  type: "call" | "sms" | "voicemail"
  direction: "inbound" | "outbound"
  from_number: string
  to_number: string
  status: string
  content?: string
  is_auto_response?: boolean
  is_missed_call?: boolean
  created_at: string
  contacts?: {
    name: string
    phone: string
  }
}

interface Note {
  id: string
  client_id?: string
  contact_id?: string
  lead_id?: string
  content: string
  type: "note" | "task" | "appointment" | "lead"
  created_by?: string
  created_at: string
  contacts?: {
    name: string
    phone: string
  }
}

export function NotesLeadsPanel() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"all" | "new" | "contacted" | "qualified" | "converted">("all")
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [newNote, setNewNote] = useState({
    content: "",
    type: "note" as Note["type"],
    lead_id: "",
  })
  const [leadFilter, setLeadFilter] = useState("all")

  const supabase = createClient()

  async function fetchData() {
    setIsLoading(true)
    
    try {
      // Fetch leads with related data
      const { data: leadsData, error: leadsError } = await supabase
        .from("leads")
        .select(`
          *,
          contacts (name, phone),
          clients (name),
          interactions!first_interaction_id (type, direction, created_at)
        `)
        .order("created_at", { ascending: false })
        .limit(50)
      
      if (!leadsError && leadsData) {
        setLeads(leadsData)
      }

      // Fetch notes
      const { data: notesData, error: notesError } = await supabase
        .from("notes")
        .select(`
          *,
          contacts (name, phone)
        `)
        .order("created_at", { ascending: false })
        .limit(50)
      
      if (!notesError && notesData) {
        setNotes(notesData)
      }

      // Fetch recent interactions for context
      const { data: interactionsData } = await supabase
        .from("interactions")
        .select(`
          *,
          contacts (name, phone)
        `)
        .order("created_at", { ascending: false })
        .limit(20)
      
      if (interactionsData) {
        setInteractions(interactionsData)
      }

    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    // Subscribe to real-time updates
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

    const notesChannel = supabase
      .channel("notes-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notes" },
        () => {
          fetchData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(leadsChannel)
      supabase.removeChannel(notesChannel)
    }
  }, [])

  const filteredLeads = leads.filter((lead) => {
    if (activeTab === "all") return true
    return lead.status === activeTab
  }).filter((lead) => {
    if (leadFilter === "all") return true
    if (leadFilter === "followup") return lead.follow_up_required === true
    if (leadFilter === "high") return lead.priority === "high"
    return true
  })

  async function handleAddNote() {
    if (!newNote.content.trim()) return

    try {
      const { error } = await supabase
        .from("leads")
        .insert({
          title: newNote.content.substring(0, 50) + (newNote.content.length > 50 ? '...' : ''),
          description: newNote.content,
          type: newNote.type,
          contact_id: selectedLeadId || undefined,
          status: "new",
          priority: "medium",
          created_at: new Date().toISOString(),
        })

      if (error) throw error

      setNewNote({ content: "", type: "note", lead_id: "" })
      setSelectedLeadId(null)
      setIsAddingNote(false)
      fetchData()

    } catch (error) {
      console.error("Error adding note:", error)
    }
  }

  async function updateLeadStatus(leadId: string, status: Lead["status"]) {
    try {
      const updates: Partial<Lead> = {
        status,
        updated_at: new Date().toISOString(),
      }

      if (status === "converted") {
        updates.converted_at = new Date().toISOString()
        updates.follow_up_required = false
      }

      const { error } = await supabase
        .from("leads")
        .update(updates)
        .eq("id", leadId)

      if (error) throw error

      fetchData()

    } catch (error) {
      console.error("Error updating lead status:", error)
    }
  }

  async function updateLeadPriority(leadId: string, priority: Lead["priority"]) {
    try {
      const { error } = await supabase
        .from("leads")
        .update({
          priority,
          updated_at: new Date().toISOString(),
        })
        .eq("id", leadId)

      if (error) throw error

      fetchData()

    } catch (error) {
      console.error("Error updating lead priority:", error)
    }
  }

  async function toggleFollowUpRequired(leadId: string, currentValue: boolean) {
    try {
      const { error } = await supabase
        .from("leads")
        .update({
          follow_up_required: !currentValue,
          updated_at: new Date().toISOString(),
        })
        .eq("id", leadId)

      if (error) throw error

      fetchData()

    } catch (error) {
      console.error("Error toggling follow-up:", error)
    }
  }

  function getStatusColor(status: Lead["status"]) {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
      case "contacted":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
      case "qualified":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
      case "converted":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      case "lost":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  function getPriorityColor(priority: Lead["priority"]) {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800"
      case "low":
        return "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
      default:
        return "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  function getSourceIcon(source: Lead["source"]) {
    switch (source) {
      case "missed_call":
        return <PhoneMissed className="h-3 w-3" />
      case "direct_call":
        return <Phone className="h-3 w-3" />
      case "sms":
        return <MessageSquare className="h-3 w-3" />
      case "website":
        return <FileText className="h-3 w-3" />
      case "referral":
        return <User className="h-3 w-3" />
      default:
        return <Circle className="h-3 w-3" />
    }
  }

  function formatTime(dateStr?: string) {
    if (!dateStr) return "--"
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

  function getLeadNotes(leadId: string) {
    return notes.filter(note => note.lead_id === leadId)
  }

  function getLeadInteractions(leadId: string) {
    const lead = leads.find(l => l.id === leadId)
    if (!lead?.contact_id) return []
    
    return interactions.filter(i => i.contact_id === lead.contact_id)
  }

  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === "new").length,
    contacted: leads.filter(l => l.status === "contacted").length,
    qualified: leads.filter(l => l.status === "qualified").length,
    converted: leads.filter(l => l.status === "converted").length,
    followup: leads.filter(l => l.follow_up_required).length,
    high: leads.filter(l => l.priority === "high").length,
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Leads & Notes
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="text-xs flex items-center gap-3">
              <Badge variant="outline" className="text-[10px]">
                Total: {stats.total}
              </Badge>
              <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700">
                New: {stats.new}
              </Badge>
              <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700">
                High: {stats.high}
              </Badge>
            </div>
            <Button
              size="sm"
              variant={isAddingNote ? "secondary" : "default"}
              onClick={() => setIsAddingNote(!isAddingNote)}
            >
              <Plus className="h-4 w-4" />
              {isAddingNote ? "Hide Form" : "Add Note"}
            </Button>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="new" className="text-xs">New</TabsTrigger>
              <TabsTrigger value="contacted" className="text-xs">Contacted</TabsTrigger>
              <TabsTrigger value="qualified" className="text-xs">Qualified</TabsTrigger>
              <TabsTrigger value="converted" className="text-xs">Converted</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Select value={leadFilter} onValueChange={setLeadFilter}>
            <SelectTrigger className="w-32 text-xs">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Leads</SelectItem>
              <SelectItem value="followup">Needs Follow-up</SelectItem>
              <SelectItem value="high">High Priority</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden">
        {/* Add Note Form */}
        <div className="bg-secondary/50 rounded-lg p-3 mb-3 space-y-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Add New Note</span>
            {isAddingNote && (
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => {
                  setIsAddingNote(false)
                  setNewNote({ content: "", type: "note", lead_id: "" })
                  setSelectedLeadId(null)
                }}
              >
                ×
              </Button>
            )}
          </div>
            <div className="flex gap-2">
              <Select
                value={newNote.type}
                onValueChange={(v) => setNewNote({ ...newNote, type: v as Note["type"] })}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="note">Note</SelectItem>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="appointment">Appointment</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                </SelectContent>
              </Select>
              
              <Select
                value={selectedLeadId || ""}
                onValueChange={(v) => {
                  setSelectedLeadId(v)
                  setNewNote({ ...newNote, lead_id: v })
                }}
              >
                <SelectTrigger className="text-xs flex-1">
                  <SelectValue placeholder="Link to lead (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {leads.map(lead => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.contacts?.name || formatPhoneNumber(lead.phone || "")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Textarea
              placeholder="Note content *"
              value={newNote.content}
              onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
              rows={3}
              className="text-sm"
            />
            
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAddNote}
                disabled={!newNote.content.trim()}
                className="flex-1"
              >
                Save Note
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => {
                  setIsAddingNote(false)
                  setNewNote({ content: "", type: "note", lead_id: "" })
                  setSelectedLeadId(null)
                }}
              >
                Cancel
              </Button>
            </div>
          </div>

        {/* Leads List */}
        <ScrollArea className="h-[calc(100%-1rem)]">
          {isLoading ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <Circle className="h-5 w-5 animate-spin mr-2" />
              Loading leads...
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No {activeTab === "all" ? "leads" : activeTab} found</p>
              <p className="text-xs mt-1">Leads from missed calls will appear here</p>
            </div>
          ) : (
            <div className="space-y-3 pr-3">
              {filteredLeads.map((lead) => (
                <div
                  key={lead.id}
                  className={`p-3 rounded-lg border bg-card transition-colors hover:bg-secondary/50 ${
                    lead.follow_up_required ? "border-l-4 border-l-orange-500" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Lead Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="font-medium text-sm truncate">
                          {lead.contacts?.name || formatPhoneNumber(lead.phone || "Unknown")}
                        </span>
                        
                        <div className="flex items-center gap-1 flex-wrap">
                          <Badge 
                            variant="outline" 
                            className={`text-[10px] px-2 py-0.5 ${getStatusColor(lead.status)}`}
                          >
                            {lead.status}
                          </Badge>
                          
                          <Badge 
                            variant="outline" 
                            className={`text-[10px] px-2 py-0.5 ${getPriorityColor(lead.priority)}`}
                          >
                            {lead.priority}
                          </Badge>
                          
                          <Badge variant="outline" className="text-[10px] px-2 py-0.5 flex items-center gap-1">
                            {getSourceIcon(lead.source)}
                            {lead.source.replace("_", " ")}
                          </Badge>
                          
                          {lead.follow_up_required && (
                            <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-orange-50 text-orange-700 border-orange-300">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Follow-up
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Notes Preview */}
                      {lead.notes && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {lead.notes}
                        </p>
                      )}
                      
                      {/* Client & Contact Info */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        {lead.clients?.name && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {lead.clients.name}
                          </span>
                        )}
                        
                        {lead.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {formatPhoneNumber(lead.phone)}
                          </span>
                        )}
                        
                        {lead.last_interaction_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Last: {formatTime(lead.last_interaction_at)}
                          </span>
                        )}
                        
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Created: {formatTime(lead.created_at)}
                        </span>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 mt-3">
                        <Select
                          value={lead.status}
                          onValueChange={(v) => updateLeadStatus(lead.id, v as Lead["status"])}
                        >
                          <SelectTrigger className="h-7 text-xs w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="contacted">Contacted</SelectItem>
                            <SelectItem value="qualified">Qualified</SelectItem>
                            <SelectItem value="converted">Converted</SelectItem>
                            <SelectItem value="lost">Lost</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Select
                          value={lead.priority}
                          onValueChange={(v) => updateLeadPriority(lead.id, v as Lead["priority"])}
                        >
                          <SelectTrigger className="h-7 text-xs w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Button
                          size="sm"
                          variant={lead.follow_up_required ? "default" : "outline"}
                          className="h-7 text-xs"
                          onClick={() => toggleFollowUpRequired(lead.id, lead.follow_up_required)}
                        >
                          {lead.follow_up_required ? "✓ Follow-up" : "Add Follow-up"}
                        </Button>
                        
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => {
                            setSelectedLeadId(lead.id)
                            setIsAddingNote(true)
                          }}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Quick Stats */}
                    <div className="text-right text-xs text-muted-foreground">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1 justify-end">
                          <span className="font-medium">{getLeadNotes(lead.id).length}</span>
                          <FileText className="h-3 w-3" />
                        </div>
                        <div className="flex items-center gap-1 justify-end">
                          <span className="font-medium">{getLeadInteractions(lead.id).length}</span>
                          <Phone className="h-3 w-3" />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Recent Notes for this Lead */}
                  {getLeadNotes(lead.id).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="space-y-2">
                        {getLeadNotes(lead.id).slice(0, 2).map((note) => (
                          <div key={note.id} className="text-xs bg-secondary/30 rounded p-2">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-[9px]">
                                {note.type.replace("_", " ")}
                              </Badge>
                              <span className="text-muted-foreground">
                                {formatTime(note.created_at)}
                              </span>
                            </div>
                            <p className="text-sm">{note.content}</p>
                          </div>
                        ))}
                        {getLeadNotes(lead.id).length > 2 && (
                          <p className="text-xs text-muted-foreground text-center">
                            +{getLeadNotes(lead.id).length - 2} more notes
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
