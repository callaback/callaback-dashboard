
"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Phone, Users, MessageSquare, FileText, Activity, Settings, Bell, Search,
  ChevronRight, BarChart3, Calendar, Mail, Filter, Download, PhoneCall,
  PhoneIncoming, PhoneOutgoing, PhoneMissed, Voicemail, Copy, Check,
  LogOut, User, Clock, Mic, MicOff, Volume2, VolumeX, Delete, Keyboard,
  Moon, Sun, X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  formatPhoneNumber,
  formatTimeAgo,
  formatDuration,
  getStatusColor,
  truncateText,
  generateInitials,
  formatDateTime,
  debounce,
  cn
} from "@/lib/utils"
import { toast, Toaster } from "sonner"
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ContactsManager } from "@/components/contacts-manager"
import { SyncChat } from "@/components/sync-chat"
import { NotesLeadsPanel } from "@/components/notes-leads-panel"
import { CallbackCalendar } from "@/components/callback-calendar"
import { FileManager } from "@/components/file-manager"

// Initialize Supabase client
const supabase = createClient()

// YOUR PHONE NUMBER
const YOUR_PHONE_NUMBER = "18444073511" // (844) 407-3511

// Types
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
  created_at: string
  contacts?: {
    name: string
    phone: string
  }
  clients?: {
    name: string
  }
}

interface Lead {
  id: string
  name: string
  phone: string
  email?: string
  status: "new" | "contacted" | "qualified" | "converted" | "lost"
  source: string
  priority: "low" | "medium" | "high"
  follow_up_required: boolean
  notes?: string
  created_at: string
  last_contact?: string
}

interface Contact {
  id: string
  name: string
  phone: string
  email?: string
  company?: string
  created_at: string
  last_interaction?: string
}

