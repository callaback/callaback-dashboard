"use client"

import { useState, useRef, useEffect } from "react"
import { Save, Upload, Download, FileText, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"

export function NotesLeadsPanel() {
  const [notes, setNotes] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // Load notes from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("persistent_notes")
    if (saved) {
      setNotes(saved)
      const timestamp = localStorage.getItem("notes_last_saved")
      if (timestamp) setLastSaved(timestamp)
    }
  }, [])

  // Auto-save to localStorage
  const saveNotes = async () => {
    setIsSaving(true)
    try {
      localStorage.setItem("persistent_notes", notes)
      const now = new Date().toLocaleTimeString()
      localStorage.setItem("notes_last_saved", now)
      setLastSaved(now)
    } catch (error) {
      console.error("Failed to save notes:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setNotes(content)
      saveNotes()
    }
    reader.readAsText(file)
  }

  const downloadNotes = () => {
    const element = document.createElement("a")
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(notes))
    element.setAttribute("download", `notes-${new Date().toISOString().split('T')[0]}.txt`)
    element.style.display = "none"
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const clearNotes = () => {
    if (confirm("Are you sure you want to clear all notes?")) {
      setNotes("")
      localStorage.removeItem("persistent_notes")
      localStorage.removeItem("notes_last_saved")
      setLastSaved("")
    }
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Notes
          </CardTitle>
          <div className="flex items-center gap-2">
            {lastSaved && (
              <span className="text-xs text-muted-foreground">
                Saved: {lastSaved}
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0 gap-3">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Write your notes here... They auto-save to your browser."
          className="flex-1 resize-none"
        />

        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={saveNotes}
            disabled={isSaving}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            Save
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            Load .txt/.md
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={downloadNotes}
            disabled={!notes.trim()}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Download
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={clearNotes}
            disabled={!notes.trim()}
            className="gap-2 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md"
          onChange={handleFileUpload}
          className="hidden"
        />
      </CardContent>
    </Card>
  )
}
