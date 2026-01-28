"use client"

import { useState } from "react"
import { Plus, Search, User, Phone, Trash2, Edit2, X, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"

export interface Contact {
  id: string
  name: string
  phone: string
  email?: string
  company?: string
  createdAt: Date
}

interface ContactsManagerProps {
  contacts: Contact[]
  onAddContact: (contact: Omit<Contact, "id" | "createdAt">) => void
  onUpdateContact: (id: string, contact: Partial<Contact>) => void
  onDeleteContact: (id: string) => void
  onSelectContact: (contact: Contact) => void
  selectedContactId?: string
}

export function ContactsManager({
  contacts,
  onAddContact,
  onUpdateContact,
  onDeleteContact,
  onSelectContact,
  selectedContactId,
}: ContactsManagerProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newContact, setNewContact] = useState({ name: "", phone: "", email: "", company: "" })
  const [editContact, setEditContact] = useState({ name: "", phone: "", email: "", company: "" })

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone.includes(searchQuery) ||
      contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.company?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAddContact = () => {
    if (newContact.name && newContact.phone) {
      onAddContact(newContact)
      setNewContact({ name: "", phone: "", email: "", company: "" })
      setIsAdding(false)
    }
  }

  const handleStartEdit = (contact: Contact) => {
    setEditingId(contact.id)
    setEditContact({
      name: contact.name,
      phone: contact.phone,
      email: contact.email || "",
      company: contact.company || "",
    })
  }

  const handleSaveEdit = (id: string) => {
    if (editContact.name && editContact.phone) {
      onUpdateContact(id, editContact)
      setEditingId(null)
    }
  }

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "")
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    return phone
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Contacts</CardTitle>
          <Button
            size="sm"
            variant={isAdding ? "secondary" : "default"}
            onClick={() => setIsAdding(!isAdding)}
          >
            {isAdding ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        {/* Add Contact Form */}
        {isAdding && (
          <div className="bg-secondary/50 rounded-lg p-3 mb-3 space-y-2">
            <Input
              placeholder="Name *"
              value={newContact.name}
              onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
            />
            <Input
              placeholder="Phone *"
              value={newContact.phone}
              onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
            />
            <Input
              placeholder="Email"
              value={newContact.email}
              onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
            />
            <Input
              placeholder="Company"
              value={newContact.company}
              onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddContact} disabled={!newContact.name || !newContact.phone}>
                Save Contact
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Contacts List */}
        <ScrollArea className="h-[calc(100%-1rem)]">
          <div className="space-y-2 pr-3">
            {filteredContacts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? "No contacts found" : "No contacts yet"}
              </div>
            ) : (
              filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  className={`group p-3 rounded-lg border transition-colors cursor-pointer ${
                    selectedContactId === contact.id
                      ? "bg-primary/10 border-primary/30"
                      : "bg-card hover:bg-secondary/50 border-border"
                  }`}
                  onClick={() => editingId !== contact.id && onSelectContact(contact)}
                >
                  {editingId === contact.id ? (
                    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                      <Input
                        value={editContact.name}
                        onChange={(e) => setEditContact({ ...editContact, name: e.target.value })}
                        placeholder="Name"
                      />
                      <Input
                        value={editContact.phone}
                        onChange={(e) => setEditContact({ ...editContact, phone: e.target.value })}
                        placeholder="Phone"
                      />
                      <Input
                        value={editContact.email}
                        onChange={(e) => setEditContact({ ...editContact, email: e.target.value })}
                        placeholder="Email"
                      />
                      <Input
                        value={editContact.company}
                        onChange={(e) => setEditContact({ ...editContact, company: e.target.value })}
                        placeholder="Company"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSaveEdit(contact.id)}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{contact.name}</p>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{formatPhone(contact.phone)}</span>
                          </div>
                          {contact.company && (
                            <p className="text-xs text-muted-foreground truncate">{contact.company}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleStartEdit(contact)
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            onDeleteContact(contact.id)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