interface SystemMetric {
  label: string
  value: string | number
  change?: number
  icon: React.ReactNode
  color: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("overview")
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthChecking, setIsAuthChecking] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [metrics, setMetrics] = useState<SystemMetric[]>([])
  const [timeRange, setTimeRange] = useState("today")
  const [user, setUser] = useState<any>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [currentTime, setCurrentTime] = useState(new Date())
  
  // Phone Dialer State
  const [phoneNumber, setPhoneNumber] = useState("")
  const [isCallActive, setIsCallActive] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [callInterval, setCallInterval] = useState<NodeJS.Timeout | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isSpeakerOn, setIsSpeakerOn] = useState(false)
  const [dialPadValue, setDialPadValue] = useState("")
  const [selectedContactForCall, setSelectedContactForCall] = useState<Contact | null>(null)
  const [smsMessage, setSmsMessage] = useState("")
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null)
  const [showFullDialer, setShowFullDialer] = useState(false)
  const [hasShownWelcome, setHasShownWelcome] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [pdfInput, setPdfInput] = useState("")
  const [isPdfLoading, setIsPdfLoading] = useState(false)
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null)
  const [pdfError, setPdfError] = useState<string | null>(null)

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Load dark mode preference
  useEffect(() => {
    const saved = localStorage.getItem("dark_mode")
    if (saved !== null) {
      setIsDarkMode(JSON.parse(saved))
    }
  }, [])

  // Apply dark mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem("dark_mode", JSON.stringify(isDarkMode))
  }, [isDarkMode])

  // Show welcome toast when user is set
  useEffect(() => {
    if (user && !hasShownWelcome) {
      toast.success(`Welcome back, ${user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'}!`)
      setHasShownWelcome(true)
    }
  }, [user, hasShownWelcome])

  // Check for existing session on mount - FIXED VERSION
  useEffect(() => {
    const checkUser = async () => {
      setIsAuthChecking(true)
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error("Session error:", error)
          throw error
        }
        
        if (!session) {
          console.log("No session found, redirecting to login")
          router.push('/login')
          return
        }
        
        console.log("Session found for user:", session.user.email)
        setUser(session.user)
        await fetchDashboardData()
        
      } catch (error) {
        console.error("Auth error:", error)
        router.push('/login')
      } finally {
        setIsAuthChecking(false)
      }
    }
    
    checkUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth state changed:", event)
        
        if (event === 'SIGNED_OUT') {
          console.log("User signed out, redirecting to login")
          setUser(null)
          setInteractions([])
          setLeads([])
          setContacts([])
          router.push('/login')
        } else if (event === 'SIGNED_IN' && session) {
          console.log("User signed in:", session.user.email)
          setUser(session.user)
          fetchDashboardData()
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [router]) // Only depend on router

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

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true)
    try {
      // Fetch recent interactions
      const { data: interactionsData } = await supabase
        .from("interactions")
        .select(`
          *,
          contacts (name, phone),
          clients (name)
        `)
        .order("created_at", { ascending: false })
        .limit(20)

      if (interactionsData) setInteractions(interactionsData)

      const { data: leadsData } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(8)

      if (leadsData) setLeads(leadsData)

      const { data: contactsData } = await supabase
        .from("contacts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(12)

      if (contactsData) setContacts(contactsData)

      calculateMetrics(interactionsData || [], leadsData || [])

      setNotifications([
        { id: 1, type: "warning", message: "3 missed calls need follow-up", time: "5 min ago" },
        { id: 2, type: "info", message: "New lead from website form", time: "15 min ago" },
        { id: 3, type: "success", message: "Monthly report generated", time: "1 hour ago" },
        { id: 4, type: "info", message: `Your number ${formatPhoneNumber(YOUR_PHONE_NUMBER)} is active`, time: "2 hours ago" },
      ])

    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      toast.error("Failed to load dashboard data")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const calculateMetrics = (interactions: Interaction[], leads: Lead[]) => {
    const totalCalls = interactions.filter(i => i.type === "call").length
    const missedCalls = interactions.filter(i => i.is_missed_call).length
    const totalSMS = interactions.filter(i => i.type === "sms").length
    const newLeads = leads.filter(l => l.status === "new").length
    const answeredCalls = totalCalls - missedCalls
    const answerRate = totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0

    setMetrics([
      {
        label: "Total Calls",
        value: totalCalls,
        change: 12,
        icon: <Phone className="h-4 w-4" />,
        color: "bg-blue-500"
      },
      {
        label: "Answer Rate",
        value: `${answerRate}%`,
        change: answerRate > 80 ? 5 : -3,
        icon: <PhoneCall className="h-4 w-4" />,
        color: "bg-green-500"
      },
      {
        label: "SMS Sent",
        value: totalSMS,
        change: 23,
        icon: <MessageSquare className="h-4 w-4" />,
        color: "bg-amber-500"
      },
      {
        label: "Missed Calls",
        value: missedCalls,
        change: -5,
        icon: <PhoneMissed className="h-4 w-4" />,
        color: "bg-red-500"
      },
      {
        label: "New Leads",
        value: newLeads,
        change: 8,
        icon: <Users className="h-4 w-4" />,
        color: "bg-purple-500"
      },
      {
        label: "Voicemails",
        value: interactions.filter(i => i.type === "voicemail").length,
        change: 2,
        icon: <Voicemail className="h-4 w-4" />,
        color: "bg-indigo-500"
      }
    ])
  }

  const handleDigitPress = (digit: string) => {
    if (dialPadValue.length < 20) {
      setDialPadValue(prev => prev + digit)
      setPhoneNumber(prev => prev + digit)
    }
  }

  const handleDeleteDigit = () => {
    setDialPadValue(prev => prev.slice(0, -1))
    setPhoneNumber(prev => prev.slice(0, -1))
  }

  const handleCall = async () => {
    if (!phoneNumber && !isCallActive) {
      return
    }
    
    if (isCallActive) {
      // End call
      setIsCallActive(false)
      setIsMuted(false)
      setIsSpeakerOn(false)
      if (callInterval) {
        clearInterval(callInterval)
        setCallInterval(null)
      }
      setCallDuration(0)
      setPhoneNumber("")
      setDialPadValue("")
      toast.success("Call ended")
    } else {
      // Start call
      setIsCallActive(true)
      toast.success(`Calling ${formatPhoneNumber(phoneNumber)}...`)
      
      const interval = setInterval(() => {
        setCallDuration(prev => prev + 1)
      }, 1000)
      setCallInterval(interval)
      
      // Log the call
      try {
        await supabase
          .from("interactions")
          .insert({
            type: "call",
            direction: "outbound",
            from_number: YOUR_PHONE_NUMBER,
            to_number: phoneNumber,
            status: "ringing",
            is_missed_call: false,
            created_at: new Date().toISOString(),
            client_id: user?.id || null,
            contact_id: selectedContactForCall?.id || null
          })
        
        if (selectedContactForCall) {
          await supabase
            .from("contacts")
            .update({ last_interaction: new Date().toISOString() })
            .eq("id", selectedContactForCall.id)
        }
      } catch (error) {
        console.error("Error logging call:", error)
      }
    }
  }

  const handleSendSMS = async () => {
    if (!phoneNumber || !smsMessage.trim()) {
      toast.error("Please enter a phone number and message")
      return
    }
    
    try {
      // Log the SMS
      await supabase
        .from("interactions")
        .insert({
          type: "sms",
          direction: "outbound",
          from_number: YOUR_PHONE_NUMBER,
          to_number: phoneNumber,
          status: "sent",
          content: smsMessage,
          is_auto_response: false,
          created_at: new Date().toISOString(),
          client_id: user?.id || null,
          contact_id: selectedContactForCall?.id || null
        })
      
      if (selectedContactForCall) {
        await supabase
          .from("contacts")
          .update({ last_interaction: new Date().toISOString() })
          .eq("id", selectedContactForCall.id)
      }
      
      // Clear inputs
      setSmsMessage("")
      toast.success("SMS sent successfully")
      
      // Refresh data
      fetchDashboardData()
      
    } catch (error) {
      console.error("Error sending SMS:", error)
      toast.error("Failed to send SMS")
    }
  }

  const handleContactSelectForCall = (contact: Contact) => {
    setPhoneNumber(contact.phone)
    setDialPadValue(contact.phone.replace(/\D/g, ""))
    setSelectedContactForCall(contact)
  }

  const copyPhoneNumber = () => {
    navigator.clipboard.writeText(formatPhoneNumber(YOUR_PHONE_NUMBER))
    setCopiedNumber(YOUR_PHONE_NUMBER)
    toast.success("Phone number copied")
    setTimeout(() => setCopiedNumber(null), 2000)
  }

  const handleSearch = debounce((query: string) => {
    setSearchQuery(query)
  }, 300)

  const handleGeneratePdf = async () => {
    if (!pdfInput.trim()) return

    setIsPdfLoading(true)
    setPdfError(null)
    try {
      const input = pdfInput.trim()
      let url = input

      // If it looks like a domain without protocol, add https://
      if (!input.startsWith("http://") && !input.startsWith("https://")) {
        // Check if it's a URL-like string (has dots) or a name
        if (input.includes(".")) {
          url = `https://${input}`
        }
      }

      const isUrl = url.startsWith("http://") || url.startsWith("https://")
      
      const params = new URLSearchParams()
      if (isUrl) {
        params.append("url", url)
      } else {
        params.append("name", input)
      }

      const response = await fetch(`https://browser-worker.callaback.workers.dev/?${params.toString()}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Worker error: ${response.status} - ${errorText || response.statusText}`)
      }

      const blob = await response.blob()
      const pdfUrl = URL.createObjectURL(blob)
      setGeneratedPdfUrl(pdfUrl)
      
      // Auto-download
      const a = document.createElement("a")
      a.href = pdfUrl
      a.download = `${input.replace(/[^a-z0-9]/gi, "_")}.pdf`
      a.click()
      
      toast.success("PDF generated and downloaded")
      setPdfInput("")
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error"
      console.error("Error generating PDF:", error)
      setPdfError(errorMsg)
      toast.error(`Failed to generate PDF: ${errorMsg}`)
    } finally {
      setIsPdfLoading(false)
    }
  }

  // FIXED LOGOUT HANDLER
  const handleLogout = async () => {
    try {
      console.log("Logging out...")
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error("Logout error:", error)
        toast.error("Failed to logout. Please try again.")
        return
      }
      
      console.log("Logout successful")
      toast.success("Logged out successfully")
      
      // Clear local state
      setUser(null)
      setInteractions([])
      setLeads([])
      setContacts([])
      setMetrics([])
      
      // The onAuthStateChange listener will handle the redirect
      // But we can also explicitly redirect as a fallback
      setTimeout(() => {
        router.push('/login')
      }, 100)
      
    } catch (error) {
      console.error("Logout exception:", error)
      toast.error("An error occurred during logout")
    }
  }

  const filteredInteractions = interactions.filter(interaction =>
    !searchQuery ||
    interaction.from_number?.includes(searchQuery) ||
    interaction.contacts?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    interaction.type?.includes(searchQuery.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    const colors = getStatusColor(status)
    return (
      <Badge
        variant="outline"
        className={cn(
          "text-xs font-medium",
          colors.bg,
          colors.text,
          colors.border
        )}
      >
        {status}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const colorMap = {
      high: "bg-red-100 text-red-800 border-red-300",
      medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
      low: "bg-green-100 text-green-800 border-green-300"
    }
    
    return (
      <Badge
        variant="outline"
        className={cn(
          "text-xs font-medium capitalize",
          colorMap[priority as keyof typeof colorMap] || "bg-gray-100 text-gray-800"
        )}
      >
        {priority}
      </Badge>
    )
  }

  // IMPROVED LOADING STATE
  if (isLoading || isAuthChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-600 border-t-transparent mx-auto" />
          <p className="text-muted-foreground font-medium">
            {isAuthChecking ? "Checking authentication..." : "Loading callaback API..."}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Toaster position="top-center" richColors />
      
      {/* Header with Phone Number */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
        <div className="max-w-[2000px] mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Logo & Brand */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-md flex-shrink-0">
                <Phone className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="font-bold text-xl bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                  callaback
                </h1>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-cyan-700">{formatPhoneNumber(YOUR_PHONE_NUMBER)}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={copyPhoneNumber}
                    title="Copy phone number"
                  >
                    {copiedNumber === YOUR_PHONE_NUMBER ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Enhanced Right Side - Clock & User */}
            <div className="flex items-center gap-3">
              {/* Enhanced Live Clock */}
              <div className="hidden md:flex items-center gap-3 px-4 py-2.5 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl border-2 border-cyan-200 shadow-md">
                <div className="text-right">
                  <p className="text-xl font-mono font-bold tracking-tight text-slate-800 tabular-nums">
                    {currentTime.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
                  </p>
                  <p className="text-xs text-slate-600 font-medium">
                    {currentTime.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              </div>
              
              {/* User Profile */}
              <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200 shadow-sm">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-md">
                  {(user?.user_metadata?.name || user?.email)?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-800 truncate max-w-[150px]">
                    {user?.user_metadata?.name || user?.email?.split('@')[0]}
                  </p>
                  <p className="text-xs text-slate-600 truncate max-w-[150px]">{user?.email}</p>
                </div>
              </div>
              
              {/* Theme Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="h-10 px-3 border-slate-200 hover:bg-slate-100"
                title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
              >
                {isDarkMode ? (
                  <Sun className="h-4 w-4 text-amber-500" />
                ) : (
                  <Moon className="h-4 w-4 text-slate-600" />
                )}
              </Button>
              
              {/* FIXED LOGOUT BUTTON */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="h-10 px-4 border-red-200 hover:border-red-500 hover:bg-red-50 text-slate-700 hover:text-red-700"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[2000px] mx-auto p-4 pb-8 w-full">
        {/* PDF Generator */}
        <div className="mb-4 flex gap-2 items-center">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">https://</span>
            <Input
              placeholder="example.com or name"
              value={pdfInput}
              onChange={(e) => setPdfInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGeneratePdf()}
              disabled={isPdfLoading}
              className="text-sm flex-1 pl-16"
            />
          </div>
          <Button
            size="sm"
            onClick={handleGeneratePdf}
            disabled={!pdfInput.trim() || isPdfLoading}
            className="whitespace-nowrap"
          >
            {isPdfLoading ? "Generating..." : "Generate PDF"}
          </Button>
        </div>
        
        {/* Progress Bar */}
        {isPdfLoading && (
          <div className="mb-4 w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1 overflow-hidden">
            <div className="h-full bg-primary animate-pulse" style={{ width: "100%" }} />
          </div>
        )}
        
        {/* Error Alert */}
        {pdfError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">PDF Generation Error</p>
                <p className="text-xs text-red-700 dark:text-red-300 mt-1 break-words">{pdfError}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 flex-shrink-0"
                onClick={() => setPdfError(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Metrics Grid - Top Overview */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
          {metrics.map((metric, index) => (
            <Card key={index} className="hover:shadow transition-shadow">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-lg font-bold">{metric.value}</p>
                      {metric.change && (
                        <span className={cn(
                          "text-[10px] font-medium",
                          metric.change > 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {metric.change > 0 ? '+' : ''}{metric.change}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center",
                    metric.color,
                    "text-white"
                  )}>
                    {metric.icon}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Dashboard Grid - Optimized for better fit */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[600px]">
          
          {/* LEFT COLUMN - Phone Dialer + File Manager */}
          <div className="lg:col-span-3 flex flex-col gap-3">
            {/* Phone Dialer - Compact or Full */}
            <Card className="flex-shrink-0 h-auto">
              <CardHeader className="pb-2 px-4 pt-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary" />
                    Quick Dial
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setShowFullDialer(!showFullDialer)}
                    title={showFullDialer ? "Compact view" : "Expand dialer"}
                  >
                    <Keyboard className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {/* Phone Number Display */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium">Number</label>
                    {phoneNumber && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleDeleteDigit}
                        className="h-5 w-5"
                      >
                        <Delete className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div className="text-lg font-mono text-center p-2 bg-secondary/30 rounded border">
                    {formatPhoneNumber(phoneNumber) || "callaback.com"}
                  </div>
                </div>

                {/* Dial Pad - Compact or Full */}
                <div className={cn(
                  "grid grid-cols-3 gap-1.5 mb-3",
                  showFullDialer ? "" : ""
                )}>
                  {(showFullDialer ? dialPadButtons : dialPadButtons.slice(0, 6)).map(({ digit, letters }) => (
                    <Button
                      key={digit}
                      variant="secondary"
                      className="h-8 flex flex-col items-center justify-center p-0 text-xs hover:bg-primary/10"
                      onClick={() => handleDigitPress(digit)}
                      disabled={isCallActive}
                    >
                      <span className="font-bold">{digit}</span>
                      {letters && (
                        <span className="text-[6px] text-muted-foreground">
                          {letters}
                        </span>
                      )}
                    </Button>
                  ))}
                </div>

                {/* Call Button */}
                <div className="flex items-center justify-center gap-1.5">
                  <Button
                    size="icon"
                    className={cn(
                      "h-10 w-10 rounded-full",
                      isCallActive
                        ? "bg-destructive hover:bg-destructive/90 animate-pulse"
                        : phoneNumber
                        ? "bg-primary hover:bg-primary/90"
                        : "bg-primary/30 cursor-not-allowed"
                    )}
                    onClick={handleCall}
                    disabled={!phoneNumber && !isCallActive}
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                  {isCallActive && (
                    <>
                      <Button
                        variant="outline"
                        size="icon"
                        className={cn(
                          "h-8 w-8 rounded-full",
                          isMuted
                            ? "bg-destructive/20 border-destructive text-destructive"
                            : "hover:bg-primary/10"
                        )}
                        onClick={() => setIsMuted(!isMuted)}
                      >
                        {isMuted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className={cn(
                          "h-8 w-8 rounded-full",
                          isSpeakerOn
                            ? "bg-primary/20 border-primary text-primary"
                            : "hover:bg-primary/10"
                        )}
                        onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                      >
                        {isSpeakerOn ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
                      </Button>
                    </>
                  )}
                </div>
                {isCallActive && (
                  <div className="text-center mt-1.5">
                    <p className="text-xs font-mono">{formatDuration(callDuration)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* File Manager - Takes remaining space */}
            <div className="h-[600px] flex flex-col gap-2">
              {generatedPdfUrl && (
                <Card className="flex-shrink-0">
                  <CardHeader className="pb-2 px-4 pt-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Generated PDF</CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setGeneratedPdfUrl(null)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <iframe
                      src={generatedPdfUrl}
                      className="w-full h-[200px] border rounded"
                    />
                    <Button
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => {
                        const a = document.createElement("a")
                        a.href = generatedPdfUrl
                        a.download = "generated.pdf"
                        a.click()
                      }}
                    >
                      Download PDF
                    </Button>
                  </CardContent>
                </Card>
              )}
              <div className={generatedPdfUrl ? "h-[350px]" : "h-full"}>
                <FileManager />
              </div>
            </div>
          </div>

          {/* CENTER COLUMN - Contacts + Chat */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            {/* Contacts Manager - Fixed height */}
            <div className="h-[380px]">
              <ContactsManager
                contacts={contacts.map(c => ({
                  id: c.id,
                  name: c.name,
                  phone: c.phone,
                  email: c.email,
                  company: c.company,
                  createdAt: new Date(c.created_at)
                }))}
                onAddContact={async (contact) => {
                  try {
                    const { data, error } = await supabase
                      .from("contacts")
                      .insert({
                        name: contact.name,
                        phone: contact.phone,
                        email: contact.email,
                        company: contact.company,
                        created_at: new Date().toISOString()
                      })
                      .select()
                      .single()
                    
                    if (error) throw error
                    
                    toast.success("Contact added successfully")
                    fetchDashboardData()
                  } catch (error) {
                    console.error("Error adding contact:", error)
                    toast.error("Failed to add contact")
                  }
                }}
                onUpdateContact={async (id, updates) => {
                  try {
                    const { error } = await supabase
                      .from("contacts")
                      .update(updates)
                      .eq("id", id)
                    
                    if (error) throw error
                    
                    toast.success("Contact updated successfully")
                    fetchDashboardData()
                  } catch (error) {
                    console.error("Error updating contact:", error)
                    toast.error("Failed to update contact")
                  }
                }}
                onDeleteContact={async (id) => {
                  try {
                    const { error } = await supabase
                      .from("contacts")
                      .delete()
                      .eq("id", id)
                    
                    if (error) throw error
                    
                    toast.success("Contact deleted successfully")
                    fetchDashboardData()
                  } catch (error) {
                    console.error("Error deleting contact:", error)
                    toast.error("Failed to delete contact")
                  }
                }}
                onSelectContact={handleContactSelectForCall}
                selectedContactId={selectedContactForCall?.id}
              />
            </div>
            
            {/* Sync Chat - Takes remaining space */}
            <div className="h-[650px]">
              <SyncChat
                sessionId={user?.id || "user-session"}
                identity={user?.email || "User"}
                phoneNumber={YOUR_PHONE_NUMBER}
                onSessionChange={() => {}}
              />
            </div>
          </div>

          {/* RIGHT COLUMN - Callback Calendar + Notes */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            {/* Callback Calendar - Takes more space */}
            <div className="h-[550px]">
              <CallbackCalendar />
            </div>
            
            {/* Notes/Leads Panel - Takes remaining space */}
            <div className="h-[480px]">
              <NotesLeadsPanel />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
