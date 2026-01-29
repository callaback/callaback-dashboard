"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, Phone, Clock, X, CheckSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { useConfetti } from "@/hooks/useConfetti"

interface Booking {
  id: string
  date: string
  time: string
  phone: string
  created_at: string
}

interface Todo {
  id: string
  text: string
  completed: boolean
}

export function CallbackCalendar() {
  const [activeTab, setActiveTab] = useState<"calendar" | "todos">("calendar")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [bookings, setBookings] = useState<Booking[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [newTodo, setNewTodo] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const supabase = createClient()

  // Use confetti hook
  useConfetti(showConfetti)

  // Time slots (15-min intervals, 9 AM to 5 PM)
  const timeSlots = Array.from({ length: 32 }, (_, i) => {
    const hour = Math.floor(i / 4) + 9
    const minute = (i % 4) * 15
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
  })

  // Load bookings and todos
  useEffect(() => {
    loadBookings()
    if (activeTab === "todos") {
      loadTodos()
    }
  }, [activeTab])

  const loadBookings = async () => {
    try {
      const { data, error } = await supabase
        .from("callback_bookings")
        .select("*")
        .order("date", { ascending: true })

      if (error) throw error
      setBookings(data || [])
    } catch (error) {
      console.error("Error loading bookings:", error)
    }
  }

  const loadTodos = async () => {
    try {
      const response = await fetch("https://to-do-list-kv.callaback.workers.dev")
      const data = await response.json()
      setTodos(data || [])
    } catch (error) {
      console.error("Error loading todos:", error)
    }
  }

  const addTodo = async () => {
    if (!newTodo.trim()) return
    
    console.log("Adding todo:", newTodo) // Debug log
    
    try {
      const response = await fetch("https://to-do-list-kv.callaback.workers.dev", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newTodo })
      })
      
      console.log("Response status:", response.status) // Debug log
      
      if (response.ok) {
        setNewTodo("")
        loadTodos()
        toast.success("Todo added")
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 100)
      } else {
        console.error("Response not ok:", response.statusText)
        toast.error("Failed to add todo")
      }
    } catch (error) {
      console.error("Error adding todo:", error)
      toast.error("Failed to add todo")
    }
  }

  const toggleTodo = async (id: string) => {
    try {
      const response = await fetch(`https://to-do-list-kv.callaback.workers.dev/${id}`, {
        method: "PUT"
      })
      
      if (response.ok) {
        loadTodos()
      }
    } catch (error) {
      console.error("Error toggling todo:", error)
    }
  }

  const deleteTodo = async (id: string) => {
    try {
      const response = await fetch(`https://to-do-list-kv.callaback.workers.dev/${id}`, {
        method: "DELETE"
      })
      
      if (response.ok) {
        loadTodos()
        toast.success("Todo deleted")
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 100)
      }
    } catch (error) {
      console.error("Error deleting todo:", error)
      toast.error("Failed to delete todo")
    }
  }

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const formatDateString = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  }

  const isSlotBooked = (date: string, time: string) => {
    return bookings.some(b => b.date === date && b.time === time)
  }

  const handleBooking = async () => {
    if (!selectedDate || !selectedTime || !phoneNumber.trim()) {
      toast.error("Please select date, time, and enter phone number")
      return
    }

    if (isSlotBooked(selectedDate, selectedTime)) {
      toast.error("This slot is already booked")
      return
    }

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("callback_bookings")
        .insert({
          date: selectedDate,
          time: selectedTime,
          phone: phoneNumber,
          created_at: new Date().toISOString()
        })
        .select()

      if (error) {
        console.error("Supabase error:", error)
        throw error
      }

      toast.success(`Callback booked for ${selectedDate} at ${selectedTime}`)
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 100)
      setPhoneNumber("")
      // Keep selections visible to show the booking was successful
      // setSelectedDate(null)
      // setSelectedTime(null)
      await loadBookings()
    } catch (error) {
      console.error("Error booking callback:", error)
      toast.error(`Failed to book callback: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelBooking = async (id: string) => {
    try {
      const { error } = await supabase
        .from("callback_bookings")
        .delete()
        .eq("id", id)

      if (error) throw error

      toast.success("Booking cancelled")
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 100)
      loadBookings()
    } catch (error) {
      console.error("Error cancelling booking:", error)
      toast.error("Failed to cancel booking")
    }
  }

  const daysInMonth = getDaysInMonth(currentDate)
  const firstDay = getFirstDayOfMonth(currentDate)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i)

  const monthName = currentDate.toLocaleString("default", { month: "long", year: "numeric" })

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            {activeTab === "calendar" ? (
              <>
                <Phone className="h-4 w-4 text-primary" />
                Callback Bookings
              </>
            ) : (
              <>
                <CheckSquare className="h-4 w-4 text-primary" />
                Todos
              </>
            )}
          </CardTitle>
          <div className="flex gap-1">
            <Button
              variant={activeTab === "calendar" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("calendar")}
              className="text-xs"
            >
              Calendar
            </Button>
            <Button
              variant={activeTab === "todos" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("todos")}
              className="text-xs"
            >
              TODOS
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-4">
        {activeTab === "calendar" ? (
          <div className="space-y-3">
            {/* Calendar */}
            <div className="border rounded-lg p-3 bg-slate-50 dark:bg-slate-800 dark:border-slate-700">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <p className="text-sm font-semibold dark:text-slate-100">{monthName}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                  <div key={day} className="text-center text-xs font-semibold text-slate-600 dark:text-slate-400 py-1">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-1">
                {emptyDays.map(i => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}
                {days.map(day => {
                  const dateStr = formatDateString(currentDate.getFullYear(), currentDate.getMonth(), day)
                  const dayBookings = bookings.filter(b => b.date === dateStr)
                  const isSelected = selectedDate === dateStr
                  const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString()

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDate(dateStr)}
                      className={`aspect-square text-xs font-medium rounded flex items-center justify-center relative transition-colors ${
                        isSelected
                          ? "bg-primary text-white"
                          : isToday
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 border border-blue-300 dark:border-blue-700"
                          : dayBookings.length > 0
                          ? "bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-100"
                          : "hover:bg-slate-200 dark:hover:bg-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {day}
                      {dayBookings.length > 0 && (
                        <span className="absolute bottom-0.5 right-0.5 h-1 w-1 bg-red-500 rounded-full" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Time Slots */}
            {selectedDate && (
              <div className="border rounded-lg p-3 bg-slate-50 dark:bg-slate-800 dark:border-slate-700">
                <p className="text-xs font-semibold mb-2 dark:text-slate-100">Select Time</p>
                <div className="grid grid-cols-4 gap-1 max-h-[120px] overflow-y-auto">
                  {timeSlots.map(time => {
                    const isBooked = isSlotBooked(selectedDate, time)
                    const isSelected = selectedTime === time

                    return (
                      <button
                        key={time}
                        onClick={() => !isBooked && setSelectedTime(time)}
                        disabled={isBooked}
                        className={`text-xs py-1.5 rounded font-medium transition-colors ${
                          isSelected
                            ? "bg-primary text-white"
                            : isBooked
                            ? "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-200 cursor-not-allowed opacity-50"
                            : "bg-white dark:bg-slate-700 border dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 dark:text-slate-300"
                        }`}
                      >
                        {time}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Phone Input */}
            {selectedDate && selectedTime && (
              <div className="border rounded-lg p-3 bg-slate-50 dark:bg-slate-800 dark:border-slate-700">
                <label className="text-xs font-semibold block mb-2 dark:text-slate-100">Phone Number</label>
                <Input
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="text-sm mb-2 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                />
                <Button
                  size="sm"
                  className="w-full"
                  onClick={handleBooking}
                  disabled={isLoading}
                >
                  <Phone className="h-3 w-3 mr-2" />
                  {isLoading ? "Booking..." : "Book Callback"}
                </Button>
              </div>
            )}

            {/* Upcoming Bookings */}
            <div className="border rounded-lg p-3 bg-slate-50 dark:bg-slate-800 dark:border-slate-700">
              <p className="text-xs font-semibold mb-2 dark:text-slate-100">Upcoming</p>
              <div className="space-y-2">
                {bookings
                  .filter(b => new Date(`${b.date}T${b.time}`) > new Date())
                  .slice(0, 5)
                  .map(booking => (
                    <div key={booking.id} className="flex items-center justify-between text-xs p-2 bg-white dark:bg-slate-700 rounded border dark:border-slate-600">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-primary" />
                        <div>
                          <p className="font-medium dark:text-slate-100">{booking.date} {booking.time}</p>
                          <p className="text-muted-foreground dark:text-slate-400">{booking.phone}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleCancelBooking(booking.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                {bookings.filter(b => new Date(`${b.date}T${b.time}`) > new Date()).length === 0 && (
                  <p className="text-xs text-muted-foreground dark:text-slate-400 text-center py-4">No upcoming bookings</p>
                )}
              </div>
            </div>
        </div>
        ) : (
          <div className="space-y-3">
            <div className="border rounded-lg p-3 bg-slate-50 dark:bg-slate-800 dark:border-slate-700">
              <div className="flex gap-2">
                <Input
                  placeholder="Add a new todo..."
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addTodo()}
                  className="text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                />
                <Button size="sm" onClick={addTodo}>
                  Add
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              {todos.map(todo => (
                <div key={todo.id} className="flex items-center gap-2 p-2 bg-white dark:bg-slate-700 rounded border dark:border-slate-600">
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => toggleTodo(todo.id)}
                    className="rounded"
                  />
                  <span className={`flex-1 text-sm ${todo.completed ? "line-through text-muted-foreground" : "dark:text-slate-100"}`}>
                    {todo.text}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => deleteTodo(todo.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {todos.length === 0 && (
                <p className="text-xs text-muted-foreground dark:text-slate-400 text-center py-4">No todos yet</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
